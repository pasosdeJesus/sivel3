// Smoke: authenticated-less pages render in both locales and the locale
// proxy redirects unprefixed paths. 404s stay 404.
// Run with: make test-smoke
import { siteBase, get, getRedirect, ok, fail, summary } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SITE = siteBase()
const WALLET = '0x0000000000000000000000000000000000000001'
const ERROR_MARKERS = ['Application error', 'Internal Server Error', 'Failed to load']

async function checkPage(path) {
  const res = await get(`${SITE}${path}`)
  if (res.status !== 200) {
    fail(`GET ${path} → ${res.status}${res.error ? ` (${res.error})` : ''}`)
    return
  }
  const marker = ERROR_MARKERS.find((m) => res.text.includes(m))
  if (marker) fail(`GET ${path} → 200 but contains "${marker}"`)
  else ok(`GET ${path} → 200`)
}

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: pages and i18n — ${SITE}\n`)

  for (const locale of ['en', 'es']) {
    await checkPage(`/${locale}/stats`)
    await checkPage(`/${locale}/dashboard`)
    await checkPage(`/${locale}/documenter`)
    await checkPage(`/${locale}/wallet/${WALLET}`)
  }

  const redirect = await getRedirect(`${SITE}/stats`)
  if (
    redirect.status >= 300 &&
    redirect.status < 400 &&
    redirect.location?.includes('/en/stats')
  ) {
    ok(`GET /stats → ${redirect.status} ${redirect.location}`)
  } else {
    fail(`GET /stats → ${redirect.status} (location: ${redirect.location})`)
  }

  const notFound = await get(`${SITE}/en/does-not-exist`)
  if (notFound.status === 404) ok('GET /en/does-not-exist → 404')
  else fail(`GET /en/does-not-exist → ${notFound.status}`)

  const apiNotFound = await get(`${SITE}/api/does-not-exist`)
  if (apiNotFound.status === 404) ok('GET /api/does-not-exist → 404')
  else fail(`GET /api/does-not-exist → ${apiNotFound.status}`)

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
