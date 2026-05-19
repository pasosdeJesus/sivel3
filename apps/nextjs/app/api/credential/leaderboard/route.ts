import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  const db = newKyselyPostgresql()

  // Top wallets by total donated, with SBTs earned
  const rows = await db
    .selectFrom('transaction as t')
    .leftJoin('credential_emission as e', (join) =>
      join.onRef('e.wallet_address', '=', 't.wallet')
    )
    .select([
      't.wallet',
      db.fn.sum('t.amount').as('totalDonatedUsdt'),
      db.fn.count('e.token_id').distinct().as('sbtCount'),
    ])
    .where('t.status', '=', 'completed')
    .groupBy('t.wallet')
    .orderBy('totalDonatedUsdt', 'desc')
    .limit(limit)
    .execute()

  return NextResponse.json(rows)
}
