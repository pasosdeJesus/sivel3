// lib/credentials.ts
// Project-specific SBT minting wrapper — delegates on-chain mint to
// @pasosdejesus/m/blockchain (which handles Celo L2 nonce retry logic).
// Adds credential_emission tracking and donor threshold queries.

import { 
  createPublicClient, 
  createWalletClient, 
  http
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import {
  hasCredentialOnChain,
  mintCredentialWithRetry,
} from '@pasosdejesus/m/blockchain'
import { getCeloCredentialsAddress } from '@pasosdejesus/m/blockchain/deployments'
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
  const chain = getViemChain()
  const rpc = (process.env.NEXT_PUBLIC_RPC_URL || '').replace(/"/g, '') || undefined
  return createPublicClient({ chain, transport: http(rpc) }) as any
}

/**
 * Mints a single SBT on-chain (via @pasosdejesus/m) and records it in
 * credential_emission. Checks off-chain cache and on-chain balance first.
 * Returns { txHash } on success, null if already minted.
 */
export async function mintSBT(
  wallet: string,
  tokenId: number,
  chainId: string,
): Promise<{ txHash: string } | null> {
  console.log(`OJO mintSBT wallet=${wallet}, tokenId=${tokenId}, chainId=${chainId}`)
  const w = wallet.toLowerCase()
  const db = newKyselyPostgresql()
  const contractAddress = getCredentialsContractAddress()

  // Off-chain cache check
  const existing = await db
    .selectFrom('credential_emission')
    .select('id')
    .where('wallet_address', '=', w)
    .where('token_id', '=', tokenId)
    .where('chain_id', '=', chainId)
    .executeTakeFirst()

  if (existing) return null

  // On-chain check
  const publicClient = getPublicClient()
  const hasOnChain = await hasCredentialOnChain(publicClient, contractAddress, w as `0x${string}`, tokenId)
  if (hasOnChain) {
    await db.insertInto('credential_emission')
      .values({ wallet_address: w, token_id: tokenId, chain_id: chainId })
      .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
      .execute()
    return null
  }

  // Mint on-chain with Celo L2 retry (handled by @pasosdejesus/m)
  const acc = privateKeyToAccount((process.env.PRIVATE_KEY || '') as `0x${string}`)
  const hash = await mintCredentialWithRetry({
    account: acc,
    rpcUrl: (process.env.NEXT_PUBLIC_RPC_URL || '').replace(/"/g, ''),
    chain: getViemChain(),
    contractAddress,
    userAddress: w as `0x${string}`,
    tokenId,
  })

  // Wait for confirmation
  await getPublicClient().waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 120_000 })

  // Record emission
  await db.insertInto('credential_emission')
    .values({ wallet_address: w, token_id: tokenId, chain_id: chainId })
    .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
    .execute()

  return { txHash: hash }
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
    if (row) result.push({ tokenId: row.token_id, name: t.name, minUsdt: t.minUsdt })
  }

  return result.sort((a, b) => a.minUsdt - b.minUsdt)
}
