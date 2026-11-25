import { Kysely } from 'kysely'

/**
 * Créditos de uso (R-#22 P2, modelo de R-#17): saldo por billetera y libro mayor
 * idempotente por `referencia` (un `tx_hash` de compra, `stipend:YYYY-MM:<wallet>` del
 * estipendio o `detalle:<caso>:<timestamp>` de un consumo). Sin créditos que rueden de
 * mes y sin saldo negativo.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('credit_balance')
    .addColumn('wallet', 'varchar(42)', (col) => col.primaryKey())
    .addColumn('credits', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo('now()'))
    .execute()

  await db.schema
    .createTable('credit_ledger')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('wallet', 'varchar(42)', (col) => col.notNull())
    .addColumn('delta', 'integer', (col) => col.notNull())
    .addColumn('reason', 'varchar(40)', (col) => col.notNull())
    .addColumn('reference', 'varchar(120)', (col) => col.unique().notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now()'))
    .execute()

  await db.schema
    .createIndex('idx_credit_ledger_wallet')
    .on('credit_ledger')
    .column('wallet')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('credit_ledger').ifExists().execute()
  await db.schema.dropTable('credit_balance').ifExists().execute()
}
