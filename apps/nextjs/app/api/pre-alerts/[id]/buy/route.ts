import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, parseAbi } from 'viem'
import { celo, celoSepolia } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { readDeployment } from '@pasosdejesus/m/blockchain/deployments'
import path from 'path'

const deploymentsDir = path.join(process.cwd(), '..', 'hardhat', 'deployments')
const network = (process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'celo' : 'celoSepolia') as 'celo' | 'celoSepolia'
const viemChain = network === 'celo' ? celo : celoSepolia
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!

function getPreAlertMarketAddress(): `0x${string}` | null {
  const dep = readDeployment(network, deploymentsDir, {
    contract: 'SIVeL3PreAlertMarket',
    version: 'V1',
  })
  return dep ? (dep.address as `0x${string}`) : null
}

const ERC20_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
])

async function verifyPreAlertPurchase(
  txHash: string,
  expectedBuyer: string,
  expectedAmount: bigint,
): Promise<{ valid: boolean; preAlertId: number | null }> {
  try {
    const client = createPublicClient({ chain: viemChain, transport: http(RPC_URL) })
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` })
    if (!tx) {
      console.warn(`[verifyPreAlert] Transaction not found on-chain: ${txHash}`)
      return { valid: false, preAlertId: null }
    }
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })
    if (!receipt) {
      console.warn(`[verifyPreAlert] Receipt not found (tx not confirmed): ${txHash}`)
      return { valid: false, preAlertId: null }
    }

    // Extract preAlertId from calldata (last 32 bytes)
    const input = tx.input
    if (input.length < 136) {
      console.warn(`[verifyPreAlert] Calldata too short: ${input.length} bytes`)
      return { valid: false, preAlertId: null }
    }
    const preAlertIdHex = '0x' + input.slice(-64)
    const preAlertId = Number(BigInt(preAlertIdHex))

    // Find Transfer event
    const usdtAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS?.toLowerCase()
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const transferLog = receipt.logs.find(
      l => l.address.toLowerCase() === usdtAddress && l.topics[0] === transferTopic,
    )
    if (!transferLog || transferLog.topics.length < 3) {
      console.warn(`[verifyPreAlert] USDT Transfer event not found in receipt logs`)
      return { valid: false, preAlertId: null }
    }

    const from = `0x${transferLog.topics[1]!.slice(26)}`.toLowerCase()
    const to = `0x${transferLog.topics[2]!.slice(26)}`.toLowerCase()
    const value = BigInt(transferLog.data)
    const contractAddr = getPreAlertMarketAddress()?.toLowerCase()

    const valid =
      from === expectedBuyer.toLowerCase() &&
      to === contractAddr &&
      value === expectedAmount

    if (!valid) {
      console.warn(
        `[verifyPreAlert] Transfer mismatch: from=${from} (expected=${expectedBuyer.toLowerCase()}), to=${to} (expected=${contractAddr}), value=${value} (expected=${expectedAmount})`,
      )
    }

    return { valid, preAlertId: valid ? preAlertId : null }
  } catch (err) {
    console.error(`[verifyPreAlert] Exception:`, err)
    return { valid: false, preAlertId: null }
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const preAlertId = parseInt(id)
    if (isNaN(preAlertId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = (await req.json()) as {
      buyer_wallet?: string
      tx_hash?: string
    }

    if (!body.buyer_wallet) {
      return NextResponse.json(
        { error: 'buyer_wallet is required' },
        { status: 400 },
      )
    }

    const db = newKyselyPostgresql()

    const preAlert = await db
      .selectFrom('pre_alert')
      .select(['id', 'status'])
      .where('id', '=', preAlertId)
      .executeTakeFirst()

    if (!preAlert) {
      console.warn(`[buy API #${preAlertId}] Pre-alert not found in DB`)
      return NextResponse.json({ error: 'Pre-alert not found' }, { status: 404 })
    }

    if (preAlert.status !== 'pending') {
      console.warn(
        `[buy API #${preAlertId}] Not available — status: ${preAlert.status}`,
      )
      return NextResponse.json(
        { error: `Pre-alert is not available for purchase (status: ${preAlert.status})` },
        { status: 409 },
      )
    }

    // Verify on-chain USDT transfer
    if (body.tx_hash) {
      console.log(
        `[buy API #${preAlertId}] Verifying on-chain tx ${body.tx_hash} — buyer: ${body.buyer_wallet}`,
      )
      const price = 1_000_000n // 1 USDT (6 decimals)
      const verification = await verifyPreAlertPurchase(
        body.tx_hash,
        body.buyer_wallet,
        price,
      )
      if (!verification.valid || verification.preAlertId !== preAlertId) {
        console.error(
          `[buy API #${preAlertId}] On-chain verification FAILED. valid=${verification.valid}, preAlertId=${verification.preAlertId}, expectedId=${preAlertId}`,
        )
        return NextResponse.json(
          { error: 'On-chain verification failed — transfer does not match expected pre-alert purchase. The transaction may not be confirmed yet.' },
          { status: 400 },
        )
      }
    }

    const conversionDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db
      .updateTable('pre_alert')
      .set({
        status: 'reserved',
        buyer_wallet: body.buyer_wallet.toLowerCase(),
        bought_at: new Date() as unknown as string,
        conversion_deadline: conversionDeadline as unknown as string,
        tx_hash: body.tx_hash || null,
        updated_at: new Date() as unknown as string,
      })
      .where('id', '=', preAlertId)
      .execute()

    return NextResponse.json({
      success: true,
      tx_hash: body.tx_hash,
      status: 'reserved',
      expires_at: conversionDeadline.toISOString(),
    })
  } catch (error) {
    console.error('POST /api/pre-alerts/[id]/buy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
