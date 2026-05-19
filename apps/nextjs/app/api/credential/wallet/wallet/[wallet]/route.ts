import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params
  if (!wallet || wallet.length !== 42 || !wallet.startsWith('0x')) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 })
  }

  const db = newKyselyPostgresql()

  // SBTs earned
  const sbts = await db
    .selectFrom('credential_emission as e')
    .innerJoin('credential_metadata as m', 'e.token_id', 'm.token_id')
    .select(['e.token_id as tokenId', 'm.name', 'm.image_url as imageUrl', 'e.emitted_at as earnedAt'])
    .where('e.wallet_address', '=', wallet)
    .orderBy('e.emitted_at', 'asc')
    .execute()

  // Donation totals from transaction table
  const donationRow = await db
    .selectFrom('transaction')
    .select([
      db.fn.sum('amount').as('totalDonated'),
      db.fn.countAll().as('donationCount'),
      db.fn.min('created_at').as('firstDonation'),
    ])
    .where('wallet', '=', wallet)
    .where('status', '=', 'completed')
    .executeTakeFirst()

  // First activity (earliest SBT or donation)
  const firstSbt = sbts.length > 0 ? sbts[0].earnedAt : null
  const firstDonation = donationRow?.firstDonation as string | null
  const firstActivity = firstSbt && firstDonation
    ? (firstSbt < firstDonation ? firstSbt : firstDonation)
    : (firstSbt || firstDonation)

  if (sbts.length === 0 && !donationRow?.donationCount) {
    return NextResponse.json({ error: 'No activity' }, { status: 404 })
  }

  return NextResponse.json({
    sbts,
    totalDonated: (donationRow?.totalDonated as string) || '0',
    donationCount: Number(donationRow?.donationCount || 0),
    firstActivity,
  })
}
