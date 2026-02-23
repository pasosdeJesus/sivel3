# Vision: SIVeL 3 - A Donation-Driven Protocol for Ethical Witnessing

## Summary

SIVeL 3 is a pioneering Web3 protocol designed to transform the ethical documentation of socio-political violence. We are creating a self-sustaining ecosystem, operating from **https://sivel.xyz**, funded directly by community donations.

This system empowers citizen witnesses by rewarding them for verified alerts, provides stabilizing stipends to a structured team of human rights documenters, and establishes an immutable, blockchain-certified record of events on the Celo network. Our mission is to foster a transparent, sustainable, and auditable cycle of ethical documentation, governed by clear editorial authority and powered by a decentralized, donation-based economic model.

## The Solution: A Web3-Powered Ecosystem for Ethical Witnessing

SIVeL 3 introduces a robust, three-tiered verification process to ensure the integrity of every documented case. This process is managed by a network of participants whose roles are defined by non-transferable Soul-Bound Tokens (SBTs), creating a system of clear accountability. The entire workflow is sustained by a unique **Regional Donation Contract**, which directs funds to the specific areas where they are needed most.

## Core Components (Technical Deliverables)

1.  **Blockchain Certification on Celo:** A smart contract module that, after a case passes three distinct verification filters, immutably records its cryptographic hash on the Celo blockchain.
2.  **SBT-Based Governance System:** A Celo smart contract for issuing non-transferable SBTs that define three critical roles: Administrator, Documenter, and Publishing Validator.
3.  **Citizen Alert Module:** An interactive map enabling citizens with verified digital identities (e.g., via self.xyz) to submit geo-located alerts, which are then routed to the appropriate regional Documenter.
4.  **Regional Donation Contract:** A decentralized smart contract that allows supporters to donate funds directly to the cause. Donors can specify a particular geographic region they wish to support, ensuring that funding is allocated to the teams and alerts on the ground where it's most impactful.
5.  **Automated Incentive Distribution:** An automated system that distributes rewards for verified citizen alerts and stipends for Documenters and Validators, paid directly from the funds held in the Regional Donation Contract.
6.  **Public Education:** The creation of a public `learn.tg` course, "From Witness to Documenter: Introduction to SIVeL 3," to onboard and train new community members.

## Metrics for Success

*   **System Integrity:** 1 Publishing Validator and at least 3 Documenters onboarded with SBTs and sustained by stipends from the donation contract.
*   **Citizen Engagement:** A growing number of active citizen reporters submitting high-quality, verifiable alerts.
*   **Immutable Record:** A steady stream of cases of socio-political violence being documented and certified on the Celo blockchain.
*   **Community Support:** Successful deployment and funding of the Regional Donation Contract, demonstrating the viability of the community-driven model.
*   **Education:** A consistent number of students successfully completing the "From Witness to Documenter" course.
*   **Platform Launch:** All functionality fully implemented and operational in production at sivel.xyz.

## Sustainability & Scalability: A Community-Owned Model

Our sustainability model is built on transparency and direct impact. By enabling region-specific donations, we empower individuals and organizations to support the documentation efforts they care about most. This creates a direct link between supporters and the on-the-ground impact.

This decentralized funding mechanism is inherently scalable. As the project grows, new regions can be added to the donation contract, allowing the system to expand organically wherever there is a need for ethical witnessing and a community to support it. The long-term vision is a globally scalable, community-governed system that sets a new standard for decentralized, ethical, and sustainable human rights documentation.

## Architectural Evolution: A Phased and Secure Transition

SIVeL 3 is engineered for long-term resilience and adaptability. Our architectural strategy is one of phased modernization, designed to balance cutting-edge technology with the paramount need for security and data integrity.

### The Role of SIVeL 2 (The Legacy Core)

The existing `sivel2` system, a robust Ruby on Rails application, currently serves as the primary engine for case documentation by our professional team. Its maturity and stability provide a trusted foundation for our core data.

### Gradual Migration to Next.js

We will progressively migrate case management functionalities to the new Next.js front-end. This transition will be methodical and cautious. New features for editing and visualizing cases will be developed, moving from the traditional, form-heavy approach of `sivel2` to more dynamic and intuitive interfaces—potentially evolving from the citizen alert mechanisms.

### A Security-First Approach

This migration is not merely a technical upgrade; it is a security-driven process. The stability and security of the `next.js` application will be rigorously evaluated on our recommended operating system, **adJ** (based on OpenBSD). We will leverage OpenBSD's advanced security features to contain and mitigate potential vulnerabilities, such as those that could lead to arbitrary code execution on the server.

The final decision on the pace and scope of this transition will be guided by our commitment to ensuring the platform remains a secure and reliable tool for human rights documentation. The integrity of our data and the safety of our users are non-negotiable.
