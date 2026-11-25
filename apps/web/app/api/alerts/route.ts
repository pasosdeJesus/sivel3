import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { resumenAlerta } from '@/lib/alertsPublicas'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'

/**
 * `GET /api/alerts` — alertas **publicadas** por revisión humana (R-#22 P0).
 *
 * Público, sin billetera y sin datos personales: sólo el caso propuesto que ya
 * trae `json_data` (y que el agente anonimiza en las notas), la fuente y la fecha
 * de publicación. Nunca `citizen_notes`, `buyer_wallet` ni la billetera del
 * documentador.
 */
export async function GET(req: NextRequest) {
  const limitado = checkRateLimit(req, { scope: 'alerts', limit: 60, windowMs: 60_000 })
  if (!limitado.ok) return rateLimitResponse(limitado.retryAfter)

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20))
  const departamento = url.searchParams.get('departamento')
  const municipio = url.searchParams.get('municipio')

  try {
    const db = newKyselyPostgresql()
    let base = db
      .selectFrom('pre_alert')
      .where('status', '=', 'published')
      .where('published_at', 'is not', null)

    if (departamento) base = base.where(sql<string>`json_data->>'departamento'`, '=', departamento)
    if (municipio) base = base.where(sql<string>`json_data->>'municipio'`, '=', municipio)

    const total = Number(
      (await base.select(sql<number>`count(*)`.as('total')).executeTakeFirst())?.total || 0,
    )

    const filas = await base
      .select(['id', 'json_data', 'source_urls', 'source_summary', 'published_at'])
      .orderBy('published_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute()

    return NextResponse.json(
      { alerts: filas.map(resumenAlerta), total, page, limit },
      { headers: { 'Cache-Control': 'public, max-age=30' } },
    )
  } catch (error) {
    console.error('GET /api/alerts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
