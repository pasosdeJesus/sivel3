# sivel3 - Smart Contracts

This directory contains the smart contracts for the sivel3 project and their
test suite. Contracts are compiled with `m`'s `contract:compile` (no Hardhat,
solc 0.8.24) and tested with `contract:test` (OpenBSD-compatible).

## Smart Contract Architecture

| Contract | Purpose |
|----------|---------|
| `MockUSDT.sol` | Mock USDT for local and testnet development |
| `PasosDeJesusCredentials.sol` | Unified SBT + NFT contract (ERC1155 + AccessControl) |
| `SIVeL3PreAlertMarket.sol` | Pre-alert marketplace on Celo |
| `SIVeL3RegionalDonationV2.sol` | Regional donation management on Celo |
| `SIVeL3RewardEscrow.sol` | Escrow for releasing USDT rewards |

## Prerequisites

- [Node.js](https://nodejs.org/) (>= 18)
- [pnpm](https://pnpm.io/) v11
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

There is **no native dependency**: `contract:compile` uses `solc@0.8.24`
(a JavaScript/WASM compiler installed with `pnpm install`) and
`contract:test` uses the `@ethereumjs/vm` fallback. The old
`solidity-analyzer`/`bin/prepadJ.sh` workaround is no longer needed.

The `ulimit -d 7340032` requirement belongs to the **web** app (SWC WASM), not
to the contracts app.

`apps/contracts/m-contracts.config.ts` pins `0.8.24`, `evmVersion: 'cancun'` and
the optimizer (200 runs) — the same settings as the existing artifacts and the
mainnet deployment, so `contract:compile` stays byte-identical. Do not change
them without re-verifying every deployment.

## 3. Development Workflow

All commands can be run via `make` or `pnpm` directly:

| Task | make | pnpm |
|------|------|------|
| Build | `make` or `make build` | `pnpm install && pnpm build` |
| Compile | `make compile` | `pnpm compile` |
| Type check | `make type` | `pnpm tsc` |
| Run tests | `make test` | `pnpm test` |
| TypeChain | `make typechain` | `pnpm typechain` |
| Clean | `make clean` | `pnpm clean` |

### Build

```sh
make
```

Compiles Solidity contracts (`contract:compile`), generates TypeScript types
(`contract:typechain`) and syncs ABIs to `apps/web/abis/`.

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

`bin/deployMockUSDT` calls `contract:deploy`, which writes
`deployments/<Contract>/<network>.json` (gitignored) and then runs
`scripts/mint-mock-usdt.mjs` to mint the test balance. The same pattern covers
the other contracts:

```sh
bin/deployRegionalDonation
bin/deployPreAlertMarket
bin/deployRewardEscrow
```

`deployRegionalDonation` also runs `scripts/set-regions.mjs` (regions 1 and 2).
`PasosDeJesusCredentials` uses `CREDENTIALS_PRIVATE_KEY` and keeps
`deployments/PasosDeJesusCredentials/<network>.json`.

`deployments/` is **gitignored** (testnet addresses can change). The app reads
the V1 file first, then the flat one, and falls back to the canonical Celo
Sepolia address in `apps/web/lib/contractAddresses.ts`; a
`NEXT_PUBLIC_*_ADDRESS` env var is only a last-resort override. Shared/final
addresses come from `@pasosdejesus/mpdj/blockchain/ecosystem-addresses`.

### Verify SIVeL3RegionalDonationV2

```sh
bin/verifyRegionalDonationV2            # network from NEXT_PUBLIC_NETWORK
bin/verifyRegionalDonationV2 celo
REGION_MAX=20 bin/verifyRegionalDonationV2 celo
```

Read-only: loads the address from the deployment file, then prints the owner,
`backendAddress`, the donation token (symbol/decimals/balance) and the name and
balance of each region, checking that the regional balances add up to the
contract's USDT. It uses `tsx` + `viem` and the compiled artifact.

### Check deployment addresses

```sh
cd ..                                       # repository root
apps/web/bin/m contract:checkdeploy      # readable report
apps/web/bin/m contract:checkdeploy --json
```

Read-only: validates every `deployments/<Contract>/V1/<network>.json` (and the
flat form) and that sources read addresses with
`@pasosdejesus/m/blockchain/deployments` instead of literals. Intentional
literals (canonical Celo Sepolia defaults, applied migrations, one-off scripts)
are declared in `contract-check.json` at the repository root.

Since `contract-test@0.2.2` the command searches upward for the project root, so
running it from `apps/web` also finds `apps/contracts`; the report header prints
the roots it used (`web`, `contratos`). The two `DEPLOYMENTS_DIR_MISSING`
findings are expected in a fresh checkout:
`deployments/PasosDeJesusCredentials/` is gitignored and only exists on machines
where the credentials contract was deployed; there the report is clean.

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

`contract:verify` builds the `solidity-standard-json-input` request from
`m-contracts.config.ts`, the artifact and the deployment file (constructor args
are passed with `--args`/`--args-file`).

## ABI Synchronization

Contract ABIs are synced to `apps/web/abis/` automatically on
`pnpm build`. To sync manually:

```sh
pnpm sync:abis
```
