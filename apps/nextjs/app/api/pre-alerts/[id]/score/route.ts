import { NextRequest, NextResponse } from 'next/server'
import { newKyselyPostgresql } from '@/.config/kysely.config'

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

    // Score 2-5 — trigger USDT payment
    const citizenWallet = preAlert.buyer_wallet
    if (!citizenWallet) {
      return NextResponse.json(
        { error: 'Pre-alert has no buyer_wallet' },
        { status: 400 },
      )
    }

    // TODO: Execute USDT payment to citizen_wallet for `body.score` USDT
    // On mainnet, use a secure contract call:
    //   const txHash = await sendUSDT(citizenWallet, body.score)
    // For now, record the score without executing payment

    await db
      .updateTable('pre_alert')
      .set({
        status: 'scored',
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
      status: 'scored',
      score: body.score,
      citizen_reward: `${body.score} USDT`,
    })
  } catch (error) {
    console.error('POST /api/pre-alerts/[id]/score error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
