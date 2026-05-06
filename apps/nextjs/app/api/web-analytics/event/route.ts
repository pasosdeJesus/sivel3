import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

/**
 * POST /api/web-analytics/event
 *
 * Records client-side analytics events (wallet connect/disconnect,
 * donation start, donation failure) that can only be observed
 * in the browser.
 *
 * Body: { event_type, wallet?, metadata?, session_id? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event_type, wallet, metadata, session_id } = body

    if (!event_type || typeof event_type !== 'string') {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      undefined
    const userAgent = request.headers.get('user-agent') || undefined
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || undefined

    const db = newKyselyPostgresql()
    await db
      .insertInto('web_event')
      .values({
        event_type,
        wallet: wallet || null,
        session_id: session_id || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ip: ip || null,
        user_agent: userAgent || null,
        referrer: referrer || null,
      })
      .execute()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[web-analytics] Error recording event:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
