# SIVeL 3 - Project Architecture

## Overview

SIVeL 3 is a Web3 protocol for the ethical and sustainable documentation of socio-political violence, operating live at **https://sivel.xyz**. The platform integrates an existing information system (`sivel2`) with new blockchain technologies to create an immutable and transparent record of cases, funded through a donation-based model with SLEARN cashback rewards.

---

## System Architecture Diagram

```mermaid
graph TD
    subgraph Users
        CZ[Citizen]
        DC[Documenter]
        DN[Donor]
    end

    subgraph "sivel3agent (AI)"
        AG[AI Agent<br/>Qwen2.5-7B]
        AG -->|publishPreAlert| PM
    end

    subgraph "sivel.xyz Platform"
        NX[Next.js Frontend]
        API[Next.js API Routes]
        DB[(PostgreSQL)]
        S2[Sivel 2 Rails]
    end

    subgraph "Celo Blockchain"
        RD[SIVeL3RegionalDonationV2]
        PM[SIVeL3PreAlertMarket]
        RE[SIVeL3RewardEscrow]
        CR[PasosDeJesusCredentials]
        SL[SLEARN Token]
    end

    subgraph "Ecosystem"
        LT[learn.tg<br/>KYC + Courses]
        SS[stable-sl.pdJ.app<br/>SLEARN redemption]
    end

    CZ -->|views map + pre-alerts| NX
    CZ -->|buys pre-alert ($1 USDT)| PM
    CZ -->|converts to alert| API
    DC -->|scores alert (EIP-191)| API
    DN -->|donates USDT| NX
    API -->|90% assignDonation| RD
    API -->|10% mintAndReserve| SL
    API -->|withdraw + releasePayment| RE
    API -->|verify KYC| LT
    NX -->|SBT minting| CR
    SS -->|redeem SLEARN| SL

    style PM fill:#f9f,stroke:#333
    style RE fill:#f9f,stroke:#333
    style SL fill:#fca,stroke:#333
    style LT fill:#bbf,stroke:#333
```

## Architecture Stack

### 1. **Main Backend: Sivel 2 (Legacy)**
- **Framework:** Ruby on Rails
- **Database:** PostgreSQL (shared with Next.js)
- **Purpose:** Centralized case data management. Persists violence cases, regions, and reference data.
- **Based on:** MSIP and cor1440_gen frameworks.
- **Status:** Read-only from Next.js perspective. Gradual migration to `@pasosdejesus/m`.

### 2. **Frontend & API: Next.js (apps/nextjs/)**
- **Framework:** Next.js App Router + React + TypeScript
- **Database:** PostgreSQL via Kysely (shared with sivel2)
- **Key features:**
  - Interactive map with case visualization (Leaflet)
  - Pre-alert marketplace (🔎 markers, mode toggle Casos/PreAlertas)
  - Donation flow (USDT via MiniPay/MetaMask, 90/10 split)
  - SLEARN cashback (10% of donation)
  - Documenter panel (queue + EIP-191 scoring)
  - Citizen dashboard (purchased pre-alerts)
  - SBT minting (Connector, Explorer, Donor tiers)
- **Authentication:** Wallet connection (RainbowKit/Wagmi) + learn.tg KYC for sensitive actions

### 3. **Smart Contracts: Hardhat (apps/hardhat/)**
- **Language:** Solidity ^0.8.20 (OpenZeppelin 5.x)
- **Network:** Celo Mainnet (42220) + Sepolia testnet (11142220)

| Contract | Address (Mainnet) | Purpose |
|----------|-------------------|---------|
| `SIVeL3RegionalDonationV2` | `0x563AbB7492bb496B9DD74d54D6daDd41374924E5` | Regional donations, withdraw to RewardEscrow |
| `SIVeL3PreAlertMarket` | `0x9aefBD59455efE0F7732638eF791f35F110ddB0c` | Pre-alert publishing, buying ($1 USDT), conversion |
| `SIVeL3RewardEscrow` | `0xBFD94B391882612425455305dc0c9b1eC41E155A` | Citizen reward payments (intermediary) |
| `PasosDeJesusCredentials` | _(pending)_ | ERC-1155 SBTs (roles + achievements) |
| `SLEARN` | `0x27fd41Bea85C39254f2B12789eB37a1543152CC1` | Cashback token (22 SLEARN = 1 USDT) |

### 4. **AI Agent: sivel3agent**
- **Framework:** Node.js + Qwen2.5-7B-Instruct
- **Registration:** ERC-8004 (token ID 9330)
- **Purpose:** Autonomous monitoring of news sources → pre-alert generation → on-chain publishing
- **Status:** Base pipeline operational (scraper, LLM extraction, cron). Remaining: deduplication, classification, GPU infra (tracked in REQ/53)

