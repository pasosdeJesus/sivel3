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

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: credentials — ${SITE}\n`)

  await expectReachable('/api/health/credentials')
  await expect200('/api/credential/breakdown')
  await expect200('/api/credential/leaderboard')

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
