# SBT Minting — sivel.xyz

> "For the Lord loves justice" (Psalm 37:28)

## Overview

sivel.xyz issues non-transferable Soulbound Tokens (ERC-1155 SBTs) via
the unified `PasosDeJesusCredentials` contract as verifiable on-chain
proof of donations, roles, and achievements.

All credential types are registered once on-chain via
`bin/m credentials:register-type` and cached locally in the
`credential_metadata` table.

## Architecture

```
┌──────────────────────────────────────────────────┐
│ Trigger Points                                    │
│                                                  │
│  1. Wallet connect → POST /api/credential/mint-connector
│  2. Donation → POST /api/donations/assign
│  3. Case view → POST /api/credential/mint-explorer
│                                                  │
│       └──→ lib/credentials.ts                    │
│              └── mintSBT(wallet, tokenId, chainId)│
│                    ├── off-chain cache check      │
│                    ├── on-chain balanceOf check   │
│                    ├── mintCredentialWithRetry()  │ ← @pasosdejesus/m
│                    └── INSERT credential_emission  │
└──────────────────────────────────────────────────┘
```

## Core Library — `lib/credentials.ts`

```typescript
export async function mintSBT(
  wallet: string,
  tokenId: number,
  chainId: string,
): Promise<{ txHash: string } | null>
```

**Flow:**

1. Check `credential_emission` cache — return `null` if already emitted
2. Check on-chain `hasCredentialOnChain()` (reads `balanceOf`) — cache and skip if true
3. Call `mintCredentialWithRetry()` from `@pasosdejesus/m` (handles Celo L2 nonce retry)
4. Wait for transaction receipt (120s timeout)
5. Insert into `credential_emission` table (INSERT … ON CONFLICT DO NOTHING)
6. Return `{ txHash }`

**Contract resolution:** reads address from
`apps/hardhat/deployments/PasosDeJesusCredentials/{network}.json`.

## Trigger Points

### 1. Wallet Connect — Connector + Global Founder

**Endpoint:** `POST /api/credential/mint-connector`

**When:** User connects their wallet on the sivel.xyz homepage.

| Condition | Action |
|-----------|--------|
| Verified by learn.tg OR has donated | Mint "Connector" SBT |
| Connector minted + <50 Global Founders exist | Best-effort mint "Global Founder" |
| Not verified, no donation | Return `{ minted: false, reason: 'not_verified' }` |

**Verification flow:**
1. sivel.xyz signs `keccak256(encodePacked(wallet, timestamp))` with its `PRIVATE_KEY`
2. Calls `POST https://learn.tg/api/verify` with wallet, timestamp, and signature
3. learn.tg checks if wallet is verified (Self/GD/Passport)

### 2. Donation — Donor Tiers

**Endpoint:** `POST /api/donations/assign`

**When:** User donates USDT to a region via `RegionalDonationV2` contract.

**Steps:**
1. Verify on-chain Transfer event (USDT → contract)
2. Extract regionId from transaction data
3. Call `assignDonation()` on `RegionalDonationV2`
4. Record donation in local `transaction` table
5. Increment Learning Points in learn.tg

**SBT minting (best-effort):**

| Threshold | SBT Name | TokenId pattern |
|-----------|----------|-----------------|
| ≥ 0.02 USDT | Donor | From `credential_metadata` |
| ≥ 5 USDT | Bronze Donor | From `credential_metadata` |
| ≥ 20 USDT | Silver Donor | From `credential_metadata` |
| ≥ 50 USDT | Gold Donor | From `credential_metadata` |
| ≥ 100 USDT | Diamond Donor | From `credential_metadata` |

All thresholds read dynamically from `credential_metadata` via
`getDonorThresholds()`. After minting donor tiers, it also best-effort
mints "Connector" and "Global Founder" (same logic as wallet connect).

### 3. Case Explorer — Explorer SBT

**Endpoint:** `POST /api/credential/mint-explorer`

**When:** User has viewed 3+ different case pages (tracked via
`userevent` table).

| Condition | Action |
|-----------|--------|
| Verified by learn.tg OR donated | Mint "Explorer" SBT |
| Not eligible | Return `{ minted: false }` |

## Credential Icons

Icons live in `apps/nextjs/public/img/credential/source/icons/` (512×512 SVG, viewBox `0 0 512 512`).
Composed into final badge images (green border `#10b981`) via `bin/m credentials:recompose-image`.

| SBT | Filename | Concept |
|-----|----------|---------|
| Connector | `connector.svg` | Link/chain |
| Explorer | `explorer.svg` | Magnifying glass / map |
| Donor | `donor.svg` | Heart |
| Bronze Donor | `donor-bronze.svg` | Bronze medal |
| Silver Donor | `donor-silver.svg` | Silver medal |
| Gold Donor | `donor-gold.svg` | Gold medal |
| Diamond Donor | `donor-diamond.svg` | Diamond gem |
| Global Founder | `global-founder.svg` | Crown + globe |

## Database Tables

### `credential_emission`

