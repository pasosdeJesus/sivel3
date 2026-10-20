// Smoke: the public site loads (EN/ES) without obvious error markers.
// Run with: bin/m test:e2e --smoke
import { siteBase, get, ok, fail, summary } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SITE = siteBase()
const ERROR_MARKERS = ['Application error', 'Internal Server Error', 'Failed to load']

async function check(path, lang) {
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
  ok(`GET ${path} → 200 (${lang})`)
}

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: public site — ${SITE}\n`)
  await check('/en', 'en')
  await check('/es', 'es')
  await check('/en/cases/osmmap', 'en (map)')
  await check('/es/cases/osmmap', 'es (map)')
  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
