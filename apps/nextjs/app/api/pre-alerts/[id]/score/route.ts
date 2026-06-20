import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { readDeployment } from '@pasosdejesus/m/blockchain/deployments'
import path from 'path'

const deploymentsDir = path.join(process.cwd(), '..', 'hardhat', 'deployments')
const chainEnv = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'celo' : 'celoSepolia'
const viemChain = chainEnv === 'celo' ? celo : celoSepolia
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!

const REWARD_ESCROW_ABI = [
  {
    inputs: [],
    name: 'balance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'releasePayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

function getRewardEscrowAddress(): `0x${string}` | null {
  const dep = readDeployment(chainEnv, deploymentsDir, {
    contract: 'SIVeL3RewardEscrow',
    version: 'V1',
  })
  return dep ? (dep.address as `0x${string}`) : null
}

// TODO(#9): Replace with SBT-based DOCUMENTER_ROLE verification
async function isDocumenter(wallet: string): Promise<boolean> {
  const allowed = (process.env.DOCUMENTER_WALLETS || '')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(wallet.toLowerCase())
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
      score?: number
      feedback?: string
      documenter_wallet?: string
    }

    if (body.score == null || !body.documenter_wallet) {
      return NextResponse.json(
        { error: 'score and documenter_wallet are required' },
        { status: 400 },
      )
    }

    if (![0, 2, 3, 4, 5].includes(body.score)) {
      return NextResponse.json(
        { error: 'score must be 0 (reject) or 2-5' },
        { status: 400 },
      )
    }

    if (!(await isDocumenter(body.documenter_wallet))) {
      return NextResponse.json(
        { error: 'DOCUMENTER_ROLE required' },
        { status: 403 },
      )
    }

    const db = newKyselyPostgresql()

    const preAlert = await db
      .selectFrom('pre_alert')
      .selectAll()
      .where('id', '=', preAlertId)
      .executeTakeFirst()

    if (!preAlert) {
      return NextResponse.json({ error: 'Pre-alert not found' }, { status: 404 })
    }

    if (preAlert.status !== 'converted') {
      return NextResponse.json(
        { error: `Pre-alert must be converted to score (status: ${preAlert.status})` },
        { status: 409 },
      )
    }

    if (body.score === 0) {
      // Rejection — no payment
      if (!body.feedback) {
        return NextResponse.json(
          { error: 'feedback (rejection_reason) is required when score is 0' },
          { status: 400 },
        )
      }

      await db
        .updateTable('pre_alert')
        .set({
          status: 'rejected',
          score: 0,
          rejection_reason: body.feedback,
          scored_by: body.documenter_wallet.toLowerCase(),
          scored_at: new Date() as unknown as string,
          updated_at: new Date() as unknown as string,
        })
        .where('id', '=', preAlertId)
        .execute()

      return NextResponse.json({
        success: true,
        pre_alert_id: preAlertId,
        status: 'rejected',
        score: 0,
        citizen_reward: '0 USDT',
      })
    }

    // Score 2-5 — release USDT payment via RewardEscrow
    const citizenWallet = preAlert.buyer_wallet
    if (!citizenWallet) {
      return NextResponse.json(
        { error: 'Pre-alert has no buyer_wallet' },
        { status: 400 },
      )
    }

    const rewardAmount = BigInt(body.score) * 1_000_000n // USDT 6 decimals
    const escrowAddress = getRewardEscrowAddress()

    if (!escrowAddress || !process.env.PRIVATE_KEY) {
      // No contract or no key — record score, payment pending
      await db
        .updateTable('pre_alert')
        .set({
          status: 'pending_reward',
          score: body.score,
          scored_by: body.documenter_wallet.toLowerCase(),
          scored_at: new Date() as unknown as string,
          updated_at: new Date() as unknown as string,
        })
        .where('id', '=', preAlertId)
        .execute()

      return NextResponse.json({
        success: true,
        pre_alert_id: preAlertId,
        status: 'pending_reward',
        score: body.score,
        citizen_reward: `${body.score} USDT (pending — reward escrow not configured)`,
      })
    }

    // Check escrow balance
    let balance = 0n
    try {
      const publicClient = createPublicClient({
        chain: viemChain,
        transport: http(RPC_URL),
      })

      balance = await publicClient.readContract({
        address: escrowAddress,
        abi: REWARD_ESCROW_ABI,
        functionName: 'balance',
      })
    } catch {
      // RPC unavailable — record as pending
      console.warn('[score] Could not read escrow balance — marking as pending_reward')
    }

    if (balance < rewardAmount) {
      await db
        .updateTable('pre_alert')
        .set({
          status: 'pending_reward',
          score: body.score,
          scored_by: body.documenter_wallet.toLowerCase(),
          scored_at: new Date() as unknown as string,
          updated_at: new Date() as unknown as string,
        })
        .where('id', '=', preAlertId)
        .execute()

      return NextResponse.json({
        success: false,
        reason: 'Insufficient funds in reward escrow',
        pre_alert_id: preAlertId,
        status: 'pending_reward',
        score: body.score,
      })
    }

    // Release payment
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({
      chain: viemChain,
      transport: http(RPC_URL),
      account,
    })

    let txHash: `0x${string}`
    try {
      txHash = await walletClient.writeContract({
        address: escrowAddress,
        abi: REWARD_ESCROW_ABI,
        functionName: 'releasePayment',
        args: [citizenWallet as `0x${string}`, rewardAmount],
      })

      await createPublicClient({ chain: viemChain, transport: http(RPC_URL) })
        .waitForTransactionReceipt({ hash: txHash, timeout: 60_000 })
    } catch (e) {
      console.error('[score] Payment transaction failed:', e)
      await db
        .updateTable('pre_alert')
        .set({
          status: 'pending_reward',
          score: body.score,
          scored_by: body.documenter_wallet.toLowerCase(),
          scored_at: new Date() as unknown as string,
          updated_at: new Date() as unknown as string,
        })
        .where('id', '=', preAlertId)
        .execute()

      return NextResponse.json({
        success: false,
        reason: `Payment transaction failed: ${e instanceof Error ? e.message : String(e)}`,
        pre_alert_id: preAlertId,
        status: 'pending_reward',
        score: body.score,
      })
    }

    // Update status to paid
    await db
      .updateTable('pre_alert')
      .set({
        status: 'paid',
        score: body.score,
        tx_hash: txHash,
        scored_by: body.documenter_wallet.toLowerCase(),
        scored_at: new Date() as unknown as string,
        updated_at: new Date() as unknown as string,
      })
      .where('id', '=', preAlertId)
      .execute()

    return NextResponse.json({
      success: true,
      pre_alert_id: preAlertId,
      status: 'paid',
      score: body.score,
      citizen_reward: `${body.score} USDT`,
      tx_hash: txHash,
    })
  } catch (error) {
    console.error('POST /api/pre-alerts/[id]/score error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
