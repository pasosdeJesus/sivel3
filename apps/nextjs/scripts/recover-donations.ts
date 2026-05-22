import { createPublicClient, http, parseAbiItem } from 'viem'
import { celo } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const RPC_URL = 'https://forno.celo.org'
const CHAIN = celo

const CONTRACTS = [
  { address: '0xE7E8e4Fb2d52C35392aBf4436569c93Aa752C050', label: 'V1' },
  { address: '0x563AbB7492bb496B9DD74d54D6daDd41374924E5', label: 'V2' },
]

const donationAssignedEvent = parseAbiItem(
  'event DonationAssigned(uint256 indexed regionId, address indexed donor, uint256 amount, bytes32 indexed txHash, uint256 timestamp)'
)
const donationReceivedEvent = parseAbiItem(
  'event DonationReceived(address indexed donor, uint256 indexed regionId, uint256 amount)'
)

const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) })
const db = newKyselyPostgresql() as any

const CHUNK_SIZE = 500000n

async function processEvent(
  contract: { address: string; label: string },
  eventAbi: typeof donationAssignedEvent | typeof donationReceivedEvent,
  eventName: string,
) {
  const latestBlock = await publicClient.getBlockNumber()

  // Estimate deployment blocks:
  // V1: deployed ~Jun 2025, roughly block 57M on Celo mainnet
  // V2: deployed ~Feb 2026, roughly block 65M
  const fromBlock = contract.label === 'V1' ? 57000000n : 65000000n
  console.log(`${contract.label} ${eventName}: desde bloque ${fromBlock} hasta ${latestBlock}`)

  let totalLogs = 0
  let inserted = 0
  let skipped = 0

  for (let from = fromBlock; from <= latestBlock; from += CHUNK_SIZE) {
    const to = from + CHUNK_SIZE - 1n > latestBlock ? latestBlock : from + CHUNK_SIZE - 1n

    try {
      const logs = await publicClient.getLogs({
        address: contract.address as `0x${string}`,
        event: eventAbi,
        fromBlock: from,
        toBlock: to,
      })

      for (const log of logs) {
        totalLogs++

        let donor: string
        let regionId: number
        let amount: number
        let txHashAssigned: string | null = null
        let ts: number | null = null
        const txHash = log.transactionHash.toLowerCase()

        if (eventName === 'DonationAssigned') {
          const args = log.args as any
          regionId = Number(args.regionId)
          donor = (args.donor as string).toLowerCase()
          amount = Number(args.amount) / 1_000_000
          txHashAssigned = args.txHash
            ? (args.txHash as string).toLowerCase()
            : null
          ts = args.timestamp ? Number(args.timestamp) : null
        } else {
          const args = log.args as any
          donor = (args.donor as string).toLowerCase()
          regionId = Number(args.regionId)
          amount = Number(args.amount) / 1_000_000
        }

        const existing = await db
          .selectFrom('transaction')
          .select('id')
          .where((eb: any) =>
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
            wallet: donor,
            region_id: regionId,
            cantidad: amount.toFixed(6),
            impacto_balance: (-amount).toFixed(6),
            tipo: 'donation',
            crypto: 'usdt',
            hash_tx: txHash,
            hash_assign: txHashAssigned,
            fecha: ts ? new Date(ts * 1000) : new Date(),
          })
          .execute()

        inserted++
        process.stdout.write(`\r  ${contract.label} ${eventName}: ${inserted} nuevos, ${skipped} existentes | ult: ${donor.slice(0,6)}...${donor.slice(-4)} region ${regionId} ${amount.toFixed(2)} USDT`)
      }
    } catch (err: any) {
      if (err.message?.includes('range') || err.message?.includes('limit') || err.message?.includes('exceed')) {
        process.stderr.write(`\n  Rango ${from}-${to} rechazado por RPC (límite de bloques), continuando...\n`)
        continue
      }
      throw err
    }

    process.stdout.write(`\r${contract.label} ${eventName}: bloque ${from}-${to}: ${inserted} nuevos, ${skipped} existentes`)
  }

  console.log(`\n${contract.label} ${eventName} — Total: ${totalLogs} eventos, ${inserted} insertados, ${skipped} existentes`)
}

async function main() {
  for (const c of CONTRACTS) {
    // V2: try DonationAssigned first (has richer data)
    if (c.label === 'V2') {
      await processEvent(c, donationAssignedEvent, 'DonationAssigned')
    }
    // Both: try DonationReceived (legacy event, all versions have it)
    await processEvent(c, donationReceivedEvent, 'DonationReceived')
  }
  console.log('\nRecuperación completa.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
