# Contributing to SIVeL 3

This document establishes the collaboration standards for the SIVeL 3 ecosystem.

## 1. Project Structure and Package Managers

This repository contains different components of the SIVeL 3 ecosystem. Each component is managed independently. **Do not mix package managers.**

| Component | Directory | Package Manager | Purpose |
|-----------|-----------|-----------------|---------|
| **Legacy Engine** | `sivel2/` | `yarn` | Ruby on Rails case documentation engine. |
| **Smart Contracts** | `apps/hardhat/` | `yarn` | Solidity contracts for Celo. |
| **Modern Frontend & API**| `apps/nextjs/` | `pnpm` | Web3 portal and orchestration API. |

---

## 2. Language Conventions

We balance international collaboration with local context:

### English
Used for technical documentation and Web3-aligned components:
*   Root documentation (`README.md`, `ARCHITECTURE.md`, `VISION.md`, `CONTRIBUTING.md`).
*   All documentation and source code in `apps/nextjs/` and `apps/hardhat/`.
*   Requirements in `REQ/` directory.
*   Commit messages (preferred).

### Spanish
Used for domain-specific documentation, legal context, and the legacy engine:
*   All documentation and comments in `sivel2/`.
*   Ethical and theological alignment documents in `@pasosdejesus/m/ia/`.
*   Legal documents (`LICENCIA.md`, `CREDITOS.md`).

---

## 3. Code Style Standards

Maintain consistency by using the established tools in each directory:

*   **`sivel2/` (Ruby):** Follows `rubocop-shopify`. Run `bundle exec rubocop` to check.
*   **`apps/nextjs/` (TS/React):** Uses ESLint and Prettier. Run `pnpm lint` and `pnpm format`.
*   **`apps/hardhat/` (Solidity/TS):** Uses Prettier for contracts and scripts. Run `yarn prettier`.

---

## 4. Guiding Principles

All human contributors are encouraged to act with **Love, Respect, and Humility** (as outlined in `@pasosdejesus/m/ia/principios.md`), recognizing our work as a service to justice. 

*Note: The operational directives in `AGENTS.md` apply strictly to AI Agents; human collaborators should refer to this document (`CONTRIBUTING.md`) and the project principles.*

---
> *"And whatever you do, do it heartily, as to the Lord and not to men"* (Colossians 3:23).
