import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Use raw SQL for numeric columns since Kysely's type system
  // does not accept precision parameters in ColumnDataType
  await sql`
    CREATE TABLE transaction_log (
      id SERIAL PRIMARY KEY,
      wallet VARCHAR(42) NOT NULL,
      fecha TIMESTAMP NOT NULL DEFAULT NOW(),
      tipo VARCHAR(20) NOT NULL,
      crypto VARCHAR(20) NOT NULL,
      cantidad NUMERIC(18,6) NOT NULL,
      impacto_balance NUMERIC(18,6) NOT NULL,
      region_id INTEGER REFERENCES region(id) ON DELETE SET NULL,
      hash_tx VARCHAR(66),
      hash_assign VARCHAR(66),
      lp_tx_hash VARCHAR(66),
      lp_nonce INTEGER,
      lp_response JSONB,
      lp_success BOOLEAN,
      metadata JSONB,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `.execute(db)

  await db.schema
    .createIndex('idx_transaction_log_wallet')
    .on('transaction_log')
    .column('wallet')
    .execute()

  await db.schema
    .createIndex('idx_transaction_log_hash_tx')
    .on('transaction_log')
    .column('hash_tx')
    .execute()

  await db.schema
    .createIndex('idx_transaction_log_fecha')
    .on('transaction_log')
    .column('fecha')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('transaction_log').ifExists().execute()
}
