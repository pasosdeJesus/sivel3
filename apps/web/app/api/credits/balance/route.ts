import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { saldoDe } from '@/lib/creditos'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

/** `GET /api/credits/balance?wallet=0x…` — saldo de créditos de uso (R-#22 P2). */
export async function GET(req: NextRequest) {
  const limitado = checkRateLimit(req, { scope: 'credits-balance', limit: 60, windowMs: 60_000 })
  if (!limitado.ok) return rateLimitResponse(limitado.retryAfter)

  const wallet = (new URL(req.url).searchParams.get('wallet') || '').toLowerCase()
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'wallet required', code: 'datos_invalidos' }, { status: 400 })
  }

  try {
    const saldo = await saldoDe(newKyselyPostgresql(), wallet)
    return NextResponse.json({ wallet, credits: saldo }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET /api/credits/balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
