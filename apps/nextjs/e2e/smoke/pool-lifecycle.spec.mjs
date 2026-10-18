// Smoke: the analytics summary must not end the process-wide pg pool.
// Regression for "Cannot use a pool after calling end on the pool": after the
// summary route ran, every DB-backed API failed until the server restarted.
// Run with: make test-smoke
import { siteBase, get, ok, fail, summary } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SITE = siteBase()

async function expect200(path) {
  const res = await get(`${SITE}${path}`, 30000)
  if (res.status === 200) {
    ok(`GET ${path} → 200`)
    return res
  }
  fail(`GET ${path} → ${res.status}${res.error ? ` (${res.error})` : ''}`)
  return res
}

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: pool lifecycle — ${SITE}\n`)

  // 1. The summary route used to call db.destroy() on the shared pool.
  const first = await expect200('/api/web-analytics/summary')
  if (first.json?.onChain) ok('summary returned the onChain block')
  else fail(`summary → unexpected body: ${first.text.slice(0, 120)}`)

  // 2. The rest of the DB-backed APIs must keep working afterwards.
  await expect200('/api/pre-alerts?limit=1')
  await expect200('/api/cases/counts')
  await expect200('/api/credential/breakdown')
  await expect200('/api/regions')

  // 3. A second summary run must not poison the pool either.
  await expect200('/api/web-analytics/summary')
  await expect200('/api/cases/counts')

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
