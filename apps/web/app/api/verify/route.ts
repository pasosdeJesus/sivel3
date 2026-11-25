import { NextRequest, NextResponse } from 'next/server'

import { verificarEnLearnTg } from '@/lib/learnTgPartner'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

/**
 * `GET /api/verify?wallet=0x…` — ¿la billetera está verificada en learn.tg?
 *
 * Lo usa el mapa (`/[locale]/cases/osmmap`) para invitar a verificarse. La firma con
 * la llave de socio ocurre en el servidor (`lib/learnTgPartner.ts`), que cachea el
 * booleano 5 min y **falla cerrado**. Se devuelve sólo `verified`: learn.tg responde
 * también nombre y país y aquí se descartan (minimización).
 *
 * Mitigaciones mientras llega el token de reclamos (REQ/78): límite de tasa y rechazo
 * de llamadas declaradas como de otro sitio. A un cliente sin cabeceras (`curl`) no se
 * le puede distinguir; por eso el contrato real es el token, no este endpoint.
 */
function mismoSitio(req: NextRequest): boolean {
  const sitio = req.headers.get('sec-fetch-site')
  if (sitio) return sitio === 'same-origin' || sitio === 'same-site' || sitio === 'none'
  const origen = req.headers.get('origin')
  if (!origen) return true
  try {
    return new URL(origen).host === new URL(req.url).host
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const limitado = checkRateLimit(req, { scope: 'verify', limit: 60, windowMs: 60_000 })
  if (!limitado.ok) return rateLimitResponse(limitado.retryAfter)

  const wallet = new URL(req.url).searchParams.get('wallet')
  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 })
  }
  if (!mismoSitio(req)) {
    return NextResponse.json({ error: 'origen no permitido' }, { status: 403 })
  }

  const verificado = await verificarEnLearnTg(wallet)
  return NextResponse.json({ verified: verificado }, { headers: { 'Cache-Control': 'no-store' } })
}
