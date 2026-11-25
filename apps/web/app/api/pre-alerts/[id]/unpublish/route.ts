import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { autorizarDocumentador, mensajeDespublicar } from '@/lib/prealertaFirma'

/**
 * `POST /api/pre-alerts/:id/unpublish` — retira una alerta publicada (R-#22 P0).
 *
 * Reversible a propósito: si la revisión detecta un error (nombre, dato que pone en
 * riesgo a alguien), la alerta vuelve a `converted` y desaparece de `/api/alerts`.
 * Firma del documentador (`despublicar:{id}:{ts}:{nonce}`).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const numero = Number(id)
  if (!Number.isInteger(numero) || numero <= 0) {
    return NextResponse.json({ error: 'Alerta no encontrada', code: 'no_existe' }, { status: 404 })
  }

  const timestamp = Number(req.headers.get('x-documenter-timestamp') || 0)
  const nonce = req.headers.get('x-documenter-nonce') || ''
  const firma = await autorizarDocumentador(req, mensajeDespublicar(numero, timestamp, nonce))
  if (!firma.ok) return firma.respuesta

  try {
    const actualizada = await newKyselyPostgresql()
      .updateTable('pre_alert')
      .set({
        status: 'converted',
        published_at: null,
        published_by: null,
        updated_at: new Date() as unknown as string,
      })
      .where('id', '=', numero)
      .where('status', '=', 'published')
      .returning(['id', 'status'])
      .executeTakeFirst()

    if (!actualizada) {
      return NextResponse.json(
        { error: 'La alerta no existe o no está publicada', code: 'no_publicada' },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { alert: actualizada },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('POST /api/pre-alerts/[id]/unpublish error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
