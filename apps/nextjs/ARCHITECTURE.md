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
    *   Manages unified wallet connection.
    *   Implements specific logic for **MiniPay** (detection, auto-connection, and legacy transaction handling).
    *   Provides the `donate` function that orchestrates the on-chain transaction and subsequent backend notification.

---

## 3. Web3 Integration and MiniPay Strategy

SIVeL 3 is optimized for mobile use via **MiniPay** (Opera Mini), which requires special considerations:

*   **Legacy Transactions:** MiniPay does not support EIP-1559. The `AppProvider` intercepts `eth_sendTransaction` to remove fields like `maxFeePerGas`.
*   **Wallet Detection:** The `useMiniPay` hook is used to identify if the application is running inside MiniPay and adjust UI behavior and transaction submission methods (`eth_sendTransaction` via `ethereum.send`).
*   **Unified Donations (`lib/donate.ts`):** A centralized library that handles the differences between `ethereum.request` (MetaMask) and `ethereum.send` (MiniPay), ensuring a consistent experience.

---

## 4. Data Layer and Orchestration API

The Next.js application acts as a bridge between the PostgreSQL database and the blockchain.

*   **API Routes (`app/api/`):**
    *   `donations/assign`: Critical endpoint that verifies a USDT transaction on-chain (using `viem`) and then calls the `RegionalDonation` contract to assign the donation to a specific region from the server (using a secure private key).
    *   `cases/*`: Endpoints for querying geo-referenced socio-political violence data.
*   **Database Access:** The `@pasosdejesus/m` library is used to interact with the SIVeL database schema, maintaining compatibility with the Rails backend (`sivel2`).

---

## 5. Components and UI

*   **Hybrid Architecture:** **Server Components** are prioritized for initial data fetching and SEO, while heavy interactivity (maps, wallet connection) is delegated to **Client Components** marked with `'use client'`.
*   **Map System (`components/mapa/`):** Uses Leaflet/React-Leaflet to visualize cases. It is designed to be responsive, with specific versions for mobile and desktop.

---

## 6. Security and Deployment

*   **Environment Variables:** Public variables (`NEXT_PUBLIC_`) for the frontend are distinguished from sensitive variables (such as `PRIVATE_KEY` for server-side donation signing) that are never exposed to the client.
*   **Recommended Platform:** The application is designed to be deployed on **adJ (OpenBSD)**, leveraging its security features to isolate the Node.js runtime environment.

---
> *"For the Lord loves justice"* (Psalm 37:28). This architecture seeks to serve that justice through technical transparency.
