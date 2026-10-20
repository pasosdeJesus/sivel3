import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE transaction RENAME COLUMN tipo TO type`.execute(db)
  await sql`ALTER TABLE transaction RENAME COLUMN cantidad TO amount`.execute(db)
  await sql`ALTER TABLE transaction RENAME COLUMN impacto_balance TO balance_impact`.execute(db)
  await sql`ALTER TABLE transaction RENAME COLUMN fecha TO date`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE transaction RENAME COLUMN type TO tipo`.execute(db)
  await sql`ALTER TABLE transaction RENAME COLUMN amount TO cantidad`.execute(db)
  await sql`ALTER TABLE transaction RENAME COLUMN balance_impact TO impacto_balance`.execute(db)
  await sql`ALTER TABLE transaction RENAME COLUMN date TO fecha`.execute(db)
}
