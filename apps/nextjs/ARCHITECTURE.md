# Next.js Application Architecture - SIVeL 3

This document describes the internal technical architecture of the Next.js application located in `apps/nextjs`. While the root `ARCHITECTURE.md` describes the global system, this one focuses on the implementation decisions of the frontend and the orchestration API.

---

## 1. Navigation and Internationalization (i18n) Structure

The application uses the Next.js **App Router** with a `[locale]` dynamic segment to handle multi-language support (Spanish and English).

*   **`[locale]` Segment:** All public routes reside under `app/[locale]/`. This allows Next.js to generate static or dynamic versions per language.
*   **Middleware (`middleware.ts`):** Detects the user's preferred language via the `accept-language` header and redirects them to the corresponding route (e.g., from `/` to `/es/`). It excludes API routes (`/api/*`) and static assets.
*   **ClientLayout:** A component that wraps pages to provide language context and state providers to the client.

---

## 2. State Management and Providers

The application uses a hierarchy of providers (`AppProvider.tsx`) to manage global state:

1.  **Wagmi & RainbowKit:** Configure the connection to the Celo blockchain (Mainnet or Sepolia).
2.  **WalletContext (`contexts/WalletContext.tsx`):** A custom abstraction layer over Wagmi that:
    *   Manages unified wallet connection — merges Wagmi's `useAccount` with MiniPay's native detection via `useMiniPay`.
    *   Implements specific logic for **MiniPay** (auto-connection on detection, legacy transaction handling).
    *   Provides the `donate` function that orchestrates the on-chain USDT transfer and subsequent backend notification via `lib/donate.ts`.
    *   Exposes wallet state to the entire app: `isConnected`, `effectiveAddress`, `isTransacting`, `isProcessing`, `isMiniPay`, `phoneNumber`, and `connectMiniPay`.

---

## 3. Web3 Integration and MiniPay Strategy

SIVeL 3 is optimized for mobile use via **MiniPay** (Opera Mini), which requires special considerations:

*   **Legacy Transactions:** MiniPay does not support EIP-1559. The `AppProvider` intercepts `eth_sendTransaction` to remove fields like `maxFeePerGas`.
*   **Wallet Detection:** The `useMiniPay` hook is used to identify if the application is running inside MiniPay and adjust UI behavior and transaction submission methods (`eth_sendTransaction` via `ethereum.send`).
*   **Unified Donations (`lib/donate.ts`):** A centralized library that handles the differences between `ethereum.request` (MetaMask) and `ethereum.send` (MiniPay), ensuring a consistent experience.

---
## 3b. Learning Points Integration (learn.tg)

After a successful donation, sivel.xyz awards the donor **Learning Points** on learn.tg — an educational platform in the Pasos de Jesús ecosystem.

### Flow

1. **Donation:** User donates USDT via `lib/donate.ts`. The on-chain transaction hash (`txHash`) is captured.
2. **Backend Assignment:** `POST /api/donations/assign` verifies the transaction on-chain and calls the `RegionalDonation` contract to assign the donation to a region.
3. **LP Increment:** The same backend route then calls `incrementLearningPoints()` from `lib/learningPoints.ts`, which:
   - Reads the current nonce from `site_nonces` table (for sivel.xyz)
   - Builds a signed message: `sivel.xyz:increment:{wallet}:{amount}:{nonce}:{timestamp}:{txHash}`
   - Signs it with sivel.xyz's `PRIVATE_KEY`
   - Sends `POST /api/learning-points/increment` to learn.tg
4. **Response:** If successful, learn.tg returns the new learning score and a response signature. sivel.xyz updates its own `last_nonce` in `site_nonces`.
5. **Toast:** The frontend shows a "🎓 Learning Points" toast with the new score if the increment succeeded.

### Nonce Protocol

The `site_nonces` table in sivel.xyz's database tracks `last_nonce` for sivel.xyz. Each request to learn.tg must use a strictly incrementing nonce to prevent replay attacks.

- sivel.xyz reads `last_nonce`, sends `nonce = last_nonce + 1`
- If learn.tg responds with "Nonce out of order" + `expectedNonce`, sivel.xyz corrects its counter and retries
- After success, sivel.xyz saves the sent nonce as the new `last_nonce`

The response from learn.tg also includes a `new_nonce` which is learn.tg's **own independent counter** — sivel.xyz does NOT use it to update its own nonce.

For the detailed API specification (message format, signature verification, error codes), see learn.tg's API documentation (private).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `LEARNTG_INCREMENT_API_URL` | URL of learn.tg's increment endpoint |
| `LEARNTG_ADDRESS` | Ethereum address identifying sivel.xyz to learn.tg |
| `PRIVATE_KEY` | Private key of the above address (used to sign requests) |

---

## 4. Data Layer and Orchestration API

The Next.js application acts as a bridge between the PostgreSQL database and the blockchain.

*   **API Routes (`app/api/`):**
    *   `donations/assign`: Critical endpoint that verifies a USDT transaction on-chain (using `viem`) and then calls the `RegionalDonation` contract to assign the donation to a specific region from the server (using a secure private key).
    *   `cases/*`: Endpoints for querying geo-referenced socio-political violence data.
*   **Database Access:** API routes use Kysely directly via `newKyselyPostgresql()` (configured in `.config/kysely.config.ts`) to query PostgreSQL tables shared with the Rails backend (`sivel2`). Database types in `db/db.d.ts` are auto-generated with `kysely-codegen`.

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
