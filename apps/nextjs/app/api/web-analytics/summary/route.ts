import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'

export async function GET(_request: NextRequest) {
  try {
    const db = newKyselyPostgresql()

    const [views24h, views7d, views30d,
           sessions24h, sessions7d, sessions30d,
           wallets24h, wallets7d,
           ips24h, ips7d,
           donationStarted24h, donationCompleted24h,
           topPages,
           errorTotal24h,
           /* on-chain stats from transaction */
           totalDonations, totalUsdtDonated, uniqueDonors,
           donationsByRegion, totalLearningPoints] = await Promise.all([
      db.selectFrom('web_event').select(sql<number>`count(*)`.as('v'))
        .where('event_type', '=', 'pageview').where(sql<boolean>`created_at >= now() - interval '24 hours'`).executeTakeFirst(),
      db.selectFrom('web_event').select(sql<number>`count(*)`.as('v'))
        .where('event_type', '=', 'pageview').where(sql<boolean>`created_at >= now() - interval '7 days'`).executeTakeFirst(),
      db.selectFrom('web_event').select(sql<number>`count(*)`.as('v'))
        .where('event_type', '=', 'pageview').where(sql<boolean>`created_at >= now() - interval '30 days'`).executeTakeFirst(),

      db.selectFrom('web_event').select(sql<number>`count(distinct session_id)`.as('v'))
        .where('event_type', '=', 'pageview').where(sql<boolean>`created_at >= now() - interval '24 hours'`).executeTakeFirst(),
      db.selectFrom('web_event').select(sql<number>`count(distinct session_id)`.as('v'))
        .where('event_type', '=', 'pageview').where(sql<boolean>`created_at >= now() - interval '7 days'`).executeTakeFirst(),
      db.selectFrom('web_event').select(sql<number>`count(distinct session_id)`.as('v'))
        .where('event_type', '=', 'pageview').where(sql<boolean>`created_at >= now() - interval '30 days'`).executeTakeFirst(),

      db.selectFrom('web_event').select(sql<number>`count(distinct wallet)`.as('v'))
        .where('wallet', 'is not', null).where(sql<boolean>`created_at >= now() - interval '24 hours'`).executeTakeFirst(),
      db.selectFrom('web_event').select(sql<number>`count(distinct wallet)`.as('v'))
        .where('wallet', 'is not', null).where(sql<boolean>`created_at >= now() - interval '7 days'`).executeTakeFirst(),

      db.selectFrom('web_event').select(sql<number>`count(distinct ip)`.as('v'))
        .where('ip', 'is not', null).where(sql<boolean>`created_at >= now() - interval '24 hours'`).executeTakeFirst(),
      db.selectFrom('web_event').select(sql<number>`count(distinct ip)`.as('v'))
        .where('ip', 'is not', null).where(sql<boolean>`created_at >= now() - interval '7 days'`).executeTakeFirst(),

      db.selectFrom('web_event').select(sql<number>`count(*)`.as('v'))
        .where('event_type', '=', 'donation_started').where(sql<boolean>`created_at >= now() - interval '24 hours'`).executeTakeFirst(),
      db.selectFrom('web_event').select(sql<number>`count(*)`.as('v'))
        .where('event_type', '=', 'donation_completed').where(sql<boolean>`created_at >= now() - interval '24 hours'`).executeTakeFirst(),

      db.selectFrom('web_event').select(['pathname', sql<number>`count(*)`.as('cnt')])
        .where('event_type', '=', 'pageview').where('pathname', 'is not', null)
        .where(sql<boolean>`created_at >= now() - interval '7 days'`)
        .groupBy('pathname').orderBy(sql`count(*)`, 'desc').limit(10).execute(),

      db.selectFrom('web_event').select(sql<number>`count(*)`.as('v'))
        .where('event_type', '=', 'api_error').where(sql<boolean>`created_at >= now() - interval '24 hours'`).executeTakeFirst(),

      // On-chain: count of USDT donations
      db.selectFrom('transaction').select(sql<number>`count(*)`.as('v'))
        .where('crypto', '=', 'usdt').executeTakeFirst(),

      // On-chain: total USDT donated
      db.selectFrom('transaction').select(sql<string>`coalesce(sum(cantidad::numeric), 0)`.as('v'))
        .where('crypto', '=', 'usdt').executeTakeFirst(),

      // On-chain: unique donor wallets
      db.selectFrom('transaction').select(sql<number>`count(distinct wallet)`.as('v'))
        .where('crypto', '=', 'usdt').executeTakeFirst(),

      // On-chain: donations by region
      db.selectFrom('transaction').select(['region_id', sql<number>`count(*)`.as('cnt'), sql<string>`coalesce(sum(cantidad::numeric), 0)`.as('total')])
        .where('crypto', '=', 'usdt').where('region_id', 'is not', null)
        .groupBy('region_id').orderBy(sql`count(*)`, 'desc').execute(),

      // On-chain: learning points earned
      db.selectFrom('transaction').select(sql<string>`coalesce(sum(cantidad::numeric), 0)`.as('v'))
        .where('crypto', '=', 'learningpoint').executeTakeFirst(),
    ])

    const toNum = (r: { v?: string | number | bigint } | undefined): number =>
      r ? Number(r.v ?? 0) : 0

    const started = toNum(donationStarted24h)
    const completed = toNum(donationCompleted24h)
    const toStr = (r: { v?: string | number | bigint } | undefined, fallback = '0'): string =>
      r ? String(r.v ?? fallback) : fallback

    return NextResponse.json({
      pageViews: { '24h': toNum(views24h), '7d': toNum(views7d), '30d': toNum(views30d) },
      uniqueSessions: { '24h': toNum(sessions24h), '7d': toNum(sessions7d), '30d': toNum(sessions30d) },
      uniqueWallets: { '24h': toNum(wallets24h), '7d': toNum(wallets7d) },
      uniqueIps: { '24h': toNum(ips24h), '7d': toNum(ips7d) },
      donationConversion: {
        started,
        completed,
        rate: started > 0 ? Math.round((completed / started) * 100) : 0,
      },
      errors24h: toNum(errorTotal24h),
      topPages: (topPages as { pathname: string; cnt: number }[]).map((r) => ({
        path: r.pathname,
        views: Number(r.cnt),
      })),
      onChain: {
        totalDonations: toNum(totalDonations),
        totalUsdtDonated: toStr(totalUsdtDonated),
        uniqueDonors: toNum(uniqueDonors),
        totalLearningPoints: toStr(totalLearningPoints),
        donationsByRegion: (donationsByRegion as { region_id: number; cnt: number; total: string }[]).map((r) => ({
          regionId: r.region_id,
          count: Number(r.cnt),
          total: r.total,
        })),
      },
    })
  } catch (error) {
    console.error('[web-analytics] Summary error:', error)
    recordEvent({ event_type: 'api_error', metadata: { route: '/api/web-analytics/summary', status: 500 } })
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
