# SIVeL 3

**A Web3 protocol for the ethical and sustainable documentation of socio-political violence.**

SIVeL 3 is a pioneering platform that leverages blockchain technology to create a transparent and resilient ecosystem for documenting human rights violations. We empower citizen witnesses, support dedicated documenters, and create an immutable historical record on the Celo blockchain.

The entire system operates from **[https://sivel.xyz](https://sivel.xyz)**.

## Core Principles

*   **Ethical Witnessing:** Providing a secure and reliable channel for citizens to report acts of violence.
*   **Decentralized Verification:** A multi-step verification process ensures the integrity and accuracy of each documented case, managed by a team with roles defined by Soul-Bound Tokens (SBTs).
*   **Immutable Record:** Validated cases have their cryptographic hash permanently stored on the Celo blockchain, preventing censorship or alteration.
*   **Sustainable & Transparent Funding:** The project is sustained by a community of supporters through a unique **Regional Donation Contract**. This allows donors to fund documentation efforts in specific geographic areas, ensuring resources are allocated with maximum impact and transparency.

## How It Works

1.  **Alert:** A citizen submits an alert about an incident through our platform.
2.  **Verification:** A regional **Documenter** reviews the alert. The case then undergoes a peer review by another Documenter before being passed to a **Publishing Validator**.
3.  **Certification:** The Publishing Validator performs the final review. Upon approval, the case's hash is immutably recorded on the Celo blockchain.

## Project Structure and Technology

SIVeL 3 is a monorepo composed of several key applications: a modern web frontend, a smart contract suite, and a robust backend data system.

For a detailed technical overview of the system components and data flows, please read our **[ARCHITECTURE.md](ARCHITECTURE.md)**.

*   **`sivel2` (Core Data Engine)**: The main data engine is a mature and robust Ruby on Rails application. It currently serves as the primary system for case documentation and manages the PostgreSQL database.

*   **`apps/nextjs/` (Frontend and New Features)**: This is a modern web application built with Next.js and React. It provides the public-facing user interface, including the interactive map and citizen alert system. It is also the layer responsible for all new features and Web3 integration.

*   **`apps/hardhat/` (Blockchain Logic)**: This directory contains the Solidity smart contracts, managed with Hardhat. It houses the on-chain logic for governance, case certification, and our decentralized donation system.

## Our Vision & Architectural Strategy

We are building a globally scalable, community-governed system that sets a new standard for decentralized and ethical human rights documentation. 

Our architectural strategy is one of careful, phased modernization. We are gradually migrating functionalities from the legacy `sivel2` system to the new `next.js` platform, with a paramount focus on security and stability. This ensures that we can innovate responsibly without compromising the integrity of our mission-critical data. 

To learn more about our long-term goals and the technical strategy behind SIVeL 3, please read our **[VISION.md](VISION.md)** and **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Get Involved

*   **Learn:** Understand the principles of ethical documentation.
*   **Contribute:** We welcome developers, designers, and human rights advocates. Please see our `CONTRIBUTING.md` file for details on how to join the effort.
*   **Support:** Fund the project directly through our regional donation mechanism (details forthcoming).
