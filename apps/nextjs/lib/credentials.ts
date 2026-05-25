// lib/credentials.ts
// Project-specific SBT minting wrapper — uses @pasosdejesus/m/blockchain for
// on-chain interactions, adds credential_emission tracking and metadata queries.
//
// Nonce handling on Celo L2:
//   Celo's OP Stack sequencer rejects txs that try to replace pending ones
//   ("replacement transaction underpriced"). To work around this:
//   1. Use blockTag: 'pending' to get the next available nonce
//   2. Pass explicit gasPrice from the network (viem auto-estimate is unreliable)
//   3. On failure, wait and retry with fresher nonce — stuck txs eventually clear
//   4. Fallback: use blockTag: 'latest' to skip stuck pending txs

import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import {
  hasCredentialOnChain,
  getCeloCredentialsAddress,
} from '@pasosdejesus/m/blockchain'
import pasosDeJesusCredentialsAbi from '@/abis/PasosDeJesusCredentials.json'
import path from 'path'
import type { Kysely } from 'kysely'

const deploymentsDir = path.join(process.cwd(), '..', 'hardhat', 'deployments', 'PasosDeJesusCredentials')

export function getChainId(): string {
  return process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'celo' : 'celoSepolia'
}

function getViemChain() {
  return process.env.NEXT_PUBLIC_NETWORK === 'celo' ? celo : celoSepolia
}

function getCredentialsContractAddress(): `0x${string}` {
  const addr = getCeloCredentialsAddress(deploymentsDir)
  if (!addr) throw new Error('Contract not configured')
  return addr
}

function getPublicClient() {
  // Don't cache — nonce can change between calls
  const chain = getViemChain()
  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || '').replace(/"/g, '') || undefined
  return createPublicClient({ chain, transport: http(rpc) })
}

/**
 * Mints a single SBT on-chain and records it in credential_emission.
 * Retries with nonce strategies on Celo-specific failures.
 * Returns { txHash } on success, null if already minted. Throws if all retries fail.
 */
export async function mintSBT(
  wallet: string,
  tokenId: number,
  chainId: string,
): Promise<{ txHash: string } | null> {
  const db = newKyselyPostgresql()
  const contractAddress = getCredentialsContractAddress()

  // Off-chain cache check
  const existing = await db
    .selectFrom('credential_emission')
    .select('id')
    .where('wallet_address', '=', wallet)
    .where('token_id', '=', tokenId)
    .where('chain_id', '=', chainId)
    .executeTakeFirst()

  if (existing) { console.log(`[credentials] mintSBT: tokenId=${tokenId} already in credential_emission`); return null }

  // On-chain check
  const publicClient = getPublicClient()
  const hasOnChain = await hasCredentialOnChain(publicClient, contractAddress, wallet as `0x${string}`, tokenId)
  if (hasOnChain) {
    console.log(`[credentials] mintSBT: tokenId=${tokenId} already on-chain, recording emission`)
    await db.insertInto('credential_emission')
      .values({ wallet_address: wallet, token_id: tokenId, chain_id: chainId })
      .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
      .execute()
    return null
  }

  // Mint on-chain with retry
  const key = process.env.PRIVATE_KEY!
  const chain = getViemChain()
  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || '').replace(/"/g, '') || undefined
  const acc = privateKeyToAccount(key as `0x${string}`)

  let lastError: any
  for (let attempt = 1; attempt <= 5; attempt++) {
    const wc = createWalletClient({ chain, transport: http(rpc), account: acc })
    const pc2 = getPublicClient()

    const nonce = await pc2.getTransactionCount({
      address: acc.address,
      blockTag: attempt <= 3 ? 'pending' : 'latest',
    })
    const gasPrice = await pc2.getGasPrice()

    console.log(`[credentials] mintSBT: tokenId=${tokenId} attempt=${attempt} nonce=${nonce} gasPrice=${Number(gasPrice)/1e9}gwei`)

    try {
      const hash = await wc.writeContract({
        address: contractAddress,
        abi: pasosDeJesusCredentialsAbi,
        functionName: 'mintCredential',
        args: [wallet as `0x${string}`, BigInt(tokenId), BigInt(1)],
        chain,
        account: acc,
        nonce,
        gasPrice,
      } as any)

      // Wait for confirmation
      await pc2.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 120_000 })

      // Record emission
      await db.insertInto('credential_emission')
        .values({ wallet_address: wallet, token_id: tokenId, chain_id: chainId })
        .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
        .execute()

      return { txHash: hash }
    } catch (err: any) {
      lastError = err
      const msg = err.message || ''
      if (msg.includes('replacement') || msg.includes('underpriced') || msg.includes('Missing or invalid')) {
        console.log(`[credentials] mintSBT: retryable error, waiting 2s...`)
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
      throw err // non-retryable error
    }
  }

  throw lastError
}

/**
 * Resolves donor threshold tokenIds from credential_metadata.
 */
export async function getDonorThresholds(
  db: Kysely<any>,
  chainId: string,
): Promise<{ tokenId: number; name: string; minUsdt: number }[]> {
  const DONOR_THRESHOLDS: { name: string; minUsdt: number }[] = [
    { name: 'Donor', minUsdt: 0.02 },
    { name: 'Bronze Donor', minUsdt: 5 },
    { name: 'Silver Donor', minUsdt: 20 },
    { name: 'Gold Donor', minUsdt: 50 },
    { name: 'Diamond Donor', minUsdt: 100 },
  ]

  const result: { tokenId: number; name: string; minUsdt: number }[] = []
  for (const t of DONOR_THRESHOLDS) {
    const row = await db
      .selectFrom('credential_metadata')
      .select('token_id')
      .where('name', '=', t.name)
      .where('chain_id', '=', chainId)
      .executeTakeFirst()
    if (row) {
      console.log(`[credentials] getDonorThresholds: ${t.name} chain=${chainId} → ${row.token_id}`)
      result.push({ tokenId: row.token_id, name: t.name, minUsdt: t.minUsdt })
    } else {
      console.log(`[credentials] getDonorThresholds: ${t.name} chain=${chainId} → NOT FOUND`)
    }
  }

  return result.sort((a, b) => a.minUsdt - b.minUsdt)
}
