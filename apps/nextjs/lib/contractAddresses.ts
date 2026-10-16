// lib/contractAddresses.ts
// Shared addresses from @pasosdejesus/mpdj/blockchain (USDT, SLEARN, network resolver).
// Project-specific addresses (PreAlertMarket, RewardEscrow, RegionalDonation,
// Credentials) remain here.
//
// Pattern: the Celo Sepolia (testnet) default is the canonical ecosystem DEV
// deployment, so an incomplete .env falls back to it instead of `undefined`; the
// `NEXT_PUBLIC_*` env var overrides it with another, even more test, deployment.
//
// See REQ/8.md and REQ/57.md (the ecosystem-shared half is `m/REQ/51`).

import {
  USDT_ADDRESSES,
  SLEARN_ADDRESSES,
  resolveNetwork,
} from '@pasosdejesus/mpdj/blockchain/ecosystem-addresses'

export const NETWORK = resolveNetwork()

export const USDT_ADDRESS = USDT_ADDRESSES[NETWORK]
export const SLEARN_ADDRESS = SLEARN_ADDRESSES[NETWORK]

/** `env` when set (the "even more test" deployment), else the canonical dev default. */
const pick = (env: string | undefined, fallback: `0x${string}`): `0x${string}` =>
  (env || fallback) as `0x${string}`

// ============================================================
// SIVeL3PreAlertMarket (#43)
// ============================================================
const PREALERT_MARKET: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '0x9aefBD59455efE0F7732638eF791f35F110ddB0c' as `0x${string}`,
  celoSepolia: pick(process.env.NEXT_PUBLIC_PREALERT_MARKET_ADDRESS, '0x902413432aD345bab37093404849C09193AB9A23'),
}
export const PREALERT_MARKET_ADDRESS = PREALERT_MARKET[NETWORK]

// ============================================================
// SIVeL3RewardEscrow (#47)
// ============================================================
const REWARD_ESCROW: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '0xBFD94B391882612425455305dc0c9b1eC41E155A' as `0x${string}`,
  celoSepolia: pick(process.env.NEXT_PUBLIC_REWARD_ESCROW_ADDRESS, '0x53aD49cBF4001aD0c8fe588dA330ED277bBD45f9'),
}
export const REWARD_ESCROW_ADDRESS = REWARD_ESCROW[NETWORK]

// ============================================================
// SIVeL3RegionalDonationV2 (#12)
// ============================================================
const REGIONAL_DONATION: Record<'celo' | 'celoSepolia', `0x${string}`> = {
  celo: '0x563AbB7492bb496B9DD74d54D6daDd41374924E5' as `0x${string}`,
  celoSepolia: pick(process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS, '0xc50123fb87e4167fe9275cab90ae35551fe1248e'),
}
export const REGIONAL_DONATION_ADDRESS = REGIONAL_DONATION[NETWORK]

// NOTE: PasosDeJesusCredentials has no entry here. Its address is resolved per
// network from the Hardhat deployment files by `getCeloCredentialsAddress()` in
// `lib/credentials.ts` (see ADMIN.md / doc/deployment-credentials.md).
