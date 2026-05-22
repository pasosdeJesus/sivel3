import { createPublicClient, http, parseAbiItem } from 'viem'
import { celo } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://forno.celo.org'

const CONTRACTS = [
  { address: '0xE7E8e4Fb2d52C35392aBf4436569c93Aa752C050', label: 'V1' },
  { address: '0x563AbB7492bb496B9DD74d54D6daDd41374924E5', label: 'V2' },
]

const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) })
const db = newKyselyPostgresql() as any

const donationEvent = parseAbiItem('event DonationReceived(address indexed donor, uint256 indexed regionId, uint256 amount)')

const CHUNK_SIZE = 10000n // Celo RPC limit for eth_getLogs

async function recover(contract: { address: string; label: string }) {
  console.log(`\n=== RegionalDonation ${contract.label}: ${contract.address} ===`)

  const latestBlock = await publicClient.getBlockNumber()
  console.log(`Bloque actual: ${latestBlock}`)

  let totalLogs = 0
  let inserted = 0
  let skipped = 0

  for (let from = 0n; from <= latestBlock; from += CHUNK_SIZE) {
    const to = from + CHUNK_SIZE - 1n > latestBlock ? latestBlock : from + CHUNK_SIZE - 1n

    try {
      const logs = await publicClient.getLogs({
        address: contract.address as `0x${string}`,
        event: donationEvent,
        fromBlock: from,
        toBlock: to,
      })

      for (const log of logs) {
        totalLogs++
        const { donor, regionId, amount } = log.args as { donor: string; regionId: bigint; amount: bigint }
        const txHash = log.transactionHash

        const existing = await db
          .selectFrom('transaction')
          .select('id')
          .where((eb) =>
            eb('hash_tx', '=', txHash).or('hash_assign', '=', txHash)
          )
          .executeTakeFirst()

        if (existing) {
          skipped++
          continue
        }

        await db
          .insertInto('transaction')
          .values({
            wallet: donor.toLowerCase(),
            region_id: Number(regionId),
            cantidad: (Number(amount) / 1e6).toString(),
            tipo: 'donation',
            crypto: 'usdt',
            hash_tx: txHash,
            fecha: new Date(),
          })
          .execute()

        inserted++
        console.log(`  ✓ ${donor.slice(0, 6)}...${donor.slice(-4)} → region ${regionId}, ${Number(amount) / 1e6} USDT, tx=${txHash.slice(0, 10)}...`)
      }
    } catch (err: any) {
      if (err.message?.includes('block range')) {
        console.error(`  ⚠ Rango ${from}-${to} excede límite del RPC. Reduce CHUNK_SIZE.`)
        break
      }
      throw err
    }

    process.stdout.write(`\r  Bloques ${from}-${to}: ${totalLogs} eventos, ${inserted} insertados, ${skipped} existentes`)
  }

  console.log(`\n  Total: ${totalLogs} eventos, ${inserted} insertados, ${skipped} ya existentes`)
}

async function main() {
  for (const c of CONTRACTS) {
    await recover(c)
  }
  console.log('\nRecuperación completa.')
}

main().catch(console.error)
