import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('region')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('name_es', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo('now()').notNull())
    .execute();

  await db
    .insertInto('region')
    .values([
      { name: 'Colombia', name_es: 'Colombia' },
      { name: 'Israel/Palestine', name_es: 'Israel/Palestina' },
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('region').execute();
}
