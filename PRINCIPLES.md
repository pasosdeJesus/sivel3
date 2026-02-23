# SIVeL 3 - Project Principles

For the development of SIVeL, we adhere to the following principles for handling information on political violence, as suggested by the Jesuit priest Javier Giraldo.

### 1. Maximum Accessibility

To maximize accessibility, SIVeL 3 and its documentation are practially public domain (license ISC) and available on the internet at no cost. The software tools recommended and used to operate the platform are also public domain or use permissive open-source licenses (e.g., MIT, BSD, or GPL). Under no circumstances does the project rely on closed-source software or components that require royalty payments or restrict copying and redistribution.

### 2. Confidentiality of Information Sources

Guaranteeing the confidentiality of information sources is paramount, especially in sensitive cases involving Human Rights (HR) violations, International Humanitarian Law (IHL), and Socio-Political Violence (SPV). We have prioritized security throughout the development of SIVeL 3.

### 3. Non-Commercialization of Victim Information

The personal information of victims is never to be commercialized. This is a foundational ethical commitment of the project. This principle is a key driver for our non-profit, donation-based funding model.

### 4. Alignment with International Humanitarian Law

The categories of violence must correspond to the categories of International Humanitarian Law so as not to dilute the responsibility of the State.

---

## Security Practices

To uphold the principle of source confidentiality, we have implemented the following security practices:

*   **Open Source for Public Auditing:** The source code for all SIVeL 3 components is open and publicly available. We build on the legacy of our predecessors (SIVeL 1 and 2), which maintained an open invitation to the community to audit the source code and identify security flaws, sometimes with financial bounties. We intend to continue this tradition for SIVeL 3.

*   **Continuous Security Audits:** The platform's components, especially the smart contracts and backend services, are subject to rigorous security audits, both automated and manual.

*   **Secure Recommended Platform:** We contribute to the development of the **`Aprendiendo de Jesús` (adJ)** operating system, which is based on OpenBSD. We recommend it as our official operating platform. In its default configuration, `adJ` ensures that all databases and backups for SIVeL are encrypted with a key provided at boot time. This means that in the event of physical server theft or illegitimate inspection, the data remains inaccessible if the machine is powered off.

*   **Client-Side Security:** We strongly recommend that end-users connect to the platform using secure operating systems (e.g., Ubuntu or other Linux distributions) instead of platforms that may have a weaker security posture. Client-side security is a critical link in the chain of trust, and efforts on the server side would be futile without it.

### **Important Notice**

We define a critical security failure as one that can be exploited on the stable version of our software when it is operating on the recommended platform (i.e., the default configuration of the `Aprendiendo de Jesús` distribution, available at http://aprendiendo.pasosdeJesus.org).
