# Vision: SIVeL 3 - A Donation-Driven Protocol for Ethical Witnessing

## Summary

SIVeL 3 is a pioneering Web3 protocol designed to transform the ethical
documentation of socio-political violence. We are creating a self-sustaining
ecosystem, operating from **https://sivel.xyz**, funded through a hybrid
model that combines community donations with value-added services for
institutional users and credit-based incentives for active contributors.

This system empowers citizen witnesses by rewarding them for verified alerts,
provides stabilizing stipends to a structured team of human rights documenters,
and establishes an immutable, blockchain-certified record of events on the Celo
network. Our mission is to foster a transparent, sustainable, and auditable
cycle of ethical documentation, governed by clear editorial authority and
powered by a **diversified funding model** that reduces dependency on volatile
international donations.

**Crucially, SIVeL 3 never charges for accessing case data.** Information about
human rights violations belongs to victims and to society; it must remain free
and open. What may be charged to professionals who rely on the platform for
their work through subscriptions, credits, or value-added services is the
**use of infrastructure** required to keep the platform running: servers,
bandwidth, development, support, advanced features (e.g., AI
queries, bulk exports) and stipends for documenters. The goal is not profit,
but the long-term sustainability of a public good.

---

## The Solution: A Web3-Powered Ecosystem for Ethical Witnessing

SIVeL 3 introduces a multi-tiered ecosystem that serves different types of
users while ensuring the integrity of every documented case:

- **General public** can check cases and if possible pray for the victims and
  the end of the conflict. Once they connect their wallet they will receive an
  SBT of **SIVeL 3 user** and during the initial launch phase they will receive
  a second **"Founder User"** SBT. The gas of their limited transaction is 
  paid by the platform.
- **Citizen witnesses and victims** can submit geo-located alerts (first-hand
  information), their contributions are essential and rewarded with credits
  and USDT when verified. The gas for their limited transactions is paid by
  the platform.
- **Donors** donate USDT to document cases in a specific region (among those
  supported by sivel.xyz), they receive courtesy credits. The gas 
  of the donation is paid by the platform.
- **Professional users (researchers, journalists, judicial operators,
  institutions)** access the case database and specialized tools (AI powered
  features, reports, etc.) for work-related purposes with credits that must be
  paid. Those who actively contribute verified alerts may earn credits, but
  usage of the platform without contribution requires payment of credits or
  a subscription for monthly credits and paying gas of their transactions.
- **Documenters** investigate alerts, transform them into structured cases, and
  participate in peer review. They receive stipends funded by donations and
  subscription revenue. Documenters have a **generous subscription with monthy
  credits and gas for transactions** (sufficient for their documentation work)
  as long as they remain active. Inactive documenters may lose these privileges
  and be downgraded to regular users.
- **Regional Publishing Validators (e.g., Banco de Datos del CINEP in 
  Colombia):** A renowned human rights organization that performs the final 
  audit for its region and certifies cases on the Celo blockchain. It 
  maintains its own internal information system with full access to all 
  case data of its region. To streamline its work, the platform supports 
  bulk exports (from the public database to its system) and bulk imports 
  (from its system to the public database).

All roles are defined by non-transferable Soul-Bound Tokens (SBTs), creating a
system of clear accountability.

---

## Core Components

1.  **Blockchain Certification on Celo:** A smart contract that immutably 
    records the cryptographic hash of verified cases on the Celo blockchain.

2.  **SBT-Based Roles and Recognition:** Smart contracts for issuing
    non-transferable SBTs that define platform roles (Administrator, 
    Documenter, "Regional Publishing Validator", "SIVeL 3 User" and 
    "SIVeL 3 Founder User").

3.  **Map and Citizen Alert Module:** An interactive map to learn about the
    conflict and to submit geo-located alerts. Verified alerts earn rewards 
    as described in point 6.

4.  **Regional Donation and Payments Contract:** A smart contract that accepts
    donations (USDT) and payment (from subscriptions/credits), allocates funds
    to specific geographic regions, and immediately distributes them as 
    follows:
    | Recipient | Percentage | Notes |
    |-----------|------------|-------|
    | Regional Publishin Validator | 20% | Regional good reputation, audit, certification |
    | Pasos de Jesús | 20% | Infrastructure, development, maintenance |
    | Documenters (stipend pool) | 40% | Monthly stipends (max US$800/month per documenter, prorated if insufficient) |
    | Citizen Alert Rewards | 10% | Monthly pool for alert rewards (max US$10 per alert, prorated if insufficient) |
    | Local Church (verified in learn.tg) | 5% | Supporting local pacifist churches (verification managed by learn.tg) |
    | Restoration Fund (on-chain) | 5% | Accumulated in the contract for future campaigns for verified victims |

