import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE credential_metadata ADD COLUMN is_soulbound BOOLEAN DEFAULT true
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE credential_metadata DROP COLUMN is_soulbound
  `.execute(db)
}
