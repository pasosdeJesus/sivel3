# Environments and Wallets

> "Whatever you do, work at it with all your heart, as working for the Lord,
> not for human masters." (Colossians 3:23)

Operational map of the sivel.xyz environments, chains, wallets, local run
modes, and deployment constraints. Read this before editing `apps/.env`,
running E2E, or assuming that a code change is visible on the dev site.

> **Rails is not needed at runtime.** The public site and its APIs are Next.js
> plus PostgreSQL (Kysely). `sivel2/` is an optional backoffice and owns the
> Rails-side migrations, but neither the dev site nor the tests run it.

## 1. Environments

|              | Production           | Development                    | Local sandbox                          |
| ------------ | -------------------- | ------------------------------ | -------------------------------------- |
| URL          | `https://sivel.xyz`  | `https://sivel.xyz:9001`       | `http://localhost:4000`                |
| Celo network | `celo` (chain 42220) | `celoSepolia` (chain 11142220) | `celoSepolia`                          |
| Next.js API  | same host            | same host (`:9001`)            | same host (`:4000`)                    |
| Data         | real cases           | development data               | the shared PostgreSQL from `apps/.env` |
| Runs on      | operator's machine   | operator's machine             | this VM                                |
| Purpose      | live platform        | E2E and manual checks          | unit checks and local debugging        |

The official environments run on **other machines**. This VM cannot deploy to
`sivel.xyz` or `sivel.xyz:9001` (there is no shell there). A change reaches the
dev site **only when the operator deploys the branch**; until then the dev site
keeps serving the previous build. A fix can be in the tree and still not be
visible in a manual test against `:9001`.

`localhost:4000` is the agent's sandbox for checking code. It is **not** the
official development site and is not a substitute for E2E against `:9001`.

## 2. Chains and contracts

The network is fixed by `NEXT_PUBLIC_NETWORK` (`celo` or `celoSepolia`). Both
the app and the contracts resolve addresses per network.

| Contract                   | Celo mainnet                                 | Celo Sepolia (canonical dev default)         |
| -------------------------- | -------------------------------------------- | -------------------------------------------- |
| `SIVeL3RegionalDonationV2` | `0x563AbB7492bb496B9DD74d54D6daDd41374924E5` | `0xc50123fb87e4167fe9275cab90ae35551fe1248e` |
| `SIVeL3PreAlertMarket`     | `0x9aefBD59455efE0F7732638eF791f35F110ddB0c` | `0x902413432aD345bab37093404849C09193AB9A23` |
| `SIVeL3RewardEscrow`       | `0xBFD94B391882612425455305dc0c9b1eC41E155A` | `0x53aD49cBF4001aD0c8fe588dA330ED277bBD45f9` |
| `USDT` / `SLEARN`          | app env / `@pasosdejesus/mpdj`               | `@pasosdejesus/mpdj` ecosystem defaults      |
| `PasosDeJesusCredentials`  | from Hardhat deployments                     | from Hardhat deployments                     |

Resolution order for the sivel3-specific contracts (`lib/contractAddresses.ts`):

1. `NEXT_PUBLIC_<CONTRACT>_ADDRESS` from `apps/.env`.
2. The canonical Celo Sepolia default above.

This checkout's `apps/.env` overrides several Sepolia addresses (for example
`NEXT_PUBLIC_PREALERT_MARKET_ADDRESS=0x8923…`). The **remote dev server has its
own environment** and may use another set. Do not assume the deployed server
shares this checkout's contracts.

`credential_metadata.chain_id` is stored as `celo` or `celoSepolia`, never as
the numeric chain id. Routes that read credentials must resolve it with
`getChainId()` (`lib/credentials.ts`), not hardcode `'celo'`; the latter breaks
ERC-1155 metadata on the dev site (fixed 2026-10-18).

## 3. Wallets

### The test wallet (this checkout)

`apps/.env` defines the wallet used by the E2E suite and by backend signing:

