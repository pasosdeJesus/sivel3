import { celo, celoSepolia, base, baseSepolia } from 'viem/chains'

export function networkName() {
  return process.env.NEXT_PUBLIC_NETWORK || 'celoSepolia'
}

export function chainFor(network) {
  switch (network) {
    case 'celo':
      return celo
    case 'celoSepolia':
      return celoSepolia
    case 'base':
      return base
    case 'baseSepolia':
      return baseSepolia
    default:
      throw new Error(`unknown network ${network}`)
  }
}

export function rpcFor(network) {
  switch (network) {
    case 'celo':
      return process.env.CELO_RPC_URL || 'https://forno.celo.org'
    case 'celoSepolia':
      return process.env.NEXT_PUBLIC_RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org/'
    case 'base':
      return process.env.BASE_RPC_URL || 'https://mainnet.base.org'
    case 'baseSepolia':
      return process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://sepolia.base.org'
    default:
      throw new Error(`unknown network ${network}`)
  }
}
