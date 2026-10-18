// Pre-alert ON-CHAIN purchase spec: buys a pending pre-alert with a real USDT
// transfer to the PreAlertMarket (1 USDT + preAlertId appended to the calldata,
// mirroring `lib/buyPreAlert.ts`), asks the backend to verify it (`tx_hash`),
// converts it, and (opt-in) scores 2 → payout.
//
// Needs USDT + gas in the test wallet. Addresses come from the app's env
// (`NEXT_PUBLIC_PREALERT_MARKET_ADDRESS`, `NEXT_PUBLIC_USDT_ADDRESS`), overridable
// with `E2E_MARKET_ADDRESS` / `E2E_USDT_ADDRESS` (the runner reloads `apps/.env`, so
// a plain env var on the command line is not enough for the target site). The RPC
// comes from `E2E_RPC_URL` or `NEXT_PUBLIC_RPC_URL` (pass `E2E_RPC_URL=…` if the
// app's RPC is IP-whitelisted). The payout step needs the region funded + the
// backend wallet holding the escrow's `BACKEND_ROLE`; enable it with `PREALERT_PAY=1`.
//
//   E2E_RPC_URL=https://forno.celo-sepolia.celo-testnet.org \
//   SITE_URL=http://localhost:4000 bin/m test:e2e prealert-purchase
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'
import { fail, initTestEnv, ok, resetFailures, summary } from '@pasosdejesus/m/e2e'
import { siteBase } from '../helpers/site.mjs'
import { loadPrivateKey } from '../helpers/wallet-ui.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const PRICE_USDT = 1n

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* not JSON */
  }
  return { status: res.status, json }
}

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* not JSON */
  }
  return { status: res.status, json }
}

async function main() {
  const t0 = performance.now()
  resetFailures()

  const base = siteBase()
  const env = await initTestEnv()
  // A full viem local account (the runner's `env.account` only signs messages).
  const pk = loadPrivateKey()
  if (!pk) {
    fail('TEST_PRIVATE_KEY / apps/.env PRIVATE_KEY not found')
    process.exit(1)
  }
  const account = privateKeyToAccount(pk)
  const buyer = account.address
  const chain = env.chainId === 42220 ? celo : celoSepolia
  const rpc = process.env.E2E_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL
  const usdt = process.env.E2E_USDT_ADDRESS || process.env.NEXT_PUBLIC_USDT_ADDRESS
  const market = process.env.E2E_MARKET_ADDRESS || process.env.NEXT_PUBLIC_PREALERT_MARKET_ADDRESS
  console.log(`Pre-alert on-chain purchase — ${base}\n wallet: ${buyer}\n rpc: ${rpc}\n`)

  if (!usdt || !market) {
    fail('NEXT_PUBLIC_USDT_ADDRESS / NEXT_PUBLIC_PREALERT_MARKET_ADDRESS not set')
    process.exit(summary(t0) > 0 ? 1 : 0)
  }

  const publicClient = createPublicClient({ chain, transport: http(rpc) })
  const walletClient = createWalletClient({ chain, transport: http(rpc), account })

  // 0. Buyer needs 1 USDT (+ gas) on-chain.
  const erc20 = [
    { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  ]
  const amount = parseUnits(String(PRICE_USDT), 6)
  const usdtBalance = await publicClient.readContract({ address: usdt, abi: erc20, functionName: 'balanceOf', args: [buyer] })
  if (usdtBalance < amount) {
    fail(`buyer has ${usdtBalance} < ${amount} USDT (${usdt}) — fund the wallet`)
    process.exit(summary(t0) > 0 ? 1 : 0)
  }
  ok(`buyer USDT balance: ${Number(usdtBalance) / 1e6}`)

  // 1. Pick a pending pre-alert.
  let id = process.env.PENDING_PREALERT_ID ? parseInt(process.env.PENDING_PREALERT_ID, 10) : null
  if (id) {
    ok(`using PENDING_PREALERT_ID=${id}`)
  } else {
    const list = await getJson(`${base}/api/pre-alerts?limit=1`)
    if (list.status !== 200) {
      fail(`GET /api/pre-alerts → ${list.status} (cannot pick a pending pre-alert)`)
      process.exit(summary(t0) > 0 ? 1 : 0)
    }
    id = list.json?.pre_alerts?.[0]?.id ?? null
    if (id) ok(`picked pending pre-alert #${id}`)
  }
  if (!id) {
    fail('no pending pre-alert to purchase (market empty?)')
    process.exit(summary(t0) > 0 ? 1 : 0)
  }

  // 2. Send the USDT transfer with preAlertId appended (same encoding as the app).
  const data =
    '0xa9059cbb' +
    market.slice(2).padStart(64, '0') +
    amount.toString(16).padStart(64, '0') +
    BigInt(id).toString(16).padStart(64, '0')
  let txHash
  try {
    txHash = await walletClient.sendTransaction({ to: usdt, data, account })
    await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 })
    ok(`sent 1 USDT to the market (tx ${txHash.slice(0, 12)}…)`)
  } catch (e) {
    fail(`on-chain transfer failed: ${e.shortMessage || e.message}`)
    process.exit(summary(t0) > 0 ? 1 : 0)
  }

  // 3. Backend verifies the on-chain transfer → reserved.
  const buy = await postJson(`${base}/api/pre-alerts/${id}/buy`, { buyer_wallet: buyer, tx_hash: txHash })
  if (buy.status === 200 && buy.json?.status === 'reserved') ok(`#${id} reserved (backend verified ${txHash.slice(0, 12)}…)`)
  else fail(`buy: expected 200 {status:"reserved"}, got ${buy.status} ${JSON.stringify(buy.json)}`)

  // 4. Convert (DB only).
  const conv = await postJson(`${base}/api/pre-alerts/convert`, {
    pre_alert_id: id,
    buyer_wallet: buyer,
    citizen_notes: 'e2e on-chain purchase',
  })
  if (conv.status === 200 && conv.json?.status === 'converted') ok(`#${id} converted`)
  else fail(`convert: expected 200 {status:"converted"}, got ${conv.status} ${JSON.stringify(conv.json)}`)

  // 5. Opt-in payout (score 2): withdraw from RegionalDonation + releasePayment.
  if (process.env.PREALERT_PAY === '1') {
    const ts = Math.floor(Date.now() / 1000)
    const signature = await account.signMessage({ message: `score:${id}:2:${ts}` })
    const sc = await postJson(`${base}/api/pre-alerts/${id}/score`, {
      score: 2,
      feedback: 'e2e on-chain payout',
      documenter_wallet: buyer,
      timestamp: ts,
      signature,
    })
    if (sc.status === 200 && sc.json?.status === 'paid') ok(`#${id} paid (${sc.json.citizen_reward})`)
    else fail(`pay: expected 200 {status:"paid"}, got ${sc.status} ${JSON.stringify(sc.json)}`)
  } else {
    console.log('  [SKIP] payout — set PREALERT_PAY=1 (needs the region funded + backend authorized)')
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
