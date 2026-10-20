// Signature spec: `/api/pre-alerts/[id]/score` verifies an EIP-191
// (`personal_sign`) signature over `score:{id}:{score}:{timestamp}`.
//
// It needs a running server but NO database rows: the invalid-score (400) and
// invalid-signature (401) paths run before any DB lookup. The optional positive
// path (a real rejection, score 0) needs PREALERT_ID and the documenter wallet
// listed in the server's DOCUMENTER_WALLETS.
//
//   SITE_URL=http://localhost:4000 bin/m test:e2e signatures
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
  console.log(`Signature (documenter score) — ${base}\n wallet: ${account.address}\n`)

  const id = 1
  const timestamp = Math.floor(Date.now() / 1000)
  const url = `${base}/api/pre-alerts/${id}/score`

  // Valid signature + out-of-range score (1) → the request passes signature
  // verification and fails on the score check (400), with no DB read.
  const signature = await account.signMessage({ message: `score:${id}:1:${timestamp}` })
  const good = await postJson(url, {
    score: 1,
    feedback: 'e2e',
    documenter_wallet: account.address,
    timestamp,
    signature,
  })
  if (good.status === 400 && /score must be/.test(JSON.stringify(good.json))) {
    ok('valid EIP-191 signature accepted (then rejected on score range)')
  } else {
    fail(`expected 400 "score must be 0 or 2-5", got ${good.status} ${JSON.stringify(good.json)}`)
  }

  // Tampered signature → 401 (Invalid signature).
  const tampered = signature.slice(0, -4) + 'ffff'
  const bad = await postJson(url, {
    score: 1,
    feedback: 'e2e',
    documenter_wallet: account.address,
    timestamp,
    signature: tampered,
  })
  if (bad.status === 401) {
    ok('tampered signature rejected (401)')
  } else {
    fail(`expected 401 for a tampered signature, got ${bad.status} ${JSON.stringify(bad.json)}`)
  }

  // Optional positive path: a real score 0 (rejection) needs a converted
  // pre-alert and the wallet in DOCUMENTER_WALLETS.
  const preId = process.env.PREALERT_ID ? parseInt(process.env.PREALERT_ID, 10) : null
  if (preId) {
    const ts = Math.floor(Date.now() / 1000)
    const sig = await account.signMessage({ message: `score:${preId}:0:${ts}` })
    const rej = await postJson(`${base}/api/pre-alerts/${preId}/score`, {
      score: 0,
      feedback: 'e2e rejection',
      documenter_wallet: account.address,
      timestamp: ts,
      signature: sig,
    })
    if (rej.status === 200 && rej.json?.status === 'rejected') {
      ok('documenter score 0 recorded (positive path)')
    } else {
      fail(`expected 200 {status:"rejected"}, got ${rej.status} ${JSON.stringify(rej.json)}`)
    }
  } else {
    console.log('  [SKIP] positive path — set PREALERT_ID and DOCUMENTER_WALLETS to run it')
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
