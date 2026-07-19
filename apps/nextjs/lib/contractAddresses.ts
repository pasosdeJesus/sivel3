// lib/contractAddresses.ts
// Shared addresses from @pasosdejesus/m/blockchain (USDT, SLEARN, network resolver).
// Project-specific addresses (PreAlertMarket, RewardEscrow, RegionalDonation,
// Credentials) remain here.
//
// See REQ/8.md and REQ/57.md

import {
  USDT_ADDRESSES,
  SLEARN_ADDRESSES,
  resolveNetwork,
} from '@pasosdejesus/m/blockchain/ecosystem-addresses'

export const NETWORK = resolveNetwork()

export const USDT_ADDRESS = USDT_ADDRESSES[NETWORK]
export const SLEARN_ADDRESS = SLEARN_ADDRESSES[NETWORK]

// ============================================================
// SIVeL3PreAlertMarket (#43)
// ============================================================
const PREALERT_MARKET: Record<'celo' | 'celoSepolia', `0x${string}`> = { 
  celo: '0x9aefBD59455efE0F7732638eF791f35F110ddB0c' as `0x${string}`,
  celoSepolia: (process.env.NEXT_PUBLIC_PREALERT_MARKET_ADDRESS || '0x902413432aD345bab37093404849C09193AB9A23') as `0x${string}`
}
export const PREALERT_MARKET_ADDRESS = PREALERT_MARKET[NETWORK]

// ============================================================
// SIVeL3RewardEscrow (#47)
// ============================================================
const REWARD_ESCROW: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '0xBFD94B391882612425455305dc0c9b1eC41E155A' as `0x${string}`,
  celoSepolia: (process.env.NEXT_PUBLIC_REWARD_ESCROW_ADDRESS || '0x53aD49cBF4001aD0c8fe588dA330ED277bBD45f9') as `0x${string}`,
}
export const REWARD_ESCROW_ADDRESS = REWARD_ESCROW[NETWORK]

// ============================================================
// SIVeL3RegionalDonationV2 (#12)
// ============================================================
const REGIONAL_DONATION: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '0x563AbB7492bb496B9DD74d54D6daDd41374924E5' as `0x${string}`,
  celoSepolia: process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`,
}
export const REGIONAL_DONATION_ADDRESS = REGIONAL_DONATION[NETWORK]

// ============================================================
// PasosDeJesusCredentials
// ============================================================
const CREDENTIALS: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '' as `0x${string}`, // pending mainnet deployment
  celoSepolia: '0x593f4486Fc7F3403e01a9c71E90ceE5DaD84A439',
}
export const CREDENTIALS_ADDRESS = CREDENTIALS[NETWORK]
