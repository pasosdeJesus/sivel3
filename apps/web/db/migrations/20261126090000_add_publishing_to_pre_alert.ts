import { Kysely } from 'kysely'

/**
 * Publicación de alertas (R-#22 P0): una alerta de documentador nace `converted` y sólo
 * por una acción humana de revisión pasa a `published`. Se guarda quién y cuándo para
 * poder despublicar y auditar.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('pre_alert')
    .addColumn('published_at', 'timestamp')
    .addColumn('published_by', 'varchar(42)')
    .execute()

  await db.schema
    .createIndex('idx_pre_alert_published_at')
    .on('pre_alert')
    .column('published_at')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_pre_alert_published_at').ifExists().execute()
  await db.schema
    .alterTable('pre_alert')
    .dropColumn('published_at')
    .dropColumn('published_by')
    .execute()
}