| Variable              | Value in this checkout                       |
| --------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_ADDRESS` | `0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C` |
| `PRIVATE_KEY`         | the shared Hardhat test key (E2E signer)     |
| `LEARNTG_ADDRESS`     | same address                                 |

It is registered on both development and production. On the dev site it has
activity (SBTs, donations, wallet profile) and is used for on-chain specs. Treat
it as a **test** key: it only holds testnet funds.

### Wallet conventions

- **Addresses are lowercase at the API boundary.** Never store or compare
  EIP-55 mixed-case addresses.
- **TokenIds are resolved from `credential_metadata`** by `(name, chainId)`,
  never hardcoded.
- **Minting** goes through `mintSBT()` in `lib/credentials.ts` so the off-chain
  cache, the on-chain check, and the Celo L2 retry stay in sync.
- **RPC**: pass `NEXT_PUBLIC_RPC_URL` explicitly to `http()`. The default Forno
  endpoint rejects writes, and the Alchemy endpoint used in `apps/.env` is
  IP-whitelisted.

## 4. Local run modes

| Mode                    | Command                            | Needs                          | Use it for                        |
| ----------------------- | ---------------------------------- | ------------------------------ | --------------------------------- |
| Full Next.js (no Rails) | `make dev` / `bin/dev`             | Node, PostgreSQL, `apps/.env`  | API routes, DB queries, wallet UI |
| Production build        | `make prod`                        | Node, PostgreSQL               | Reproducing a build-only failure  |
| E2E only                | `make test-smoke`, `make test-e2e` | Node, Chrome for browser specs | Checking the deployed dev site    |

`bin/dev` removes `.next`, installs dependencies, builds the vendored engines
(`make eng-build`), and starts `next dev` on `PORT` (4000 in `apps/.env`). It
aborts if the engines fail, because a stale `dist/` would serve old engine code
with the new app. Do not start a local server to test the official dev site;
the E2E targets talk to `:9001` directly.

When the vendored engines change (`packages/generated/*`), regenerate them with
`make eng-sync M_FROM=/path/to/m` and rebuild with `make eng-build`. They are
derived copies, like `node_modules`: never edit them by hand.

## 5. E2E targets

Use the Makefile targets. A bare `bin/m test:e2e` falls back to the runner
defaults (`learn.tg:443`, chain `42220`, production).

| Command                          | Target                   | Chrome |
| -------------------------------- | ------------------------ | ------ |
| `make test-smoke`                | `https://sivel.xyz:9001` | no     |
| `make test-e2e`                  | `https://sivel.xyz:9001` | yes    |
| `make test-e2e-spec SPEC=<name>` | `https://sivel.xyz:9001` | yes    |
| `make test-e2e-retry`            | `https://sivel.xyz:9001` | yes    |

The targets export `IPDES=sivel.xyz PUERTOPRU=9001 CHAIN_ID=11142220`. Override
the site with `SITE_URL`. For client-side on-chain steps whose RPC is
IP-whitelisted, pass `E2E_RPC_URL=https://forno.celo-sepolia.celo-testnet.org`.
For contract addresses that differ from this checkout's `apps/.env`, pass
`E2E_MARKET_ADDRESS` / `E2E_USDT_ADDRESS`.

See [apps/nextjs/doc/e2e-testing.md](../apps/nextjs/doc/e2e-testing.md) for the spec catalog, fixtures, and the
positive-path environment variables.

## 6. Health checks and troubleshooting

| Symptom                                                 | Likely cause                                                                            | What to check                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pages return 200 but every DB-backed API returns 500    | The dev server's PostgreSQL is down or restarting                                       | `GET /api/cases/counts`; if it is 500, the specs cannot be trusted until the site recovers                                         |
| `GET /api/health/credentials` returns 503               | The endpoint is reachable but one or both chains are not configured or unreachable      | Expected on a dev deployment without credentials addresses                                                                         |
| `prealert-purchase` says "On-chain verification failed" | The server verifies a different `PreAlertMarket` than the one `apps/.env` sent funds to | Set `E2E_MARKET_ADDRESS` to the server's market (measured 2026-10-18: site used the `0x9024…` default, `apps/.env` used `0x8923…`) |
| `GET /api/credential/<id>` returns 404                  | The metadata route filtered `chain_id = 'celo'` on a `celoSepolia` deployment           | Use `getChainId()`; redeploy the fix                                                                                               |
| Every DB API returns 500 after the stats page loads     | A route called `db.destroy()` on the shared Kysely pool                                 | Never destroy clients from `newKyselyPostgresql()`; restart the server after removing the call                                     |
| A spec fails on a slow remote site                      | Timing, RPC latency, on-demand compilation                                              | Rerun the spec alone; use `make test-e2e-retry` for the full suite                                                                 |

The transfer in `prealert-purchase` is a real on-chain transaction and cannot
be undone. Run it only against testnet with test funds.

## 7. Deployment checklist

The deploy must rebuild the engines and the app. `make all` runs the three
steps below; `make prod` builds and starts the production server.

```sh
cd apps/nextjs
pnpm install
make eng-build
pnpm build
```

After the operator deploys:

```sh
cd apps/nextjs
make test-smoke
make test-e2e
```

A change is not "on the dev site" until those commands can see it. If a new
spec asserts behavior introduced by an undeployed fix, the spec stays red on
`:9001` until the deploy lands. That is the expected workflow, not a spec bug.

## 8. References

- [apps/nextjs/doc/e2e-testing.md](../apps/nextjs/doc/e2e-testing.md) - spec catalog, fixtures, test environment.
- [apps/nextjs/doc/deployment-credentials.md](../apps/nextjs/doc/deployment-credentials.md) - credentials contract.
- [apps/nextjs/doc/donation-flow.md](../apps/nextjs/doc/donation-flow.md) - donation and SLEARN flow.
- [ARCHITECTURE.md](../ARCHITECTURE.md) - system architecture and contract overview.
- [apps/nextjs/ARCHITECTURE.md](../apps/nextjs/ARCHITECTURE.md) - Next.js data flow.
- learn.tg `doc/environments.md` - the reference implementation of this guide.
