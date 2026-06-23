import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, verifyMessage } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo, celoSepolia } from 'viem/chains'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { REGIONAL_DONATION_ADDRESS, REWARD_ESCROW_ADDRESS } from '@/lib/contractAddresses'

const SIGNATURE_WINDOW = 300 // 5 minutes anti-replay

const REGIONAL_DONATION_ABI = [
  {
    inputs: [
      { name: '_regionId', type: 'uint256' },
      { name: '_amount', type: 'uint256' },
      { name: '_to', type: 'address' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

const REWARD_ESCROW_ABI = [
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

// Map departamento to regionId (Colombia=1, other=2)
const COLOMBIA_DEPTOS = new Set([
  'putumayo', 'cauca', 'antioquia', 'bogota', 'cundinamarca', 'nariño',
  'valle', 'santander', 'norte de santander', 'arauca', 'meta', 'huila',
  'tolima', 'caldas', 'risaralda', 'quindio', 'boyaca', 'bolivar',
  'magdalena', 'cesar', 'cordoba', 'sucre', 'atlantico', 'guajira',
  'choco', 'casanare', 'amazonas', 'guainia', 'guaviare', 'vaupes', 'vichada',
  'san andres',
])
function getRegionId(departamento: string | undefined): number {
  if (!departamento) return 2
  return COLOMBIA_DEPTOS.has(departamento.toLowerCase().trim()) ? 1 : 2
}

const chainEnv = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'celo' : 'celoSepolia'
const viemChain = chainEnv === 'celo' ? celo : celoSepolia
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!

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
      timestamp?: number
      signature?: string
    }

    if (body.score == null || !body.documenter_wallet) {
      return NextResponse.json(
        { error: 'score and documenter_wallet are required' },
        { status: 400 },
      )
    }

    if (!body.feedback) {
      return NextResponse.json(
        { error: 'feedback is required' },
        { status: 400 },
      )
    }

    if (!body.timestamp || !body.signature) {
      return NextResponse.json(
        { error: 'timestamp and signature are required (EIP-191 of score:id:score:timestamp)' },
        { status: 401 },
      )
    }

    // Anti-replay: 5 minute window
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - body.timestamp) > SIGNATURE_WINDOW) {
      return NextResponse.json(
        { error: 'Signature expired' },
        { status: 401 },
      )
    }

    // Verify EIP-191 signature: documenter signed "score:{id}:{score}:{timestamp}"
    const message = `score:${preAlertId}:${body.score}:${body.timestamp}`
    let recovered: boolean
    try {
      recovered = await verifyMessage({
        address: body.documenter_wallet as `0x${string}`,
        message,
        signature: body.signature as `0x${string}`,
      })
    } catch {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 },
      )
    }

    if (!recovered) {
      return NextResponse.json(
        { error: 'Signature does not match documenter_wallet' },
        { status: 401 },
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
      await db
        .updateTable('pre_alert')
        .set({
          status: 'rejected',
          score: 0,
          feedback: body.feedback,
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

    // Score 2-5 — auto-withdraw from RegionalDonation + release via RewardEscrow
    const citizenWallet = preAlert.buyer_wallet
    if (!citizenWallet) {
      return NextResponse.json(
        { error: 'Pre-alert has no buyer_wallet' },
        { status: 400 },
      )
    }

    const rewardAmount = BigInt(body.score) * 1_000_000n // USDT 6 decimals

    if (!process.env.PRIVATE_KEY) {
      await db
        .updateTable('pre_alert')
        .set({
          status: 'pending_reward',
          score: body.score,
          feedback: body.feedback,
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
        citizen_reward: `${body.score} USDT (pending — PRIVATE_KEY not configured)`,
      })
    }

    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({
      chain: viemChain,
      transport: http(RPC_URL),
      account,
    })

    // 1. Determine region from pre-alert's departamento
    const depto = ((preAlert.json_data as any)?.departamento) as string | undefined
    const regionId = BigInt(getRegionId(depto))

    // 2. Withdraw from RegionalDonationV2 to RewardEscrow
    const escrowAddress = REWARD_ESCROW_ADDRESS as `0x${string}`
    try {
      console.log(
        `[score] Withdrawing ${body.score} USDT from region ${regionId} to RewardEscrow…`,
      )
      const withdrawHash = await walletClient.writeContract({
        address: REGIONAL_DONATION_ADDRESS as `0x${string}`,
        abi: REGIONAL_DONATION_ABI,
        functionName: 'withdraw',
        args: [regionId, rewardAmount, escrowAddress],
      })

      await createPublicClient({ chain: viemChain, transport: http(RPC_URL) })
        .waitForTransactionReceipt({ hash: withdrawHash, timeout: 60_000 })

      console.log(`[score] Withdrawn — tx: ${withdrawHash}`)
    } catch (e) {
      console.error('[score] Withdraw from RegionalDonation failed:', e)
      await db
        .updateTable('pre_alert')
        .set({
          status: 'pending_reward',
          score: body.score,
          feedback: body.feedback,
          scored_by: body.documenter_wallet.toLowerCase(),
          scored_at: new Date() as unknown as string,
          updated_at: new Date() as unknown as string,
        })
        .where('id', '=', preAlertId)
        .execute()

      return NextResponse.json({
        success: false,
        reason: `Withdraw from RegionalDonation failed: ${e instanceof Error ? e.message : String(e)}`,
        pre_alert_id: preAlertId,
        status: 'pending_reward',
        score: body.score,
      })
    }

    // 3. Release payment from RewardEscrow to citizen
    let txHash: `0x${string}`
    try {
      console.log(`[score] Releasing ${body.score} USDT to citizen ${citizenWallet.slice(0, 10)}…`)
      txHash = await walletClient.writeContract({
        address: escrowAddress,
        abi: REWARD_ESCROW_ABI,
        functionName: 'releasePayment',
        args: [citizenWallet as `0x${string}`, rewardAmount],
      })

      await createPublicClient({ chain: viemChain, transport: http(RPC_URL) })
        .waitForTransactionReceipt({ hash: txHash, timeout: 60_000 })
    } catch (e) {
      console.error('[score] releasePayment failed:', e)
      await db
        .updateTable('pre_alert')
        .set({
          status: 'pending_reward',
          score: body.score,
          feedback: body.feedback,
          scored_by: body.documenter_wallet.toLowerCase(),
          scored_at: new Date() as unknown as string,
          updated_at: new Date() as unknown as string,
        })
        .where('id', '=', preAlertId)
        .execute()

      return NextResponse.json({
        success: false,
        reason: `releasePayment failed (funds are in RewardEscrow): ${e instanceof Error ? e.message : String(e)}`,
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
        feedback: body.feedback,
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
