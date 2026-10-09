# E2E Testing

End-to-end testing for sivel3 uses `@pasosdejesus/m`'s test runner
(`bin/m test:e2e`), the same system learn.tg uses. Tests have two layers:

- **Smoke** (`e2e/smoke/*.spec.mjs`) — plain HTTP, no browser (fast, ~2 s each).
- **Specs** (`e2e/specs/*.spec.mjs`) — real Chrome via Puppeteer (~30 s each).

`bin/m test:e2e` is only registered **when `e2e/` exists** (this is why it does
not appear in `bin/m --help` in a checkout without the directory). See
`REQ/66` for the plan (Block A = smoke, doable now; Block B = browser + signature
specs).

## Quick reference

| Command | What | Needs Chrome? | Target |
|---|---|:---:|---|
| `make test-smoke` | All HTTP smoke specs | ❌ | `https://sivel.xyz:9001` |
| `make test-e2e` | All browser specs | ✅ | `https://sivel.xyz:9001` |
| `make test-e2e-spec SPEC=<name>` | One spec by filename pattern | ✅ | `https://sivel.xyz:9001` |
| `bin/m test:e2e --smoke` | Smoke only | ❌ | ⚠️ falls back to `learn.tg:443` |
| `bin/m test:e2e <pattern>` | Browser specs matching `<name>` | ✅ | ⚠️ `learn.tg:443` |

### ⚠️ Run through the Makefile targets, not a bare `bin/m test:e2e`

The `make` targets export `IPDES=sivel.xyz PUERTOPRU=9001 CHAIN_ID=11142220`.
A bare `bin/m test:e2e` uses the runner defaults (host `learn.tg`, port `443`,
chain `42220` — **production**). Always use the targets, or export the three
variables yourself.

Override the target: `SITE_URL=https://sivel.xyz:9001 bin/m test:e2e`.

## Running against a local server

```sh
cd apps/nextjs
make dev                                   # http://localhost:4000
SITE_URL=http://localhost:4000 make test-smoke
```

`SITE_URL` is honoured by `@pasosdejesus/m`'s `initTestEnv` (P2, `m@0.23.0`), so
the specs navigate to the HTTP local server — no per-spec patching.

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `SITE_URL` | (unset) | explicit base (http or https); wins over IPDES/PUERTOPRU |
| `IPDES` | `learn.tg` | deployment host |
| `PUERTOPRU` | `443` | port |
| `CHAIN_ID` | `42220` | Celo chain (`11142220` = celoSepolia) |
| `CHROME_PATH` | auto-detect | Chrome/Chromium binary |
| `E2E_SPEC_DELAY_MS` | `1500` | pause between specs (rate-limit relief) |
| `WALLET_INDEX` | `0` | wallet rotation across specs |

## OpenBSD / adJ notes

- Chrome is searched in `CHROME_PATH`, `/usr/local/bin/chrome`,
  `/usr/local/bin/chromium`, `/usr/local/bin/chromium-browser`.
- Launch headless (legacy mode); after several launches clean `/tmp/puppeteer*`.
- A spec counts as green **only by exit code**: end each spec with
  `const failures = summary(t0); process.exit(failures > 0 ? 1 : 0)`.

## References

- `@pasosdejesus/m`: `doc/e2e.md`, `packages/m/src/e2e/README.md`,
  `packages/m/src/tasks/e2e.ts`.
- sivel3 `REQ/66` (this suite), `REQ/65` (no-Rails guard), `REQ/67` (wallet
  rework — Block B tests against in-app + EIP-6963, not RainbowKit).
- learn.tg `doc/e2e-testing.md` (the reference implementation).
