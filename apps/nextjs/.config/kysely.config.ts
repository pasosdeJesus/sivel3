import 'dotenv/config'
import { Kysely, PostgresDialect } from 'kysely'
import { defineConfig, getKnexTimestampPrefix } from 'kysely-ctl'
import { Pool } from 'pg'

import type { DB } from '@/db/db.d.ts'

// Process-wide pool. API routes call `newKyselyPostgresql()` per request; a
// fresh `pg.Pool` per call leaked connections until Postgres refused
// ("sorry, too many clients already"). Next.js can instantiate this module more
// than once (one per route bundle), so the pool lives on `globalThis`.
const globalForPg = globalThis as unknown as { __sivelPgPool?: Pool }

function sharedPool(): Pool {
  if (!globalForPg.__sivelPgPool) {
    globalForPg.__sivelPgPool = new Pool({
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      port: 5432,
    })
  }
  return globalForPg.__sivelPgPool
}

export default defineConfig({
  dialect: new PostgresDialect({
    pool: sharedPool(),
  }),
  migrations: {
    migrationFolder: '../db/migrations',
    getMigrationPrefix: getKnexTimestampPrefix,
  },
})

export function newKyselyPostgresql() {
  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: sharedPool(),
    }),
  })
}
