# Donation Flow — SIVeL 3

> *"Blessed are those who hunger and thirst for righteousness, for they shall be satisfied."* (Matthew 5:6)

This document describes the complete donation flow: from the user clicking "Donate" to the SLEARN cashback being minted. It covers the wallet interaction, on-chain transaction, backend verification, and 90/10 split between RegionalDonation and SLEARN.

## Why this document exists

The donation flow went through several iterations (approve+donate two-step, unified ERC-20 transfer, MiniPay compatibility fixes, 4xx retry logic). The design decisions that led to the current architecture were hard-earned and are documented here so future developers don't repeat the same debugging cycles.

---

## 1. Flow Overview

```
User clicks "Donate"
    │
    ▼
┌─────────────────────────────┐
│  donate() [lib/donate.ts]   │
│  Wallet Layer               │
└─────────────────────────────┘
    │
    ├── MiniPay?  → ethereum.send()
    ├── MetaMask/OneKey? → ethereum.request()
    │
    ▼
Transaction sent to Celo (USDT transfer with regionId in data, to sivel.xyz backend wallet)
    │
    ▼
┌───────────────────────────────────────┐
│  POST /api/donations/assign [route.ts]│
│  Server-side verification              │
└───────────────────────────────────────┘
    │
    ├── 1. Verify tx on-chain (Viem)
    ├── 2. Extract regionId from tx.data
    ├── 3. 10% → SLEARN contract (mintAndReserve → 22:1 cashback)
    ├── 4. 90% → RegionalDonationV2 (assignDonation)
    │
    ▼
Response returned to user
```

---

## 2. Wallet Layer — `lib/donate.ts`

### 2.1 Unified Transfer (No Approve Step)

**Decision:** The donation uses a single `transfer()` call to the USDT contract, with the region ID appended to the data field. There is no separate `approve()` step.

