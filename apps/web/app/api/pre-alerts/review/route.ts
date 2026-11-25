import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import {
  autorizarDocumentador,
  mensajeListadoRevision,
} from '@/lib/prealertaFirma'

/**
 * `GET /api/pre-alerts/review` — cola de revisión de alertas del documentador
 * (R-#22 P0). Sólo documentadores, con firma EIP-191 (`revisar:{ts}:{nonce}`).
 *
 * Devuelve las alertas `converted` y `published`: el revisor las lee antes de
 * publicar y puede despublicar. No incluye `citizen_notes` ni datos del mercado.
 */
export async function GET(req: NextRequest) {
  const timestamp = Number(req.headers.get('x-documenter-timestamp') || 0)
  const nonce = req.headers.get('x-documenter-nonce') || ''
  const firma = await autorizarDocumentador(req, mensajeListadoRevision(timestamp, nonce))
  if (!firma.ok) return firma.respuesta

  try {
    const filas = await newKyselyPostgresql()
      .selectFrom('pre_alert')
      .select([
        'id',
        'status',
        'origin',
        'json_data',
        'source_urls',
        'source_summary',
        'converted_at',
        'published_at',
        'created_at',
      ])
      .where('origin', '=', 'documenter')
      .where('status', 'in', ['converted', 'published'])
      .orderBy('created_at', 'desc')
      .limit(100)
      .execute()

    return NextResponse.json(
      { alerts: filas, reviewer: firma.wallet },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('GET /api/pre-alerts/review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
