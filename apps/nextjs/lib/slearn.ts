// lib/slearn.ts
// Mints SLEARN cashback for all donors via mintAndReserve().
// Replaces lib/learningPoints.ts (learn.tg API deactivated, returns 410).
//
// === Flow ===
// 1. Transfer 10% of donation USDT from server wallet to SLEARN contract
// 2. Call mintAndReserve(donor, usdtAmount) — mints SLEARN at 1:22 rate
// 3. Retry on collision (shared USDT pool — see doc/slearn-integration.md §3.1)
//
// === SLEARN contract ===
// Mainnet: 0x27fd41Bea85C39254f2B12789eB37a1543152CC1
// Sepolia: 0x9fBa3A2Ca0275c4D7A3eA341923f8c531e913BFA

import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'
import { SLEARN_ADDRESS, USDT_ADDRESS } from '@/lib/contractAddresses'

const SLEARN_ABI = parseAbi([
  'function mintAndReserve(address to, uint256 usdtAmount) external returns (uint256)',
  'function usdtToSLEARN(uint256 usdtAmount) view returns (uint256)',
  'function paused() view returns (bool)',
])

const USDT_ABI = parseAbi([
  'function transfer(address to, uint256 amount) external returns (bool)',
])

function getChain() {
  return process.env.NEXT_PUBLIC_NETWORK === 'celo' ? celo : celoSepolia
}

const CASHBACK_PERCENT = 10 // 10% of donation goes to SLEARN reserve

export interface SlearnResult {
  success: boolean
  message: string
  userMessage: string
  txHash?: string
  slearnAmount?: string
}

/**
 * Transfer USDT to SLEARN contract, then call mintAndReserve().
 * Retries up to 3 times on collision (shared USDT pool).
 */
async function transferAndMint(
  donor: `0x${string}`,
  usdtAmount: bigint,
  maxRetries = 3,
): Promise<{ hash: `0x${string}`; slearnAmount: bigint }> {
  const account = privateKeyToAccount((process.env.PRIVATE_KEY || '') as `0x${string}`)
  const chain = getChain()
  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || '').replace(/"/g, '') || undefined
  const slearn = SLEARN_ADDRESS
  const usdt = USDT_ADDRESS

  const wc = createWalletClient({ chain, transport: http(rpc), account })
  const pc = createPublicClient({ chain, transport: http(rpc) })

  // Check if SLEARN is paused
  const paused = await pc.readContract({
    address: slearn, abi: SLEARN_ABI, functionName: 'paused',
  })
  if (paused) throw new Error('SLEARN contract is paused')

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Step 1: Transfer USDT to SLEARN contract
    const transferHash = await wc.writeContract({
      address: usdt, abi: USDT_ABI,
      functionName: 'transfer',
      args: [slearn, usdtAmount],
      chain, account,
    })
    await pc.waitForTransactionReceipt({ hash: transferHash, timeout: 60_000 })

    // Step 2: Mint SLEARN
    try {
      const hash = await wc.writeContract({
        address: slearn, abi: SLEARN_ABI,
        functionName: 'mintAndReserve',
        args: [donor, usdtAmount],
        chain, account,
      })
      await pc.waitForTransactionReceipt({ hash, timeout: 60_000 })

      const slearnAmount = await pc.readContract({
        address: slearn, abi: SLEARN_ABI,
        functionName: 'usdtToSLEARN',
        args: [usdtAmount],
      })

      return { hash, slearnAmount }
    } catch (err: any) {
      if (err.message?.includes('insufficient USDT balance') && attempt < maxRetries - 1) {
        console.warn(`[slearn] Collision, retrying (${attempt + 1}/${maxRetries})...`)
        await new Promise(r => setTimeout(r, 1000))
        continue
      }
      throw err
    }
  }
  throw new Error(`mintAndReserve failed after ${maxRetries} retries`)
}

/**
 * Mint SLEARN cashback for a verified donor.
 * 10% of the donation amount in USDT is sent to the SLEARN reserve
 * and SLEARN is minted to the donor's wallet at 22:1 rate.
 *
 * @returns { usdtToReserve, slearnMinted, txHash } or null if user not verified
 */
export async function mintSlearnCashback(
  wallet: string,
  donationAmountUsdt: number,
): Promise<{ usdtToReserve: string; slearnMinted: string; txHash: string } | null> {
  console.log(`OJO mintSlearnCashback wallet=${wallet}, donation=${donationAmountUsdt}`)

  // 10% of donation to SLEARN reserve
  const usdtToReserve = (donationAmountUsdt * CASHBACK_PERCENT) / 100
  const usdtAmount = BigInt(Math.round(usdtToReserve * 1_000_000)) // USDT has 6 decimals

  if (usdtAmount <= 0n) {
    console.log(`[slearn] Cashback amount too small: ${usdtToReserve}`)
    return null
  }

  try {
    const { hash, slearnAmount } = await transferAndMint(wallet as `0x${string}`, usdtAmount)
    const slearnMinted = (Number(slearnAmount) / 100).toFixed(2) // SLEARN has 2 decimals

    console.log(`[slearn] Minted ${slearnMinted} SLEARN to ${wallet.slice(0, 8)}..., tx=${hash.slice(0, 10)}...`)
    return {
      usdtToReserve: usdtToReserve.toFixed(2),
      slearnMinted,
      txHash: hash,
    }
  } catch (err: any) {
    console.error(`[slearn] mintSlearnCashback failed: ${err.message}`)
    return null
  }
}

/**
 * Returns the SLEARN cashback percentage for logging/display.
 */
export function getCashbackPercent(): number {
  return CASHBACK_PERCENT
}
