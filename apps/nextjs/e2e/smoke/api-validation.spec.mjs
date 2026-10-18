// Smoke: API routes reject malformed input with the documented status codes and
// serve the positive read paths. Read-only: no rows are mutated.
// Run with: make test-smoke
import { siteBase, get, postJson, ok, fail, summary } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SITE = siteBase()

function expectStatus(label, res, status) {
  if (res.status === status) ok(`${label} → ${status}`)
  else fail(`${label} → ${res.status} (expected ${status})`)
}

async function expectGet(path, status) {
  const res = await get(`${SITE}${path}`)
  expectStatus(`GET ${path}`, res, status)
  return res
}

async function expectPost(path, body, status) {
  const res = await postJson(`${SITE}${path}`, body)
  expectStatus(`POST ${path}`, res, status)
  return res
}

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: API validation — ${SITE}\n`)

  await expectPost('/api/donations/assign', {}, 400)
  await expectPost('/api/donations/assign', { regionId: 1 }, 400)
  await expectPost('/api/pre-alerts/convert', {}, 400)

  await expectGet('/api/pre-alerts/queue', 400)
  await expectGet(
    '/api/pre-alerts/queue?wallet=0x0000000000000000000000000000000000000001',
    403,
  )

  await expectPost('/api/pre-alerts/sync', {}, 401)
  const now = new Date().toISOString()
  const res = await fetch(`${SITE}/api/pre-alerts/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Signature': '0xdead',
      'X-Agent-Timestamp': now,
    },
    body: '{}',
    signal: AbortSignal.timeout(20000),
  })
  expectStatus('POST /api/pre-alerts/sync (headers, empty body)', res, 400)

  await expectGet('/api/verify', 400)
  await expectGet('/api/geocode', 400)
  const geo = await expectGet('/api/geocode?departamento=Putumayo', 200)
  if (geo.json && typeof geo.json.latitud === 'number' && typeof geo.json.longitud === 'number') {
    ok('GET /api/geocode returned numeric coordinates')
  } else {
    fail(`GET /api/geocode → unexpected body: ${geo.text.slice(0, 120)}`)
  }

  await expectGet('/api/cases/abc', 404)
  await expectGet('/api/cases/0', 404)
  await expectGet('/api/cases/999999999', 404)

  const osm = await get(`${SITE}/api/cases/datos-osm`)
  const caseId = osm.json?.respuesta ? Object.keys(osm.json.respuesta)[0] : null
  if (!caseId) {
    fail('GET /api/cases/datos-osm → no case id to probe the detail endpoint')
  } else {
    const detail = await expectGet(`/api/cases/${caseId}`, 200)
    if (detail.json?.caso?.id === String(caseId)) ok(`GET /api/cases/${caseId} → case payload`)
    else fail(`GET /api/cases/${caseId} → unexpected body: ${detail.text.slice(0, 120)}`)
  }

  await expectGet('/api/credential/abc', 400)
  await expectGet('/api/credential/999999', 404)
  await expectGet('/api/credential/wallet/nope', 400)

  const limit = await expectGet('/api/pre-alerts?limit=0', 200)
  if (limit.json?.limit === 1) ok('GET /api/pre-alerts?limit=0 → limit clamped to 1')
  else fail(`GET /api/pre-alerts?limit=0 → limit=${limit.json?.limit}`)

  const page = await expectGet('/api/pre-alerts?page=0', 200)
  if (page.json?.page === 1) ok('GET /api/pre-alerts?page=0 → page clamped to 1')
  else fail(`GET /api/pre-alerts?page=0 → page=${page.json?.page}`)

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
