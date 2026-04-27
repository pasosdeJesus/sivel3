# lib/ — Logic Modules

> *"Let the wise listen and add to their learning"* (Proverbs 1:5, CSB)

Directory of logic modules shared between components and API routes.

| File | Purpose |
|------|---------|
| `donate.ts` | Orchestrates the unified donation: builds the ERC-20 transaction, sends it via MiniPay or MetaMask, and calls the backend for assignment. See `doc/donation-flow.md`. |
| `learningPoints.ts` | HTTP client for the learn.tg API. Implements the nonce protocol and EIP-191 signing to increment Learning Points. |
| `errors.ts` | Translates wallet/blockchain errors to user-friendly messages (`parseWalletError`). |
| `logger.ts` | Unified logging system with floating debug console for MiniPay. See `doc/mobile-debug-console.md`. |
| `debug.ts` | Debug utilities: `safeStringify` for circular objects, `debugLog`. |
| `utils.ts` | General utilities (`cn()` for Tailwind class merging). |

For detailed feature and protocol documentation, see `doc/`.
