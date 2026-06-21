// lib/contractAddresses.ts
// Hardcoded contract addresses for client-side use.
// Read from deployments/ on the server (readDeployment), use these on the client.

export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'celo' : 'celoSepolia') as 'celo' | 'celoSepolia'

// ============================================================
// USDT
// ============================================================
const USDT: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e',
  celoSepolia: process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`,
}
export const USDT_ADDRESS = USDT[NETWORK]

// ============================================================
// SIVeL3PreAlertMarket (#43)
// ============================================================
const PREALERT_MARKET: Record<'celo' | 'celoSepolia', `0x${string}`> = { 
  celo: '' as `0x${string}`, // pending mainnet deployment
  celoSepolia: (process.env.NEXT_PUBLIC_PREALERT_MARKET_ADDRESS || '0x902413432aD345bab37093404849C09193AB9A23') as `0x${string}`
}
export const PREALERT_MARKET_ADDRESS = PREALERT_MARKET[NETWORK]

// ============================================================
// SIVeL3RewardEscrow (#47)
// ============================================================
const REWARD_ESCROW: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '' as `0x${string}`, // pending mainnet deployment
  celoSepolia: (process.env.NEXT_PUBLIC_PREALERT_MARKET_ADDRESS || '0x902413432aD345bab37093404849C09193AB9A23') as `0x${string}`,
}
export const REWARD_ESCROW_ADDRESS = REWARD_ESCROW[NETWORK]

// ============================================================
// SIVeL3RegionalDonationV2 (#12)
// ============================================================
const REGIONAL_DONATION: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '' as `0x${string}`,
  celoSepolia: process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`,
}
export const REGIONAL_DONATION_ADDRESS = REGIONAL_DONATION[NETWORK]

// ============================================================
// SLEARN
// ============================================================
const SLEARN: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '0x27fd41Bea85C39254f2B12789eB37a1543152CC1',
  celoSepolia: process.env.NEXT_PUBLIC_SLEARN_ADDRESS as `0x${string}`,
}
export const SLEARN_ADDRESS = SLEARN[NETWORK]

// ============================================================
// PasosDeJesusCredentials
// ============================================================
const CREDENTIALS: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '' as `0x${string}`, // pending mainnet deployment
  celoSepolia: '0x593f4486Fc7F3403e01a9c71E90ceE5DaD84A439',
}
export const CREDENTIALS_ADDRESS = CREDENTIALS[NETWORK]
