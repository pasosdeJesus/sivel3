// scripts/mint-donor-direct.mjs
// Directly mints Donor SBT for a wallet on production contract.
// Isolates the minting issue from the donation flow.
// Run on production server: node scripts/mint-donor-direct.mjs

import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import { readFileSync } from 'fs'

const CONTRACT = '0x9522f056fa74edbfe72988c002be37048d5d6604'
const TARGET = '0x8fd27bdc1d1d53ebf7ab31225e7663b49d3573f7'
const TOKEN_ID = 2 // Donor

// Force nonce to reproduce error — use 'latest' to see nonce gap,
// or set to specific number to test replacement
const FORCE_NONCE = parseInt(process.env.FORCE_NONCE || '0') || undefined

const key = process.env.PRIVATE_KEY
if (!key) { console.error('PRIVATE_KEY not set'); process.exit(1) }

const rpc = (process.env.NEXT_PUBLIC_RPC_URL || '').replace(/"/g, '') || 'https://forno.celo.org'
const abi = JSON.parse(readFileSync(path.join(__dirname, '..', 'abis', 'PasosDeJesusCredentials.json'), 'utf-8'))

const account = privateKeyToAccount(key)
const pc = createPublicClient({ chain: celo, transport: http(rpc) })

async function main() {
  console.log(`Backend: ${account.address}`)
  console.log(`Target: ${TARGET}`)
  console.log(`Contract: ${CONTRACT}`)
  console.log(`TokenId: ${TOKEN_ID} (Donor)`)

  // Pre-checks
  const celoBal = await pc.getBalance({ address: account.address })
  console.log(`\nCELO: ${(Number(celoBal)/1e18).toFixed(4)}`)

  try {
    const MINTER_ROLE = await pc.readContract({ address: CONTRACT, abi, functionName: 'MINTER_ROLE' })
    const hasMinter = await pc.readContract({ address: CONTRACT, abi, functionName: 'hasRole', args: [MINTER_ROLE, account.address] })
    console.log(`MINTER_ROLE: ${hasMinter ? '✅' : '❌'}`)
    if (!hasMinter) { console.log('Aborting: no MINTER_ROLE'); return }
  } catch (e) { console.log(`MINTER_ROLE check: ${e.message?.slice(0,60)}`); return }

  // Check existing balance
  try {
    const bal = await pc.readContract({ address: CONTRACT, abi, functionName: 'balanceOf', args: [TARGET, BigInt(TOKEN_ID)] })
    if (bal > 0n) { console.log(`Target already has Donor SBT. Aborting.`); return }
    console.log(`Target does NOT have Donor SBT`)
  } catch (e) { console.log(`BalanceOf check: ${e.message?.slice(0,60)}`) }

  // Nonce
  const nonceLatest = await pc.getTransactionCount({ address: account.address })
  const noncePending = await pc.getTransactionCount({ address: account.address, blockTag: 'pending' })
  const nonceToUse = FORCE_NONCE || noncePending
  console.log(`Nonce: ${nonceLatest} (latest) / ${noncePending} (pending) → using ${nonceToUse}`)
  
  // Gas price
  const gasPrice = await pc.getGasPrice()
  console.log(`Gas price: ${Number(gasPrice)/1e9} gwei`)

  // Try 'pending' first (likely fails with "replacement underpriced")
  console.log(`\nAttempt 1: nonce=pending (${noncePending})`)
  try {
    const wc = createWalletClient({ chain: celo, transport: http(rpc), account })
    const hash = await wc.writeContract({
      address: CONTRACT, abi,
      functionName: 'mintCredential',
      args: [TARGET, BigInt(TOKEN_ID), BigInt(1)],
      chain: celo, account,
      nonce: noncePending,
      gasPrice,
    })
    console.log(`✅ nonce=${noncePending}: txHash ${hash.slice(0,10)}...`)
    await pc.waitForTransactionReceipt({ hash, timeout: 60_000 })
    console.log('✅ Confirmed!')
  } catch (e) {
    console.log(`❌ nonce=${noncePending}: ${e.message?.slice(0,160)}`)
  }

  // Try 'latest' (should work since it skips stuck pending txs)
  console.log(`\nAttempt 2: nonce=latest (${nonceLatest})`)
  try {
    const wc2 = createWalletClient({ chain: celo, transport: http(rpc), account })
    const hash = await wc2.writeContract({
      address: CONTRACT, abi,
      functionName: 'mintCredential',
      args: [TARGET, BigInt(TOKEN_ID), BigInt(1)],
      chain: celo, account,
      nonce: nonceLatest,
      gasPrice,
    })
    console.log(`✅ nonce=${nonceLatest}: txHash ${hash.slice(0,10)}...`)
    await pc.waitForTransactionReceipt({ hash, timeout: 60_000 })
    console.log('✅ Confirmed!')
  } catch (e) {
    console.log(`❌ nonce=${nonceLatest}: ${e.message?.slice(0,160)}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
