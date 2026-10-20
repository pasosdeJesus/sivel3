import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE credential_emission (
      id BIGSERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      token_id INTEGER NOT NULL,
      chain_id VARCHAR(20) NOT NULL DEFAULT 'celo',
      emitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(wallet_address, token_id, chain_id)
    )
  `.execute(db)

  await db.schema
    .createIndex('idx_credential_emission_wallet')
    .on('credential_emission')
    .column('wallet_address')
    .execute()

  await db.schema
    .createIndex('idx_credential_emission_token')
    .on('credential_emission')
    .column('token_id')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('credential_emission').execute()
}
