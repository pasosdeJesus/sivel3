import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { newKyselyPostgresql } from '@/.config/kysely.config'

/**
 * GET /api/web-analytics/timeline
 *
 * Returns daily page view counts for the last 30 days.
 * Used by the stats page for the timeline chart.
 */
export async function GET(_request: NextRequest) {
  try {
    const db = newKyselyPostgresql()

    const rows = await sql<{ date: string; count: number }>`
      SELECT created_at::date AS date, count(*)::int AS count
      FROM web_event
      WHERE event_type = 'pageview'
        AND created_at >= now() - interval '30 days'
      GROUP BY created_at::date
      ORDER BY date ASC
    `.execute(db)

    return NextResponse.json({ days: rows.rows })
  } catch (error) {
    console.error('[web-analytics] Timeline error:', error)
    return NextResponse.json({ error: 'Failed to load timeline' }, { status: 500 })
  }
}
