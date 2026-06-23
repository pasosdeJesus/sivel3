#!/usr/bin/env node
/**
 * bin/check-escrow.mjs — Quick balance check of contracts
 *
 * Usage: node bin/check-escrow.mjs [--network celo|celoSepolia]
 */
import { createPublicClient, http } from 'viem'
import { celo, celoSepolia } from 'viem/chains'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '..', '.env') })

const network = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? celo : celoSepolia
const label = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'Mainnet' : 'Sepolia'
const rpc = process.env.NEXT_PUBLIC_RPC_URL!

const client = createPublicClient({ chain: network, transport: http(rpc) })

const ADDRESSES = {
  RewardEscrow: '0xBFD94B391882612425455305dc0c9b1eC41E155A',
  PreAlertMarket: '0x9aefBD59455efE0F7732638eF791f35F110ddB0c',
  RegionalDonation: '0x563AbB7492bb496B9DD74d54D6daDd41374924E5',
}

const USDT = network === celo
  ? '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e'
  : process.env.NEXT_PUBLIC_USDT_ADDRESS

const usdtAbi = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
]

console.log(`Network: ${label}`)
console.log(`RPC:     ${rpc}`)
console.log()

for (const [name, addr] of Object.entries(ADDRESSES)) {
  try {
    const bal = await client.readContract({
      address: USDT as `0x${string}`,
      abi: usdtAbi,
      functionName: 'balanceOf',
      args: [addr as `0x${string}`],
    })
    const usdt = Number(bal) / 1_000_000
    console.log(`${name}: ${usdt} USDT (${addr})`)
  } catch (e: any) {
    console.log(`${name}: ERROR — ${e.message}`)
  }
}
