import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'

import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import {
  COOKIE_PASE,
  crearPase,
  DURACION_PASE_S,
  mensajePase,
  VENTANA_FIRMA_PASE_S,
} from '@/lib/walletPass'

/**
 * `POST /api/wallet-pass` — emite el pase de cuota de billetera (R-#22 P1).
 *
 * Cuerpo `{address, timestamp, signature}`: EIP-191 sobre `pase:{address}:{timestamp}`,
 * válido 5 minutos. Una firma por sesión de 12 h; el pase sólo sube la cuota de detalle
 * (16/mes, 24 si learn.tg verifica la billetera) y no identifica a la persona.
 */
export async function POST(req: NextRequest) {
  const limitado = checkRateLimit(req, { scope: 'wallet-pass', limit: 20, windowMs: 60_000 })
  if (!limitado.ok) return rateLimitResponse(limitado.retryAfter)

  let cuerpo: { address?: unknown; timestamp?: unknown; signature?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo no es JSON', code: 'json_invalido' }, { status: 400 })
  }

  const address = typeof cuerpo.address === 'string' ? cuerpo.address.toLowerCase() : ''
  const timestamp = Number(cuerpo.timestamp)
  const signature = typeof cuerpo.signature === 'string' ? cuerpo.signature : ''

  if (!/^0x[0-9a-f]{40}$/.test(address) || !signature || !Number.isFinite(timestamp)) {
    return NextResponse.json({ error: 'Faltan datos del pase', code: 'sin_firma' }, { status: 400 })
  }
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > VENTANA_FIRMA_PASE_S) {
    return NextResponse.json({ error: 'La firma venció', code: 'firma_vencida' }, { status: 401 })
  }

  let valida = false
  try {
    valida = await verifyMessage({
      address: address as `0x${string}`,
      message: mensajePase(address, timestamp),
      signature: signature as `0x${string}`,
    })
  } catch {
    valida = false
  }
  if (!valida) {
    return NextResponse.json({ error: 'La firma no corresponde', code: 'firma_invalida' }, { status: 401 })
  }

  const pase = crearPase(address)
  if (!pase) {
    return NextResponse.json(
      { error: 'El pase no está configurado en este servidor', code: 'pase_no_configurado' },
      { status: 503 },
    )
  }

  const respuesta = NextResponse.json(
    { wallet: address, maxAge: DURACION_PASE_S },
    { headers: { 'Cache-Control': 'no-store' } },
  )
  respuesta.cookies.set(COOKIE_PASE, pase.valor, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: pase.maxAge,
  })
  return respuesta
}
