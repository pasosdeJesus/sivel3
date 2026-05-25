// scripts/mint-missing-sbts.ts
// Mints missing SBTs for a wallet. Usage: npx tsx scripts/mint-missing-sbts.ts 0xWALLET

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

import { createPublicClient, http } from 'viem'
import { celo } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { mintCredentialWithRetry, hasCredentialOnChain, getCeloCredentialsAddress } from '@pasosdejesus/m/blockchain'

const wallet = process.argv[2]
if (!wallet || !wallet.startsWith('0x')) { console.error('Usage: npx tsx scripts/mint-missing-sbts.ts 0xWALLET'); process.exit(1) }

const w = wallet.toLowerCase()
const chainId = 'celo'
const chain = celo
const rpc = (process.env.NEXT_PUBLIC_RPC_URL || '').replace(/"/g, '') || undefined

const deploymentsDir = path.join(process.cwd(), '..', 'hardhat', 'deployments', 'PasosDeJesusCredentials')
const contractAddress = getCeloCredentialsAddress(deploymentsDir)!

console.log(`Wallet: ${w}`)
console.log(`Chain: ${chainId}`)
console.log(`Contract: ${contractAddress}`)
console.log(`RPC: ${rpc?.slice(0, 50)}...`)

const pc = createPublicClient({ chain, transport: http(rpc) })
const db = newKyselyPostgresql() as any

// Resolve tokenIds from credential_metadata
const SBT_NAMES = ['Donor', 'Connector', 'Global Founder']
const tokenIds: { name: string; tokenId: number }[] = []
for (const name of SBT_NAMES) {
  const row = await db
    .selectFrom('credential_metadata')
    .select('token_id')
    .where('name', '=', name)
    .where('chain_id', '=', chainId)
    .executeTakeFirst()
  if (row) tokenIds.push({ name, tokenId: row.token_id })
  else console.log(`${name}: NOT REGISTERED for chain ${chainId}`)
}

if (tokenIds.length === 0) {
  console.log('No token types found. Register them first.')
  process.exit(1)
}

// Check and mint
let minted = 0
for (const { name, tokenId } of tokenIds) {
  // Check DB
  const existing = await db
    .selectFrom('credential_emission')
    .select('id')
    .where('wallet_address', '=', w)
    .where('token_id', '=', tokenId)
    .where('chain_id', '=', chainId)
    .executeTakeFirst()

  if (existing) { console.log(`[${name}] already in DB`); continue }

  // Check on-chain
  const hasOnChain = await hasCredentialOnChain(pc, contractAddress, w as `0x${string}`, tokenId)
  if (hasOnChain) {
    console.log(`[${name}] already on-chain, syncing to DB`)
    await db.insertInto('credential_emission')
      .values({ wallet_address: w, token_id: tokenId, chain_id: chainId })
      .onConflict((oc: any) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
      .execute()
    continue
  }

  // Mint
  console.log(`[${name}] minting...`)
  try {
    const hash = await mintCredentialWithRetry({
      privateKey: process.env.PRIVATE_KEY as `0x${string}`,
      rpcUrl: rpc || '',
      chain,
      contractAddress,
      userAddress: w as `0x${string}`,
      tokenId,
    })
    console.log(`[${name}] ✅ tx=${hash.slice(0, 10)}...`)

    await pc.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 60_000 })

    await db.insertInto('credential_emission')
      .values({ wallet_address: w, token_id: tokenId, chain_id: chainId })
      .onConflict((oc: any) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
      .execute()

    minted++
    console.log(`[${name}] ✅ confirmed + recorded`)
  } catch (e: any) {
    console.log(`[${name}] ❌ ${e.message?.slice(0, 200)}`)
  }
}

console.log(`\nMinted: ${minted}/${tokenIds.length}`)
