// lib/slearn.ts
// Mints SLEARN cashback for verified donors via mintAndReserve().
// Replaces lib/learningPoints.ts (learn.tg API deactivated, returns 410).
//
// === Flow ===
// 1. Verify donor on learn.tg via GET /api/verify (EIP-191, 5 min window)
// 2. If verified: transfer 10% of donation USDT to SLEARN contract
// 3. Call mintAndReserve(donor, usdtAmount) — mints SLEARN at 1:22 rate
// 4. Retry on collision (shared USDT pool — see doc/slearn-integration.md §3.1)
//
// === SLEARN contract ===
// Mainnet: 0x27fd41Bea85C39254f2B12789eB37a1543152CC1
// Sepolia: 0x9fBa3A2Ca0275c4D7A3eA341923f8c531e913BFA

import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'

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

function getSlearnAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_SLEARN_ADDRESS
  if (!addr) throw new Error('NEXT_PUBLIC_SLEARN_ADDRESS not set')
  return addr as `0x${string}`
}

function getUsdtAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_USDT_ADDRESS
  if (!addr) throw new Error('NEXT_PUBLIC_USDT_ADDRESS not set')
  return addr as `0x${string}`
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
 * Verify if a wallet is verified on learn.tg (Self.xyz passport).
 * Same protocol as mint-connector verification.
 */
async function isVerifiedOnLearnTg(wallet: string): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000)
  const pk = process.env.PRIVATE_KEY || ''
  console.log(`[slearn] PK length=${pk.length}, starts=${pk.slice(0,6)}...`)
  const account = privateKeyToAccount(pk as `0x${string}`)
  console.log(`[slearn] Signing verify request with: ${account.address}`)

  // Sign: keccak256(encodePacked(['address', 'uint256'], [wallet, timestamp]))
  const message = `${wallet}${timestamp}`
  const signature = await account.signMessage({ message })

function getVerifyUrl(): string {
  return process.env.NEXT_PUBLIC_NETWORK === 'celo'
    ? 'https://learn.tg'
    : 'https://learn.tg:9001'
}

  const verifyUrl = `${getVerifyUrl()}/api/verify?wallet=${wallet}&timestamp=${timestamp}&signature=${signature}`
  try {
    const res = await fetch(verifyUrl)
    if (!res.ok) return false
    const data = await res.json()
    return data.verified === true
  } catch {
    return false
  }
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
  const slearn = getSlearnAddress()
  const usdt = getUsdtAddress()

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

  // Check verification
  const verified = await isVerifiedOnLearnTg(wallet)
  if (!verified) {
    console.log(`[slearn] Wallet ${wallet.slice(0, 8)}... not verified, skipping cashback`)
    return null
  }

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
