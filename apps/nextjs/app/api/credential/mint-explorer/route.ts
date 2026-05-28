import { NextRequest, NextResponse } from 'next/server'
import { keccak256, encodePacked } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { mintSBT, getChainId } from '@/lib/credentials'
import { getCredentialMetadata } from '@pasosdejesus/m/blockchain'

const MIN_CASES = 3

async function getTokenId(
  db: ReturnType<typeof newKyselyPostgresql>,
  name: string,
  chainId: string,
): Promise<number | null> {
  const row = await db
    .selectFrom('credential_metadata')
    .select('token_id')
    .where('name', '=', name)
    .where('chain_id', '=', chainId)
    .executeTakeFirst()
  return row ? row.token_id : null
}

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

async function hasDonated(db: ReturnType<typeof newKyselyPostgresql>, wallet: string): Promise<boolean> {
  const row = await db
    .selectFrom('transaction')
    .select('id')
    .where('wallet', '=', wallet)
    .where('tipo', '=', 'donation')
    .where('crypto', '=', 'usdt')
    .executeTakeFirst()
  return !!row
}

export async function POST(request: NextRequest) {
  const { wallet: raw } = await request.json().catch(() => ({}))
  const wallet = (raw || '').toLowerCase()
  if (!wallet || !wallet.startsWith('0x') || wallet.length !== 42) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const chainId = getChainId()
  const db = newKyselyPostgresql()

  const rows = await db
    .selectFrom('web_event')
    .select(db.fn.countAll().as('count'))
    .where('wallet', '=', wallet)
    .where('event_type', '=', 'pageview')
    .where('pathname', 'like', '/cases/%')
    .executeTakeFirst()

  const count = Number(rows?.count || 0)
  console.log(`[Explorer] wallet=${wallet.slice(0,6)} views=${count} minCases=${MIN_CASES}`)
  if (count < MIN_CASES) {
    console.log(`[Explorer] insufficient views: ${count} < ${MIN_CASES}`)
    return NextResponse.json({ minted: false, reason: 'insufficient_views', count })
  }

  const isVerified = await isLearnTgVerified(wallet)
  const donated = await hasDonated(db, wallet)
  console.log(`[Explorer] wallet=${wallet.slice(0,6)} verified=${isVerified} donated=${donated}`)
  if (!isVerified && !donated) {
    console.log(`[Explorer] blocked: not verified and no donations`)
    return NextResponse.json({
      minted: false,
      reason: 'not_verified',
      message: 'Complete self-verification on learn.tg or make a donation to earn SBTs',
    })
  }

  try {
    const explorerTokenId = await getTokenId(db, 'Explorer', chainId)
    if (!explorerTokenId) {
      return NextResponse.json({ error: 'Explorer type not registered' }, { status: 500 })
    }

    const result = await mintSBT(wallet, explorerTokenId, chainId)
    if (!result) {
      console.log(`[Explorer] already has Explorer SBT`)
      return NextResponse.json({ minted: false, reason: 'already_has' })
    }
    console.log(`[Explorer] ✅ minted! tx=${result.txHash.slice(0,10)} views=${count}`)

    const meta = await getCredentialMetadata(db as any, explorerTokenId, chainId)

    return NextResponse.json({
      minted: true,
      txHash: result.txHash,
      casesViewed: count,
      mintedSbt: meta ? { name: meta.name, imageUrl: meta.image_url } : null,
    })
  } catch (err: any) {
    console.error('Explorer mint failed:', err.message || err)
    return NextResponse.json({ minted: false, reason: 'tx_failed' }, { status: 500 })
  }
}
