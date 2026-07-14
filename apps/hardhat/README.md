# sivel3 - Smart Contracts

This directory contains the Hardhat development environment for the sivel3 project's smart contracts. These contracts form the on-chain backbone of our mission to create a transparent and sustainable ecosystem for human rights documentation.

## Smart Contract Architecture

Our architecture is designed to be modular and phased, allowing for secure and incremental development. The core components are:

1.  **`RegionalDonation.sol` (In Progress):** This is the heart of our sustainability model. This contract will allow anyone to donate funds (e.g., USDT) to specific, pre-approved geographic regions. It will serve as the treasury for on-the-ground operations.

2.  **`PasosdeJesusCredentials.sol` (In Progress):** Unified credential contract (ERC1155 + AccessControl) for SBTs on Celo and NFTs on Base. Manages course completions, roles, achievements, and transferable collectibles across the Pasos de Jesús ecosystem.

3.  **`CaseCertification.sol` (Planned):** This contract will provide the mechanism for creating an immutable, on-chain record of verified cases. After a case passes our rigorous 3-step verification process, its cryptographic hash will be stored permanently on the Celo blockchain via this contract.

4.  **`Incentives.sol` (Planned):** This contract will manage the automated distribution of funds from the `RegionalDonation` contract. It will handle rewards for citizen witnesses who submit verified alerts and periodic stipends for the official Documenters and Validators, creating a sustainable economic loop.

## Current Status: Foundational Development

Currently, this directory contains:

- `MockUSDT.sol` — Fake USDT for local and testnet development. See **[MOCK_USDT_README.md](./MOCK_USDT_README.md)**.
- `PasosdeJesusCredentials.sol` — Unified SBT + NFT contract (ERC1155 + AccessControl), deployable on Celo and Base.
- `SIVeL3RegionalDonationV2.sol` — Regional donation management on Celo.

## Prerequisites

- [Node.js](https://nodejs.org/) (>= 18)
- [Yarn](https://yarnpkg.com/)
- A Celo-compatible wallet with test funds. You can get Sepolia Celo tokens from the [Celo Faucet](https://faucet.celo.org/celo-sepolia).

## 1. Environment Configuration

This project uses a **single unified `.env`**  file located at `apps/.env`.
Copy the template if needed:

```sh
cp ../.env.example ../.env
```

Edit `apps/.env` with:

- `PRIVATE_KEY`: The private key of the wallet used for deployment.
- `CREDENTIALS_PRIVATE_KEY`: Private key for `DEFAULT_ADMIN_ROLE` on `PasosDeJesusCredentials`.
- `BLOCKSCOUT_API_KEY`: API key from [Celo Blockscout](https://explorer.celo.org/) for verification.
- `BASESCAN_API_KEY`: API key from [BaseScan](https://basescan.org/) for Base verification.

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

The script will output the contract address. **Copy this address** and update `NEXT_PUBLIC_MOCK_USDT_ADDRESS` in `apps/.env`.

### Step 3.4: Deploy and Verify PasosDeJesusCredentials

```sh
# Deploy
bin/deployPdJCredentials celoSepolia
bin/deployPdJCredentials baseSepolia

# Verify source on explorers
bin/PdJCredentialsSourceVerification celoSepolia
bin/PdJCredentialsSourceVerification baseSepolia

# Functional verification
bin/verifyPdJCredentials celoSepolia
bin/verifyPdJCredentials baseSepolia
```

### Step 3.5: Verify a Contract on Blockscout

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
