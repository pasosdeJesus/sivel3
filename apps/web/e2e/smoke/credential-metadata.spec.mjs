// Smoke: ERC-1155 metadata, wallet profiles, and regional balances.
// The metadata endpoint must resolve the chain the deployment actually uses
// (`celo` on mainnet, `celoSepolia` on the dev site).
// Run with: make test-smoke
import { siteBase, get, ok, fail, summary } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SITE = siteBase()

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: credential metadata and balances — ${SITE}\n`)

  const breakdown = await get(`${SITE}/api/credential/breakdown`)
  if (breakdown.status !== 200 || !Array.isArray(breakdown.json)) {
    fail(`GET /api/credential/breakdown → ${breakdown.status}`)
  } else if (breakdown.json.length === 0) {
    console.log('  [SKIP] breakdown is empty — no registered credential types')
  } else {
    ok(`GET /api/credential/breakdown → ${breakdown.json.length} token(s)`)
    const tokenId = breakdown.json[0].tokenId
    const meta = await get(`${SITE}/api/credential/${tokenId}`)
    if (meta.status !== 200 || !meta.json) {
      fail(`GET /api/credential/${tokenId} → ${meta.status}`)
    } else if (
      typeof meta.json.name !== 'string' ||
      typeof meta.json.image !== 'string' ||
      !Array.isArray(meta.json.attributes)
    ) {
      fail(`GET /api/credential/${tokenId} → malformed ERC-1155 metadata`)
    } else {
      ok(`GET /api/credential/${tokenId} → ${meta.json.name} (ERC-1155 metadata)`)
    }
  }

  const leaderboard = await get(`${SITE}/api/credential/leaderboard?limit=1`)
  if (leaderboard.status !== 200 || !Array.isArray(leaderboard.json)) {
    fail(`GET /api/credential/leaderboard → ${leaderboard.status}`)
  } else if (leaderboard.json.length === 0) {
    console.log('  [SKIP] leaderboard is empty — no donor wallets to inspect')
  } else {
    const wallet = leaderboard.json[0].wallet
    const profile = await get(`${SITE}/api/credential/wallet/${wallet}`)
    if (profile.status !== 200 || !profile.json) {
      fail(`GET /api/credential/wallet/${wallet} → ${profile.status}`)
    } else if (!Array.isArray(profile.json.sbts) || typeof profile.json.donationCount !== 'number') {
      fail(`GET /api/credential/wallet/${wallet} → malformed profile`)
    } else {
      ok(`GET /api/credential/wallet/${wallet.slice(0, 8)}… → ${profile.json.sbts.length} SBT(s)`)
    }
  }

  const regions = await get(`${SITE}/api/regions`)
  if (regions.status !== 200 || !Array.isArray(regions.json) || regions.json.length === 0) {
    fail(`GET /api/regions → ${regions.status}`)
  } else {
    const regionId = regions.json[0].id
    const balance = await get(`${SITE}/api/regions/${regionId}/balance`)
    if (balance.status !== 200 || !balance.json) {
      fail(`GET /api/regions/${regionId}/balance → ${balance.status}`)
    } else if (
      typeof balance.json.balance !== 'string' ||
      typeof balance.json.timestamp !== 'number'
    ) {
      fail(`GET /api/regions/${regionId}/balance → malformed body`)
    } else {
      ok(`GET /api/regions/${regionId}/balance → ${balance.json.balance} USDT`)
    }
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
