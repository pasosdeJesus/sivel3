# Next.js Application Architecture - SIVeL 3

This document describes the internal technical architecture of the Next.js application located in `apps/web`. While the root `ARCHITECTURE.md` describes the global system, this one focuses on the implementation decisions of the frontend and the orchestration API.

---

## 1. Navigation and Internationalization (i18n) Structure

The application uses the Next.js **App Router** with a `[locale]` dynamic segment to handle multi-language support (Spanish and English).

*   **`[locale]` Segment:** All public routes reside under `app/[locale]/`. This allows Next.js to generate static or dynamic versions per language.
*   **Proxy (`proxy.ts`):** Detects the user's preferred language via the `accept-language` header and redirects them to the corresponding route (e.g., from `/` to `/es/`). It excludes API routes (`/api/*`) and static assets.
*   **ClientLayout:** A component that wraps pages to provide language context and state providers to the client.

---

## 2. State Management and Providers

The application uses a hierarchy of providers (`providers/AppProvider.tsx`) to manage global state:

1.  **React Query (`@tanstack/react-query`):** `QueryClientProvider` for server-state.
2.  **WalletContext (`contexts/WalletContext.tsx`):** a thin layer over the shared `@pasosdejesus/m/wallet`:
    *   **In-app wallet first:** `useInAppWallet()` (`@pasosdejesus/m/wallet/next`) when the in-app wallet is unlocked.
    *   **External wallet:** the EIP-6963 connector (`getExternalProvider` / `subscribeExternalProvider`); **no** wagmi, RainbowKit, WalletConnect or MiniPay.
    *   The **effective provider** is in-app ?? external; the address is read with `eth_accounts` and refreshed on `accountsChanged`.
    *   Exposes `{ isConnected, effectiveAddress, chainId, provider, isInApp, externalAvailable, disconnect, donate, isTransacting, isProcessing }`.
    *   `donate` orchestrates the on-chain USDT transfer and the backend notification via `lib/donate.ts`.

The in-app storage namespaces are fixed in `configureInAppWallet({ dbName, destinationsPrefix, rpName })` — changing them makes existing wallets unreadable.

---

## 3. Web3 Integration

*   **Signing:** EIP-191 (`personal_sign`) through the effective EIP-1193 provider (in-app or external). SIVeL 3 does **not** use SIWE.
*   **Sends:** `lib/donate.ts` and `lib/buyPreAlert.ts` receive the effective provider and call `provider.request({ method: 'eth_sendTransaction', params })`.
*   **UI:** `components/ConnectWalletButton.tsx` renders its own dialog with `InAppWalletSetup`/`InAppWalletUnlock` (from `@pasosdejesus/m/wallet/next`) plus an optional external-wallet path.

---
## 3b. Rewards (learn.tg)

After a successful donation, sivel.xyz mints **SLEARN** cashback for the donor
(`lib/slearn.ts`: transfers 10% of the USDT to the SLEARN contract and calls
`mintAndReserve`). The former **Learning Points** increment API on learn.tg
(nonce protocol + EIP-191 signature) was deactivated and is no longer called;
`site_nonces` remains in the schema as legacy.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `LEARNTG_ADDRESS` | Ethereum address identifying sivel.xyz to learn.tg (receives `MINTER_ROLE` to mint course SBTs) |
| `PRIVATE_KEY` | Server wallet that signs the on-chain transfer and mint |

---

## 4. Data Layer and Orchestration API

The Next.js application acts as a bridge between the PostgreSQL database and the blockchain.

*   **API Routes (`app/api/`):**
    *   `donations/assign`: Critical endpoint that verifies a USDT transaction on-chain (using `viem`) and then calls the `RegionalDonation` contract to assign the donation to a specific region from the server (using a secure private key).
    *   `cases/*`: Endpoints for querying geo-referenced socio-political violence data.
*   **Database Access:** API routes use Kysely directly via `newKyselyPostgresql()` (configured in `.config/kysely.config.ts`), which shares one process-wide `pg.Pool`. They query the same PostgreSQL database the Rails backoffice uses, but **Rails is not required at runtime** (dev and production do not run it; `sivel2/` is an optional backoffice and the owner of the Rails-side migrations). Database types in `db/db.d.ts` are auto-generated with `kysely-codegen`.

---

## 5. Components and UI

*   **Hybrid Architecture:** **Server Components** are prioritized for initial data fetching and SEO, while heavy interactivity (maps, wallet connection) is delegated to **Client Components** marked with `'use client'`.
*   **Map System (`components/mapa/`):** Uses Leaflet/React-Leaflet to visualize cases. It is designed to be responsive, with specific versions for mobile (`OSMMapMobile`) and desktop (`OSMMapDesktop`).

### 5b. Map Page Hooks (`app/[locale]/cases/osmmap/hooks/`)

These hooks are specific to the case map page and centralize its data-fetching logic:

*   **`useOSMMapData(currentLocale)`:** Loads all reference data needed by the map on mount:
    *   Fetches departments, violence categories, alleged perpetrators, and donation regions from `/api/departments`, `/api/categories`, `/api/alleged-perpetrators`, and `/api/regions` in parallel via `Promise.all`.
    *   Selects the first donation region by default.
    *   Manages filter state (`filters` object with Rails-compatible keys like `filtro[fechaini]`, `filtro[departamento_id]`, etc.) and exposes `handleFilterChange` + `applyFilters`.
    *   Receives map counts from the `MapComponent` via `handleCountsLoad` callback.
    *   Shows a toast on fetch failure.

*   **`useRegionBalance(selectedRegion)`:** Manages on-chain regional balance fetching:
    *   Calls `GET /api/regions/{id}/balance` to read the `RegionalDonation` contract balance on Celo via Viem.
    *   Implements retry logic (up to 3 retries, 2s delay) — the on-chain balance may take seconds to reflect a recent donation.
    *   Exposes `fetchBalance(regionId)` for explicit refreshes (e.g., after donation).
    *   Does **not** auto-refresh on region change to avoid duplicate fetches during transactions.

---

## 6. Security and Deployment

*   **Environment Variables:** Public variables (`NEXT_PUBLIC_`) for the frontend are distinguished from sensitive variables (such as `PRIVATE_KEY` for server-side donation signing) that are never exposed to the client.
*   **Recommended Platform:** The application is designed to be deployed on **adJ (OpenBSD)**, leveraging its security features to isolate the Node.js runtime environment.

---
> *"For the Lord loves justice"* (Psalm 37:28). This architecture seeks to serve that justice through technical transparency.
