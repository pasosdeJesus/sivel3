import type { Kysely } from 'kysely'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'
import { keccak256, encodePacked } from 'viem'
import pasosDeJesusCredentialsAbi from '../../abis/PasosDeJesusCredentials.json'
import path from 'path'
import fs from 'fs'

const DONOR_THRESHOLDS: { name: string; minUsdt: number }[] = [
  { name: 'Donor', minUsdt: 0.02 },
  { name: 'Donor Bronze', minUsdt: 5 },
  { name: 'Donor Silver', minUsdt: 20 },
  { name: 'Donor Gold', minUsdt: 50 },
  { name: 'Donor Diamond', minUsdt: 100 },
]

async function getTokenId(
  db: Kysely<any>,
  site: string,
  type: string,
  name: string,
): Promise<number | null> {
  const row = await db
    .selectFrom('credential_metadata')
    .select('token_id')
    .where('site', '=', site)
    .where('type', '=', type)
    .where('name', '=', name)
    .where('chain_id', '=', 'celo')
    .executeTakeFirst()
  return row ? row.token_id : null
}

async function mintIfMissing(
  db: Kysely<any>,
  wallet: string,
  tokenId: number,
  walletClient: any,
  publicClient: any,
  contractAddress: `0x${string}`,
): Promise<boolean> {
  const existing = await db
    .selectFrom('credential_emission')
    .select('id')
    .where('wallet_address', '=', wallet)
    .where('token_id', '=', tokenId)
    .where('chain_id', '=', 'celo')
    .executeTakeFirst()

  if (existing) return false

  // Also verify on-chain (credential may have been minted outside DB tracking)
  try {
    const hasOnChain = await publicClient.readContract({
      address: contractAddress,
      abi: pasosDeJesusCredentialsAbi,
      functionName: 'balanceOf',
      args: [wallet as `0x${string}`, BigInt(tokenId)],
    }) as bigint
    if (hasOnChain > 0n) {
      // Record in DB for future idempotency
      await db
        .insertInto('credential_emission')
        .values({ wallet_address: wallet, token_id: tokenId, chain_id: 'celo' })
        .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
        .execute()
      console.log(`  - ${wallet.slice(0, 6)}...${wallet.slice(-4)} → tokenId ${tokenId} (already on-chain, recorded)`)
      return true
    }
  } catch {
    // Contract read failed — proceed with mint attempt
  }

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: pasosDeJesusCredentialsAbi,
    functionName: 'mintCredential',
    args: [wallet as `0x${string}`, BigInt(tokenId), BigInt(1)],
    chain: walletClient.chain,
    account: walletClient.account,
  } as any)

  // Wait for confirmation before next transaction (prevents nonce collisions)
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 })

  await db
    .insertInto('credential_emission')
    .values({ wallet_address: wallet, token_id: tokenId, chain_id: 'celo' })
    .execute()

  console.log(`  ✓ ${wallet.slice(0, 6)}...${wallet.slice(-4)} → tokenId ${tokenId}. tx=${hash.slice(0, 10)}...`)
  return true
}

async function checkLearnTgVerified(wallet: string, key: `0x${string}`): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000)
  const message = keccak256(
    encodePacked(['address', 'uint256'], [wallet as `0x${string}`, BigInt(timestamp)]),
  )
  const account = privateKeyToAccount(key)
  const signature = await account.signMessage({ message })

  try {
    const base = process.env.LEARNTG_URL || 'https://learn.tg'
    const url = `${base}/api/verify?wallet=${wallet}&timestamp=${timestamp}&signature=${signature}`
    const res = await fetch(url)
    if (!res.ok) return false
    const data = (await res.json()) as { verified?: boolean }
    return data.verified === true
  } catch {
    return false
  }
}

