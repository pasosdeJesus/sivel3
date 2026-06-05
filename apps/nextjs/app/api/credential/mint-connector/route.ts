import { NextRequest, NextResponse } from 'next/server'
import { keccak256, encodePacked } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { mintSBT, getChainId } from '@/lib/credentials'
import { getCredentialMetadata } from '@pasosdejesus/m/blockchain'

const MAX_FOUNDERS = 50

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
  } catch {
    return true
  }
}

async function hasDonated(db: ReturnType<typeof newKyselyPostgresql>, wallet: string): Promise<boolean> {
  const row = await db
    .selectFrom('transaction')
    .select('id')
    .where('wallet', '=', wallet)
    .where('type', '=', 'donation')
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

  // Verify: either learn.tg verified OR has donated
  const isVerified = await isLearnTgVerified(wallet)
  const donated = await hasDonated(db, wallet)
  if (!isVerified && !donated) {
    return NextResponse.json({
      minted: false,
      reason: 'not_verified',
      message: 'Complete self-verification on learn.tg or make a donation to earn SBTs',
    })
  }

  try {
    const connectorId = await getTokenId(db, 'Connector', chainId)
    if (!connectorId) {
      return NextResponse.json({ error: 'Connector type not registered' }, { status: 500 })
    }
    const connectorResult = await mintSBT(wallet, connectorId, chainId)
    if (!connectorResult) {
      return NextResponse.json({ minted: false, reason: 'already_has' })
    }

    let founderMinted = false
    let founderTokenId: number | null = null
    try {
      founderTokenId = await getTokenId(db, 'Global Founder', chainId)
      if (founderTokenId !== null) {
        const founderCount = await db
          .selectFrom('credential_emission')
          .select(db.fn.countAll().as('count'))
          .where('token_id', '=', founderTokenId)
          .where('chain_id', '=', chainId)
          .executeTakeFirst()

        if (Number(founderCount?.count || 0) < MAX_FOUNDERS) {
          const result = await mintSBT(wallet, founderTokenId, chainId)
          if (result) founderMinted = true
        }
      }
    } catch { /* best effort */ }

    const [connectorMeta, founderMeta] = await Promise.all([
      getCredentialMetadata(db as any, connectorId, chainId),
      founderMinted && founderTokenId !== null
        ? getCredentialMetadata(db as any, founderTokenId, chainId)
        : Promise.resolve(null),
    ])

    const mintedSbts: { name: string; imageUrl: string }[] = []
    if (connectorMeta) mintedSbts.push({ name: connectorMeta.name, imageUrl: connectorMeta.image_url })
    if (founderMeta) mintedSbts.push({ name: founderMeta.name, imageUrl: founderMeta.image_url })

    return NextResponse.json({ minted: true, txHash: connectorResult.txHash, founderMinted, mintedSbts })
  } catch (err: any) {
    console.error('Connector mint failed:', err.message || err)
    return NextResponse.json({ minted: false, reason: 'tx_failed' }, { status: 500 })
  }
}
