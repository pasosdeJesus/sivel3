import { sql } from 'kysely'
import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const preAlertId = parseInt(id)
    if (isNaN(preAlertId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const url = new URL(req.url)
    const wallet = url.searchParams.get('wallet')?.toLowerCase()

    const db = newKyselyPostgresql()

    const preAlert = await db
      .selectFrom('pre_alert')
      .selectAll()
      .where('id', '=', preAlertId)
      .executeTakeFirst()

    if (!preAlert) {
      return NextResponse.json({ error: 'Pre-alert not found' }, { status: 404 })
    }

    const jsonData = preAlert.json_data as Record<string, unknown> | null

    // Pre-purchase view (wallet not buyer, or no wallet provided)
    const isBuyer = wallet && preAlert.buyer_wallet?.toLowerCase() === wallet

    if (!isBuyer) {
      return NextResponse.json({
        id: preAlert.id,
        status: preAlert.status,
        titulo: jsonData?.titulo,
        fecha: jsonData?.fecha,
        departamento: jsonData?.departamento,
        municipio: jsonData?.municipio,
        source_urls: preAlert.source_urls,
        source_summary: preAlert.source_summary,
        can_purchase: preAlert.status === 'pending',
      })
    }

    // Post-purchase view (citizen is buyer)
    return NextResponse.json({
      id: preAlert.id,
      json_data: jsonData,
      status: preAlert.status,
      bought_at: preAlert.bought_at,
      conversion_deadline: preAlert.conversion_deadline,
    })
  } catch (error) {
    console.error('GET /api/pre-alerts/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
