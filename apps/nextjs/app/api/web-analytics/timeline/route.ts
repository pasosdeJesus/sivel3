import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { newKyselyPostgresql } from '@/.config/kysely.config'

/**
 * GET /api/web-analytics/timeline?metric=<name>&days=<n>
 *
 * Returns daily aggregated counts for the requested metric over the last N days.
 *
 * Metrics:
 *   pageviews     — daily page view counts (default, days=30)
 *   uniqueWallets — daily distinct wallets with page views (days=30)
 *   uniqueIps     — daily distinct IPs with page views (days=30)
 *   errors        — daily api_error counts (days=30)
 *   donations     — daily donation_completed counts (days=30)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'pageviews'
    const days = Math.min(parseInt(searchParams.get('days') || '30') || 30, 90)

    const db = newKyselyPostgresql()

    let query: ReturnType<typeof sql<{ date: string; count: number }>>

    switch (metric) {
      case 'uniqueWallets':
        query = sql<{ date: string; count: number }>`
          SELECT created_at::date AS date, count(DISTINCT wallet)::int AS count
          FROM web_event
          WHERE wallet IS NOT NULL
            AND created_at >= now() - (${days} || ' days')::interval
          GROUP BY created_at::date
          ORDER BY date ASC
        `
        break

      case 'uniqueIps':
        query = sql<{ date: string; count: number }>`
          SELECT created_at::date AS date, count(DISTINCT ip)::int AS count
          FROM web_event
          WHERE ip IS NOT NULL
            AND created_at >= now() - (${days} || ' days')::interval
          GROUP BY created_at::date
          ORDER BY date ASC
        `
        break

      case 'errors':
        query = sql<{ date: string; count: number }>`
          SELECT created_at::date AS date, count(*)::int AS count
          FROM web_event
          WHERE event_type = 'api_error'
            AND created_at >= now() - (${days} || ' days')::interval
          GROUP BY created_at::date
          ORDER BY date ASC
        `
        break

      case 'donations':
        query = sql<{ date: string; count: number }>`
          SELECT created_at::date AS date, count(*)::int AS count
          FROM web_event
          WHERE event_type = 'donation_completed'
            AND created_at >= now() - (${days} || ' days')::interval
          GROUP BY created_at::date
          ORDER BY date ASC
        `
        break

      default:
        query = sql<{ date: string; count: number }>`
          SELECT created_at::date AS date, count(*)::int AS count
          FROM web_event
          WHERE event_type = 'pageview'
            AND created_at >= now() - (${days} || ' days')::interval
          GROUP BY created_at::date
          ORDER BY date ASC
        `
    }

    const rows = await query.execute(db)

    return NextResponse.json({ metric, days, data: rows.rows })
  } catch (error) {
    console.error('[web-analytics] Timeline error:', error)
    return NextResponse.json({ error: 'Failed to load timeline' }, { status: 500 })
  }
}