**Why:** The old flow required two transactions: (1) approve USDT spending, (2) call donate on the contract. This was confusing, expensive (gas ×2), and error-prone. MiniPay does not support the approve+call pattern (see [issue #24](https://github.com/pasosdeJesus/sivel3/issues/24) and [celo-composer#382](https://github.com/celo-org/celo-composer/issues/382)), which forced the redesign. The current flow encodes the region ID directly in the ERC-20 transfer data, and the backend extracts it server-side.

### 2.2 Transaction Data Encoding

The ERC-20 `transfer(address to, uint256 amount)` function is called on the USDT contract, with the region ID and the **sivel.xyz backend wallet** (`NEXT_PUBLIC_ADDRESS`) encoded in the data:

```
┌──────────────────────────────────────────────────────────────┐
│ 0xa9059cbb  │  transfer selector (4 bytes)                   │
│  0000...to  │  sivel.xyz backend wallet (32 bytes)            │
│  0000...amt │  amount in smallest unit (32 bytes, 6 decimals)│
│  0000...reg │  regionId (32 bytes) ← appended for extraction  │
└──────────────────────────────────────────────────────────────┘
```

The donation arrives at sivel.xyz's wallet. The backend splits it: 10% to SLEARN (mintAndReserve for cashback) and 90% to RegionalDonationV2 (assignDonation).

> **Note:** This is not standard ERC-20. The standard `transfer(address,uint256)` expects exactly 68 bytes of calldata. Appending extra bytes (called *calldata stuffing*) works because the USDT contract ignores surplus data — Solidity only decodes what it needs. It is a pragmatic workaround: MiniPay does not support the standard approve+call pattern, so we encode the region ID in the transfer and verify it server-side instead.

**Why encode regionId in data?** Security. The frontend sends `regionId` in the POST body, but the backend ignores it and extracts the region directly from the on-chain transaction data. This prevents a compromised frontend from redirecting donations.

### 2.3 Wallet Detection — MiniPay vs MetaMask

| Wallet | Method | Limitation |
|--------|--------|------------|
| **MiniPay** | `ethereum.send()` | Does NOT support `ethereum.request()` (throws on `_request`) |
| **MetaMask / OneKey** | `ethereum.request()` | Does NOT support `ethereum.send()` without callback |

Detection:

```typescript
const isMiniPay = window.ethereum.isMiniPay === true
```

If `isMiniPay`, use `ethereum.send()`. Otherwise, use `ethereum.request()`.

### 2.4 MiniPay Response Parsing

MiniPay returns the transaction hash in different formats depending on the version:

```typescript
// Format 1: direct string
"0xabcd..."

// Format 2: object with result
{ result: "0xabcd..." }

// Format 3: object with hash
{ hash: "0xabcd..." }

// Format 4: object with transactionHash
{ transactionHash: "0xabcd..." }
```

The code tries each format in order. If none matches, it throws with the serialized response for debugging.

### 2.5 Backend Retry Logic

After sending the transaction, the frontend calls `POST /api/donations/assign` with up to 5 retries and 2-second intervals:

| HTTP Status | Behavior | Why |
|-------------|----------|-----|
| 2xx (ok) | Break, success | Transaction verified |
| 4xx | Mark as client error, but **continue retrying** | Transaction may not be confirmed on-chain yet (e.g. `TransactionNotFoundError`). The backend returns 400 temporarily. |
| 5xx | Continue retrying | Temporary server error |
| Network error | Continue retrying | Transient network issue |

**Important:** 4xx errors do NOT break the loop. The first implementation broke on 4xx, which caused donations to fail when the blockchain was slow to confirm. The transaction is valid — it just needs a few more seconds.

After 5 failed attempts:

- **Client error (4xx):** Shows message like "The transaction could not be verified by the server. Reason: HTTP 400. Contact the team if the problem persists."
- **Server error (5xx) or network:** Shows "The donation was sent but could not be assigned automatically (after 5 attempts). Funds are safe in the contract. Hash: 0xabcd... Contact the team."

---

## 3. Server-side Verification — `POST /api/donations/assign`

### 3.1 Flow

```
Receive { regionId, donor, amount, txHash }
    │
    ▼
1. Validate required params (400 if missing)
    │
    ▼
2. Verify transaction on-chain via Viem:
   ├── getTransaction(txHash) → extract regionId from tx.input
   ├── getTransactionReceipt(txHash) → find USDT Transfer event
   ├── Verify: from === donor, to === backend wallet, value === amount
   └── Verify: regionId is valid (1 or 2)
    │
    ▼
3. Split 90/10:
   ├── 10% → SLEARN contract (mintAndReserve → 22 SLEARN per USDT cashback)
   └── 90% → RegionalDonationV2 (transfer + assignDonation)
    │
    ▼
Return { success, txHash, slearn }
```

### 3.2 Transaction Verification Details

The backend reads the full transaction data from Celo using `viem.getTransaction()`. It:

1. **Extracts regionId** from the last 32 bytes of `tx.input`
2. **Finds the USDT Transfer event** in the receipt logs by matching:
   - Topic[0]: Transfer event signature
   - Address: USDT contract address
3. **Verifies the transfer**:
   - `from` (from topic[1]) matches the donor address
   - `to` (from topic[2]) matches the sivel.xyz backend wallet (`NEXT_PUBLIC_ADDRESS`)
   - `value` (from log data) matches the donation amount

### 3.3 SLEARN Cashback

The backend calls `mintSlearnCashback(donor, donationAmount)` from `lib/slearn.ts`:

- Derives the backend wallet client from `PRIVATE_KEY`
- Transfers 10% of the donation USDT to the SLEARN contract
- Calls `mintAndReserve(donor, usdtAmount)` on SLEARN — mints at 22:1 rate
- Retries on collision (shared USDT pool, up to 3 attempts)
- **All donors receive SLEARN cashback** (verified or not — the donation is proof of good faith)
- **Non-blocking**: if SLEARN minting fails, 100% goes to RegionalDonation

### 3.4 Security Considerations

- The backend uses the region ID **from the transaction data**, not from the request body. The frontend's `regionId` is only used as fallback.
- The USDT Transfer event is verified against the actual on-chain data, not client-provided values.
- All contract calls are signed with the server's `PRIVATE_KEY`.

---

## 4. Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ADDRESS` | sivel.xyz backend wallet — donations arrive here before 90/10 split |
| `PRIVATE_KEY` | Server's private key for signing contract calls |
| `NEXT_PUBLIC_RPC_URL` | Celo RPC endpoint |
| `NEXT_PUBLIC_USDT_ADDRESS` | USDT token on Celo |
| `NEXT_PUBLIC_REGIONALDONATION_ADDRESS` | RegionalDonationV2 contract |
| `NEXT_PUBLIC_SLEARN_ADDRESS` | SLEARN token (via `contractAddresses.ts`) |

---

## 5. Error Handling

### User-Facing Errors (`lib/errors.ts`)

Wallet/blockchain errors are translated to user-friendly messages via `parseWalletError()`:

| Error Pattern | User Message |
|---------------|-------------|
| `insufficient funds` / `exceeds balance` | Insufficient USDT balance |
| `user rejected` / code 4001 | Transaction cancelled in wallet |
| `network` / `RPC` | Network connection error |
| `gas` | Not enough CELO for gas |
| Pre-translated messages (from donate.ts) | Returned as-is |

### Debug Console

Enable with `?debug=1` URL parameter. Shows real-time logs from the donation flow. See `doc/mobile-debug-console.md`.

---

## 6. Key Design Decisions Summary

| Decision | Rationale |
|----------|-----------|
| **Unified transfer vs approve+donate** | Fewer transactions, less gas, simpler UX |
| **RegionId in tx.data** | Security: prevents frontend tampering |
| **Transfer to backend wallet** | Enables 90/10 split: 10% SLEARN cashback, 90% RegionalDonation |
| **SLEARN for all donors** | Donation itself is proof of good faith; verification encouraged via UI |
| **MiniPay uses `ethereum.send`** | Discovered empirically — MiniPay does not support `request()` |
| **4xx continues retrying** | Transaction may not be confirmed yet (false positive) |
| **SLEARN is non-blocking** | Donation succeeds even if SLEARN minting fails |
