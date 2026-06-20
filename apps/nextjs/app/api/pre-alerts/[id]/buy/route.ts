import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { readDeployment } from '@pasosdejesus/m/blockchain/deployments'
import path from 'path'

const deploymentsDir = path.join(process.cwd(), '..', 'hardhat', 'deployments')
const network = (process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'celo' : 'celoSepolia') as 'celo' | 'celoSepolia'

function getPreAlertMarketAddress(): `0x${string}` | null {
  const dep = readDeployment(network, deploymentsDir, {
    contract: 'SIVeL3PreAlertMarket',
    version: 'V1',
  })
  return dep ? (dep.address as `0x${string}`) : null
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
      return NextResponse.json({ error: 'Pre-alert not found' }, { status: 404 })
    }

    if (preAlert.status !== 'pending') {
      return NextResponse.json(
        { error: `Pre-alert is not available for purchase (status: ${preAlert.status})` },
        { status: 409 },
      )
    }

    // TODO(#43): Verify on-chain PreAlertBought event via tx_hash
    // const contractAddress = getPreAlertMarketAddress()
    // if (contractAddress && body.tx_hash) {
    //   verify PreAlertBought event: id matches preAlertId, buyer matches
    // }

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
