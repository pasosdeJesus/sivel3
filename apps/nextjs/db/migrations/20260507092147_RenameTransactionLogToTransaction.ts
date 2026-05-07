import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE transaction_log RENAME TO transaction`.execute(db)
  await sql`ALTER INDEX idx_transaction_log_wallet RENAME TO idx_transaction_wallet`.execute(db)
  await sql`ALTER INDEX idx_transaction_log_hash_tx RENAME TO idx_transaction_hash_tx`.execute(db)
  await sql`ALTER INDEX idx_transaction_log_fecha RENAME TO idx_transaction_fecha`.execute(db)
  await sql`ALTER SEQUENCE transaction_log_id_seq RENAME TO transaction_id_seq`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE transaction RENAME TO transaction_log`.execute(db)
  await sql`ALTER INDEX idx_transaction_wallet RENAME TO idx_transaction_log_wallet`.execute(db)
  await sql`ALTER INDEX idx_transaction_hash_tx RENAME TO idx_transaction_log_hash_tx`.execute(db)
  await sql`ALTER INDEX idx_transaction_fecha RENAME TO idx_transaction_log_fecha`.execute(db)
  await sql`ALTER SEQUENCE transaction_id_seq RENAME TO transaction_log_id_seq`.execute(db)
}
