import { createHash } from 'node:crypto'
import { sql } from 'kysely'
import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { isDocumenterWallet, nonceNuevo, VENTANA_FIRMA_S } from '@/lib/documenter'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const departamento = url.searchParams.get('departamento')
    const municipio = url.searchParams.get('municipio')
    const wallet = url.searchParams.get('wallet')
    const buyer = url.searchParams.get('buyer')

    const offset = (page - 1) * limit

    const db = newKyselyPostgresql()

    let baseQuery = db
      .selectFrom('pre_alert')

    // buyer=wallet → map: show pending (market) + user's reserved
    // wallet=addr → dashboard: show all user's pre-alerts
    if (buyer) {
      baseQuery = baseQuery.where((eb) =>
        eb.or([
          eb('status', '=', 'pending'),
          eb('buyer_wallet', 'ilike', buyer),
        ]),
      )
    } else if (wallet) {
      baseQuery = baseQuery.where('buyer_wallet', 'ilike', wallet)
    } else {
      baseQuery = baseQuery.where('status', '=', 'pending')
    }

    if (departamento) {
      baseQuery = baseQuery.where(sql`json_data->>'departamento'`, '=', departamento)
    }
    if (municipio) {
      baseQuery = baseQuery.where(sql`json_data->>'municipio'`, '=', municipio)
    }

    const countResult = await baseQuery
      .select(sql<number>`count(*)`.as('total'))
      .executeTakeFirst()
    const total = Number(countResult?.total || 0)

    const preAlerts = await baseQuery
      .select([
        'id',
        'status',
        'buyer_wallet',
        'bought_at',
        'conversion_deadline',
        'score',
        'feedback',
        'citizen_notes',
        'source_urls',
        'source_summary',
        sql<string>`json_data->>'titulo'`.as('titulo'),
        sql<string>`json_data->>'fecha'`.as('fecha'),
        sql<string>`json_data->>'departamento'`.as('departamento'),
        sql<string>`json_data->>'municipio'`.as('municipio'),
      ])
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

    return NextResponse.json({
      pre_alerts: preAlerts,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('GET /api/pre-alerts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * `POST /api/pre-alerts` — borrador de prealerta creado por un documentador
 * desde el asistente de documentación (R-#20).
 *
 * El documentador firma `prealerta:{sha256(cuerpo)}:{timestamp}:{nonce}` con su
 * billetera; el cuerpo lleva los relatos propuestos por el modelo. La prealerta
 * queda `pending` (mercado), con el documentador como publisher y deduplicada
 * por `event_hash`: el mismo caso no se publica dos veces.
 */
export async function POST(req: NextRequest) {
  try {
    const cuerpo = await req.text()
    const wallet = (req.headers.get('x-documenter-address') || '').toLowerCase()
    const firma = req.headers.get('x-documenter-signature') || ''
    const timestamp = Number(req.headers.get('x-documenter-timestamp') || 0)
    const nonce = req.headers.get('x-documenter-nonce') || ''

    if (!wallet || !firma || !timestamp || nonce.length < 8) {
      return NextResponse.json({ error: 'Falta la firma del documentador', code: 'sin_firma' }, { status: 401 })
    }
    if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > VENTANA_FIRMA_S) {
      return NextResponse.json({ error: 'Firma vencida', code: 'firma_vencida' }, { status: 401 })
    }
    if (!isDocumenterWallet(wallet)) {
      return NextResponse.json(
        { error: 'DOCUMENTER_ROLE required', code: 'no_documenter' },
        { status: 403 },
      )
    }

    if (!nonceNuevo(nonce)) {
      return NextResponse.json({ error: 'La acción ya se envió', code: 'nonce_repetido' }, { status: 401 })
    }

    const hashCuerpo = createHash('sha256').update(cuerpo).digest('hex')
    const mensaje = `prealerta:${hashCuerpo}:${timestamp}:${nonce}`
    let valida = false
    try {
      valida = await verifyMessage({
        address: wallet as `0x${string}`,
        message: mensaje,
        signature: firma as `0x${string}`,
      })
    } catch {
      valida = false
    }
    if (!valida) {
      return NextResponse.json(
        { error: 'Firma inválida', code: 'firma_invalida' },
        { status: 401 },
      )
    }

    let datos: any
    try {
      datos = JSON.parse(cuerpo)
    } catch {
      return NextResponse.json({ error: 'Cuerpo no es JSON', code: 'json_invalido' }, { status: 400 })
    }

    const relatosBrutos = datos?.relatos
    const relatos = Array.isArray(relatosBrutos) ? relatosBrutos : relatosBrutos ? [relatosBrutos] : []
    if (relatos.length === 0) {
      return NextResponse.json(
        { error: 'Faltan los relatos del caso', code: 'sin_caso' },
        { status: 422 },
      )
    }

    const relato = (relatos[0] || {}) as Record<string, unknown>
    const titulo = String(datos?.titulo || relato.titulo || 'Prealerta del documentador')
    const jsonData = {
      ...relato,
      titulo,
      fecha: String(relato.fecha || ''),
      departamento: String(relato.departamento || ''),
      municipio: String(relato.municipio || ''),
      relatos,
      origen: 'asistente_documentador',
    }
    const fuente = datos?.fuente || {}
    const sourceUrls = Array.isArray(datos?.source_urls)
      ? datos.source_urls
      : fuente.url
        ? [String(fuente.url)]
        : []
    const sourceSummary =
      typeof datos?.source_summary === 'string' ? datos.source_summary : (relato.source_summary as string | undefined) ?? null

    const eventHash = `0x${createHash('sha256').update(JSON.stringify({ titulo, relatos })).digest('hex')}`

    const db = newKyselyPostgresql()
    const inserted = await db
      .insertInto('pre_alert')
      .values({
        event_hash: eventHash,
        json_data: jsonData as any,
        // Una prealerta de documentador no pasa por el mercado: nace como alerta
        // en revisión (`converted`) y su pago sale del fondo de documentadores.
        status: 'converted',
        origin: 'documenter',
        publisher_wallet: wallet,
        source_urls: sourceUrls as any,
        source_summary: sourceSummary,
        converted_at: new Date() as any,
        created_at: new Date() as any,
        updated_at: new Date() as any,
      })
      .onConflict((oc) => oc.column('event_hash').doNothing())
      .returning(['id', 'status'])
      .executeTakeFirst()

    if (!inserted) {
      return NextResponse.json(
        { error: 'Ese caso ya tiene una prealerta', code: 'duplicada' },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { id: inserted.id, status: inserted.status },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('POST /api/pre-alerts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
