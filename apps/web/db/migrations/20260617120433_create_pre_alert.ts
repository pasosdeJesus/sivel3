import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('pre_alert')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('event_hash', 'varchar(66)', (col) => col.unique().notNull())
    .addColumn('json_data', 'jsonb', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('pending'))
    .addColumn('publisher_wallet', 'varchar(42)', (col) => col.notNull())
    .addColumn('source_urls', 'jsonb', (col) => col.defaultTo('[]'))
    .addColumn('source_summary', 'text')
    .addColumn('buyer_wallet', 'varchar(42)')
    .addColumn('bought_at', 'timestamp')
    .addColumn('conversion_deadline', 'timestamp')
    .addColumn('converted_at', 'timestamp')
    .addColumn('tx_hash', 'varchar(66)')
    .addColumn('contract_pre_alert_id', 'integer')
    .addColumn('score', 'integer')
    .addColumn('scored_by', 'varchar(42)')
    .addColumn('scored_at', 'timestamp')
    .addColumn('rejection_reason', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now()'))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo('now()'))
    .execute()

  await db.schema
    .createIndex('idx_pre_alert_status')
    .on('pre_alert')
    .column('status')
    .execute()

  await db.schema
    .createIndex('idx_pre_alert_event_hash')
    .on('pre_alert')
    .column('event_hash')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_pre_alert_event_hash').ifExists().execute()
  await db.schema.dropIndex('idx_pre_alert_status').ifExists().execute()
  await db.schema.dropTable('pre_alert').ifExists().execute()
}
