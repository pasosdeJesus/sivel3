// Helpers for the HTTP smoke specs (e2e/smoke/).
//
// Self-contained on purpose: the smoke layer must NOT need Chrome (Puppeteer) nor
// the `siwe`/`viem` stack that `@pasosdejesus/m/e2e` pulls in, so these specs import
// nothing but Node. Base URL resolution mirrors the e2e runner env:
//   - `SITE_URL` (e.g. http://localhost:4000) wins (HTTP or HTTPS, has precedence);
//   - otherwise `https://${IPDES}:${PUERTOPRU}` (dev site defaults to sivel.xyz:9001).

export function siteBase() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '')
  const host = process.env.IPDES || 'sivel.xyz'
  const port = process.env.PUERTOPRU || '9001'
  return `https://${host}:${port}`
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** GET that never throws; returns { status, text, json } (json = null if not JSON). */
export async function get(url, timeoutMs = 20000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    const text = await res.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      /* not JSON */
    }
    return { status: res.status, text, json, ok: res.ok }
  } catch (err) {
    return { status: 0, text: '', json: null, ok: false, error: err?.message || String(err) }
  }
}

// Minimal assertion helpers (same contract as @pasosdejesus/m/e2e, without importing it).
let passed = 0
let failed = 0

export function ok(msg) {
  passed += 1
  console.log(`  ✅ ${msg}`)
}

export function fail(msg) {
  failed += 1
  console.log(`  ❌ ${msg}`)
}

/** Prints a summary and returns the failure count (caller does process.exit(failures > 0 ? 1 : 0)). */
export function summary(t0) {
  const ms = Math.round(performance.now() - t0)
  console.log(`\n${passed} passed / ${failed} failed (${ms}ms)`)
  return failed
}
