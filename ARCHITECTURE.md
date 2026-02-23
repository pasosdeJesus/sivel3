# SIVeL 3 - Project Architecture

## Overview

SIVeL 3 is a Web3 protocol for the ethical and sustainable documentation of socio-political violence, operating live at **https://sivel.xyz**. The platform integrates an existing information system (`sivel2`) with new blockchain technologies to create an immutable and transparent record of cases, funded through a donation-based model.

---

## System Architecture Diagram

This diagram illustrates the flow of information between the user, the application components, and the Celo blockchain.

```mermaid
graph TD
    subgraph User
        B[Browser]
    end

    subgraph Platform
        C[Frontend - Next.js/React]
        D[Main Backend - Sivel 2 (Rails)]
        E[Smart Contracts - Solidity/Celo]
        F[Backend API - Next.js]
    end

    subgraph Blockchain
        G[Celo Network]
    end

    B -- 1. Views map and cases --> C
    C -- 2. Requests case/map data --> D
    D -- 3. Returns geo-referenced data --> C
    B -- 4. Submits a citizen alert --> F
    F -- 5. Processes alert and stores it --> D
    B -- 6. Documenter/Validator reviews cases --> C
    C -- 7. Submits final approval --> F
    F -- 8. Certifies case hash in the contract --> E
    E -- 9. Executes transaction --> G
    G -- 10. Records the immutable case hash --> E

    style E fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#9f9,stroke:#333,stroke-width:2px
    style F fill:#f9f,stroke:#333,stroke-width:2px
```

## Architecture Stack

### 1. **Main Backend: Sivel 2**
- **Framework:** Ruby on Rails
- **Database:** PostgreSQL
- **Purpose:** Acts as the central data management system. It persists information on socio-political violence cases, regions, and other fundamental data. It is a legacy but robust system.
- **Based on:** MSIP and cor1440_gen frameworks.
- **Authentication:** There is no token-based authentication flow between the frontend and this backend. Public data access is performed without authentication.

### 2. **Frontend and Interaction API: Next.js (apps/nextjs/)**
- **Framework:** Next.js with React + TypeScript.
- **Purpose:** Provides the main user interface, including the interactive map for visualization and alert submission. Its internal API manages user interactions that require business logic or communication with the blockchain.
- **Authentication:** A user-facing authentication system like SIWE or JWT tokens is not currently implemented. Future features, such as alert submissions, will require a form of wallet verification to prevent spam.
- **Note:** For a detailed technical breakdown, refer to the `README.md` file within the `apps/nextjs` directory.

### 3. **Smart Contracts: Hardhat (apps/hardhat/)**
- **Language:** Solidity
- **Network:** Celo
- **Contracts:**
    - `SBTs.sol` (planned): For issuing Soul-Bound Tokens that define roles (Administrator, Documenter, Validator).
    - `CaseCertification.sol` (planned): Immutably records the hash of cases that have passed the 3-filter validation process.
    - `RegionalDonation.sol` (planned): Will manage the reception and distribution of donations by region.

---

## Data Flow and Core Logic

The system operates with a clear data flow designed to ensure information integrity.

1.  **Visualization:** The Next.js frontend queries the `sivel2` (Rails) backend to get published case data and displays it on an interactive map.
2.  **Alert Submission:** A citizen submits an alert via a form on the frontend. The Next.js API receives this alert and registers it in the PostgreSQL database, associating it with a specific region.
3.  **Verification Process (3 Filters):**
    *   **Filter 1:** A **Documenter** assigned to the region reviews the initial alert and converts it into a structured case.
    *   **Filter 2:** The case is submitted for peer review by another **Documenter**.
    *   **Filter 3:** A **Publishing Validator** performs the final audit. This is the ultimate editorial authority.
4.  **Blockchain Certification:** After the Publishing Validator's approval, the Next.js API calculates a hash of the case content and calls a function on the `CaseCertification.sol` contract. The contract records this hash on the Celo blockchain, creating an immutable and tamper-proof timestamp.

---

## Database

The PostgreSQL database is the single source of truth for case data.

-   **Schema Owner:** The Rails backend (`sivel2`) is the main owner of the database schema and manages it through its migrations (ActiveRecord).
-   **Access:**
    -   The Rails application reads from and writes directly to the database.
    -   The Next.js API has read and write access to the same database to register alerts and update case statuses during the verification flow.

---

## Key Technologies

| Component | Technology | Purpose |
|---|---|---|
| Main Backend | Rails + PostgreSQL | Centralized case data management. |
| Smart Contracts | Solidity + Hardhat | Governance (SBTs), data certification. |
| Frontend & API | Next.js + React | UI, map, alert submission, blockchain orchestration. |
| Blockchain | Celo | Immutable record layer. |
| Map | Mapbox / Leaflet | Geo-referenced data visualization. |

## Architectural Evolution and Security Strategy

SIVeL 3's architecture is designed for a phased evolution. It strategically leverages a mature, legacy system (`sivel2`) for its stability while progressively introducing modern components (`next.js`) in a security-conscious manner.

### **Current Phase: A Hybrid Model**

-   **`sivel2` as the Core Data Engine:** In the current phase, the `sivel2` Ruby on Rails application serves as the authoritative backend for case documentation. Its robust, form-based interface is used by professional documenters to create and manage the detailed case data stored in the PostgreSQL database. Its stability and maturity are key to ensuring data integrity.

-   **`next.js` for Public Interaction and New Features:** The `next.js` application provides the public-facing interface, including the case map visualization and the new citizen alert submission system. It is the innovation layer, responsible for all Web3 interactions (blockchain certification, governance) and user-facing features that are not part of the core documentation workflow.

### **Future Phase: Gradual Migration and Modernization**

The long-term vision is to gradually replace the case management functionalities of `sivel2`. This migration will be methodical and guided by a security-first principle:

1.  **Evolving Case Management:** New functionalities for editing and managing cases will be developed within the `next.js` application. The goal is to move beyond `sivel2`'s extensive forms towards more visual, intuitive, and possibly context-aware editing mechanisms, potentially evolving from the citizen alert workflow.

2.  **Core Scaffolding Replacement:** The migration not only covers the `sivel2` functionalities but also its core scaffolding (`msip` and `cor1440_gen`). This process has already begun with the integration of the `@pasosdejesus/m` library, which is designed to operate as a Rails-style logic and data access layer within the Next.js ecosystem. In the long term, `@pasosdejesus/m` will replace `msip`, allowing us to gradually and safely unify development into a single technology platform.

3.  **Security-Driven Transition:** The pace of this migration is directly tied to the proven stability and security of the Next.js stack when deployed on the recommended `adJ` operating system. We will leverage `adJ`'s foundation in OpenBSD to implement strong security measures, such as process sandboxing, to contain and mitigate potential vulnerabilities in the Node.js ecosystem (e.g., recent exploits allowing arbitrary code execution).

This careful, security-focused transition ensures that SIVeL 3 can innovate and improve the user experience without compromising the integrity of its mission-critical data or the security of the platform.
