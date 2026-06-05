import { makeSummaryHandler } from '@pasosdejesus/m/wba/routes'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { sql } from 'kysely'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/web-analytics/summary
 *
 * Returns aggregated web + on-chain analytics for the dashboard.
 * Extends the shared handler with project-specific queries:
 * - donationsByRegion (USDT donations grouped by region_id)
 * - totalLearningPoints (sum of learningpoint transactions)
 */
const baseHandler = makeSummaryHandler(
  () => newKyselyPostgresql() as any,
  { transactionTable: 'transaction' },
)

export async function GET(req: NextRequest) {
  const res = await baseHandler(req)
  if (res.status !== 200) return res

  const data = await res.json()
  const db = newKyselyPostgresql() as any

  try {
    // Donations by region
    const byRegion = await db
      .selectFrom('transaction')
      .select([
        'region_id',
        sql<string>`coalesce(sum(amount::numeric), 0)::text`.as('total'),
        sql<number>`count(*)::int8`.as('count'),
      ])
      .where('type', '=', 'donation')
      .where('crypto', '=', 'usdt')
      .where('region_id', 'is not', null)
      .groupBy('region_id')
      .orderBy('region_id')
      .execute()

    data.onChain.donationsByRegion = byRegion.map((r: any) => ({
      regionId: r.region_id,
      total: r.total,
      count: Number(r.count),
    }))

    // Total learning points
    const lpRows = await sql<{ v: string }>`
      SELECT coalesce(sum(amount::numeric), 0)::text AS v
      FROM transaction WHERE crypto = 'learningpoint'
    `.execute(db)

    data.onChain.totalLearningPoints = lpRows.rows[0]?.v || '0'

    return NextResponse.json(data)
  } catch (error) {
    console.error('[wba/summary] Project extension error:', error)
    return NextResponse.json(data)
  } finally {
    await db.destroy()
  }
}
