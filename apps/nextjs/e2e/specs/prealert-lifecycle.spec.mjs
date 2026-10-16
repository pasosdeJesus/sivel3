// Pre-alert lifecycle spec: pending → reserved → converted → rejected, over the
// API only (no on-chain tx, no DB rows created here).
//
// It is self-contained: it picks a `pending` pre-alert (env `PENDING_PREALERT_ID`
// or the newest from `/api/pre-alerts`), reserves it (buy without `tx_hash` → the
// API does not verify on-chain), converts it (buyer must match), and scores it 0
// as the documenter (the wallet must be listed in the server's
// `DOCUMENTER_WALLETS`; score 0 does not move funds).
//
// It CONSUMES one pending pre-alert per run (ends `rejected`); re-run it with a
// fresh pre-alert, or seed one with `node scripts/e2e/seed-pre-alerts.mjs`.
//
//   SITE_URL=http://localhost:4000 bin/m test:e2e prealert-lifecycle
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

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
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
  const buyer = env.account.address
  console.log(`Pre-alert lifecycle — ${base}\n wallet: ${buyer}\n`)

  // 1. Pick a pending pre-alert.
  let id = process.env.PENDING_PREALERT_ID ? parseInt(process.env.PENDING_PREALERT_ID, 10) : null
  if (id) {
    ok(`using PENDING_PREALERT_ID=${id}`)
  } else {
    const list = await getJson(`${base}/api/pre-alerts?limit=1`)
    const first = list.json?.pre_alerts?.[0]
    if (first?.id) {
      id = first.id
      ok(`picked pending pre-alert #${id}`)
    }
  }
  if (!id) {
    fail('no pending pre-alert to run the lifecycle on (market empty?)')
    process.exit(summary(t0) > 0 ? 1 : 0)
  }

  // 2. Reserve (buy without tx_hash → DB only).
  const buy = await postJson(`${base}/api/pre-alerts/${id}/buy`, { buyer_wallet: buyer })
  if (buy.status === 200 && buy.json?.status === 'reserved') ok(`#${id} reserved`)
  else fail(`reserve: expected 200 {status:"reserved"}, got ${buy.status} ${JSON.stringify(buy.json)}`)

  // 3. Convert (buyer_wallet must match).
  const conv = await postJson(`${base}/api/pre-alerts/convert`, {
    pre_alert_id: id,
    buyer_wallet: buyer,
    citizen_notes: 'e2e lifecycle',
  })
  if (conv.status === 200 && conv.json?.status === 'converted') ok(`#${id} converted`)
  else fail(`convert: expected 200 {status:"converted"}, got ${conv.status} ${JSON.stringify(conv.json)}`)

  // 4. Score 0 (rejection) as documenter (needs DOCUMENTER_WALLETS on the server).
  const ts = Math.floor(Date.now() / 1000)
  const signature = await env.account.signMessage({ message: `score:${id}:0:${ts}` })
  const sc = await postJson(`${base}/api/pre-alerts/${id}/score`, {
    score: 0,
    feedback: 'e2e lifecycle rejection',
    documenter_wallet: buyer,
    timestamp: ts,
    signature,
  })
  if (sc.status === 200 && sc.json?.status === 'rejected') ok(`#${id} rejected (score 0)`)
  else fail(`score: expected 200 {status:"rejected"}, got ${sc.status} ${JSON.stringify(sc.json)}`)

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
