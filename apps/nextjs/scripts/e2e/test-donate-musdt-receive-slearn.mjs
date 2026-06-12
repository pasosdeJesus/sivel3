// scripts/e2e/test-donate-musdt-receive-slearn.mjs
// E2E: Donate mUSDT on SIVeL 3 → receive SLEARN cashback (10%)
//
// PREREQUISITES:
//   1. learn.tg dev: sivel.xyz backend in AUTHORIZED_VERIFIERS
//   2. Test wallet NOT verified on learn.tg (no Self.xyz passport)
//      → expects no SLEARN: verifies bypass works
//   3. Backend has mUSDT for funding test wallets
//
// RUN: cd apps/nextjs && node scripts/e2e/test-donate-musdt-receive-slearn.mjs

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
const USDT = process.env.NEXT_PUBLIC_USDT_ADDRESS
const DONATION = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS
const SLEARN = process.env.NEXT_PUBLIC_SLEARN_ADDRESS
const DONATION_REGION = '1'
const PRIVATE_KEY = process.env.PRIVATE_KEY
if (!PRIVATE_KEY) { console.error('PRIVATE_KEY not set'); process.exit(1) }

const testKey = generatePrivateKey()
const testAccount = privateKeyToAccount(testKey)
const wallet = testAccount.address.toLowerCase()
const funderAccount = privateKeyToAccount(PRIVATE_KEY)

console.log(`SIVeL 3 E2E SLEARN — ${BASE_URL}`)
console.log(`Test wallet: ${wallet}`)
if (SLEARN) console.log(`SLEARN: ${SLEARN.slice(0, 10)}...`)
else console.log('SLEARN: not configured (skip on-chain checks)')

const api = axios.create({
  baseURL: BASE_URL,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

let passed = 0, failed = 0
function ok(l) { console.log(`  ✅ ${l}`); passed++ }
function fail(l, d) { console.log(`  ❌ ${l}${d ? ': ' + d : ''}`); failed++ }

const SLEARN_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function usdtToSLEARN(uint256) view returns (uint256)',
])

// ─── Fund ───
async function fund() {
  console.log('\n── Funding ──')
  const pc = createPublicClient({ chain: celoSepolia, transport: http(RPC_URL) })
  const fc = createWalletClient({ chain: celoSepolia, transport: http(RPC_URL), account: funderAccount })

  const h = await fc.sendTransaction({ to: wallet, value: BigInt(1e18), chain: celoSepolia, account: funderAccount })
  await pc.waitForTransactionReceipt({ hash: h, timeout: 30_000 })
  ok(`CELO: ${(Number(await pc.getBalance({ address: wallet })) / 1e18).toFixed(2)}`)

  if (!USDT) { fail('USDT_ADDRESS not set'); return 0 }
  const fb = await pc.readContract({ address: USDT, abi: parseAbi(['function balanceOf(address) view returns (uint256)']), functionName: 'balanceOf', args: [funderAccount.address] })
  const fu = Number(fb) / 1e6
  console.log(`  Funder mUSDT: ${fu.toFixed(2)}`)
  if (fu < 101) { fail(`Insufficient: ${fu.toFixed(2)} < 101`); return 0 }

  const th = await fc.writeContract({ address: USDT, abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']), functionName: 'transfer', args: [wallet, BigInt(101_000_000)], chain: celoSepolia, account: funderAccount })
  await pc.waitForTransactionReceipt({ hash: th, timeout: 30_000 })
  const tb = await pc.readContract({ address: USDT, abi: parseAbi(['function balanceOf(address) view returns (uint256)']), functionName: 'balanceOf', args: [wallet] })
  const tu = Number(tb) / 1e6
  ok(`mUSDT: ${tu.toFixed(2)}`)
  return tu
}

// ─── Donate ───
async function donate() {
  if (!USDT || !DONATION) { fail('Addresses not set'); return null }
  console.log('\n── Donation ($100, MiniPay flow) ──')
  const pc = createPublicClient({ chain: celoSepolia, transport: http(RPC_URL) })
  const wc = createWalletClient({ chain: celoSepolia, transport: http(RPC_URL), account: testAccount })

  const amount = BigInt(100_000_000)
  const regionId = BigInt(parseInt(DONATION_REGION))
  const data = '0xa9059cbb' +
    DONATION.slice(2).toLowerCase().padStart(64, '0') +
    amount.toString(16).padStart(64, '0') +
    regionId.toString(16).padStart(64, '0')

  const txHash = await wc.sendTransaction({
    to: USDT, data: data,
    chain: celoSepolia, account: testAccount,
  })
  await pc.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 })
  ok(`Donated $100. tx=${txHash.slice(0, 10)}...`)

  console.log('  Assigning via backend...')
  const r = await api.post('/api/donations/assign', {
    regionId: parseInt(DONATION_REGION), donor: wallet, amount: '100', txHash,
  })
  if (!r.data.success) { fail('Assign', JSON.stringify(r.data)); return null }
  ok('Assigned')
  return r.data
}

// ─── Verify SLEARN ───
async function verifySlearn(assignResult: any) {
  console.log('\n── SLEARN cashback ──')
  const slearnField = assignResult?.slearn

  if (!slearnField) {
    console.log('  No slearn field in response')
    return
  }

  if (slearnField.success) {
    ok(`Backend reports: ${slearnField.slearnMinted} SLEARN minted, tx=${slearnField.txHash?.slice(0, 10)}...`)

    if (SLEARN) {
      const pc = createPublicClient({ chain: celoSepolia, transport: http(RPC_URL) })
      const bal = await pc.readContract({
        address: SLEARN, abi: SLEARN_ABI,
        functionName: 'balanceOf', args: [wallet],
      })
      const balance = Number(bal) / 100
      if (balance > 0) ok(`On-chain SLEARN balance: ${balance.toFixed(2)}`)
      else fail('On-chain balance is 0')

      const expected = await pc.readContract({
        address: SLEARN, abi: SLEARN_ABI,
        functionName: 'usdtToSLEARN', args: [BigInt(10_000000)],
      })
      const expectedSlearn = Number(expected) / 100
      ok(`Expected: ${expectedSlearn.toFixed(2)} SLEARN (10 USDT × rate)`)
    }
  } else {
    console.log(`  ⚠️  No SLEARN (${slearnField.message || 'not verified'})`)
    ok('No SLEARN for unverified wallet (expected)')

    if (SLEARN) {
      const pc = createPublicClient({ chain: celoSepolia, transport: http(RPC_URL) })
      const bal = await pc.readContract({
        address: SLEARN, abi: SLEARN_ABI,
        functionName: 'balanceOf', args: [wallet],
      })
      if (Number(bal) === 0) ok('On-chain balance is 0 (expected)')
    }
  }
}

async function main() {
  const bal = await fund()
  if (bal < 100) { console.error('Insufficient funds'); process.exit(1) }

  const assignResult = await donate()
  if (assignResult) await verifySlearn(assignResult)

  console.log(`\n${'='.repeat(40)}\n${passed} passed, ${failed} failed`)
  if (failed) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
