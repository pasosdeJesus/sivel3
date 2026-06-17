import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { sql } from 'kysely'

// TODO(#9): Replace with SBT-based DOCUMENTER_ROLE verification
// For MVP2, use hardcoded list from DOCUMENTER_WALLETS env variable
async function isDocumenter(wallet: string): Promise<boolean> {
  const allowed = (process.env.DOCUMENTER_WALLETS || '')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(wallet.toLowerCase())
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const wallet = url.searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json(
        { error: 'wallet query parameter is required' },
        { status: 400 },
      )
    }

    if (!(await isDocumenter(wallet))) {
      return NextResponse.json(
        { error: 'DOCUMENTER_ROLE required' },
        { status: 403 },
      )
    }

    const db = newKyselyPostgresql()

    const converted = await db
      .selectFrom('pre_alert')
      .select([
        'id',
        'json_data',
        'source_urls',
        'source_summary',
        'buyer_wallet',
        'bought_at',
        'converted_at',
        'status',
      ])
      .where('status', '=', 'converted')
      .orderBy('converted_at', 'desc')
      .execute()

    return NextResponse.json({
      pending: converted,
      total: converted.length,
    })
  } catch (error) {
    console.error('GET /api/pre-alerts/queue error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
