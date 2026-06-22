#!/usr/bin/env node
/**
 * bin/check-verification.mjs — Check if a wallet is verified on learn.tg
 *
 * Usage:  node bin/check-verification.mjs 0x2e2c4AC19c93d0984840cDD8E7f77500e2ef978e
 *
 * Uses the same signed-request protocol as /api/verify.
 * Requires PRIVATE_KEY and NEXT_PUBLIC_NETWORK in .env
 */

import { privateKeyToAccount } from 'viem/accounts'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '..', '.env') })

const wallet = process.argv[2]
if (!wallet) {
  console.error('Usage: node bin/check-verification.mjs 0x...')
  process.exit(1)
}

const pk = process.env.PRIVATE_KEY
if (!pk) {
  console.error('PRIVATE_KEY not set in .env')
  process.exit(1)
}

const base =
  process.env.NEXT_PUBLIC_NETWORK === 'celo'
    ? 'https://learn.tg'
    : 'https://learn.tg:9001'

const account = privateKeyToAccount(pk)
console.log(`signer:    ${account.address}`)
console.log(`LEARNTG_ADDRESS (env): ${process.env.LEARNTG_ADDRESS || 'NOT SET'}`)
const timestamp = Math.floor(Date.now() / 1000)
const message = `${wallet}${timestamp}`
const signature = await account.signMessage({ message })

const url = `${base}/api/verify?wallet=${wallet}&timestamp=${timestamp}&signature=${signature}`
console.log(`learn.tg:  ${base}`)
console.log(`wallet:    ${wallet}`)
console.log(`timestamp: ${timestamp}`)
console.log(`url:       ${url}`)
console.log()

const res = await fetch(url)
if (!res.ok) {
  console.error(`learn.tg responded HTTP ${res.status}`)
  process.exit(1)
}

const data = await res.json()
console.log(data.verified ? '✅ VERIFIED' : '❌ NOT VERIFIED')