```sql
CREATE TABLE credential_emission (
    id BIGSERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,          -- donor/sivel user wallet
    token_id INTEGER NOT NULL,                     -- from PasosDeJesusCredentials
    chain_id VARCHAR(20) NOT NULL DEFAULT 'celo', -- 'celo' | 'base'
    emitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(wallet_address, token_id, chain_id)
);
```

### `credential_metadata` — Cache

Populated by on-chain sync (similar to learn.tg). Read by frontend
components to display SBT names, types, and images.

```sql
CREATE TABLE credential_metadata (
    token_id INTEGER NOT NULL,
    chain_id VARCHAR(20) NOT NULL DEFAULT 'celo',
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,       -- 'role', 'achievement', 'course_completion', 'nft'
    site VARCHAR(50) NOT NULL,       -- 'sivel.xyz', 'learn.tg'
    is_premium BOOLEAN DEFAULT false,
    is_soulbound BOOLEAN DEFAULT true,
    image_url TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (token_id, chain_id)
);
```

## Endpoints — Read

| Endpoint | Purpose |
|----------|---------|
| `GET /api/credential/[tokenId]` | ERC-1155 metadata JSON (image, attributes) |
| `GET /api/credential/wallet/[wallet]` | Wallet SBTs, donation summary, first activity |
| `GET /api/credential/breakdown` | All SBT types with mint counts |
| `GET /api/credential/leaderboard` | Top donors by USDT with SBT counts |
## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/e2e/test-sbts.mjs` | E2E test: donation → SBT award on Celo Sepolia |
| `scripts/mint-missing-sbts.ts` | CLI: mint any missing SBTs for a wallet |
| `scripts/mint-donor-direct.mjs` | One-shot: mint Donor SBT directly |
| `scripts/diagnose-contract.mjs` | Diagnostic: contract state, roles, balances |
| `db/migrations/20260521_backfill_sbts.ts` | Migration backfill for historical donor wallets |

## Admin Commands

```bash
cd apps/nextjs

# List registered credential types
bin/m credentials:list-types --network celo

# Sync local credential_metadata cache from contract
bin/m credentials:sync-cache --network celo

# Grant MINTER_ROLE to a wallet (requires DEFAULT_ADMIN_ROLE)
bin/m credentials:grant-minter --network celo --address 0xWALLET

# Register new credential type (requires MINTER_ROLE)
bin/m credentials:register-type \
  --network celo \
  --site sivel.xyz \
  --type role \
  --display "New Badge" \
  --soulbound true
```

## Backfill Migration

One-time migration for users with prior activity before the SBT system was
deployed.

**File:** `db/migrations/20260521_backfill_sbts.ts`

**SBTs backfilled:** Connector (wallet connected), Donor levels 1-5
(cumulative donations), Global Founder (first 50 wallets verified in learn.tg).
TokenIds resolved dynamically from `credential_metadata` — not hardcoded.

### Global Founder Ordering Rule

- Query the first 50 wallets by `MIN(created_at)` in `web_event`
- For each, check learn.tg verification via signed `GET /api/verify`
- Mint only for those verified — ≤ 50 total
- Wallets beyond position 50 are NOT searched — it's a temporal cap, not a
  broader search for 50 verified wallets

### Operator Notes

- Requires `MINTER_ROLE` + CELO for gas on the `PRIVATE_KEY` wallet
- Same `PRIVATE_KEY` signs learn.tg verification requests (must be in learn.tg partner list)
- Idempotent — safe to re-run; checks `credential_emission` before each mint
- `credential_metadata` cache must be populated first (handled by prior migration `20260520_sync_credential_metadata`)
- Backup DB before running on mainnet
- Each `credential_emission` row records the real `hash_tx`

## Differences from learn.tg

| Aspect | learn.tg | sivel.xyz |
|--------|----------|-----------|
| Minting function | `mintCourseWithRetry` (course mint) | `mintCredentialWithRetry` (credential mint) |
| Wallet tracking | `usuario_id` in `credential_emission` | `wallet_address` in `credential_emission` |
| Trigger | Course 100% completion in `check-crossword` | Wallet connect + donation + case views |
| On-chain check | `hasCredentialOnChain` via `balanceOf` | Same, in `mintSBT()` wrapper |
| Off-chain check | `credential_emission` by `usuario_id` + `course_id` | `credential_emission` by `wallet_address` + `token_id` + `chain_id` |
| Verification | Learn.tg self-verification | Cross-checks learn.tg verification API |
| L2 retry | Via `mintCourseWithRetry` in `@pasosdejesus/m` | Via `mintCredentialWithRetry` in `@pasosdejesus/m` |

## See Also

- [ADMIN.md](../ADMIN.md) — Full admin guide for PasosDeJesusCredentials
- [doc/API.md](API.md) — Public API documentation
- [@pasosdejesus/m/doc/celo-nonce-handling.md](https://gitlab.com/pasosdeJesus/m/-/blob/main/doc/celo-nonce-handling.md) — Celo L2 nonce retry strategy
