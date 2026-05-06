import 'dotenv/config'
import type { Kysely } from 'kysely'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { celo, celoSepolia } from 'viem/chains'

/**
 * Backfill transaction_log with past donations by reading DonationAssigned
 * events from the SIVeL3RegionalDonationV2 contract on-chain.
 */
export async function up(db: Kysely<any>): Promise<void> {
  const CONTRACT = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`
  const NETWORK = process.env.NEXT_PUBLIC_NETWORK!

  if (!CONTRACT) {
    console.log('Skipping backfill — REGIONALDONATION_ADDRESS not set')
    return
  }

  // Use forno RPC (Celo's public node) — no block-range limits
  const rpcUrl =
    NETWORK === 'celo'
      ? 'https://forno.celo.org'
      : 'https://forno.celo-sepolia.celo-testnet.org'

  const client = createPublicClient({
    chain: NETWORK === 'celo' ? celo : celoSepolia,
    transport: http(rpcUrl),
  })

  const donationAssignedEvent = parseAbiItem(
    'event DonationAssigned(uint256 indexed regionId, address indexed donor, uint256 amount, bytes32 indexed txHash, uint256 timestamp)'
  )

  const donationReceivedEvent = parseAbiItem(
    'event DonationReceived(address indexed donor, uint256 indexed regionId, uint256 amount)'
  )

  try {
    const latestBlock = await client.getBlockNumber()
    // Start from ~4 weeks back for testnet; adjust if needed
    const startBlock = latestBlock - 2500000n

    // Try V2 events first
    try {
      const logs = await client.getLogs({
        address: CONTRACT,
        event: donationAssignedEvent,
        fromBlock: startBlock,
        toBlock: 'latest',
      })

      let inserted = 0
      for (const log of logs) {
        const regionId = Number(log.args.regionId)
        const donor = (log.args.donor as string).toLowerCase()
        const amount = Number(log.args.amount) / 1_000_000
        const txHash = log.args.txHash ? (log.args.txHash as string).toLowerCase() : null
        const ts = log.args.timestamp ? Number(log.args.timestamp) : null
        const txHashTx = log.transactionHash.toLowerCase()

        const existing = await db
          .selectFrom('transaction_log').select('id')
          .where('hash_tx', '=', txHashTx).executeTakeFirst()
        if (existing) continue

        await db.insertInto('transaction_log').values({
          wallet: donor, fecha: ts ? new Date(ts * 1000) : new Date(),
          tipo: 'donation', crypto: 'usdt',
          cantidad: amount.toFixed(6),
          impacto_balance: (-amount).toFixed(6),
          region_id: regionId,
          hash_tx: txHashTx, hash_assign: txHash,
        }).execute()
        inserted++
      }
      console.log(`Backfill: inserted ${inserted} donations from V2 contract`)
    } catch (e: any) {
      console.log('V2 query skipped:', e.message?.slice(0, 120))
    }

    // Also check V1 (legacy) DonationReceived events
    const V1_CONTRACT = process.env.NEXT_PUBLIC_REGIONALDONATION_V1_ADDRESS as `0x${string}`
    if (V1_CONTRACT) {
      try {
        const logs = await client.getLogs({
          address: V1_CONTRACT,
          event: donationReceivedEvent,
          fromBlock: startBlock,
          toBlock: 'latest',
        })
        let inserted = 0
        for (const log of logs) {
          const donor = (log.args.donor as string).toLowerCase()
          const regionId = Number(log.args.regionId)
          const amount = Number(log.args.amount) / 1_000_000
          const txHashTx = log.transactionHash.toLowerCase()

          const existing = await db
            .selectFrom('transaction_log').select('id')
            .where('hash_tx', '=', txHashTx).executeTakeFirst()
          if (existing) continue

          await db.insertInto('transaction_log').values({
            wallet: donor, fecha: new Date(),
            tipo: 'donation', crypto: 'usdt',
            cantidad: amount.toFixed(6),
            impacto_balance: (-amount).toFixed(6),
            region_id: regionId, hash_tx: txHashTx,
          }).execute()
          inserted++
        }
        console.log(`Backfill: inserted ${inserted} donations from V1 contract`)
      } catch (e: any) {
        console.log('V1 query skipped:', e.message?.slice(0, 120))
      }
    }
  } catch (error: any) {
    console.log('Backfill skipped — RPC error:', error.message?.slice(0, 120))
  }
}

export async function down(_db: Kysely<any>): Promise<void> {
  console.log('Backfill: irreversible (would remove historical data).')
}
