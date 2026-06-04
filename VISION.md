# Vision: SIVeL 3 - A Donation-Driven Protocol for Ethical Witnessing

## Summary

SIVeL 3 is a pioneering Web3 protocol designed to transform the ethical
documentation of socio-political violence. We are creating a self-sustaining
ecosystem, operating from **https://sivel.xyz**, funded through a hybrid
model that combines community donations, value-added services for
institutional users, credit-based incentives, ownership of identity
by verified victims or relatives who decide it and a pre-alert market
where citizens purchase and improve AI-generated alerts.
Initial operations are supported by the founder's own capital
until the model achieves sustainable revenue.

This system empowers an AI agent to autonomously detect potential
events from public sources, enables citizen witnesses to verify and
improve those alerts, rewards them for their contributions, provides a
pathway for professional researchers to access valuable data, and
establishes an immutable, blockchain-certified record of events on
the CELO network.

**Crucially, SIVeL 3 never charges victims or the general public for
accessing case data.** Information about human rights violations belongs
to victims and to society; it must remain free and open. Professional
users (researchers, journalists, security firms, government agencies) who
require bulk access or sensitive data may contribute to the
platform's sustainability.

---

## The Solution: A Web3-Powered Ecosystem for Ethical Witnessing

SIVeL 3 introduces a multi-tiered ecosystem that serves different types of
users while ensuring the integrity of every documented case:

- **General public** can browse cases on an interactive map, view aggregated
  data and learn about the conflict. Basic access is free and requires no
  wallet.

- **AI Agent:** An autonomous agent that continuously monitors public
  sources (news, RSS, APIs) to detect potential human rights violations.
  It generates **pre-alerts** (structured preliminary reports) and publishes
  them onchain.

- **Citizen witnesses and victims** can browse available pre-alerts, purchase
  access to a pre-alert for a small fee (discouraging spam), investigate the
  event using their own sources, improve the pre-alert with verified
  information (photos, exact location, witness testimony), and submit it as a
  **citizen alert**. If verified, they receive a reward. Citizens can also
  submit direct alerts (without purchasing a pre-alert) if they have
  first-hand information of a case not discovered by an AI agent.

- **Documenters** investigate citizen alerts, transform them into structured
  cases, and participate in peer review. If the system reaches financial
  stability, they will receive a monthly stipend but meanwhile they will
  receive a donation per case documented with according to the funds in the
  alerts and documenters fund.

- **Regional Publishing Validators (e.g., Banco de Datos de Violencia Política
  del CINEP in Colombia):** A renowned human rights organization that performs
  the final audit for its region and certifies cases on the Celo blockchain.
  It maintains its own internal information system with full access to all
  case data of its region. 

- **Professional users (researchers, journalists, security firms,
  institutions)** can access the case database and specialized tools through a
  **subscription or credit-based system**. They pay for bulk access,
  API usage, and in the future, for access to case details with possibility
  to pay to victims/relatives enrolled to acces the victim's identity.

- **Donors** donate USDT to document cases in specific regions. They receive
  recognition and courtesy credits.

All roles are defined by non-transferable Soul-Bound Tokens (SBTs), creating a
system of clear accountability.

---

## The AI Agent & Pre-alert Market

The AI agent is a core innovation of SIVeL 3. It:

1. **Monitors public sources** (RSS feeds, ReliefWeb API, HRW, Amnesty, etc.)
   at no cost, using freely available data.
2. **Detects potential events** using a small LLM (BERT-based NER) that runs on
   hardware provided initially by the Banco de Datos del CINEP.
3. **Generates pre-alerts** – structured JSON reports following the Banco
   de Datos methodology – and publishes them onchain.
4. **Checks for duplicates** by querying the existing database, ensuring no
   redundant pre-alerts are published.

**Market for pre-alerts:**

- Citizens can browse available pre-alerts on an interactive map.
- To access full details, a citizen pays a small fee
  (currently **$1.00 USDT** to be adjusted according to balance
   accesibility for citizens and long term sustainability).
- After purchase, the citizen can investigate, improve, and submit the
  pre-alert as a citizen alert.
- If the alert is verified by a Documenter, the citizen receives a reward from
  $2 (simple validation) to $5 (full investigation) USDT, based on the
  significance of their contribution.
- Reward pool transparency: The contract address is public. Anyone can
  verify the available funds and track all reward payments.


---


## Sustainable Funding Model (Future)

We are building a multi-layered sustainability model to ensure long-term
operation without relying solely on donations.

| Tier | Access | Price | Audience |
| :--- | :--- | :--- | :--- |
| **Free (no wallet)** | Map + 8 cases/month (1/day) | $0 | Casual visitors |
| **Free (with wallet)** | 16 cases/month (2/day) | $0 | Registered with wallet |
| **Free (with verified wallet)** | 24 cases/month (3/day) | $0 | Registered and verified in learn.tg |
| **Basic Researcher (with verified wallet) ** | 240 cases/month + API | $10 USDT/month | Academics, journalists |
| **Professional (with verified wallet)** | 1,000 cases/month + full API | $40 USDT/month | NGOs, security firms |
| **Institutional (verified wallet of representative)** | Custom (bulk export, priority support) | $200-500 USDT/month | Governments, universities |
| **Victim consent access** | One-time payment to reveal identity and inform the victim/relative who is the payer | $2 USDT (70% to victim) | Any researcher |


**Revenue distribution:**

Percentages apply from the first dollar received (including donations).

