// lib/credentials.ts
// Project-specific SBT minting wrapper — uses @pasosdejesus/m/blockchain for
// on-chain interactions, adds credential_emission tracking and metadata queries.
//
// What stays in the shared m package (per its README):
//   - mintRoleSBT, hasCredentialOnChain (contract interaction)
//   - getCeloCredentialsAddress (deployment resolution)
//   - composeCredentialImage (badge generation)
//
// What stays in the project:
//   - credential_emission inserts (table structure differs per project)
//   - getDonorThresholds (business logic: which thresholds = donor SBTs)
//   - getChainId (project-specific env var resolution)

import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import {
  mintRoleSBT,
  hasCredentialOnChain,
  getCeloCredentialsAddress,
} from '@pasosdejesus/m/blockchain'
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

function getWalletClient() {
  const key = process.env.PRIVATE_KEY
  if (!key) throw new Error('PRIVATE_KEY not configured')
  const chain = getViemChain()
  const account = privateKeyToAccount(key as `0x${string}`)
  return createWalletClient({ chain, transport: http(), account })
}

function getPublicClient() {
  const chain = getViemChain()
  return createPublicClient({ chain, transport: http() })
}

/**
 * Mints a single SBT on-chain (via @pasosdejesus/m) and records it in
 * credential_emission. Returns the tx hash on success, or null if already
 * minted (off-chain cache or on-chain check). Throws on RPC errors.
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

  if (existing) return null

  // On-chain check (SBT may have been minted outside our DB)
  const publicClient = getPublicClient()
  const hasOnChain = await hasCredentialOnChain(publicClient, contractAddress, wallet as `0x${string}`, tokenId)
  if (hasOnChain) {
    await db.insertInto('credential_emission')
      .values({ wallet_address: wallet, token_id: tokenId, chain_id: chainId })
      .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
      .execute()
    return null
  }

  // Mint on-chain
  const walletClient = getWalletClient()
  const publicClient2 = getPublicClient()
  const hash = await mintRoleSBT(walletClient, contractAddress, wallet as `0x${string}`, tokenId)

  // Wait for confirmation to avoid nonce collisions on subsequent mints
  await publicClient2.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 120_000 })

  // Record emission
  await db.insertInto('credential_emission')
    .values({ wallet_address: wallet, token_id: tokenId, chain_id: chainId })
    .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
    .execute()

  return { txHash: hash }
}

/**
 * Resolves donor threshold tokenIds from credential_metadata.
 * Returns thresholds sorted by minUsdt ascending.
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
    console.log(`[credentials] getDonorThresholds: ${t.name} chain=${chainId} → ${row ? row.token_id : 'NOT FOUND'}`)
    if (row) {
      result.push({ tokenId: row.token_id, name: t.name, minUsdt: t.minUsdt })
    }
  }

  return result.sort((a, b) => a.minUsdt - b.minUsdt)
}
