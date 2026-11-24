import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { sql } from 'kysely'
import { isDocumenterWallet } from '@/lib/documenter'

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

    if (!isDocumenterWallet(wallet)) {
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
        'origin',
        'publisher_wallet',
      ])
      .where('status', '=', 'converted')
      // Nadie revisa su propia prealerta (R-#20, alertas de documentador).
      .where(sql<boolean>`lower(publisher_wallet) <> ${wallet.toLowerCase()}`)
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
