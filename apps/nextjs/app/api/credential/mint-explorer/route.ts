import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, keccak256, encodePacked } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { getCeloCredentialsAddress } from '@pasosdejesus/m/blockchain'
import path from 'path'

const deploymentsDir = path.join(process.cwd(), '..', 'hardhat', 'deployments', 'PasosDeJesusCredentials')
import pasosDeJesusCredentialsAbi from '@/abis/PasosDeJesusCredentials.json'

const EXPLORER_TOKEN_ID = 13
const MIN_CASES = 3

async function isLearnTgVerified(wallet: string): Promise<boolean> {
  const key = process.env.PRIVATE_KEY
  if (!key) return true
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
  } catch { return true }
}

export async function POST(request: NextRequest) {
  const { wallet } = await request.json().catch(() => ({}))
  if (!wallet || !wallet.startsWith('0x') || wallet.length !== 42) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const db = newKyselyPostgresql()

  // Check if already minted
  const existing = await db
    .selectFrom('credential_emission')
    .selectAll()
    .where('wallet_address', '=', wallet)
    .where('token_id', '=', EXPLORER_TOKEN_ID)
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

  // Count distinct cases viewed (from web_event)
  const rows = await db
    .selectFrom('web_event')
    .select(db.fn.countAll().as('count'))
    .where('wallet', '=', wallet)
    .where('event_type', '=', 'pageview')
    .where('pathname', 'like', '/cases/%')
    .executeTakeFirst()

  const count = Number(rows?.count || 0)
  if (count < MIN_CASES) {
    return NextResponse.json({ minted: false, reason: 'insufficient_views', count })
  }

  // Mint Explorer SBT
  const contractAddress = getCeloCredentialsAddress(deploymentsDir)
  if (!contractAddress) {
    return NextResponse.json({ error: 'Contract not configured' }, { status: 500 })
  }

  const key = process.env.PRIVATE_KEY
  if (!key) {
    return NextResponse.json({ error: 'PRIVATE_KEY not configured' }, { status: 500 })
  }

  try {
    const chain = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? celo : celoSepolia
    const account = privateKeyToAccount(key as `0x${string}`)
    const walletClient = createWalletClient({ chain, transport: http(), account })

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: pasosDeJesusCredentialsAbi,
      functionName: 'mintCredential',
      args: [wallet as `0x${string}`, BigInt(EXPLORER_TOKEN_ID), BigInt(1)],
      chain,
      account,
    } as any)

    // Record emission
    await db.insertInto('credential_emission')
      .values({ wallet_address: wallet, token_id: EXPLORER_TOKEN_ID, chain_id: 'celo' })
      .onConflict((oc) => oc.columns(['wallet_address', 'token_id', 'chain_id']).doNothing())
      .execute()

    return NextResponse.json({ minted: true, txHash: hash, casesViewed: count })
  } catch (err: any) {
    console.error('Explorer mint failed:', err.message || err)
    return NextResponse.json({ minted: false, reason: 'tx_failed' }, { status: 500 })
  }
}
