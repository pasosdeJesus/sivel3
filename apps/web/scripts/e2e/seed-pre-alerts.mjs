// scripts/e2e/seed-pre-alerts.mjs
// Seeds (idempotently) two `pre_alert` fixtures in the LOCAL database so the
// e2e suite can exercise its positive paths:
//
//   - `pending`   → PENDING_PREALERT_ID  (used by prealert-buy, prealert-lifecycle)
//   - `converted` → PREALERT_ID          (used by signatures' positive path)
//
// Re-running RESETS both rows (status/buyer/scores), which the suite consumes
// (pending→reserved→converted→rejected). Never run it against production: it
// writes to PGDATABASE from `apps/.env`.
//
//   cd apps/web && node scripts/e2e/seed-pre-alerts.mjs
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') })

import pg from 'pg'

const PUBLISHER = (
  process.env.E2E_PUBLISHER_WALLET ||
  process.env.NEXT_PUBLIC_ADDRESS ||
  '0x0000000000000000000000000000000000000000'
).toLowerCase()
const BUYER = (process.env.E2E_BUYER_WALLET || PUBLISHER).toLowerCase()

// Deterministic 66-char event hashes → stable fixture rows we can reset.
const HASH_PENDING = `0x${'1'.repeat(64)}`
const HASH_CONVERTED = `0x${'2'.repeat(64)}`

const JSON_DATA = {
  titulo: 'Fixture e2e (seed)',
  fecha: '2026-01-01',
  departamento: 'ANTIOQUIA',
  municipio: 'MEDELLIN',
  descripcion: 'Fila de prueba creada por scripts/e2e/seed-pre-alerts.mjs',
}

const pool = new pg.Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: 5432,
})

async function upsert(eventHash, { status, buyer, boughtAt, deadline, convertedAt }) {
  const { rows } = await pool.query(
    `INSERT INTO pre_alert
       (event_hash, json_data, status, publisher_wallet, source_urls,
        buyer_wallet, bought_at, conversion_deadline, converted_at, updated_at)
     VALUES ($1, $2::jsonb, $3, $4, '[]'::jsonb, $5, $6, $7, $8, now())
     ON CONFLICT (event_hash) DO UPDATE SET
       json_data = EXCLUDED.json_data,
       status = EXCLUDED.status,
       publisher_wallet = EXCLUDED.publisher_wallet,
       buyer_wallet = EXCLUDED.buyer_wallet,
       bought_at = EXCLUDED.bought_at,
       conversion_deadline = EXCLUDED.conversion_deadline,
       converted_at = EXCLUDED.converted_at,
       score = NULL, scored_by = NULL, scored_at = NULL, rejection_reason = NULL,
       updated_at = now()
     RETURNING id`,
    [eventHash, JSON.stringify(JSON_DATA), status, PUBLISHER, buyer, boughtAt, deadline, convertedAt],
  )
  return rows[0].id
}

async function main() {
  if (process.env.NODE_ENV === 'production' || /prod/i.test(process.env.PGDATABASE || '')) {
    console.error(`Refusing to seed against a production-looking database: ${process.env.PGDATABASE}`)
    process.exit(1)
  }

  const now = new Date()
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const pendingId = await upsert(HASH_PENDING, {
    status: 'pending',
    buyer: null,
    boughtAt: null,
    deadline: null,
    convertedAt: null,
  })
  const convertedId = await upsert(HASH_CONVERTED, {
    status: 'converted',
    buyer: BUYER,
    boughtAt: now,
    deadline: in7d,
    convertedAt: now,
  })

  console.log(`Seeded pre_alert fixtures in ${process.env.PGDATABASE}:`)
  console.log(`  pending    #${pendingId}  → PENDING_PREALERT_ID=${pendingId}`)
  console.log(`  converted  #${convertedId}  → PREALERT_ID=${convertedId}`)
  console.log(`  publisher: ${PUBLISHER}  buyer: ${BUYER}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