### 5. **Ecosystem Integration**
- **learn.tg:** KYC verification (EIP-191), premium SBTs, SLEARN course payments
- **stable-sl.pdJ.app:** SLEARN → Leones/USDT redemption (post premium course SBT)

---

## Pre-Alert State Machine (MVP)

```
┌──────────┐    buyPreAlert    ┌──────────┐    convertToAlert    ┌───────────────┐
│  Pending  │ ───────────────→ │ Reserved │ ──────────────────→ │ ConvertedByCit │
│ (🔎 grey) │   $1 USDT        │ (🔎 green)│   7-day deadline    │ (queue)        │
└──────────┘                   └──────────┘                     └───────┬───────┘
                                                                        │
                                              ┌─────────────────────────┘
                                              ▼
                                    ┌──────────────────┐
                                    │  Documenter scores │
                                    │  EIP-191 signature │
                                    │  0=reject, 2-5=pay │
                                    └────────┬─────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              ▼                              ▼
                      ┌────────────┐                ┌────────────┐
                      │  Rejected   │                │    Paid     │
                      │  score=0    │                │  score=2-5  │
                      └────────────┘                │  USDT sent  │
                                                    └────────────┘
```

States: `pending` → `reserved` → `converted` → `paid` / `rejected` / `pending_reward`

---

## Donation Flow

```
User sends USDT → sivel.xyz wallet (NEXT_PUBLIC_ADDRESS)
  │
  ▼
POST /api/donations/assign
  ├── Verify on-chain transfer (Viem)
  ├── 10% → SLEARN contract → mintAndReserve(donor, amount)
  │     → 220 SLEARN per USDT minted to donor
  ├── 90% → RegionalDonationV2 → assignDonation()
  ├── Mint donor SBTs (Connector, Donor tiers)
  └── Toast: SLEARN cashback + link to learn.tg
```

---

## Reward Payment Flow (Documenter Scoring)

```
Documenter submits score (EIP-191 signed)
  │
  ▼
POST /api/pre-alerts/:id/score
  ├── Verify EIP-191 signature (verifyMessage)
  ├── Check DOCUMENTER_WALLETS (env var → REQ/52 for SBT)
  ├── If score=0: reject (no payment)
  └── If score=2-5:
        ├── Determine region from pre-alert departamento
        ├── withdraw(regionId, amount, rewardEscrow) on RegionalDonationV2
        ├── releasePayment(citizen, amount) on RewardEscrow
        └── Status → paid
```

---

## Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Main Backend | Rails + PostgreSQL | Centralized case data management |
| Smart Contracts | Solidity + Hardhat (OZ 5.x) | Marketplace, donations, rewards, SBTs |
| Frontend & API | Next.js + React + TypeScript | UI, map, donations, pre-alert marketplace |
| Blockchain | Celo | Immutable record + payments |
| Map | Leaflet + markerCluster | Geo-referenced visualization |
| AI Agent | Node.js + Qwen2.5-7B | Pre-alert generation from news |
| KYC | learn.tg (Self protocol) | Citizen verification |
| Wallet | Wagmi + RainbowKit | Multi-wallet (MetaMask, MiniPay, OneKey) |

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Donation 90/10 split | 10% SLEARN cashback incentivizes donors; 90% funds regional documentation |
| Pre-alert $1 fixed price | Anti-spam, accessible. Dynamic pricing deferred to post-MVP |
| EIP-191 documenter signatures | Prevents reward fraud without sessions. Compatible with MetaMask/OneKey |
| Off-chain state machine | Cheaper (no gas), flexible. Blockchain certifies only purchase + payment |
| Separate RewardEscrow contract | Clean separation: RegionalDonation = incoming, RewardEscrow = outgoing |
| SLEARN from contractAddresses.ts | Single source of truth, no env var dependency |
| Calldata-stuffing for buy | MiniPay doesn't support approve(). On-chain buyPreAlert() deferred to REQ/51 |

---

## Key REQ References

| REQ | Title | Status |
|-----|-------|--------|
| #36 | AI Agent Epic (MVP) | ✅ Closed (MVP) |
| #39 | SLEARN Cashback | ✅ Closed |
| #43 | PreAlertMarket.sol | ✅ Closed |
| #44 | API Endpoints | ✅ Closed |
| #47 | RewardEscrow | ✅ Closed |
| #48 | Frontend MVP | ✅ Closed |
| #49 | Citizen Auth | ✅ Closed (risk accepted) |
| #51 | On-chain buy/convert | 📋 Open |
| #52 | SBT Documenter | 📋 Open |
| #53 | Agent Phase 2 | 📋 Open |

---

> *"For the Lord loves justice"* (Psalm 37:28)
