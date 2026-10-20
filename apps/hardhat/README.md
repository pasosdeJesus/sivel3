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
prebuilt binaries. On a fresh adJ/OpenBSD installation:

```sh
# 1. Update npm (the bundled version is too old for our deps)
npm install -g npm

# 2. Enable corepack for pnpm and yarn version management
doas corepack enable

# 3. Patch and compile the native solidity-analyzer addon
make prepadJ
```

Steps 1-2 are one-time per machine. `prepadJ.sh` handles `pnpm install`
internally. On non-OpenBSD platforms, only `make install && make build`
is needed.

## 3. Development Workflow

All commands can be run via `make` or `pnpm` directly:

| Task | make | pnpm |
|------|------|------|
| Build | `make` or `make build` | `pnpm install && pnpm build` |
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

The deploy scripts write the address to
`deployments/<Contract>/V1/<network>.json` (gitignored). The Next.js app reads
those files at build time (`next.config.ts`), so **no manual copy to
`apps/.env` is needed**. The same convention covers
`SIVeL3RegionalDonationV2`, `SIVeL3PreAlertMarket` and `SIVeL3RewardEscrow`;
`PasosDeJesusCredentials` keeps its own
`deployments/PasosDeJesusCredentials/<network>.json`.

```sh
bin/deployRegionalDonation celoSepolia
bin/deployPreAlertMarket celoSepolia
bin/deployRewardEscrow celoSepolia
```

If a deployment file is missing (fresh checkout), the app falls back to the
canonical Celo Sepolia address in `apps/nextjs/lib/contractAddresses.ts`; a
`NEXT_PUBLIC_*_ADDRESS` env var is only a last-resort override.

### Verify SIVeL3RegionalDonationV2

```sh
bin/verifyRegionalDonationV2            # network from NEXT_PUBLIC_NETWORK
bin/verifyRegionalDonationV2 celo
REGION_MAX=20 bin/verifyRegionalDonationV2 celo
```

Read-only: loads the address from
`deployments/SIVeL3RegionalDonationV2/V1/<network>.json`, then prints the owner,
`backendAddress`, the donation token (symbol/decimals/balance) and the name and
balance of each region, checking that the regional balances add up to the
contract's USDT. It uses `tsx` + `viem` and the compiled artifact instead of
`hardhat run`, so it works on OpenBSD without `bin/prepadJ.sh`.

### Check deployment addresses

```sh
cd ..                                       # repository root
apps/nextjs/bin/m contract:checkdeploy      # readable report
apps/nextjs/bin/m contract:checkdeploy --json
```

Read-only: validates every `deployments/<Contract>/V1/<network>.json` (address,
network, expected fields) and that sources read addresses with
`@pasosdejesus/m/blockchain/deployments` instead of literals. Intentional
literals (canonical Celo Sepolia defaults, applied migrations, one-off scripts)
are declared in `contract-check.json` at the repository root.

Run it from the **repository root**: from `apps/nextjs` the tool does not see
`apps/hardhat`. The two `DEPLOYMENTS_DIR_MISSING` findings are expected in a
fresh checkout: `deployments/PasosDeJesusCredentials/` is gitignored and only
exists on machines where the credentials contract was deployed; there the report
is clean.

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
