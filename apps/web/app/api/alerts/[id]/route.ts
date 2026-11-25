import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { alertaPublica } from '@/lib/alertsPublicas'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

/**
 * `GET /api/alerts/:id` — detalle de una alerta **publicada** (R-#22 P0).
 *
 * Devuelve el caso propuesto tal como quedó en `json_data` (las notas se
 * anonimizan al generarlas), las fuentes y las fechas. Deliberadamente fuera:
 * `citizen_notes`, `buyer_wallet`, `publisher_wallet`, `score` y cualquier dato del
 * circuito del mercado: la alerta publicada es contenido público, no un expediente.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const limitado = checkRateLimit(req, { scope: 'alerts-id', limit: 120, windowMs: 60_000 })
  if (!limitado.ok) return rateLimitResponse(limitado.retryAfter)

  const { id } = await ctx.params
  const numero = Number(id)
  if (!Number.isInteger(numero) || numero <= 0) {
    return NextResponse.json({ error: 'Alerta no encontrada', code: 'no_existe' }, { status: 404 })
  }

  try {
    const fila = await newKyselyPostgresql()
      .selectFrom('pre_alert')
      .select(['id', 'json_data', 'source_urls', 'source_summary', 'published_at', 'created_at'])
      .where('id', '=', numero)
      .where('status', '=', 'published')
      .where('published_at', 'is not', null)
      .executeTakeFirst()

    if (!fila) {
      return NextResponse.json({ error: 'Alerta no encontrada', code: 'no_existe' }, { status: 404 })
    }

    return NextResponse.json(
      { alert: alertaPublica(fila) },
      { headers: { 'Cache-Control': 'public, max-age=60' } },
    )
  } catch (error) {
    console.error('GET /api/alerts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
