// Pre-alert purchase spec: `/api/pre-alerts/[id]/buy`.
//
// Deterministic negative paths run with no database rows. The optional positive
// path (reserving a `pending` pre-alert, no on-chain tx) needs PENDING_PREALERT_ID
// and touches the DB — it reserves (200). The full on-chain verification path is
// covered by the browser flow in `osmmap.spec.mjs` + the real mock wallet.
//
//   SITE_URL=http://localhost:4000 bin/m test:e2e prealert-buy
import { fail, initTestEnv, ok, resetFailures, summary } from '@pasosdejesus/m/e2e'
import { siteBase } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* not JSON */
  }
  return { status: res.status, json }
}

async function main() {
  const t0 = performance.now()
  resetFailures()

  const base = siteBase()
  const env = await initTestEnv()
  const account = env.account
  console.log(`Pre-alert buy — ${base}\n wallet: ${account.address}\n`)

  // Missing buyer_wallet → 400.
  const noBuyer = await postJson(`${base}/api/pre-alerts/1/buy`, {})
  if (noBuyer.status === 400) ok('missing buyer_wallet rejected (400)')
  else fail(`expected 400 without buyer_wallet, got ${noBuyer.status} ${JSON.stringify(noBuyer.json)}`)

  // Unknown pre-alert → 404.
  const missing = await postJson(`${base}/api/pre-alerts/999999/buy`, {
    buyer_wallet: account.address,
  })
  if (missing.status === 404) ok('unknown pre-alert rejected (404)')
  else fail(`expected 404 for unknown pre-alert, got ${missing.status} ${JSON.stringify(missing.json)}`)

  // Optional positive path: reserve a pending pre-alert (no tx_hash).
  const pendingId = process.env.PENDING_PREALERT_ID
    ? parseInt(process.env.PENDING_PREALERT_ID, 10)
    : null
  if (pendingId) {
    const res = await postJson(`${base}/api/pre-alerts/${pendingId}/buy`, {
      buyer_wallet: account.address,
    })
    if (res.status === 200 && res.json?.status === 'reserved') {
      ok('pending pre-alert reserved (positive path)')
    } else {
      fail(`expected 200 {status:"reserved"}, got ${res.status} ${JSON.stringify(res.json)}`)
    }
  } else {
    console.log('  [SKIP] positive path — set PENDING_PREALERT_ID to run it')
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