| Recipient | Share | Notes |
| :--- | :--- | :--- |
| **Banco de Datos del CINEP** | 20% | Data access, methodology, and their internal process  |
| **Pasos de Jesús (operator)** | 30% | Capped at **$1,500 USD per month**. Operation, development, hosting, AI agent, seed capital |
| **Independent Documenters** | 30% | $5-$20 per verified case (territory work with victims), depending on donations received |
| **Restoration Fund (victims)** | 5% | Welcome reparation bonusfor victims that claim their case, reparations, memorial events, activities and goods. |
| **Church Fund** | 5% | Verified pacifist churches (via learn.tg) |
| **Reinvestment** | 10% | Marketing, new features, hackathons |

**Cap mechanism:** In the event that 30% of monthly revenue for pdJ exceeds $1,500 USD, the surplus will be distributed equally to the Restoration Fund, Church Fund and each region in the Regional Contract.

pdJ may change the percentages to adjust to operational, ethical, legal
concerns, and will inform all the users of the platform.

**Data license:** The cases used and contributed by AI-agents and users have the **Creative Commons Attribution (CC/By)** license. The copyright holder is "Banco de Datos del CINEP". This open license allows sivel.xyz to use, redistribute, and build upon the data as long as attribution is given.


### Victim Recognition & Consent

When a victim or family member is authenticated by a documenter, they receive a **$2 welcome gift** from the Restoration Fund. They become eligible for future reparations organized by sivel.xyz.

After registration, they choose how their information is handled on sivel.xyz:

| Option | What happens on sivel.xyz | Free tiers see | Researchers see |
| :--- | :--- | :--- | :--- |
| **Anonymize** | Name hidden from all users | ❌ Hidden | ❌ Hidden |
| **Public without royalties** | Name visible (as originally published) | ✅ Visible | ✅ Visible |
| **Public with royalties** | Name hidden by default. Researchers can pay **$2** to reveal it. | ❌ Hidden | ❌ Hidden, but **$2 payment reveals name** (only to that researcher) |

**For cases without registered victims:** All information (including victim names) remains fully visible to all users, as originally published by the Banco de Datos del CINEP.

**For the "Public with royalties" option:**

- When a researcher pays $2, the transaction is recorded on-chain as a receipt.
- The researcher can use the victim's name in their publications.
- The victim receives $1.40 (70%) and the researcher's contact information.
- sivel.xyz does not intermediate beyond this.

**If a victim changes their choice later:**

- If a victim who previously chose "Public with royalties" switches to "Anonymize", researchers who already paid will no longer see the name on sivel.xyz.
- Those researchers are notified (via the transaction record) that the victim may contact them directly. sivel.xyz does not refund payments or enforce further changes.

**Why $2?** Meaningful for victims, low enough for researchers, comparable to similar models (e.g., DOVU offered above $5 in tokens).


---

## Core Components

SIVeL 3 is built on four core pillars already described above:

1. **Blockchain Certification** – Immutable case records on Celo.
2. **SBT-Based Roles** – Connector, Global Founder, Documenter, Validator, AI Agent.
3. **AI Agent & Pre-alert Market** – AI-generated pre-alerts, citizen purchase and improvement.
4. **Regional Donation Contract** – USDT donations, revenue distribution, reward pools.

Future components (credit system, advanced research tools, API access, documenter case management) will be added as the platform grows and investigator revenue allows.

---

## Future Governance

### Regional Governance
When a region's Restoration Fund reaches $5,000, a **Regional Council** is formed with victims/relatives, active donors, citizen alerters, and community leaders to decide how those funds will be used to repair victims. Documenters and Validators have voice but no vote. The operator (Pasos de Jesús) retains technical veto for operational, legal and security compliance.

### Donor Acceptance Policy
We welcome donors who share our commitment to ethical documentation, without conditions that compromise our principles:

1. **No censorship** — No donor may demand removal or modification of documented cases.
2. **No ideological conditionality** — Donations are accepted without political, religious, or Zionist propaganda agendas.
3. **Transparency** — All donations are recorded on-chain and publicly visible.
4. **No governance rights** — Donors receive recognition and may be elected
   for regional governance with one vote (not according to their donation).

Donors who violate these principles will be rejected.


### Protection of Principles
Foundational principles (see `PRINCIPLES.md`) — including open-source licensing, non-commercialization of victim data, and alignment with IHL — cannot be altered by any governance body or donor. Pasos de Jesús retains permanent technical veto to enforce them.

---

## Scalability

This decentralized, hybrid funding mechanism is inherently scalable. As the
project grows, new regions can be added, allowing the system to expand
organically wherever there is a need for ethical witnessing and community
support. The investigator payment model ensures sustainability without
relying solely on volatile donations.

**Note:** When we start working in a new region, the service operator
(Pasos de Jesús) may initially fulfill the documenter role while local
documenters emerge.

---

## Metrics for Success

*   **System Integrity:** 1 Publishing Validator and at least 3 Documenters
    onboarded with SBTs.
*   **AI Agent Effectiveness:** The AI agent consistently generates relevant
    pre-alerts that lead to verified citizen alerts.
*   **Citizen Engagement:** A growing number of active citizen reporters
    purchasing, investigating, and improving pre-alerts.
*   **Immutable Record:** A steady stream of cases being documented and
    certified on the Celo blockchain.
*   **Sustainability:** The investigator payment model generates sufficient
    revenue to cover operational costs, hardware, and stipends for
    Documenters.
*   **Victim Compensation:** Victims receive fair compensation when their
    identity is accessed (with consent).
*   **Platform Launch:** All core functionality fully implemented and
    operational in production at sivel.xyz.
