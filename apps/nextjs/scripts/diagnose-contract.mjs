// scripts/diagnose-contract.mjs
// Diagnostic: checks PasosDeJesusCredentials contract state on Celo mainnet.
// Run: node scripts/diagnose-contract.mjs

import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

import { createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import { readFileSync } from 'fs'

const abi = JSON.parse(readFileSync(path.join(__dirname, '..', 'abis', 'PasosDeJesusCredentials.json'), 'utf-8'))

const CONTRACT = '0x9522F056fA74eDBFE72988c002BE37048D5D6604'
const BACKEND = process.env.PRIVATE_KEY
  ? privateKeyToAccount(process.env.PRIVATE_KEY).address
  : null

const rpc = (process.env.NEXT_PUBLIC_RPC_URL || '').replace(/"/g, '').replace('celo-sepolia', 'celo-mainnet') || 'https://forno.celo.org'
const pc = createPublicClient({ chain: celo, transport: http(rpc) })

async function main() {
  console.log(`Contrato: ${CONTRACT}`)
  console.log(`RPC: ${rpc.slice(0, 55)}...`)

  try {
    const nextId = await pc.readContract({
      address: CONTRACT, abi,
      functionName: 'nextTokenId',
    })
    console.log(`\nnextTokenId: ${nextId}`)

    for (let i = 1; i < Number(nextId); i++) {
      try {
        const [name, sb, maxSup] = await Promise.all([
          pc.readContract({ address: CONTRACT, abi, functionName: 'tokenNames', args: [BigInt(i)] }),
          pc.readContract({ address: CONTRACT, abi, functionName: 'isSoulbound', args: [BigInt(i)] }),
          pc.readContract({ address: CONTRACT, abi, functionName: 'maxSupply', args: [BigInt(i)] }),
        ])
        let totalSup = '?'
        try {
          totalSup = String(await pc.readContract({ address: CONTRACT, abi, functionName: 'totalSupply', args: [BigInt(i)] }))
        } catch {}
        const maxS = Number(maxSup)
        const totalS = Number(totalSup)
        let status = '✅'
        if (maxS > 0 && totalS >= maxS) status = '🔒 SUPPLY'
        console.log(`  ${i}: ${status} | ${name} | soulbound=${sb} | supply=${totalS}/${maxS || '∞'}`)
      } catch (e) {
        console.log(`  ${i}: ❌ ${e.message?.slice(0, 80)}`)
      }
    }
  } catch (e) {
    console.log(`Error: ${e.message}`)
  }

  if (BACKEND) {
    console.log(`\nBackend: ${BACKEND}`)
    try {
      const MINTER_ROLE = await pc.readContract({
        address: CONTRACT, abi,
        functionName: 'MINTER_ROLE',
      })
      const hasMinter = await pc.readContract({
        address: CONTRACT, abi,
        functionName: 'hasRole',
        args: [MINTER_ROLE, BACKEND],
      })
      console.log(`  MINTER_ROLE: ${hasMinter ? '✅ YES' : '❌ NO'}`)
      const celoBal = await pc.getBalance({ address: BACKEND })
      console.log(`  CELO: ${(Number(celoBal)/1e18).toFixed(4)}`)
    } catch (e) {
      console.log(`  ❌ ${e.message?.slice(0, 80)}`)
    }
  }

  const wallets = ['0x358643badcc77cccb28a319abd439438a57339a7', '0x6b3bc1b55b28380193733a2fd27f2639d92f14be']
  for (const w of wallets) {
    console.log(`\nWallet ${w.slice(0,6)}... on-chain SBTs:`)
    let found = 0
    for (let i = 1; i <= 10; i++) {
      try {
        const bal = await pc.readContract({
          address: CONTRACT, abi,
          functionName: 'balanceOf',
          args: [w, BigInt(i)],
        })
        if (bal > 0n) {
          const name = await pc.readContract({
            address: CONTRACT, abi,
            functionName: 'tokenNames',
            args: [BigInt(i)],
          })
          console.log(`  tokenId=${i}: ${name} (${bal})`)
          found++
        }
      } catch {}
    }
    if (found === 0) console.log('  (ninguno)')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
