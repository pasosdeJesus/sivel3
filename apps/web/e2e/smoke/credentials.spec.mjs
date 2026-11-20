// Smoke: credential/on-chain read endpoints answer.
// Run with: bin/m test:e2e --smoke
import { siteBase, get, ok, fail, summary } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SITE = siteBase()

async function expect200(path) {
  const res = await get(`${SITE}${path}`)
  if (res.status === 200) ok(`GET ${path} → 200`)
  else fail(`GET ${path} → ${res.status}`)
}

// The health check reports on-chain reachability: 200 = healthy, 503 = one or
// both chains unreachable (expected when the credentials addresses are not
// configured). Both mean the endpoint responds; 404/500/timeout are failures.
async function expectReachable(path) {
  const res = await get(`${SITE}${path}`)
  if (res.status === 200 || res.status === 503) ok(`GET ${path} → ${res.status} (reachable)`)
  else fail(`GET ${path} → ${res.status}`)
}

// Every SBT shown on /stats and on public wallet profiles is served from
// public/img/credential/<tokenId>.png. Those files are versioned, so a missing
// one means a fresh deploy lost the composed badge and the UI renders a broken
// image (the ERC-1155 metadata points at the same URL).
async function expectCredentialImages() {
  const res = await get(`${SITE}/api/credential/breakdown`)
  if (res.status !== 200 || !Array.isArray(res.json)) {
    fail(`GET /api/credential/breakdown → ${res.status}`)
    return
  }
  if (res.json.length === 0) {
    fail('GET /api/credential/breakdown → no types to check')
    return
  }
  for (const row of res.json) {
    const path = String(row.imageUrl || '').replace(/^\/+/, '')
    if (!path) {
      fail(`credential ${row.name} has no imageUrl`)
      continue
    }
    const img = await get(`${SITE}/${path}`)
    if (img.status === 200 && /^image\//.test(img.contentType || ''))
      ok(`GET /${path} → 200 ${img.contentType}`)
    else fail(`GET /${path} → ${img.status} ${img.contentType || 'no content-type'}`)
  }
}

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: credentials — ${SITE}\n`)

  await expectReachable('/api/health/credentials')
  await expectCredentialImages()
  await expect200('/api/credential/leaderboard')

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
