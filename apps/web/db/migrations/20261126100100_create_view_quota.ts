import { Kysely } from 'kysely'

/**
 * Cuota de detalle de caso (R-#22 P1, números de R-#17): 1/día anónimo, 16/mes con
 * billetera y 24/mes con billetera verificada. El sujeto es `ip:<ip>` o `wallet:<0x…>`
 * y el periodo `YYYY-MM-DD` (anónimo) o `YYYY-MM` (billetera), así las dos cuotas no se
 * mezclan y el reinicio es natural.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('view_quota')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('subject', 'varchar(120)', (col) => col.notNull())
    .addColumn('period', 'varchar(10)', (col) => col.notNull())
    .addColumn('count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo('now()'))
    .execute()

  await db.schema
    .createIndex('idx_view_quota_subject_period')
    .on('view_quota')
    .columns(['subject', 'period'])
    .unique()
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('view_quota').ifExists().execute()
}
