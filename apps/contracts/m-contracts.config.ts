/**
 * m-contracts.config.ts — sivel3 contracts without Hardhat.
 *
 * `contract:compile` reads `solidity`; `contract:deploy` reads
 * `networks.<network>.url` and `chainId`; `contract:verify` reads
 * `explorer.<network>.apiUrl`. The values are read with regular expressions,
 * so this file must be a literal object (no functions, no imports).
 *
 * Pin 0.8.24 (installed as `solc@0.8.24`) with `evmVersion: 'cancun'` and the
 * optimizer enabled (200 runs): these are the settings of the artifacts and
 * the mainnet deployment, so `contract:compile` stays byte-identical.
 */
const config = {
  solidity: '0.8.24',
  optimizer: { enabled: true, runs: 200 },
  evmVersion: 'cancun',
  networks: {
    celo: {
      url: 'https://forno.celo.org',
      chainId: 42220,
    },
    celoSepolia: {
      url: 'https://forno.celo-sepolia.celo-testnet.org/',
      chainId: 11142220,
    },
    base: {
      url: 'https://mainnet.base.org',
      chainId: 8453,
    },
    baseSepolia: {
      url: 'https://sepolia.base.org',
      chainId: 84532,
    },
  },
  explorer: {
    celo: {
      apiUrl: 'https://celo.blockscout.com/api',
      apiKeyEnv: 'BLOCKSCOUT_API_KEY',
    },
    celoSepolia: {
      apiUrl: 'https://celo-sepolia.blockscout.com/api',
      apiKeyEnv: 'BLOCKSCOUT_API_KEY',
    },
    base: {
      apiUrl: 'https://api.etherscan.io/v2/api?chainid=8453',
      apiKeyEnv: 'BASESCAN_API_KEY',
    },
    baseSepolia: {
      apiUrl: 'https://api.etherscan.io/v2/api?chainid=84532',
      apiKeyEnv: 'BASESCAN_API_KEY',
    },
  },
}

export default config
