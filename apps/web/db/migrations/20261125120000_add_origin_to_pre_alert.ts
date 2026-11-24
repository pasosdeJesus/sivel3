import { Kysely } from 'kysely'

/**
 * `pre_alert.origin` distingue de dónde nace la prealerta:
 * - `agent` (por omisión): el agente de sivel3agent, entra al mercado y se compra;
 * - `citizen`: la crea un ciudadano (flujo futuro);
 * - `documenter`: la crea un documentador desde el asistente (R-#20). No pasa por
 *   el mercado ni cobra recompensa de ciudadano: nace `converted`, va a revisión y
 *   su pago sale del fondo de documentadores, no de una compra.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('pre_alert')
    .addColumn('origin', 'varchar(20)', (col) => col.notNull().defaultTo('agent'))
    .execute()

  await db.schema
    .createIndex('idx_pre_alert_origin')
    .on('pre_alert')
    .column('origin')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_pre_alert_origin').ifExists().execute()
  await db.schema.alterTable('pre_alert').dropColumn('origin').execute()
}