5.  **Credit and Subscription System:** A backend system that manages
    credits. Credits can be obtained through (1) one-time donations,
    (2) monthly or annual subscriptions (with discounts for longer 
    commitments), (3) creating alerts and (4) a **referral program** that 
    rewards users who invite new active participants (credits in the
    referral program are capped monthly to prevent abuse).

6.  **Automated Incentive Distribution:** A system that automatically 
    distributes monthly stipends to Documenters (from the stipend pool) and 
    rewards to citizens (from the alert reward pool). Stipends are capped at 
    US$800/month per documenter; alert rewards are capped at US$10 per 
    verified alert. If funds are insufficient, amounts are prorated 
    proportionally. Surplus in the stipend pool remains for future months or 
    to invite new Documenters.

7.  **Public Education:** A `learn.tg` course ("From Witness to Documenter")
    to train potential documenters. **Prerequisite:** The user must have 
    submitted at least 3 citizen alerts (from any of the priority regions: 
    Colombia, Israel/Palestine, or future regions) through the `sivel.xyz` 
    platform. Completion of the course is a prerequisite for entering the
    **documenter pipeline**, where candidates are evaluated based on
    activity, demonstrated trust, and resource availability. The **Documenter
    SBT** is issued only after these criteria are met.

8.  **Data Access for Professional Users:** Professional users interact with
    case data through the interactive map and public interface (which requires
    a connected wallet). For institutional partners with special agreements
    (e.g. universities, NGOs), additional access methods may be
    provided:
    - **API Access (restricted):** Programmatic access to case data, designed
      for partners who need to integrate SIVeL 3 with their own systems.
    - **Bulk Import/Export:** Using the existing **REXML** (Relato en XML)
      format. Not available to the general public.

9.  **Case Management System for Documenters:** A secure interface (currently
    SIVeL 2.2) for Documenters to register, edit, and manage cases. This system
    will be enhanced to support **wallet-based authentication** (via SBTs),
    replacing or complementing traditional credentials.

10. **Advanced Research Tools (Credits-Based):** Professional users can 
     access the following features by spending credits:
    - **Analytics and Reporting:** Interactive charts, graphs, and statistical
      reports (initially from SIVeL 2.2) to visualize trends, geographical
      distribution, and temporal patterns of violence. Access requires wallet
      authentication and consumes credits per report or per data refresh.
    - **AI-Powered Natural Language Query (future):** Allows researchers to
      ask complex questions in plain language (e.g., "Show me displacement
      cases in Antioquia between 2020 and 2022"). Each query consumes credits.

---

## Future Governance

When a region's restoration fund accumulates sufficient resources 
(e.g., $5,000), a **regional governance body** will be established
to decide on the use of those funds (e.g., reparations for victims in that
region). Each region will have its own body, including representatives of
local actors: verified victims, active donors, active recruiters, 
active alerters. Detailed mechanisms will be defined in `PRINCIPLES.md` 
when the time comes.  Documenters, regional validator and operator will 
not have vote but voice and veto power.

When we have at least 2 regional governance bodies, we will propose a 
general governance body based on the experience with regional governance bodies
to ensure legal and operation aligned with our principles.

---

## Scalability

This decentralized, hybrid funding mechanism is inherently scalable. As the
project grows, new regions can be added to the contracts, allowing the
system to expand organically wherever there is a need for ethical 
witnessing and a community to support it. Similarly, the range of value-added 
services can grow based on researchers needs and institutional demand.

**Note:** When we start working in a region the service operator 
(Pasos de Jesús) may also fulfill the documentor role, while documenters
emerge.

---

## Metrics for Success

*   **System Integrity:** 1 Publishing Validator and at least 3 Documenters onboarded with SBTs and sustained by stipends from the donation contract.
*   **Citizen Engagement:** A growing number of active citizen reporters submitting high-quality, verifiable alerts.
*   **Immutable Record:** A steady stream of cases of socio-political violence being documented and certified on the Celo blockchain.
*   **Community Support:** Successful deployment and funding of the Regional Donation Contract, demonstrating the viability of the community-driven model.
*   **Education:** A consistent number of students successfully completing the "From Witness to Documenter" course.
*   **Platform Launch:** All functionality fully implemented and operational in production at sivel.xyz.

