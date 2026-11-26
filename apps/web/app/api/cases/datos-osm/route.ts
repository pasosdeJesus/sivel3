"use server"

import { createHash } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'
import { MAX_ROWS, cellStepForZoom, parseBbox, parseZoom } from '@/lib/mapData'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { ventanaPublica } from '@/lib/ventanaPublica'

// Map data for the public map. It only serves what the map draws: the case id
// (object key) and its coordinates. Filters, viewport (`bbox`) and `zoom` shape
// the response; when zoomed out the cases are aggregated into cells on the
// server so the payload stays small (https://gitlab.com/pasosdeJesus/sivel3/-/issues/69).

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
}

const RATE_LIMIT = { scope: 'datos-osm', limit: 60, windowMs: 60_000 }

interface MarkerRow {
  caso_id: number | string
  latitud: number | string
  longitud: number | string
}

interface CellRow {
  cell_lat: number | string
  cell_lng: number | string
  n: number | string
}

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, RATE_LIMIT)
  if (!limited.ok) return rateLimitResponse(limited.retryAfter)

  try {
    const db = newKyselyPostgresql()
    const { searchParams } = new URL(request.url)

    const bbox = parseBbox(searchParams.get('bbox'))
    if ('error' in bbox) {
      return NextResponse.json({ error: bbox.error }, { status: 400 })
    }

    const zoom = parseZoom(searchParams.get('zoom'))
    if ('error' in zoom) {
      return NextResponse.json({ error: zoom.error }, { status: 400 })
    }

    const ventana = ventanaPublica()
    // La ventana pública es el valor por omisión: si el cliente pide fechas, manda él.
    const fechaini = searchParams.get('filtro[fechaini]') || ventana.desde
    const fechafin = searchParams.get('filtro[fechafin]') || ventana.hasta
    const departamentoId = searchParams.get('filtro[departamento_id]')
    const presponsableId = searchParams.get('filtro[presponsable_id]')
    const categoriaId = searchParams.get('filtro[categoria_id]')

    // The Kysely builder types are far too concrete to narrow here: the select
    // branch changes with the zoom (aggregated cells or markers).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
      .selectFrom('sivel2_gen_caso as c')
      .innerJoin('msip_ubicacion as u', 'u.id', 'c.ubicacion_id')
      .where('u.latitud', 'is not', null)
      .where('u.longitud', 'is not', null)
      // The Rails map only plotted cases that have at least one act
      .where('c.id', 'in', (eb: any) =>
        eb.selectFrom('sivel2_gen_acto as a').select('a.caso_id'),
      )

    if (fechaini) query = query.where(sql<boolean>`c.fecha >= ${fechaini}::date`)
    if (fechafin) query = query.where(sql<boolean>`c.fecha <= ${fechafin}::date`)

    if (departamentoId) {
      query = query.where('c.id', 'in', (eb: any) =>
        eb
          .selectFrom('msip_ubicacion as uf')
          .select('uf.caso_id')
          .where('uf.departamento_id', '=', Number(departamentoId)),
      )
    }

    if (presponsableId) {
      query = query.where('c.id', 'in', (eb: any) =>
        eb
          .selectFrom('sivel2_gen_caso_presponsable as cp')
          .select('cp.caso_id')
          .where('cp.presponsable_id', '=', Number(presponsableId)),
      )
    }

    if (categoriaId) {
      const catId = Number(categoriaId)
      query = query.where((eb: any) =>
        eb.or([
          eb('c.id', 'in', (eb2: any) =>
            eb2
              .selectFrom('sivel2_gen_acto as a')
              .select('a.caso_id')
              .where('a.categoria_id', '=', catId),
          ),
          eb('c.id', 'in', (eb2: any) =>
            eb2
              .selectFrom('sivel2_gen_actocolectivo as ac')
              .select('ac.caso_id')
              .where('ac.categoria_id', '=', catId),
          ),
          eb('c.id', 'in', (eb2: any) =>
            eb2
              .selectFrom('sivel2_gen_caso_categoria_presponsable as ccp')
              .innerJoin(
                'sivel2_gen_caso_presponsable as cp',
                'cp.id',
                'ccp.caso_presponsable_id',
              )
              .select('cp.caso_id')
              .where('ccp.categoria_id', '=', catId),
          ),
        ]),
      )
    }

    if (bbox.value) {
      const { minLng, minLat, maxLng, maxLat } = bbox.value
      query = query
        .where('u.longitud', '>=', minLng)
        .where('u.longitud', '<=', maxLng)
        .where('u.latitud', '>=', minLat)
        .where('u.latitud', '<=', maxLat)
    }

    // Without a viewport the endpoint never serves individual markers: the whole
    // corpus would be a download. From zoom 11 it uses the most detailed cell.
    const step = bbox.value
      ? cellStepForZoom(zoom.value)
      : (cellStepForZoom(zoom.value) ?? 0.02)

    if (step === null) {
      const rows: MarkerRow[] = await query
        .select(['c.id as caso_id', 'u.latitud as latitud', 'u.longitud as longitud'])
        .execute()

      if (rows.length > MAX_ROWS) {
        return NextResponse.json(
          {
            error: 'La vista devuelve demasiados casos',
            cap: MAX_ROWS,
            hint: 'Reduce el bbox o el zoom',
          },
          { status: 413 },
        )
      }

      const respuesta: Record<string, { latitud: number; longitud: number }> = {}
      for (const row of rows) {
        const latitud = row.latitud === null ? NaN : Number(row.latitud)
        const longitud = row.longitud === null ? NaN : Number(row.longitud)
        if (Number.isFinite(latitud) && Number.isFinite(longitud)) {
          respuesta[String(row.caso_id)] = { latitud, longitud }
        }
      }

      return respond(request, {
        modo: 'marcadores',
        total: Object.keys(respuesta).length,
        respuesta,
        ventana: ventana.activa ? { desde: ventana.desde, hasta: ventana.hasta } : null,
      })
    }

    // Aggregated cells: round each coordinate to the nearest grid point of the
    // zoom's cell and count the cases that fall there. The aliases do not shadow
    // the table columns, and GROUP BY uses the select ordinals because PostgreSQL
    // does not fold the parameterised expressions as equal.
    const latitud = sql<number>`(round(u.latitud::numeric / ${step}) * ${step})`
    const longitud = sql<number>`(round(u.longitud::numeric / ${step}) * ${step})`
    const rows: CellRow[] = await query
      .select([
        latitud.as('cell_lat'),
        longitud.as('cell_lng'),
        sql<string>`count(*)`.as('n'),
      ])
      .groupBy(sql`1, 2`)
      .execute()

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        {
          error: 'La vista devuelve demasiadas celdas',
          cap: MAX_ROWS,
          hint: 'Reduce el bbox o el zoom',
        },
        { status: 413 },
      )
    }

    let total = 0
    const celdas = rows
      .map((row) => {
        const n = Number(row.n)
        total += n
        return { latitud: Number(row.cell_lat), longitud: Number(row.cell_lng), n }
      })
      .filter((cell) => Number.isFinite(cell.latitud) && Number.isFinite(cell.longitud))

    return respond(request, {
      modo: 'celdas',
      total,
      respuesta: {},
      celdas,
      ventana: ventana.activa ? { desde: ventana.desde, hasta: ventana.hasta } : null,
    })
  } catch (error) {
    console.error('Error en datos-osm:', error)
    recordEvent({ event_type: 'api_error', metadata: { route: '/api/cases/datos-osm', status: 500 } })
    return NextResponse.json(
      { error: 'Error al obtener datos del mapa' },
      { status: 500 },
    )
  }
}

function respond(request: NextRequest, body: unknown): NextResponse {
  const etag = `"${createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16)}"`
  const headers = { ...CACHE_HEADERS, ETag: etag }

  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers })
  }

  return NextResponse.json(body, { status: 200, headers })
}
