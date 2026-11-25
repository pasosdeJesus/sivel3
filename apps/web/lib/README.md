# lib/ — Logic Modules

> *"Let the wise listen and add to their learning"* (Proverbs 1:5, CSB)

Directory of logic modules shared between components and API routes.

| File | Purpose |
|------|---------|
| `donate.ts` | Orchestrates the unified donation: builds the ERC-20 transaction, sends it through the effective EIP-1193 provider (in-app wallet or external EIP-6963), and calls the backend for assignment. See `doc/donation-flow.md`. |
| `slearn.ts` | SLEARN cashback for donors: transfers 10% of the USDT and calls `mintAndReserve` on the SLEARN contract (replaces the retired learn.tg Learning Points API). |
| `learnTgPartner.ts` | Partner channel with learn.tg (`GET /api/verify`): signs with the dedicated `LEARNTG_AUTHPARTNER_PRIVATE_KEY` (the key is chosen by `LEARNTG_ADDRESS`; fallback `PRIVATE_KEY`, then `SIVEL3_MESSAGES_PRIVATE_KEY`), caches the boolean 5 minutes and **fails closed**. Only the boolean is kept: learn.tg's `name`/`countryId` are discarded. |
| `errors.ts` | Translates wallet/blockchain errors to user-friendly messages (`parseWalletError`). |
| `logger.ts` | Unified logging system with floating debug console for embedded browsers. See `doc/mobile-debug-console.md`. |
| `debug.ts` | Debug utilities: `safeStringify` for circular objects, `debugLog`. |
| `utils.ts` | General utilities (`cn()` for Tailwind class merging). |
|| `web-analytics.ts` | Web analytics helpers: `recordEvent()` for pageviews, donations, wallet connects. |

For detailed feature and protocol documentation, see `doc/`.
