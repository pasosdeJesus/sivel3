import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { autorizarDocumentador, mensajePublicar } from '@/lib/prealertaFirma'

/**
 * `POST /api/pre-alerts/:id/publish` — publica una alerta revisada (R-#22 P0).
 *
 * Requiere firma de documentador (`publicar:{id}:{ts}:{nonce}`) y que la alerta esté
 * `converted` (el estado en el que el asistente la deja). Publicar hace visible el
 * caso propuesto en `/api/alerts`; el texto no se reescribe aquí, así que lo que se
 * revisó es lo que se publica.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const numero = Number(id)
  if (!Number.isInteger(numero) || numero <= 0) {
    return NextResponse.json({ error: 'Alerta no encontrada', code: 'no_existe' }, { status: 404 })
  }

  const timestamp = Number(req.headers.get('x-documenter-timestamp') || 0)
  const nonce = req.headers.get('x-documenter-nonce') || ''
  const firma = await autorizarDocumentador(req, mensajePublicar(numero, timestamp, nonce))
  if (!firma.ok) return firma.respuesta

  try {
    const db = newKyselyPostgresql()
    const actualizada = await db
      .updateTable('pre_alert')
      .set({
        status: 'published',
        published_at: new Date() as unknown as string,
        published_by: firma.wallet,
        updated_at: new Date() as unknown as string,
      })
      .where('id', '=', numero)
      .where('status', '=', 'converted')
      .returning(['id', 'status', 'published_at'])
      .executeTakeFirst()

    if (!actualizada) {
      return NextResponse.json(
        { error: 'La alerta no existe o no está pendiente de publicación', code: 'no_publicable' },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { alert: actualizada },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('POST /api/pre-alerts/[id]/publish error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
