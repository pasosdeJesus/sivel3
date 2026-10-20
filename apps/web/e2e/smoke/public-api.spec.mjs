// Smoke: the public API endpoints answer with the expected JSON shape.
// These read the shared PostgreSQL via Kysely (R-#65: no Rails).
// Run with: bin/m test:e2e --smoke
import { siteBase, get, ok, fail, summary } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SITE = siteBase()

async function expectJson(path, check) {
  const res = await get(`${SITE}${path}`)
  if (res.status !== 200) {
    fail(`GET ${path} → ${res.status}`)
    return
  }
  if (res.json === null) {
    fail(`GET ${path} → 200 but not JSON`)
    return
  }
  const problem = check(res.json)
  if (problem) fail(`GET ${path} → ${problem}`)
  else ok(`GET ${path} (${Array.isArray(res.json) ? `${res.json.length} item(s)` : 'json'})`)
}

const isArray = (v) => (Array.isArray(v) ? null : `expected array, got ${typeof v}`)

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: public API — ${SITE}\n`)

  await expectJson('/api/cases/counts', (j) =>
    typeof j.casos === 'number' ? null : 'missing numeric "casos"')
  await expectJson('/api/categories', isArray)
  await expectJson('/api/departments', isArray)
  await expectJson('/api/regions', isArray)
  await expectJson('/api/alleged-perpetrators', isArray)
  await expectJson('/api/cases/datos-osm', (j) =>
    j.respuesta && typeof j.respuesta === 'object' ? null : 'missing "respuesta" object')

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
