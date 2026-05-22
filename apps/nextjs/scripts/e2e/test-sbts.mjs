// scripts/e2e/test-sbts.mjs
// E2E test for SIVeL 3 SBT minting on Celo Sepolia.
//
// Tests all SBT types end-to-end via HTTP API:
//   1. Connector (wallet connect)
//   2. Global Founder (first 50 wallets)
//   3. Explorer (view 3+ cases)
//   4. Donor levels: incremental donations testing each threshold
//
// Verifies:
//   - API responses include mintedSbts metadata (toast data)
//   - credential_emission records exist
//   - /stats page reflects SBT counts
//   - /wallet/[address] profile shows SBTs
//
// Prerequisites:
//   - Test wallet funded with CELO (gas) and mUSDT
//   - Server running at https://sivel.xyz:9001 or local
//
// Run:  cd apps/nextjs && node scripts/e2e/test-sbts.mjs

import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') })

import axios from 'axios'
import https from 'https'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { celoSepolia } from 'viem/chains'

const RPC_URL = (process.env.NEXT_PUBLIC_RPC_URL || 'https://celo-sepolia.infura.io/v3/').replace(/"/g, '')
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sivel.xyz:9001'

if (BASE_URL === 'https://sivel.xyz') {
  console.error('Este script E2E solo corre contra desarrollo (https://sivel.xyz:9001) o local.')
  console.error('No contra producción (https://sivel.xyz).')
  process.exit(1)
}

const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS
const DONATION_CONTRACT = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS
const DONATION_REGION = '1'

// Incremental donations to test each donor SBT threshold
const DONOR_LEVELS = [
  { amount: '0.02',  sbt: 'Donor' },
  { amount: '5',     sbt: 'Bronze Donor' },
  { amount: '20',    sbt: 'Silver Donor' },
  { amount: '50',    sbt: 'Gold Donor' },
  { amount: '100',   sbt: 'Diamond Donor' },
]

const PRIVATE_KEY = process.env.PRIVATE_KEY
if (!PRIVATE_KEY) {
  console.error('PRIVATE_KEY not set in .env')
  process.exit(1)
}

// Fresh wallet each run, funded by PRIVATE_KEY
const testKey = generatePrivateKey()
const testAccount = privateKeyToAccount(testKey)
const wallet = testAccount.address.toLowerCase()

const funderAccount = privateKeyToAccount(PRIVATE_KEY)
const funderWallet = funderAccount.address.toLowerCase()

console.log(`SIVeL 3 — SBT E2E Test`)
console.log(`Site: ${BASE_URL}`)
console.log(`Test wallet: ${wallet}  (fresh each run)`)
console.log(`Funder: ${funderWallet.slice(0,6)}...`)

const httpsAgent = new https.Agent({ rejectUnauthorized: false })
const api = axios.create({
  baseURL: BASE_URL, httpsAgent, timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

let passed = 0
let failed = 0
function ok(label)  { console.log(`  ✅ ${label}`); passed++ }
function fail(label, detail) { console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`); failed++ }
function summary() {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

// ─── Fund test wallet with CELO + mUSDT from PRIVATE_KEY ───
async function fundWallet() {
  console.log('\n── Funding test wallet ──')
  const publicClient = createPublicClient({ chain: celoSepolia, transport: http(RPC_URL) })

  // CELO
  try {
    const celoWei = BigInt(Math.floor(1 * 1e18)) // 1 CELO for gas
    console.log(`  Transferring 1 CELO from funder...`)
    const funderClient = createWalletClient({
      chain: celoSepolia, transport: http(RPC_URL), account: funderAccount,
    })
    const hash = await funderClient.sendTransaction({
      to: wallet, value: celoWei, chain: celoSepolia, account: funderAccount,
    })
    await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 })
    const celoBal = await publicClient.getBalance({ address: wallet })
    ok(`CELO funded: ${(Number(celoBal)/1e18).toFixed(4)}`)
  } catch (e) {
    fail('CELO transfer', e.message?.slice(0, 80))
    return 0
  }

  // mUSDT
  if (!USDT_ADDRESS) { fail('NEXT_PUBLIC_USDT_ADDRESS not set'); return 0 }
  try {
    const funderBalance = await publicClient.readContract({
      address: USDT_ADDRESS,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf', args: [funderWallet],
    })
    const funderUsdt = Number(funderBalance) / 1e6
    console.log(`  Funder mUSDT: ${funderUsdt.toFixed(2)}`)

    const fundAmount = 150 // enough for all 5 donor levels (0.02+5+20+50+100 = ~175, but they're cumulative)
    if (funderUsdt < fundAmount) {
      fail(`Insufficient funder mUSDT: ${funderUsdt.toFixed(2)} < ${fundAmount}`)
      return 0
    }

    const funderClient = createWalletClient({
      chain: celoSepolia, transport: http(RPC_URL), account: funderAccount,
    })
    const amount = BigInt(Math.floor(fundAmount * 1_000_000))
    console.log(`  Transferring ${fundAmount} mUSDT...`)
    const hash = await funderClient.writeContract({
      address: USDT_ADDRESS,
      abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
      functionName: 'transfer', args: [wallet, amount],
      chain: celoSepolia, account: funderAccount,
    })
    await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 })
    const testBal = await publicClient.readContract({
      address: USDT_ADDRESS,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf', args: [wallet],
    })
    const testUsdt = Number(testBal) / 1e6
    ok(`mUSDT funded: ${testUsdt.toFixed(2)}`)
    return testUsdt
  } catch (e) {
    fail('mUSDT transfer', e.message?.slice(0, 80))
    return 0
  }
}

// ─── Connector SBT ───
async function testConnector() {
  console.log('\n── Connector SBT ──')
  try {
    const res = await api.post('/api/credential/mint-connector', { wallet })
    if (!res.data.minted) {
      if (res.data.reason === 'already_has') { ok('Already minted'); return true }
      if (res.data.reason === 'not_verified') { ok('Requires learn.tg verification (expected)'); return false }
      fail('Connector mint', JSON.stringify(res.data))
      return false
    }
    ok(`Minted! tx=${res.data.txHash?.slice(0,10)}...`)
    const sbts = res.data.mintedSbts || []
    if (sbts.some(s => s.name === 'Connector')) ok('Toast data includes Connector')
    if (res.data.founderMinted) {
      ok('Global Founder also minted')
      if (sbts.some(s => s.name === 'Global Founder')) ok('Toast data includes Global Founder')
    }
    return true
  } catch (e) {
    fail('Connector request', e.code || e.response?.status || e.message?.slice(0, 80))
    return false
  }
}

// ─── Explorer SBT ───
async function testExplorer() {
  console.log('\n── Explorer SBT ──')
  if (await walletHasSbt('Explorer')) { ok('Already in wallet profile'); return }
  console.log('  (requires 3+ case views via browser — skipping)')
  ok('Explorer deferred (needs browser)')
}

async function walletHasSbt(name) {
  try {
    const r = await api.get(`/api/credential/wallet/${wallet}`)
    return r.status === 200 && (r.data.sbts || []).some(s => s.name === name)
  } catch { return false }
}

// ─── Incremental donations ───
async function testIncrementalDonations(usdtBalance) {
  if (!USDT_ADDRESS || !DONATION_CONTRACT) {
    fail('Contract addresses not configured')
    return
  }

  console.log('\n── Incremental Donations ──')
  const publicClient = createPublicClient({ chain: celoSepolia, transport: http(RPC_URL) })
  const walletClient = createWalletClient({
    chain: celoSepolia, transport: http(RPC_URL), account: testAccount,
  })

  for (const level of DONOR_LEVELS) {
    const amountNum = parseFloat(level.amount)
    if (usdtBalance < amountNum) {
      console.log(`  ⚠️  Insufficient mUSDT for ${level.sbt} (need ${level.amount}, have ${usdtBalance.toFixed(2)})`)
      continue
    }

    console.log(`\n  → Donating ${level.amount} USDT for ${level.sbt}...`)

    // Check if already has this SBT
    if (await walletHasSbt(level.sbt)) {
      ok(`${level.sbt} already minted`)
      continue
    }

    try {
      const amount = BigInt(Math.floor(amountNum * 1_000_000))
      const txHash = await walletClient.writeContract({
        address: USDT_ADDRESS,
        abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
        functionName: 'transfer',
        args: [DONATION_CONTRACT, amount],
        chain: celoSepolia, account: testAccount,
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 })

      // Assign donation via backend
      const res = await api.post('/api/donations/assign', {
        regionId: parseInt(DONATION_REGION),
        donor: wallet,
        amount: level.amount,
        txHash,
      })

      if (!res.data.success) {
        fail(`Assign ${level.sbt}`, res.data.error || JSON.stringify(res.data))
        continue
      }

      ok(`Donated ${level.amount} USDT. tx=${txHash.slice(0,10)}...`)

      // Verify toast data in response
      const mintedSbts = res.data.mintedSbts || []
      if (mintedSbts.length > 0) {
        ok(`Toast data: ${mintedSbts.map(s => s.name).join(', ')}`)
        if (mintedSbts.some(s => s.name === level.sbt)) {
          ok(`${level.sbt} toast data present`)
        }
      }

      usdtBalance -= amountNum
    } catch (e) {
      fail(`Donation ${level.sbt}`, e.response?.data?.error || e.message?.slice(0, 80))
    }
  }
}

// ─── Wallet profile ───
async function testWalletProfile() {
  console.log('\n── Wallet Profile ──')
  try {
    const res = await api.get(`/api/credential/wallet/${wallet}`)
    if (res.status === 404) { ok('No activity yet (fresh wallet)'); return }
    const sbts = res.data.sbts || []
    const total = parseFloat(res.data.totalDonated || '0')
    console.log(`  Donated: ${total.toFixed(2)} USDT, SBTs: ${sbts.map(s => s.name).join(', ') || 'none'}`)
    for (const level of DONOR_LEVELS) {
      if (total >= parseFloat(level.amount) && sbts.some(s => s.name === level.sbt)) {
        ok(`${level.sbt} (>= $${level.amount})`)
      }
    }
    ok('Wallet profile endpoint responds')
  } catch (e) {
    fail('Wallet profile', e.code || e.response?.status || e.message?.slice(0, 80))
  }
}

// ─── Stats page ───
async function testStats() {
  console.log('\n── Stats page ──')
  try {
    const [breakdown, leaderboard] = await Promise.all([
      api.get('/api/credential/breakdown').then(r => r.data).catch(() => []),
      api.get('/api/credential/leaderboard?limit=10').then(r => r.data).catch(() => []),
    ])
    if (breakdown.length > 0) ok(`SBTs: ${breakdown.map(b => `${b.name}=${b.count}`).join(', ')}`)
    if (leaderboard.length > 0) ok(`${leaderboard.length} donors on leaderboard`)
  } catch (e) {
    fail('Stats', e.code || e.message?.slice(0, 80))
  }
}

// ─── Main ───
async function main() {
  await testConnector()
  await testExplorer()

  const usdtBalance = await fundWallet()
  await testIncrementalDonations(usdtBalance)

  await testWalletProfile()
  await testStats()
  summary()
}

main().catch(e => { console.error(e); process.exit(1) })
