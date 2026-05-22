import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  const db = newKyselyPostgresql() as any

  // Sum donations per wallet (no join to avoid row multiplication)
  const rows = await db
    .selectFrom('transaction as t')
    .select([
      't.wallet',
      db.fn.sum('t.cantidad').as('totalDonatedUsdt'),
      db.fn.countAll().as('donationCount'),
    ])
    .where('t.tipo', '=', 'donation')
    .groupBy('t.wallet')
    .orderBy('totalDonatedUsdt', 'desc')
    .limit(limit)
    .execute()

  // For each wallet, count distinct SBTs
  const result = []
  for (const row of rows) {
    const sbtCount = await db
      .selectFrom('credential_emission')
      .select(db.fn.countAll().as('count'))
      .where('wallet_address', '=', row.wallet)
      .executeTakeFirst()

    result.push({
      wallet: row.wallet,
      totalDonatedUsdt: row.totalDonatedUsdt,
      sbtCount: Number(sbtCount?.count || 0),
    })
  }

  return NextResponse.json(result)
}
