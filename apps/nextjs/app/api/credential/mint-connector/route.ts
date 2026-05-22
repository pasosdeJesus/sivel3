import { NextRequest, NextResponse } from 'next/server'
import { keccak256, encodePacked } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { mintSBT, getChainId } from '@/lib/credentials'
import { getCredentialMetadata } from '@pasosdejesus/m/blockchain'

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

export async function POST(request: NextRequest) {
  const { wallet } = await request.json().catch(() => ({}))
  if (!wallet || !wallet.startsWith('0x') || wallet.length !== 42) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const chainId = getChainId()
  const isVerified = await isLearnTgVerified(wallet)
  if (!isVerified) {
    return NextResponse.json({
      minted: false,
      reason: 'not_verified',
      message: 'Complete self-verification on learn.tg to earn this SBT',
    })
  }

  const db = newKyselyPostgresql()

  try {
    // Mint Connector
    const connectorResult = await mintSBT(wallet, CONNECTOR_TOKEN_ID, chainId)
    if (!connectorResult) {
      return NextResponse.json({ minted: false, reason: 'already_has' })
    }

    // Global Founder: mint if < 50 total
    let founderMinted = false
    let founderTokenId: number | null = null
    try {
      founderTokenId = await getFounderTokenId(db, chainId)
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
    } catch {
      // Founder mint is best-effort
    }

    // Resolve SBT names for toast
    const [connectorMeta, founderMeta] = await Promise.all([
      getCredentialMetadata(db, CONNECTOR_TOKEN_ID, chainId),
      founderMinted && founderTokenId !== null
        ? getCredentialMetadata(db, founderTokenId, chainId)
        : Promise.resolve(null),
    ])

    const mintedSbts: { name: string; imageUrl: string }[] = []
    if (connectorMeta) mintedSbts.push({ name: connectorMeta.name, imageUrl: connectorMeta.image_url })
    if (founderMeta) mintedSbts.push({ name: founderMeta.name, imageUrl: founderMeta.image_url })

    return NextResponse.json({
      minted: true,
      txHash: connectorResult.txHash,
      founderMinted,
      mintedSbts,
    })
  } catch (err: any) {
    console.error('Connector mint failed:', err.message || err)
    return NextResponse.json({ minted: false, reason: 'tx_failed' }, { status: 500 })
  }
}
