import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('userevent')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('timestamp', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('path', 'text')
    .addColumn('amount', 'numeric')
    .addColumn('currency', 'text')
    .addColumn('metadata', 'jsonb')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('userevent').execute();
}
