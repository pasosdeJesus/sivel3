import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Drop PK constraint, add chain_id, recreate composite PK
  await sql`
    ALTER TABLE credential_metadata DROP CONSTRAINT credential_metadata_pkey
  `.execute(db)

  await sql`
    ALTER TABLE credential_metadata ADD COLUMN chain_id VARCHAR(20) NOT NULL DEFAULT 'celo'
  `.execute(db)

  await sql`
    ALTER TABLE credential_metadata ADD PRIMARY KEY (token_id, chain_id)
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE credential_metadata DROP CONSTRAINT credential_metadata_pkey
  `.execute(db)

  await sql`
    ALTER TABLE credential_metadata DROP COLUMN chain_id
  `.execute(db)

  await sql`
    ALTER TABLE credential_metadata ADD PRIMARY KEY (token_id)
  `.execute(db)
}
