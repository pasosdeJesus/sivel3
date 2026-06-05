# Vision: SIVeL 3 \- A protocol for ethically witnessing socio-political violence

## 1\. Fundamental Principles

SIVeL 3 is governed by the following principles formulated by the priest Javier Giraldo

- **Inalienable human dignity**– Information about human rights violations belongs to the victims and to society. It must be free and open.  
- **Free universal access**– The general public and victims never pay to access documented cases.  
- **Open source and auditable**– ISC license for the source code and CC/BY license for the data.  
- **Reserved sources of information** for personal safety.  
- **Alignment with International Humanitarian Law**– Classification according to the conceptual framework of the Banco de Datos Database.  
- **No commercialization of victims' data**– Revenue comes from institutional services and loans, not from the sale of information.

---

## 2\. Summary

SIVeL 3 will be a pioneering Web3 protocol designed to transform the ethical documentation of sociopolitical violence. We are creating a self-sustaining ecosystem, operating from [**https://sivel.xyz**](https://sivel.xyz) It is funded through a hybrid model that combines donations, value-added services for institutional users, credit-based incentives, and a pre-alert marketplace where citizens purchase and enhance AI-generated alerts. Initial operations are supported by the founder's own capital until the model reaches sustainable revenue.

The system empowers an **AI agent** to autonomously detect potential events in public sources, it allows citizen witnesses to verify and improve those alerts, rewards them for their contributions, provides a path for professional researchers to access valuable data, and establishes an immutable, blockchain-certified record of events on the Celo network.

**Crucially, SIVeL 3 never charges victims or the general public for access to case data.**Information on human rights violations belongs to the victims and to society; it must remain free and open. Professional users (researchers, journalists, security firms, government agencies) who require bulk access to sensitive data can contribute to the platform's sustainability.

---

## 3\. Ecosystem Actors and Roles

SIVeL 3 introduces a multi-level ecosystem where each role is defined by non-transferable Soul-Bound Tokens (SBTs):

### 3.1 Community Roles

- **General public**Explore cases on an interactive map and view aggregated data. Free access, no wallet required.  
    
- **Citizens (whistleblowers)**– They browse the available pre-alerts, purchase access to a pre-alert for a small fee (discouraging spam), research the event using their own sources, enhance the pre-alert with verified information (photos, exact location, testimonials), and submit it as **citizen alert** If verified, they receive a reward. They can also send direct alerts without going through a pre-alert if they have firsthand information about a case not discovered by the AI ​​agent.  
    
- **Victims or family members** \- They can **register** and **claim a case** existing (already published by the Data Bank) and interview a documenter or validator staff to verify it. By doing so, they receive a **symbolic compensation of $5** (Subject to availability in the Restoration Fund or by joining a queue to receive payment when resources become available in that fund), your wallets are registered for potential donations to your case, and future reparations or assistance without needing to keep your personal information online. If for security or privacy reasons you prefer, you can request that the victim's name be anonymized on sivel.xyz (permanently or temporarily).

### 3.2 Operational Roles

- **AI Agent**– Independently monitors public sources (news, RSS, APIs) to detect potential human rights violations. Generates **pre-alerts**(structured reports in JSON following the methodology of the Banco de Datos del CINEP) and publishes them in a section of sivel.xyz  
    
- **Documenters** They investigate citizen alerts, transform them into structured cases, and participate in peer review. They are not workers neither volunteers of the validator. They receive a donation per documented case from the alerts and documenters fund ($5–$20 per case, depending on availability). They also help certify victims and their families when they file a claim. If the system achieves financial stability, they will receive a monthly stipend instead of payment per case. In Colombia, members of the Database Network are already trained in the methodology and simply need to register their wallet to receive the Documenter SBT and be preferred for authenticating victims in their region.  
    
- **Regional Publication Validators** (e.g., Banco de Datos del CINEP's Political Violence Database in Colombia) – A recognized human rights organization that conducts the final audit for its region and certifies cases on the Celo blockchain. It maintains its own internal information system with full access to all data for its region. It also helps authenticate victims and their families when they file a claim.

### 3.3 Professional Roles and Funders

- **Professional users** (researchers, journalists, security companies, institutions) – Access the database of cases and specialized tools through a **subscription or credit system** (see section 5). You can buy credits (e.g., $10 for 240 cases/month) or monthly subscriptions.  
    
- **Donors**– They donate USDT to document cases in specific regions or as micro-reparations to victims registered on the platform. They receive recognition and courtesy credits. They do not have governance rights, but they can be elected to regional councils with one vote (regardless of the amount donated).

---

## 4\. AI Agent and Pre-alert Market

The AI ​​agent is a core innovation of SIVeL 3:

1. **Monitor public sources**(RSS, ReliefWeb API, HRW, Amnesty, etc.) free of charge.  
2. **Detects potential events** using a small LLM running on hardware initially provided by the Banco de Datos del CINEP.  
3. **Generates pre-alerts**– structured reports in JSON following the methodology of the Data Bank – and publishes them in the section for this on sivel.xyz with blockchain certification.  
4. **Check for duplicates** consulting the existing database, ensuring that redundant pre-alerts are not published.

**Pre-alert market:**

- Citizens navigate through the available pre-alerts on an interactive map.  
- To access the full details, the citizen pays a small fee (currently **$1.00 USDT** adjustable to balance accessibility and long-term sustainability).  
- After the purchase, the citizen investigates, improves, and sends the pre-alert as a citizen alert.  
- If a Documenter verifies the alert, the citizen receives a reward of **$2 (simple validation) to $5 (full investigation)** according to the significance of their contribution.  
- The rewards fund is transparent: the contract address is public; anyone can verify the funds and track payments to wallets (without personal information).

---

## 5\. Access Levels and Prices

| Level | Access | Price | Audience |
| :---- | :---- | :---- | :---- |
| **Free (no wallet required)** | Map \+ 8 cases/month (1/day) | $0 | Occasional visitors |
| **Free (with wallet)** | 16 cases/month (2/day) | $0 | Registered with wallet |
| **Free (with verified wallet)** | 24 cases/month (3/day) | $0 | Registered and verified on learn.tg |
| **Basic Researcher**(verified wallet) | 240 cases/month \+ API | $10 USDT/mes | Academics, journalists |
| **Professional**(verified wallet) | 1,000 cases/month \+ full API | $40 USDT/mes | NGOs, security companies |
| **Institutional**(representative's verified wallet) | Customized (bulk export, priority support) | $200-500 USDT/mes | Governments, universities |

---

## 6\. Financial Model and Income Distribution

The percentages are applied from the first dollar received (including donations).

| Recipient | Percentage | Notes |
| :---- | :---- | :---- |
| Banco de Datos del CINEP | 20% | Data access, methodology, internal process |
| **pdJ (operator)** | 30% | Top of **$1,500 USD per month** Operation, development, hosting, AI agent, seed capital |
| **Independent Documenters** | 30% | $5–$20 per verified case (field work), based on donations received |
| **Restoration Fund (victims)** | 5% | Welcome bonus, repairs, commemorative events, reforestation |
| **Church Fund** | 5% | Verified pacifist churches (via learn.tg) |
| **Reinvestment** | 10% | Marketing, new features, hackathons |

**Stop mechanism (cap):** If 30% of the monthly income for pdJ exceeds $1,500 USD, the surplus is distributed equally between the Restoration Fund, the Church Fund, and each active regional contract (Colombia, Palestine, etc.).

**Settings:**Pasos de Jesús may change the percentages to address operational, ethical, or legal concerns, informing all users of the platform.

**Data license:**The cases used and contributed by AI agents and users are licensed**Creative Commons Attribution (CC/BY)**The copyright holder is the "Banco de Datos del CINEP". This open license allows sivel.xyz to use, redistribute, and build upon the data, provided that proper attribution is given.

---

## 7\. Governance

### Technical Authority (Steps of Jesus)

- Adjust revenue distribution percentages to ensure operational sustainability and legal compliance.  
- It retains a permanent technical veto right to protect the founding principles (open source, non-commercialization of victim data, alignment with IHL, system integrity).

### Regional Sovereignty (Regional Councils)

- When a region's Restoration Fund reaches **$5,000**, a **Regional Council** with victims/family members enrolled, active donors, citizen whistleblowers.  
- They sovereignly decide how to use the funds for the reparation of victims (reforestation, events, direct aid, etc.).  
- The Documenters, Validators and the operator have a voice to make proposals but no vote.  
- The operator (Pasos de Jesús) maintains a technical veto only for security, legal or operational compliance reasons.

### Donor Acceptance Policy

We accept donors who share our commitment to ethical documentation, without conditions that compromise our principles:

1. **Uncensored**– No donor can demand the removal or modification of documented cases.  
2. **Without ideological conditions**– Donations are accepted without political, religious or Zionist propaganda agendas.  
3. **Transparency**– All donations are recorded on the blockchain and are publicly visible.  
4. **Without governance rights**– Donors receive recognition and can be elected to regional governance with one vote (not based on the amount donated).

Donors who violate these principles will be rejected.

### Protection of Principles

The founding principles (see `PRINCIPLES.md`– including open-source licensing, non-commercialization of victim data, protection of sources, and alignment with IHL – cannot be altered by any governance body or donor. Pasos de Jesús retains permanent technical veto power to enforce them.

---

## 8\. Scalability

This decentralized, hybrid financing mechanism is inherently scalable. As the project grows, new regions can be added, allowing the system to expand organically wherever there is a need for ethical witness and community support.

**Use:**When starting in a new region, the service operator (Jesus Steps) can initially fulfill the role of documenter while local documenters emerge.

---

## 9\. Success Metrics

- **System integrity:** 1 Regional Validator and at least 3 Documenters incorporated with SBTs (of which at least 2 are from the Network of Data Banks in Colombia).  
- **Effectiveness of the AI ​​Agent:** The agent consistently generates relevant pre-alerts that lead to verified citizen alerts.  
- **Citizen participation:** A growing number of active citizens are buying, researching, and improving pre-alerts.  
- **Immutable record:** Constant flow of documented and certified cases in Celo.  
- **Sustainability:** The pay-per-researcher model generates sufficient revenue to cover operating costs, hardware, and stipends for Documenters.  
- **Donations to victims:** The victims receive the donations made (optionally the donor can allocate 10% for the sustainability of the platform).  
- **Platform functionality:** All core functionality fully implemented and operational in production at sivel.xyz.

