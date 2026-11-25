import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { acreditar, CREDITOS_POR_USDT } from '@/lib/creditos'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { verificarTransferenciaUSDT } from '@/lib/usdtTransfer'

/**
 * `POST /api/credits/purchase` — compra de créditos con USDT (R-#22 P2, R-#17).
 *
 * Cuerpo `{wallet, txHash}`. El pago va a la tesorería del proyecto
 * (`CREDITS_TREASURY_ADDRESS`); sin esa variable el endpoint responde `503` en vez de
 * inventar un destino. La verificación es en cadena y el libro mayor es idempotente por
 * `tx_hash`: reintentar la misma transacción no acredita dos veces.
 */
export async function POST(req: NextRequest) {
  const limitado = checkRateLimit(req, { scope: 'credits-purchase', limit: 20, windowMs: 60_000 })
  if (!limitado.ok) return rateLimitResponse(limitado.retryAfter)

  const tesoreria = process.env.CREDITS_TREASURY_ADDRESS
  if (!tesoreria) {
    return NextResponse.json(
      {
        error: 'La compra de créditos no está configurada (CREDITS_TREASURY_ADDRESS)',
        code: 'tesoreria_no_configurada',
      },
      { status: 503 },
    )
  }

  let cuerpo: { wallet?: unknown; txHash?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo no es JSON', code: 'json_invalido' }, { status: 400 })
  }

  const wallet = typeof cuerpo.wallet === 'string' ? cuerpo.wallet.toLowerCase() : ''
  const txHash = typeof cuerpo.txHash === 'string' ? cuerpo.txHash.trim() : ''
  if (!/^0x[0-9a-f]{40}$/.test(wallet) || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return NextResponse.json(
      { error: 'Faltan la billetera o el hash de la transacción', code: 'datos_invalidos' },
      { status: 400 },
    )
  }

  const pago = await verificarTransferenciaUSDT(txHash, {
    hacia: tesoreria,
    desde: wallet,
    minimoUSDT: 0.01,
  })
  if (!pago.ok) {
    return NextResponse.json(
      { error: 'No se encontró un pago USDT válido', code: pago.motivo ?? 'pago_invalido' },
      { status: 422 },
    )
  }

  const creditos = Math.floor((pago.monto ?? 0) * CREDITOS_POR_USDT)
  if (creditos <= 0) {
    return NextResponse.json({ error: 'El pago no alcanza un crédito', code: 'pago_minimo' }, { status: 422 })
  }

  try {
    const resultado = await acreditar(newKyselyPostgresql(), {
      wallet,
      creditos,
      motivo: 'compra',
      referencia: txHash.toLowerCase(),
    })
    return NextResponse.json(
      {
        wallet,
        creditos,
        duplicada: resultado.duplicada,
        saldo: resultado.saldo,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('POST /api/credits/purchase error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
