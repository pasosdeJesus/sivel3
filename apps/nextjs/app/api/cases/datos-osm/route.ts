"use server"

import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET(request: NextRequest) {
  try {
    const db = newKyselyPostgresql()
    const { searchParams } = new URL(request.url)

    const fechaini = searchParams.get('filtro[fechaini]')
    const fechafin = searchParams.get('filtro[fechafin]')
    const departamentoId = searchParams.get('filtro[departamento_id]')
    const presponsableId = searchParams.get('filtro[presponsable_id]')
    const categoriaId = searchParams.get('filtro[categoria_id]')

    // Data source: sivel2_gen_caso JOIN msip_ubicacion (by caso.ubicacion_id),
    // the same join the Rails report used. Replicates the Sivel2Gen::Conscaso
    // filter scopes (fechaini, fechafin, departamento_id, presponsable_id,
    // categoria_id).
    let query = db
      .selectFrom('sivel2_gen_caso as c')
      .innerJoin('msip_ubicacion as u', 'u.id', 'c.ubicacion_id')
      .leftJoin('msip_departamento as d', 'd.id', 'u.departamento_id')
      .leftJoin('msip_municipio as m', 'm.id', 'u.municipio_id')
      .select([
        'c.id as caso_id',
        'u.latitud as latitud',
        'u.longitud as longitud',
        'd.nombre as departamento',
        'm.nombre as municipio',
        'c.fecha as fecha',
      ])
      .where('u.latitud', 'is not', null)
      .where('u.longitud', 'is not', null)
      // The Rails map only plotted cases that have at least one act
      .where('c.id', 'in', (eb) =>
        eb.selectFrom('sivel2_gen_acto as a').select('a.caso_id'),
      )

    if (fechaini) query = query.where(sql<boolean>`c.fecha >= ${fechaini}::date`)
    if (fechafin) query = query.where(sql<boolean>`c.fecha <= ${fechafin}::date`)

    if (departamentoId) {
      query = query.where('c.id', 'in', (eb) =>
        eb
          .selectFrom('msip_ubicacion as uf')
          .select('uf.caso_id')
          .where('uf.departamento_id', '=', Number(departamentoId)),
      )
    }

    if (presponsableId) {
      query = query.where('c.id', 'in', (eb) =>
        eb
          .selectFrom('sivel2_gen_caso_presponsable as cp')
          .select('cp.caso_id')
          .where('cp.presponsable_id', '=', Number(presponsableId)),
      )
    }

    if (categoriaId) {
      const catId = Number(categoriaId)
      query = query.where((eb) =>
        eb.or([
          eb('c.id', 'in', (eb2) =>
            eb2
              .selectFrom('sivel2_gen_acto as a')
              .select('a.caso_id')
              .where('a.categoria_id', '=', catId),
          ),
          eb('c.id', 'in', (eb2) =>
            eb2
              .selectFrom('sivel2_gen_actocolectivo as ac')
              .select('ac.caso_id')
              .where('ac.categoria_id', '=', catId),
          ),
          eb('c.id', 'in', (eb2) =>
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

    const rows = await query.execute()

    const respuesta: Record<
      string,
      {
        latitud: string
        longitud: string
        departamento: string
        municipio: string
        fecha: string
      }
    > = {}

    for (const row of rows) {
      respuesta[String(row.caso_id)] = {
        latitud: row.latitud === null ? '' : String(row.latitud),
        longitud: row.longitud === null ? '' : String(row.longitud),
        departamento: row.departamento ?? '',
        municipio: row.municipio ?? '',
        fecha: formatDate(row.fecha),
      }
    }

    return NextResponse.json({ respuesta }, { status: 200 })
  } catch (error) {
    console.error('Error en datos-osm:', error)
    recordEvent({ event_type: 'api_error', metadata: { route: '/api/cases/datos-osm', status: 500 } })
    return NextResponse.json(
      { error: 'Error al obtener datos del mapa' },
      { status: 500 },
    )
  }
}
