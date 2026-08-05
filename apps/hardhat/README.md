# sivel3 - Smart Contracts

This directory contains the smart contracts for the sivel3 project and their
test suite. Contracts are compiled with Hardhat, tested with
`@pasosdejesus/m`'s `contract:test` runner (OpenBSD-compatible).

## Smart Contract Architecture

| Contract | Purpose |
|----------|---------|
| `MockUSDT.sol` | Mock USDT for local and testnet development |
| `PasosdeJesusCredentials.sol` | Unified SBT + NFT contract (ERC1155 + AccessControl) |
| `SIVeL3PreAlertMarket.sol` | Pre-alert marketplace on Celo |
| `SIVeL3RegionalDonationV2.sol` | Regional donation management on Celo |
| `SIVeL3RewardEscrow.sol` | Escrow for releasing USDT rewards |

## Prerequisites

- [Node.js](https://nodejs.org/) (>= 18)
- [pnpm](https://pnpm.io/) v10
- A Celo-compatible wallet with test funds. See the [Celo Faucet](https://faucet.celo.org/celo-sepolia).

## 1. Environment Configuration

This project uses a **single unified `.env`** file located at `apps/.env`.
Copy the template if needed:

```sh
cp ../.env.example ../.env
```

Edit `apps/.env` with:

- `PRIVATE_KEY`: The private key of the wallet used for deployment.
- `CREDENTIALS_PRIVATE_KEY`: Private key for `DEFAULT_ADMIN_ROLE` on
  `PasosDeJesusCredentials`.
- `BLOCKSCOUT_API_KEY`: API key from [Celo Blockscout](https://explorer.celo.org/)
  for verification.
- `BASESCAN_API_KEY`: API key from [BaseScan](https://basescan.org/) for
  Base verification.

**⚠️ Security Warning:** Never use a wallet containing real funds for
development. Always generate and use a separate, dedicated wallet for testing.

## 2. Platform-Specific Setup (adJ / OpenBSD)

On OpenBSD/adJ, Hardhat's native dependencies (solidity-analyzer) don't have
prebuilt binaries. Run the preparation script once:

```sh
make prepadJ
```

This patches and compiles the native addon. On non-OpenBSD platforms, this
step is not needed.

## 3. Development Workflow

All commands can be run via `make` or `pnpm` directly:

| Task | make | pnpm |
|------|------|------|
| Build | `make` or `make build` | `pnpm build` |
| Install deps | `make install` | `pnpm install` |
| Type check | `make type` | `pnpm tsc` |
| Run tests | `make test` | `pnpm test` |
| Clean | `make clean` | `pnpm clean` |
| OpenBSD setup | `make prepadJ` | `sh bin/prepadJ.sh` |

### Build

```sh
make
```

Compiles Solidity contracts, generates TypeScript types, and syncs ABIs
to `apps/nextjs/abis/`.

### Run Tests

```sh
make test
```

Runs all contract tests via `@pasosdejesus/m`'s `contract:test` runner
(OpenBSD-compatible, no EDR needed).

### Deploy a Contract

```sh
pnpm deploy-mock-usdt
```

The script will output the contract address. **Copy this address** and
update the corresponding `NEXT_PUBLIC_*` variable in `apps/.env`.

### Deploy and Verify PasosDeJesusCredentials

```sh
# Deploy
bin/deployPdJCredentials celoSepolia
bin/deployPdJCredentials baseSepolia

# Verify source on explorers
bin/PdJCredentialsSourceVerification celoSepolia
bin/PdJCredentialsSourceVerification baseSepolia

# Functional verification
bin/verifyPdJCredentials celoSepolia
bin/verifyPdJCredentials baseSepolia
```

### Verify a Contract on Blockscout

```sh
pnpm verify-mock-usdt
```

## ABI Synchronization

Contract ABIs are synced to `apps/nextjs/abis/` automatically on
`pnpm build`. To sync manually:

```sh
pnpm sync:abis
```
