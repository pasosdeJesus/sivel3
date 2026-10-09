// Smoke: the public site works with the Rails app down (R-#65 guard).
//
// These are the endpoints that used to be proxied to Rails (`app/api/cases/*`).
// They now read the shared database with Kysely, and the page HTML must not
// reference the Rails host.
// Run with: bin/m test:e2e --smoke
import { siteBase, get, ok, fail, summary } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SITE = siteBase()
const RAILS_HOST_MARKERS = ['sivelxyz-admin', ':3500']

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: no-Rails (R-#65) — ${SITE}\n`)

  // 1. The two former Rails proxies now answer from the database.
  for (const path of ['/api/cases/datos-osm', '/api/cases/counts']) {
    const res = await get(`${SITE}${path}`)
    if (res.status === 200 && res.json !== null) ok(`GET ${path} → 200 (Kysely, no Rails)`)
    else fail(`GET ${path} → ${res.status} (expected 200 JSON)`)
  }

  // 2. No page HTML points at the Rails host (only meaningful if the page loaded).
  const page = await get(`${SITE}/en`)
  if (page.status !== 200) {
    fail(`GET /en → ${page.status} (cannot check for the Rails host)`)
  } else {
    const marker = RAILS_HOST_MARKERS.find((m) => page.text.includes(m))
    if (marker) fail(`/en references the Rails host ("${marker}")`)
    else ok('/en does not reference the Rails host')
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
