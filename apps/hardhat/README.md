# sivel3 - Smart Contracts

This directory contains the Hardhat development environment for the sivel3 project's smart contracts. These contracts form the on-chain backbone of our mission to create a transparent and sustainable ecosystem for human rights documentation.

## Smart Contract Architecture

Our architecture is designed to be modular and phased, allowing for secure and incremental development. The core components are:

1.  **`RegionalDonation.sol` (In Progress):** This is the heart of our sustainability model. This contract will allow anyone to donate funds (e.g., USDT) to specific, pre-approved geographic regions. It will serve as the treasury for on-the-ground operations.

2.  **`SBTs.sol` (Planned):** A Soul-Bound Token (SBT) contract for on-chain identity and role management. This will be used to issue non-transferable tokens that represent the official roles within our ecosystem: **Administrator**, **Documenter**, and **Publishing Validator**. This ensures clear accountability.

3.  **`CaseCertification.sol` (Planned):** This contract will provide the mechanism for creating an immutable, on-chain record of verified cases. After a case passes our rigorous 3-step verification process, its cryptographic hash will be stored permanently on the Celo blockchain via this contract.

4.  **`Incentives.sol` (Planned):** This contract will manage the automated distribution of funds from the `RegionalDonation` contract. It will handle rewards for citizen witnesses who submit verified alerts and periodic stipends for the official Documenters and Validators, creating a sustainable economic loop.

## Current Status: Foundational Development

Currently, this directory contains a mock USDT contract (`MockUSDT.sol`) used for local and testnet development. For more details, see **[MOCK_USDT_README.md](./MOCK_USDT_README.md)**.

## Prerequisites

- [Node.js](https://nodejs.org/) (>= 18)
- [Yarn](https://yarnpkg.com/)
- A Celo-compatible wallet with test funds. You can get Sepolia Celo tokens from the [Celo Faucet](https://faucet.celo.org/celo-sepolia).

## 1. Environment Configuration

First, create your environment file by copying the template:

```sh
cp .env.example .env
```

Next, edit the `.env` file with the following information:

- `PRIVATE_KEY`: The private key of the wallet you will use for deployment.
- `BLOCKSCOUT_API_KEY`: Your API key from Blockscout for contract verification. You can generate one in your account settings on the [Celo Blockscout explorer](https://explorer.celo.org/).

**⚠️ Security Warning:** Never use a wallet containing real funds for development. Always generate and use a separate, dedicated wallet for testing.

## 2. Platform-Specific Setup (adJ / OpenBSD)

Due to compatibility issues, Hardhat v3 does not work on adJ/OpenBSD as of 2025. This project is configured to use Hardhat v2. If you are on this platform, you must first run the following script to prepare the environment:

```sh
bin/prepadJ.sh
```

## 3. Development Workflow

Follow these steps to compile, deploy, and verify your contracts.

### Step 3.1: Install Dependencies

```sh
yarn install
```

### Step 3.2: Compile Contracts

This command compiles the Solidity contracts and automatically syncs the ABIs with the Next.js frontend.

```sh
yarn build
```

### Step 3.3: Deploy a Contract

Use the `yarn` scripts to deploy your contracts. For example, to deploy the mock USDT token, run:

```sh
yarn deploy-mock-usdt
```

The script will output the contract address. **Copy this address** and update the `USDT_ADDRESS` variable in your `.env` file.

### Step 3.4: Verify a Contract on Blockscout

To build trust and transparency, always verify your deployed contracts. For example, to verify the mock USDT token, run:

```sh
yarn verify-mock-usdt
```

## 4. Testing

The project uses Hardhat's built-in testing framework with Chai matchers.

To run the entire test suite, execute:

```sh
yarn test
```

## ABI Synchronization

The contract ABIs (Application Binary Interfaces) are essential for the frontend to interact with the smart contracts. This project is configured to sync them automatically to `../nextjs/abis/` every time you run `yarn build`. To run the sync manually, use `yarn sync:abis`.
