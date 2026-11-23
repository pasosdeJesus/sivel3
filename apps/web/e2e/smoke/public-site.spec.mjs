// Smoke: the public site loads (EN/ES) without obvious error markers.
// Run with: bin/m test:e2e --smoke
import { siteBase, get, ok, fail, summary } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SITE = siteBase()
const ERROR_MARKERS = ['Application error', 'Internal Server Error', 'Failed to load']

async function check(path, lang, { forbidden = [], required = [] } = {}) {
  const res = await get(`${SITE}${path}`)
  if (res.status !== 200) {
    fail(`GET ${path} → ${res.status}${res.error ? ` (${res.error})` : ''}`)
    return
  }
  const marker = ERROR_MARKERS.find((m) => res.text.includes(m))
  if (marker) {
    fail(`GET ${path} → 200 but contains "${marker}"`)
    return
  }
  const stale = forbidden.find((f) => res.text.includes(f))
  if (stale) {
    fail(`GET ${path} → 200 but still contains "${stale}"`)
    return
  }
  const missing = required.find((r) => !res.text.includes(r))
  if (missing) {
    fail(`GET ${path} → 200 but is missing "${missing}"`)
    return
  }
  ok(`GET ${path} → 200 (${lang})`)
}

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: public site — ${SITE}\n`)
  await check('/en', 'en', { forbidden: ['MiniPay'], required: ['on-chain payments and certifications'] })
  await check('/es', 'es', { forbidden: ['MiniPay'], required: ['pagos y certificaciones on-chain'] })
  await check('/en/cases/osmmap', 'en (map)')
  await check('/es/cases/osmmap', 'es (map)')
  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
