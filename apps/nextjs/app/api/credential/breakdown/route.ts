import { NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

export async function GET() {
  const db = newKyselyPostgresql()

  const rows = await db
    .selectFrom('credential_emission as e')
    .innerJoin('credential_metadata as m', 'e.token_id', 'm.token_id')
    .select([
      'e.token_id as tokenId',
      'm.name',
      'm.image_url as imageUrl',
      db.fn.countAll().as('count'),
    ])
    .groupBy(['e.token_id', 'm.name', 'm.image_url'])
    .orderBy('tokenId', 'asc')
    .execute()

  return NextResponse.json(rows)
}