export async function up(db: Kysely<any>): Promise<void> {
  const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'celoSepolia'
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL
  const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}` | undefined

  if (!RPC_URL) throw new Error('NEXT_PUBLIC_RPC_URL not set')
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not set')

  // Resolve contract address from deployment file or env var
  const deploymentsDirBf = path.join(process.cwd(), '..', 'hardhat', 'deployments', 'PasosDeJesusCredentials')
  const deploymentFileBf = path.join(deploymentsDirBf, `${NETWORK}.json`)
  let resolvedAddress: `0x${string}`
  if (fs.existsSync(deploymentFileBf)) {
    resolvedAddress = JSON.parse(fs.readFileSync(deploymentFileBf, 'utf-8')).address as `0x${string}`
  } else {
    const envAddr = process.env.NEXT_PUBLIC_PDJCREDENTIALS_CELO_ADDRESS
    if (!envAddr) throw new Error('NEXT_PUBLIC_PDJCREDENTIALS_CELO_ADDRESS not set and no deployment file found')
    resolvedAddress = envAddr as `0x${string}`
  }

  console.log(`Iniciando backfill de SBTs en ${NETWORK}`)
  console.log(`Contrato: ${resolvedAddress}`)

  const chain = NETWORK === 'celo' ? celo : celoSepolia
  const account = privateKeyToAccount(PRIVATE_KEY)
  const walletClient = createWalletClient({ chain, transport: http(RPC_URL), account })

  // Verify contract reachable
  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) })
  try {
    await publicClient.readContract({
      address: resolvedAddress,
      abi: pasosDeJesusCredentialsAbi,
      functionName: 'nextTokenId',
    })
  } catch (err: any) {
    throw new Error(`Contract not reachable on ${NETWORK}: ${err.message}`)
  }

  // Resolve tokenIds from credential_metadata cache
  const connectorId = await getTokenId(db, 'sivel.xyz', 'achievement', 'Connector')
  const founderId = await getTokenId(db, 'sivel.xyz', 'achievement', 'Global Founder')

  const donorIds: { tokenId: number; minUsdt: number }[] = []
  for (const t of DONOR_THRESHOLDS) {
    const tid = await getTokenId(db, 'sivel.xyz', 'achievement', t.name)
    if (tid) donorIds.push({ tokenId: tid, minUsdt: t.minUsdt })
  }

  console.log(`TokenIds: Connector=${connectorId}, Donor levels=${donorIds.map(d => d.tokenId).join(',')}, Founder=${founderId}`)

  if (!connectorId && donorIds.length === 0 && !founderId) {
    console.log('No hay tipos registrados en credential_metadata. Ejecuta sync_credential_metadata primero.')
    return
  }

  let totalMinted = 0
  let errors = 0

  // ── 1. Connector ──────────────────────────────────────
  if (connectorId) {
    console.log('\n── Connector (tokenId=' + connectorId + ') ──')
    const wallets = await db
      .selectFrom('web_event')
      .select('wallet')
      .where('wallet', 'is not', null)
      .groupBy('wallet')
      .execute()

    for (const row of wallets) {
      try {
        const minted = await mintIfMissing(db, row.wallet as string, connectorId, walletClient, publicClient, resolvedAddress)
        if (minted) totalMinted++
      } catch (err: any) {
        console.error(`  ✗ ${row.wallet}: ${err.message}`)
        errors++
      }
    }
    console.log(`  Listo.`)
  }

  // ── 2. Donor levels (cumulative) ─────────────────────
  for (const donor of donorIds) {
    console.log(`\n── ${donor.tokenId} (≥ $${donor.minUsdt}) ──`)
    const wallets = await db
      .selectFrom('transaction')
      .select(['wallet', db.fn.sum('cantidad').as('total')])
      .where('tipo', '=', 'donation')
      .groupBy('wallet')
      .execute()

    for (const row of wallets) {
      const total = parseFloat(row.total as string)
      if (total < donor.minUsdt) continue
      try {
        const minted = await mintIfMissing(db, row.wallet as string, donor.tokenId, walletClient, publicClient, resolvedAddress)
        if (minted) totalMinted++
      } catch (err: any) {
        console.error(`  ✗ ${row.wallet}: ${err.message}`)
        errors++
      }
    }
    console.log(`  Listo.`)
  }

  // ── 3. Global Founder (first 50 by date + learn.tg verified) ──
  if (founderId) {
    console.log(`\n── Global Founder (tokenId=${founderId}) ──`)
    const earliestWallets = await db
      .selectFrom('web_event')
      .select(['wallet', db.fn.min('created_at').as('first_seen')])
      .where('wallet', 'is not', null)
      .groupBy('wallet')
      .orderBy('first_seen', 'asc')
      .limit(50)
      .execute()

    let verifiedFounders = 0
    for (const row of earliestWallets) {
      const wallet = row.wallet as string
      const verified = await checkLearnTgVerified(wallet, PRIVATE_KEY)
      if (!verified) {
        console.log(`  - ${wallet.slice(0, 6)}...${wallet.slice(-4)} (no verificado en learn.tg)`)
        continue
      }
      try {
        const minted = await mintIfMissing(db, wallet, founderId, walletClient, publicClient, resolvedAddress)
        if (minted) {
          totalMinted++
          verifiedFounders++
        }
      } catch (err: any) {
        console.error(`  ✗ ${wallet}: ${err.message}`)
        errors++
      }
    }
    console.log(`  ${verifiedFounders} Global Founders minteados de ${earliestWallets.length} wallets tempranas.`)
  }

  console.log(`\nBackfill completo: ${totalMinted} SBTs minteados, ${errors} errores.`)
}

export async function down(_db: Kysely<any>): Promise<void> {
  console.error(
    'Migración irreversible. Los SBTs minteados están en la blockchain. ' +
    'Para revocar SBTs individuales usa revokeCredential.',
  )
}
