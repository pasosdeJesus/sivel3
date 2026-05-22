import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, keccak256, encodePacked } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { getCeloCredentialsAddress } from '@pasosdejesus/m/blockchain'
import path from 'path'

const deploymentsDir = path.join(process.cwd(), '..', 'hardhat', 'deployments', 'PasosDeJesusCredentials')
import pasosDeJesusCredentialsAbi from '@/abis/PasosDeJesusCredentials.json'

const CONNECTOR_TOKEN_ID = 2
const MAX_FOUNDERS = 50

async function getFounderTokenId(
  db: ReturnType<typeof newKyselyPostgresql>,
  chainId: string,
): Promise<number | null> {
  const row = await db
    .selectFrom('credential_metadata')
    .select('token_id')
    .where('site', '=', 'sivel.xyz')
    .where('type', '=', 'achievement')
    .where('name', '=', 'Global Founder')
    .where('chain_id', '=', chainId)
    .executeTakeFirst()
  return row ? row.token_id : null
}

/**
 * Check if a wallet is self-verified on learn.tg.
 * Uses signed request per https://github.com/pasosdeJesus/learn.tg/issues/133
 */
async function isLearnTgVerified(wallet: string): Promise<boolean> {
  const key = process.env.PRIVATE_KEY
  if (!key) return true // no key configured, allow by default

  const timestamp = Math.floor(Date.now() / 1000)
  const message = keccak256(
    encodePacked(['address', 'uint256'], [wallet as `0x${string}`, BigInt(timestamp)])
  )
  const account = privateKeyToAccount(key as `0x${string}`)
  const signature = await account.signMessage({ message })

  try {
    const base = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'https://learn.tg' : 'https://learn.tg:9001'
    const url = `${base}/api/verify?wallet=${wallet}&timestamp=${timestamp}&signature=${signature}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json() as { verified?: boolean }
      return data.verified === true
    }
    return false
  } catch {
    return true // learn.tg unreachable — allow mint
  }
}

export async function POST(request: NextRequest) {
  const { wallet } = await request.json().catch(() => ({}))
  if (!wallet || !wallet.startsWith('0x') || wallet.length !== 42) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const db = newKyselyPostgresql()

  // Check if already minted (off-chain cache)
  const existing = await db
    .selectFrom('credential_emission')
    .selectAll()
    .where('wallet_address', '=', wallet)
    .where('token_id', '=', CONNECTOR_TOKEN_ID)
    .where('chain_id', '=', 'celo')
    .executeTakeFirst()

  if (existing) {
    return NextResponse.json({ minted: false, reason: 'already_has' })
  }

  // Verify self-verification on learn.tg
  const isVerified = await isLearnTgVerified(wallet)

  if (!isVerified) {
    return NextResponse.json({
      minted: false,
      reason: 'not_verified',
      message: 'Complete self-verification on learn.tg to earn this SBT',
    })
  }

  // Check on-chain
  const contractAddress = getCeloCredentialsAddress(deploymentsDir)
  if (!contractAddress) {
    return NextResponse.json({ error: 'Contract not configured' }, { status: 500 })
  }

  const chain = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? celo : celoSepolia
  const chainId = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'celo' : 'celoSepolia'
  const publicClient = createPublicClient({ chain, transport: http() })

  try {
    const hasOnChain = await publicClient.readContract({
      address: contractAddress,
      abi: pasosDeJesusCredentialsAbi,
      functionName: 'balanceOf',
      args: [wallet as `0x${string}`, BigInt(CONNECTOR_TOKEN_ID)],
    }) as bigint
    if (hasOnChain > 0n) {
      // Record in cache even if already on-chain
      await db.insertInto('credential_emission')
        .values({ wallet_address: wallet, token_id: CONNECTOR_TOKEN_ID, chain_id: 'celo' })
        .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
        .execute()
      return NextResponse.json({ minted: false, reason: 'already_has' })
    }
  } catch {
    // Contract read error — skip on-chain check
  }

  // Mint Connector SBT
  const key = process.env.PRIVATE_KEY
  if (!key) {
    return NextResponse.json({ error: 'PRIVATE_KEY not configured' }, { status: 500 })
  }

  try {
    const account = privateKeyToAccount(key as `0x${string}`)
    const walletClient = createWalletClient({ chain, transport: http(), account })

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: pasosDeJesusCredentialsAbi,
      functionName: 'mintCredential',
      args: [wallet as `0x${string}`, BigInt(CONNECTOR_TOKEN_ID), BigInt(1)],
      chain,
      account,
    } as any)

    // Record emission
    await db.insertInto('credential_emission')
      .values({ wallet_address: wallet, token_id: CONNECTOR_TOKEN_ID, chain_id: 'celo' })
      .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
      .execute()

    // Global Founder: mint if < 50 total and user doesn't already have it
    let founderMinted = false
    try {
      const founderTokenId = await getFounderTokenId(db, chainId)
      if (founderTokenId !== null) {
        const founderCount = await db
          .selectFrom('credential_emission')
          .select(db.fn.countAll().as('count'))
          .where('token_id', '=', founderTokenId)
          .where('chain_id', '=', chainId)
          .executeTakeFirst()

        if (Number(founderCount?.count || 0) < MAX_FOUNDERS) {
          const existingFounder = await db
            .selectFrom('credential_emission')
            .selectAll()
            .where('wallet_address', '=', wallet)
            .where('token_id', '=', founderTokenId)
            .where('chain_id', '=', chainId)
            .executeTakeFirst()

          if (!existingFounder) {
            await walletClient.writeContract({
              address: contractAddress,
              abi: pasosDeJesusCredentialsAbi,
              functionName: 'mintCredential',
              args: [wallet as `0x${string}`, BigInt(founderTokenId), BigInt(1)],
              chain,
              account,
            } as any)

            await db.insertInto('credential_emission')
              .values({ wallet_address: wallet, token_id: founderTokenId, chain_id: chainId })
              .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
              .execute()

            founderMinted = true
          }
        }
      }
    } catch {
      // Founder mint is best-effort — don't fail the Connector mint
    }

    return NextResponse.json({ minted: true, txHash: hash, founderMinted })
  } catch (err: any) {
    console.error('Connector mint failed:', err.message || err)
    return NextResponse.json({ minted: false, reason: 'tx_failed' }, { status: 500 })
  }
}
