// scripts/e2e/test-sbts.mjs
// E2E test for SIVeL 3 SBT minting on Celo Sepolia.
// Uses legacy donate(regionId, amount) flow (same as MetaMask/MiniPay).
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

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sivel.xyz:9001'
if (BASE_URL === 'https://sivel.xyz') {
  console.error('E2E solo contra desarrollo, no producción.')
  process.exit(1)
}
const RPC_URL = (process.env.NEXT_PUBLIC_RPC_URL || '').replace(/"/g, '') || 'https://forno.celo-sepolia.celo-testnet.org'
const RPC_DONATION = 'https://forno.celo-sepolia.celo-testnet.org' // forno for custom-data txs
const USDT = process.env.NEXT_PUBLIC_USDT_ADDRESS
const DONATION = BASE_URL === 'https://sivel.xyz:9001'
  ? '0xc50123FB87e4167Fe9275Cab90Ae35551fE1248e' // Sepolia deployment
  : process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS
const DONATION_REGION = '1'
const PRIVATE_KEY = process.env.PRIVATE_KEY
if (!PRIVATE_KEY) { console.error('PRIVATE_KEY not set'); process.exit(1) }

const testKey = generatePrivateKey()
const testAccount = privateKeyToAccount(testKey)
const wallet = testAccount.address.toLowerCase()
const funderAccount = privateKeyToAccount(PRIVATE_KEY)

console.log(`SIVeL 3 E2E — ${BASE_URL}`)
console.log(`Test wallet: ${wallet}`)

const api = axios.create({ baseURL: BASE_URL, httpsAgent: new https.Agent({ rejectUnauthorized: false }), timeout: 30000, headers: { 'Content-Type': 'application/json' } })
let passed = 0, failed = 0
function ok(l) { console.log(`  ✅ ${l}`); passed++ }
function fail(l, d) { console.log(`  ❌ ${l}${d?': '+d:''}`); failed++ }

async function walletHasSbt(name) {
  try { const r = await api.get(`/api/credential/wallet/${wallet}`); return r.status===200 && (r.data.sbts||[]).some(s=>s.name===name) } catch { return false }
}

// ─── Fund ───
async function fund() {
  console.log('\n── Funding ──')
  const pc = createPublicClient({ chain: celoSepolia, transport: http(RPC_URL) })
  const fc = createWalletClient({ chain: celoSepolia, transport: http(RPC_URL), account: funderAccount })

  try {
    const h = await fc.sendTransaction({ to: wallet, value: BigInt(1e18), chain: celoSepolia, account: funderAccount })
    await pc.waitForTransactionReceipt({ hash: h, timeout: 30_000 })
    ok(`CELO: ${(Number(await pc.getBalance({address:wallet}))/1e18).toFixed(2)}`)
  } catch(e) { fail('CELO', e.message?.slice(0,60)); return 0 }

  if (!USDT) { fail('USDT_ADDRESS not set'); return 0 }
  try {
    const fb = await pc.readContract({ address: USDT, abi: parseAbi(['function balanceOf(address) view returns (uint256)']), functionName: 'balanceOf', args: [funderAccount.address] })
    const fu = Number(fb)/1e6
    console.log(`  Funder mUSDT: ${fu.toFixed(2)}`)
    if (fu < 101) { fail(`Insufficient: ${fu.toFixed(2)} < 101`); return 0 }
    const h = await fc.writeContract({ address: USDT, abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']), functionName: 'transfer', args: [wallet, BigInt(101_000_000)], chain: celoSepolia, account: funderAccount })
    await pc.waitForTransactionReceipt({ hash: h, timeout: 30_000 })
    const tb = await pc.readContract({ address: USDT, abi: parseAbi(['function balanceOf(address) view returns (uint256)']), functionName: 'balanceOf', args: [wallet] })
    const tu = Number(tb)/1e6
    ok(`mUSDT: ${tu.toFixed(2)}`)
    return tu
  } catch(e) { fail('mUSDT', e.message?.slice(0,60)); return 0 }
}

// ─── Test SBTs ───
async function testConnector() {
  console.log('\n── Connector ──')
  try {
    const r = await api.post('/api/credential/mint-connector', { wallet })
    if (!r.data.minted) {
      if (r.data.reason==='already_has') { ok('Already minted'); return }
      if (r.data.reason==='not_verified') { ok('Needs learn.tg (expected)'); return }
      fail('Connector', JSON.stringify(r.data)); return
    }
    ok('Minted!')
    const sbts = r.data.mintedSbts || []
    if (sbts.some(s=>s.name==='Connector')) ok('Toast: Connector')
    if (r.data.founderMinted) { ok('Global Founder minted'); if (sbts.some(s=>s.name==='Global Founder')) ok('Toast: Global Founder') }
  } catch(e) { fail('Connector', e.code||e.message?.slice(0,60)) }
}

// ─── Donate via MiniPay flow (direct transfer + assign) ───
async function testDonation() {
  if (!USDT || !DONATION) { fail('Addresses not set'); return }
  console.log('\n── Donation ($100, MiniPay flow) ──')
  const pc = createPublicClient({ chain: celoSepolia, transport: http(RPC_DONATION) })
  const wc = createWalletClient({ chain: celoSepolia, transport: http(RPC_DONATION), account: testAccount })

  try {
    // Build custom transfer data with regionId appended (same as lib/donate.ts:79)
    // 0xa9059cbb + paddedAddress + paddedAmount + paddedRegionId
    const amount = BigInt(100_000_000) // $100 USDT
    const regionId = BigInt(parseInt(DONATION_REGION))
    const data = '0xa9059cbb' +
      DONATION.slice(2).toLowerCase().padStart(64, '0') +
      amount.toString(16).padStart(64, '0') +
      regionId.toString(16).padStart(64, '0')

    const txHash = await wc.sendTransaction({
      to: USDT,
      data: data,
      chain: celoSepolia, account: testAccount,
    })
    await pc.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 })
    ok(`Donated $100. tx=${txHash.slice(0,10)}...`)

    // assign via backend
    console.log('  Assigning via backend...')
    const r = await api.post('/api/donations/assign', { regionId: parseInt(DONATION_REGION), donor: wallet, amount: '100', txHash })
    if (!r.data.success) { fail('Assign', JSON.stringify(r.data)); return }
    ok('Assigned')

    const sbts = r.data.mintedSbts || []
    console.log(`  mintedSbts response: ${JSON.stringify(sbts)}`)
    if (sbts.length) {
      ok(`Toast: ${sbts.map(s=>s.name).join(', ')}`)
      for (const lvl of ['Donor','Bronze Donor','Silver Donor','Gold Donor','Diamond Donor'])
        if (sbts.some(s=>s.name===lvl)) ok(`Toast: ${lvl}`)
    }
  } catch(e) { fail('Donation', e.response?.data?.error||e.message?.slice(0,60)) }
}

// ─── Explorer: record 3 case views then mint ───
async function testExplorer() {
  console.log('\n── Explorer SBT ──')
  if (await walletHasSbt('Explorer')) { ok('Already minted'); return }

  const cases = ['171399', '171491', '171287']
  for (const c of cases) {
    await api.post('/api/web-analytics/event', {
      event_type: 'pageview', pathname: `/cases/${c}`, wallet,
    }).catch(() => {})
  }
  console.log(`  Recorded ${cases.length} case views`)

  try {
    const r = await api.post('/api/credential/mint-explorer', { wallet })
    if (!r.data.minted) {
      if (r.data.reason === 'already_has') { ok('Already minted'); return }
      fail('Explorer', JSON.stringify(r.data)); return
    }
    ok('Explorer minted!')
    if (r.data.mintedSbt) ok(`Toast: ${r.data.mintedSbt.name}`)
  } catch(e) { fail('Explorer', e.message?.slice(0,60)) }
}

// ─── Verify ───
async function verify() {
  console.log('\n── Verify ──')
  try {
    const r = await api.get(`/api/credential/wallet/${wallet}`)
    const sbts = r.data.sbts || []
    const total = parseFloat(r.data.totalDonated||'0')
    console.log(`  Donated: ${total.toFixed(2)} USDT, SBTs: ${sbts.map(s=>s.name).join(', ')||'none'}`)
    if (total>=0.02 && sbts.some(s=>s.name==='Donor')) ok('Donor SBT')
    if (total>=100 && sbts.some(s=>s.name==='Diamond Donor')) ok('Diamond Donor SBT (all levels)')
    ok('Wallet profile OK')
  } catch(e) { fail('Verify', e.code||e.message?.slice(0,60)) }
}

async function stats() {
  console.log('\n── Stats ──')
  try {
    const [b, lb] = await Promise.all([api.get('/api/credential/breakdown').then(r=>r.data).catch(()=>[]), api.get('/api/credential/leaderboard?limit=10').then(r=>r.data).catch(()=>[])])
    if (b.length) ok(`SBTs: ${b.map(x=>`${x.name}=${x.count}`).join(', ')}`)
    if (lb.length) ok(`${lb.length} donors`)
  } catch(e) { fail('Stats', e.code||e.message?.slice(0,60)) }
}

async function main() {
  await testConnector()
  const bal = await fund()
  if (bal >= 100) await testDonation()
  await verify()
  await testExplorer()
  await stats()
  console.log(`\n${'='.repeat(40)}\n${passed} passed, ${failed} failed`)
  if (failed) process.exit(1)
}
main().catch(e => { console.error(e); process.exit(1) })
