# SIVeL 3

**A Web3 protocol for the ethical and sustainable documentation of socio-political violence.**

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Celo](https://img.shields.io/badge/blockchain-Celo-35CCB0)](https://celo.org)
[![Human Rights](https://img.shields.io/badge/focus-Human%20Rights-red)](https://sivel.xyz)

---

## 🌍 Context & Motivation

We believe that in Colombia, the continuous, systematic, and rigorous documentation of human rights violations has contributed to raising public awareness—especially among younger generations—and has positively influenced their participation in social protests and voting behavior, impacting the country's political sphere in defense of human dignity against economic privilege and violence.

SIVeL is a **well-established and successful public good** operating on Web 2.0, continuously used by thousands of people to understand the Colombian conflict through publications from various networks and NGOs, including:

- **Network of Data Banks** (see interactive digital map)
- **CINEP Human Rights Data Bank** ("Noche y Niebla" journal)
- **Somos Defensores**
- **CODACOP**
- **ACIN**
- **ASOM**

Recently, some NGOs in **Honduras** (including CPTRT) began using the system, demonstrating its internationalization potential.

The entire system operates from **[https://sivel.xyz](https://sivel.xyz)**.

---

## 🚀 Current Status (February 2026)

**SIVeL 3 is already live in production at [https://sivel.xyz](https://sivel.xyz)**

### ✅ What Already Works:

| Component | Description |
|-----------|-------------|
| **Interactive Map** | Geospatial visualization of socio-political violence cases |
| **Case Management** | Registration and consultation of documented cases, victims, acts |
| **Regional Donation System** | Celo smart contract enabling region-specific donations |

### 📊 Current Data:

- **Documented cases:** ~500 cases from the first semester of 2025 in Colombia
- **Source:** Open data from CINEP Human Rights Data Bank
- **Active regions:** 2 (Colombia, Israel/Palestine*)

\* *We are actively seeking local contacts in Israel/Palestine. If you work on human rights in the region, [contact us](mailto:vtamara@pasosdeJesus.org).*

---

## 📚 Project Documentation

To understand the heart and direction of SIVeL 3, consult these foundational documents:

| Document | Purpose | Audience |
|----------|---------|----------|
| **[PRINCIPLES.md](PRINCIPLES.md)** | **Ethical and foundational principles** (includes biblical foundation) | Team, collaborators, partners |
| **[VISION.md](VISION.md)** | **Long-term strategic vision** and Web3 sustainability model | Donors, technical community, institutional partners |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | **Detailed technical architecture** (monorepo, contracts, migration) | Developers |

---

## 🏗️ Project Structure

SIVeL 3 is a monorepo containing:
```
sivel3/
├── sivel2/ # Legacy data engine (Ruby on Rails)
├── apps/
│ ├── nextjs/ # Modern frontend and Web3 integration
│ └── hardhat/ # Solidity smart contracts (Celo)
├── PRINCIPLES.md # Ethical principles
├── VISION.md # Strategic vision
├── ARCHITECTURE.md # Technical documentation
└── README.md # This file
```

---

## 💡 Sustainability Model

Initially we propose to operate SIVeL 3 with a **decentralized donation model** through smart contracts on Celo. Funds are distributed as follows:

| Recipient | % | Purpose |
|-----------|---|---------|
| **CINEP Human Rights Data Bank** (Validator) | 20% | Historical archive, academic verification |
| **Pasos de Jesús** (Operator & Developer) | 30% | Hosting, development, maintenance |
| **Regional Documenters** | 40% | Stipends for field documentation work |
| **Citizen Alert Rewards** | 10% | Incentives for verified citizen submissions |

*Full details in [VISION.md](VISION.md)*

---

## 🛡️ Security & Confidentiality

We prioritize source confidentiality above all:

- **Recommended platform:** [adJ](http://aprendiendo.pasosdeJesus.org) (OpenBSD-based) with encrypted databases
- **Open source:** All code is publicly auditable
- **Continuous audits:** Especially for smart contracts and backend services
- **Client-side security:** We recommend users connect via secure operating systems (Ubuntu or other Linux distributions)

---

## 🔗 Blockchain Funding Opportunities

SIVeL 3 is actively seeking alignment with blockchain foundations that support human rights and public goods. 

---

## 🤝 How to Contribute

We welcome collaborators who share our ethical commitment.

1. **Read our principles:** [PRINCIPLES.md](PRINCIPLES.md)
2. **Understand the vision:** [VISION.md](VISION.md)
3. **Explore the architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
4. **Contact the team:** [vtamara@pasosdeJesus.org]

### Specific needs:
- **Israel/Palestine:** Local human rights documenters
- **Blockchain development:** Solidity, Celo, Web3 integration
- **Translation:** English/Spanish documentation

---

## 📄 License

SIVeL 3 is **open source** under the [ISC license](https://opensource.org/licenses/ISC)—one of the most permissive licenses, effectively public domain.

> *"Freely you have received; freely give" (Matthew 10:8)*

---


## 📬 Contact

- **Live platform:** [https://sivel.xyz](https://sivel.xyz)
- **Repository:** [https://gitlab.com/pasosdeJesus/sivel3](https://gitlab.com/pasosdeJesus/sivel3)
- **Email:** [vtamara@pasosdeJesus.org]

---

> *"For I, the Lord, love justice" (Isaiah 61:8)*