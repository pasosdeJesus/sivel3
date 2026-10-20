import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE web_event (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(64),
      event_type VARCHAR(40) NOT NULL,
      pathname VARCHAR(200),
      locale VARCHAR(5),
      referrer VARCHAR(500),
      user_agent VARCHAR(500),
      ip VARCHAR(45),
      wallet VARCHAR(42),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `.execute(db)

  await db.schema
    .createIndex('idx_web_event_type')
    .on('web_event')
    .columns(['event_type', 'created_at'])
    .execute()

  await db.schema
    .createIndex('idx_web_event_session')
    .on('web_event')
    .column('session_id')
    .execute()

  await db.schema
    .createIndex('idx_web_event_wallet')
    .on('web_event')
    .column('wallet')
    .execute()

  await db.schema
    .createIndex('idx_web_event_ip')
    .on('web_event')
    .column('ip')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('web_event').ifExists().execute()
}
