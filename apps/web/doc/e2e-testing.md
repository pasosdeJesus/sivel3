# E2E Testing

End-to-end testing for sivel3 uses `@pasosdejesus/m`'s test runner
(`bin/m test:e2e`), the same system learn.tg uses. Tests have two layers:

- **Smoke** (`e2e/smoke/*.spec.mjs`) — plain HTTP, no browser (fast, ~2 s each).
- **Specs** (`e2e/specs/*.spec.mjs`) — real Chrome via Puppeteer (~30 s each).

`bin/m test:e2e` is only registered **when `e2e/` exists** (this is why it does
not appear in `bin/m --help` in a checkout without the directory). See
https://gitlab.com/pasosdeJesus/sivel3/-/issues/66 for the plan; **Blocks A (smoke)
and B (browser + signature specs) are implemented**.

## Quick reference

| Command | What | Needs Chrome? | Target |
|---|---|:---:|---|
| `make test-smoke` | All HTTP smoke specs | ❌ | `https://sivel.xyz:9001` |
| `make test-e2e` | All browser specs | ✅ | `https://sivel.xyz:9001` |
| `make test-e2e-spec SPEC=<name>` | One spec by filename pattern | ✅ | `https://sivel.xyz:9001` |
| `make test-smoke-prod` | Read-only smokes (`PROD_READONLY_SMOKES`) | ❌ | `https://sivel.xyz` |
| `make warmup` | Compiles the routes of `e2e/warmup-paths.json` | ❌ | `https://sivel.xyz:9001` |
| `make warmup-local` | Same, sequential | ❌ | `http://localhost:4000` |
| `make wait-site` | Waits until `--path` answers (`test:e2e:wait`) | ❌ | `https://sivel.xyz:9001` |
| `make wait-deploy` | Same, plus `EXPECT_CHANGE=1` (a new build is visible) | ❌ | `https://sivel.xyz:9001` |
| `bin/m test:e2e --smoke` | Smoke only | ❌ | ⚠️ falls back to `learn.tg:443` |
| `bin/m test:e2e <pattern>` | Browser specs matching `<name>` | ✅ | ⚠️ `learn.tg:443` |

### ⚠️ Run through the Makefile targets, not a bare `bin/m test:e2e`

The `make` targets export `IPDES=sivel.xyz PUERTOPRU=9001 CHAIN_ID=11142220`.
A bare `bin/m test:e2e` uses the runner defaults (host `learn.tg`, port `443`,
chain `42220` — **production**). Always use the targets, or export the three
variables yourself.

Override the target: `SITE_URL=https://sivel.xyz:9001 bin/m test:e2e`.

## Smoke specs (`e2e/smoke/`)

