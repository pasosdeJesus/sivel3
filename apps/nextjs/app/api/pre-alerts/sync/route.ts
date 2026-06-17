import { verifyMessage } from 'viem'
import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

const AGENT_WALLET_ADDRESS =
  (process.env.AGENT_WALLET_ADDRESS || '').toLowerCase()
const SIGNATURE_WINDOW_MS = 5 * 60 * 1000 // ±5 minutes

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('X-Agent-Signature')
    const timestamp = req.headers.get('X-Agent-Timestamp')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing X-Agent-Signature header' },
        { status: 401 },
      )
    }
    if (!timestamp) {
      return NextResponse.json(
        { error: 'Missing X-Agent-Timestamp header' },
        { status: 401 },
      )
    }

    // Verify timestamp is within window
    const ts = new Date(timestamp).getTime()
    if (Math.abs(Date.now() - ts) > SIGNATURE_WINDOW_MS) {
      return NextResponse.json(
        { error: 'Timestamp outside allowed window (±5 minutes)' },
        { status: 401 },
      )
    }

    const body = (await req.json()) as {
      event_hash: string
      json_data: Record<string, unknown>
      publisher_wallet: string
      source_urls: string[]
      source_summary?: string
    }

    if (!body.event_hash || !body.json_data || !body.publisher_wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: event_hash, json_data, publisher_wallet' },
        { status: 400 },
      )
    }

    // Verify signature
    const message = `${body.event_hash}:${timestamp}`
    let recovered: string
    try {
      recovered = await verifyMessage({ message, signature: signature as `0x${string}` })
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    if (recovered.toLowerCase() !== AGENT_WALLET_ADDRESS) {
      return NextResponse.json(
        { error: `Signer ${recovered} not authorized. Expected ${AGENT_WALLET_ADDRESS}` },
        { status: 401 },
      )
    }

    // Check for duplicate
    const db = newKyselyPostgresql()
    const existing = await db
      .selectFrom('pre_alert')
      .select('id')
      .where('event_hash', '=', body.event_hash)
      .executeTakeFirst()

    if (existing) {
      return NextResponse.json(
        {
          error: 'Duplicate event_hash',
          pre_alert_id: existing.id,
        },
        { status: 409 },
      )
    }

    // Insert
    const result = await db
      .insertInto('pre_alert')
      .values({
        event_hash: body.event_hash,
        json_data: JSON.stringify(body.json_data),
        status: 'pending',
        publisher_wallet: body.publisher_wallet.toLowerCase(),
        source_urls: JSON.stringify(body.source_urls || []),
        source_summary: body.source_summary || null,
      })
      .returning('id')
      .executeTakeFirst()

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to insert pre_alert' },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        pre_alert_id: result.id,
        status: 'pending',
        event_hash: body.event_hash,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /api/pre-alerts/sync error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
