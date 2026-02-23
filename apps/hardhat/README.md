# sivel3 - Smart Contracts

This directory contains the Hardhat development environment for the sivel3 project's smart contracts. It is structured as a template to facilitate the development, testing, and deployment of the project's future on-chain components.

## Project Goal

The ultimate goal is to develop smart contracts that support the mission of sivel3. 

## Current Status: Mock Token

Currently, this directory contains a foundational piece for development and testing: a secure, OpenZeppelin-based mock USDT contract.

- **`MockUSDT.sol`**: An ERC20 token used for testing in local or testnet environments. It includes an owner-only minting function to ensure controlled testing. For more specific details, please see **[MOCK_USDT_README.md](./MOCK_USDT_README.md)**.

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