| Spec | What it checks |
|---|---|
| `public-site.spec.mjs` | `/en`, `/es`, and both OSM map routes return 200 without error markers. |
| `public-api.spec.mjs` | Public reference endpoints (counts, categories, departments, regions, alleged perpetrators, OSM data) return their expected JSON shape. |
| `no-rails.spec.mjs` | The public data routes are served by Kysely (R-#65) and the HTML does not reference the Rails host. |
| `credentials.spec.mjs` | Credential health (200 or 503), breakdown, and leaderboard answer. |
| `credential-metadata.spec.mjs` | ERC-1155 metadata for the deployment's own chain (`celo` / `celoSepolia`), the composed badge PNG of every token in the breakdown, a wallet profile, and a regional on-chain balance. |
| `api-validation.spec.mjs` | Malformed requests get the documented 4xx codes (donations, pre-alerts buy/convert/queue/sync, verify, geocode, case detail, credential); pagination is clamped; a real case id returns its payload. |
| `pages-and-i18n.spec.mjs` | Stats, dashboard, documenter, and wallet pages return 200 in EN/ES; unprefixed paths redirect through the locale proxy; unknown pages stay 404. |
| `pool-lifecycle.spec.mjs` | The analytics summary does not end the shared pg pool: after it runs, pre-alerts, counts, credentials, and regions still return 200 (regression for "Cannot use a pool after calling end on the pool"). |

## Browser and signature specs (`e2e/specs/`)

| Spec | Needs | What it checks |
|---|---|---|
| `connect-wallet.spec.mjs` | Chrome + server | The **external EIP-6963** wallet (shared mock, real signer) is discovered and shown connected, with the injected address. |
| `in-app-wallet.spec.mjs` | Chrome + server | Creates the **in-app wallet** through `WalletDialog` (`setupInAppWallet`: password, phrase and 3-word quiz), ends on the new address; reloads (locks it) and unlocks (`unlockInAppWallet`). |
| `in-app-wallet-import.spec.mjs` | Chrome + server + `PRIVATE_KEY` | Imports the **known test wallet** (no new keys) and unlocks it after a reload; safe to run against production because it creates nothing and the SBT mint is skipped when the wallet already holds it. |
| `public-pages.spec.mjs` | Chrome + server | Client pages hydrate against the live APIs: the OSM map renders its Leaflet container, EN/ES stats render, and the wallet profile leaves the loading state. |
| `signatures.spec.mjs` | server (+ `PREALERT_ID`, `DOCUMENTER_WALLETS` for the positive path) | `/api/pre-alerts/[id]/score` accepts a valid **EIP-191** signature (fails later on the score range, 400) and rejects a tampered one (401); the positive path records a score 0 (**rejected**). |
| `prealert-buy.spec.mjs` | server (+ `PENDING_PREALERT_ID` for the positive path) | `/api/pre-alerts/[id]/buy` rejects a missing `buyer_wallet` (400) and an unknown pre-alert (404); the positive path **reserves** a pending one. |
| `prealert-lifecycle.spec.mjs` | server (+ `DOCUMENTER_WALLETS`; `PENDING_PREALERT_ID` optional) | The **DB-only** lifecycle `pending → reserved → converted → rejected` over the API: reserves (buy without `tx_hash`), converts, and scores 0. It picks a pending pre-alert itself. |
| `prealert-purchase.spec.mjs` | server + **on-chain** (USDT + gas in the wallet) | Buys a pending pre-alert with a real USDT transfer to the PreAlertMarket (1 USDT + `preAlertId` appended, like `lib/buyPreAlert.ts`); the backend verifies it (`tx_hash`) and it converts it. `PREALERT_PAY=1` also scores 2 → payout (needs the region funded + the escrow's `BACKEND_ROLE`). |

The wallet specs run on `/en`: the connect button lives in the shared Header, which
is the same on every route. The OSM map route (`/en/cases/osmmap`,
`/es/cases/osmmap`) is covered by the HTTP smoke layer (`public-site.spec.mjs`); the
map page itself now renders in the browser too (the counts widget no longer
white-screens when `/api/cases/counts` fails).

The in-app form is driven by `@pasosdejesus/m/e2e`'s `setupInAppWallet`/
`unlockInAppWallet` (testids of `WalletDialog`). Since `m@0.41.0` (REQ/75 of `m`)
sivel3 has no wallet dialog of its own: `ConnectWalletButton` only injects the
connection state and the language into the engine's `WalletConnect`, so
`helpers/wallet-ui.mjs` just opens the wallet (`connect-wallet` or `connected-wallet`)
and picks the in-app path; the dialog testids (`wallet-*`) are driven by the shared
driver. `wallet-styling.spec.mjs` asserts the dialog is `position: fixed`, centered,
themed with the site's primary and that Tailwind scanned the package.
Optional positive paths are gated by env (below) and otherwise print `[SKIP]`.

## Running against a local server

```sh
cd apps/web
make dev                                   # http://localhost:4000
SITE_URL=http://localhost:4000 make test-smoke
SITE_URL=http://localhost:4000 make test-e2e
```

`SITE_URL` is honoured by `@pasosdejesus/m`'s `initTestEnv` (P2, `m@0.23.0`), so
the specs navigate to the HTTP local server — no per-spec patching.

### Warmup (cold compile)

`next dev` compiles each route on demand, so the first request can outlast the
smoke timeout (measured 2026-11-21: `public-site` failed `GET /en` with
`The operation was aborted due to timeout` and passed on the immediate retry).
`bin/m test:e2e:warmup` reads the route list from `e2e/warmup-paths.json` (the
pages and the GET endpoints the specs touch). `make warmup` targets the dev site
and `make warmup-local` runs it sequentially against `localhost:4000`, because
this 1-CPU VM cannot compile routes in parallel. A production build needs no
warmup. The bare `warmup` command was renamed in `@pasosdejesus/m` 0.40.0 (no
alias): the target name stays `make warmup`, the binary call changes.

### Waiting for a deploy

`make wait-site` runs `bin/m test:e2e:wait` against the dev site: it polls
`/en` until it answers 200. `make wait-deploy` adds `--expect-build-change`, so
it only returns once a new build is visible; a deploy that only adds files under
`public/` does not move the build marker, and that case is checked with an
asset:

```sh
EXPECT_ASSET=/img/credential/1.png make wait-deploy
SITE_URL=https://sivel.xyz:9001 WAIT_PATH=/es make wait-site
```

`--insecure` is passed by the target only when the URL ends in `:9001` (the dev
site's self-signed certificate); production keeps TLS verification.

### Production: read-only smokes

`make test-smoke-prod` runs an **explicit list** (`PROD_READONLY_SMOKES` in the
Makefile) of smokes that only read: public GETs, no session, no wallet, no funds,
no malformed requests. It defaults to `https://sivel.xyz` (`SITE_URL` overrides).
The list is explicit on purpose: a smoke that starts writing must not leak into a
production run by joining `--smoke`.

### Failure diagnostics

`e2e/helpers/diag.mjs` (`captureDiagnostics`) records `pageerror` and console
errors and, on a thrown failure, prints the visible `data-testid`s and the tail
of the page text. The two in-app wallet specs use it: the usual failure is a
timeout, and by then the wallet has already painted the reason.

## Fixtures (positive paths)

The optional positive paths **consume** a row (`pending → reserved`, `converted →
rejected`). Against a **local** DB you can (re)create the two fixtures with a stable
id:

```sh
cd apps/web && node scripts/e2e/seed-pre-alerts.mjs
# → PENDING_PREALERT_ID=<id>  PREALERT_ID=<id>
```

It upserts two `pre_alert` rows (keyed by a fixed `event_hash`) and resets
status/buyer/scores, so a run is repeatable. It writes to `PGDATABASE` from
`apps/.env`: **never** run it against production. On a remote site the rows must
already exist there (the agent's pre-alerts); `prealert-lifecycle` picks a pending
one by itself, and `signatures`/`prealert-buy` take the id via env.

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `SITE_URL` | (unset) | explicit base (http or https); wins over IPDES/PUERTOPRU |
| `IPDES` | `learn.tg` | deployment host |
| `PUERTOPRU` | `443` | port |
| `CHAIN_ID` | `42220` | Celo chain (`11142220` = celoSepolia) |
| `CHROME_PATH` | auto-detect | Chrome/Chromium binary |
| `WALLET_INDEX` | `0` | wallet rotation across specs |
| `PREALERT_ID` | (unset) | a **converted** pre-alert → runs `signatures`' positive path |
| `PENDING_PREALERT_ID` | (unset) | a **pending** pre-alert → runs `prealert-buy`' positive path (and pins `prealert-lifecycle`) |
| `DOCUMENTER_WALLETS` | (server) | must list the test wallet for the `signatures`/`prealert-lifecycle` score step |
| `E2E_RPC_URL` | `NEXT_PUBLIC_RPC_URL` | RPC for the client-side on-chain steps (`prealert-purchase`); set it when the app's RPC is IP-whitelisted (e.g. `https://forno.celo-sepolia.celo-testnet.org`) |
| `E2E_MARKET_ADDRESS` / `E2E_USDT_ADDRESS` | app env | override the PreAlertMarket / USDT address used by `prealert-purchase` (the runner reloads `apps/.env`, so a plain command-line var is not enough for a different site) |
| `PREALERT_PAY` | (unset) | `1` → `prealert-purchase` also runs the payout (score 2) |

The remote dev site has its own environment, so its contracts may not match this
checkout's `apps/.env`. If `prealert-purchase` reports `On-chain verification
failed`, send the USDT to the address the **server** expects with
`E2E_MARKET_ADDRESS` (measured 2026-10-18: the site verified against the
`celoSepolia` default `0x9024…`, while `apps/.env` pointed at `0x8923…`).

## OpenBSD / adJ notes

- Chrome is searched in `CHROME_PATH`, `/usr/local/bin/chrome`,
  `/usr/local/bin/chromium`, `/usr/local/bin/chromium-browser`.
- Launch headless (legacy mode); after several launches clean `/tmp/puppeteer*`.
- A spec counts as green **only by exit code**: end each spec with
  `const failures = summary(t0); process.exit(failures > 0 ? 1 : 0)`.

## References

- `@pasosdejesus/m`: `doc/e2e.md`, `packages/m/src/e2e/README.md`,
  `packages/m/src/tasks/e2e.ts`.
- sivel3 https://gitlab.com/pasosdeJesus/sivel3/-/issues/66 (this suite),
  https://gitlab.com/pasosdeJesus/sivel3/-/issues/65 (no-Rails guard),
  https://gitlab.com/pasosdeJesus/sivel3/-/issues/67 (wallet rework — Block B
  tests against in-app + EIP-6963, not RainbowKit).
- sivel3 [environments.md](../../../doc/environments.md): environments, chains, wallets, and
  the deploy constraint (a fix in the tree is not visible on `:9001` until the
  operator deploys).
- learn.tg `doc/e2e-testing.md` (the reference implementation).
