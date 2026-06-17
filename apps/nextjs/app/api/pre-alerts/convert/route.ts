import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      pre_alert_id?: number
      buyer_wallet?: string
    }

    if (!body.pre_alert_id || !body.buyer_wallet) {
      return NextResponse.json(
        { error: 'pre_alert_id and buyer_wallet are required' },
        { status: 400 },
      )
    }

    const db = newKyselyPostgresql()

    const preAlert = await db
      .selectFrom('pre_alert')
      .selectAll()
      .where('id', '=', body.pre_alert_id)
      .executeTakeFirst()

    if (!preAlert) {
      return NextResponse.json({ error: 'Pre-alert not found' }, { status: 404 })
    }

    if (preAlert.status !== 'reserved') {
      return NextResponse.json(
        { error: `Pre-alert must be reserved to convert (status: ${preAlert.status})` },
        { status: 409 },
      )
    }

    if (preAlert.buyer_wallet?.toLowerCase() !== body.buyer_wallet.toLowerCase()) {
      return NextResponse.json(
        { error: 'buyer_wallet does not match the pre-alert owner' },
        { status: 403 },
      )
    }

    if (preAlert.conversion_deadline && new Date(preAlert.conversion_deadline as unknown as string) < new Date()) {
      return NextResponse.json(
        { error: 'Conversion deadline has expired' },
        { status: 410 },
      )
    }

    // TODO: Store enriched_json in alert/case system when available
    // For now, update status to converted
    await db
      .updateTable('pre_alert')
      .set({
        status: 'converted',
        converted_at: new Date() as unknown as string,
        updated_at: new Date() as unknown as string,
      })
      .where('id', '=', body.pre_alert_id)
      .execute()

    return NextResponse.json({
      success: true,
      alert_id: body.pre_alert_id,
      status: 'converted',
    })
  } catch (error) {
    console.error('POST /api/pre-alerts/convert error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
