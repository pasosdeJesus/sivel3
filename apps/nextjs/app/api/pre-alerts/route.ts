import { sql } from 'kysely'
import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const departamento = url.searchParams.get('departamento')
    const municipio = url.searchParams.get('municipio')
    const wallet = url.searchParams.get('wallet')
    const buyer = url.searchParams.get('buyer')

    const offset = (page - 1) * limit

    const db = newKyselyPostgresql()

    let baseQuery = db
      .selectFrom('pre_alert')

    // buyer=wallet → map: show pending (market) + user's reserved
    // wallet=addr → dashboard: show all user's pre-alerts
    if (buyer) {
      baseQuery = baseQuery.where((eb) =>
        eb.or([
          eb('status', '=', 'pending'),
          eb('buyer_wallet', 'ilike', buyer),
        ]),
      )
    } else if (wallet) {
      baseQuery = baseQuery.where('buyer_wallet', 'ilike', wallet)
    } else {
      baseQuery = baseQuery.where('status', '=', 'pending')
    }

    if (departamento) {
      baseQuery = baseQuery.where(sql`json_data->>'departamento'`, '=', departamento)
    }
    if (municipio) {
      baseQuery = baseQuery.where(sql`json_data->>'municipio'`, '=', municipio)
    }

    const countResult = await baseQuery
      .select(sql<number>`count(*)`.as('total'))
      .executeTakeFirst()
    const total = Number(countResult?.total || 0)

    const preAlerts = await baseQuery
      .select([
        'id',
        'status',
        'buyer_wallet',
        'bought_at',
        'conversion_deadline',
        'score',
        'feedback',
        'citizen_notes',
        'source_urls',
        'source_summary',
        sql<string>`json_data->>'titulo'`.as('titulo'),
        sql<string>`json_data->>'fecha'`.as('fecha'),
        sql<string>`json_data->>'departamento'`.as('departamento'),
        sql<string>`json_data->>'municipio'`.as('municipio'),
      ])
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

    return NextResponse.json({
      pre_alerts: preAlerts,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('GET /api/pre-alerts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
