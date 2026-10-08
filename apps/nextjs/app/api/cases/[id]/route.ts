"use server"

import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'

function formatDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value.slice(0, 10)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const casoId = Number(id)
    if (!Number.isInteger(casoId) || casoId <= 0) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })
    }

    const db = newKyselyPostgresql()

    // Same shape as the Rails _caso.json.jbuilder: caso + its main location.
    const caso = await db
      .selectFrom('sivel2_gen_caso as c')
      .leftJoin('msip_ubicacion as u', 'u.id', 'c.ubicacion_id')
      .leftJoin('msip_departamento as d', 'd.id', 'u.departamento_id')
      .leftJoin('msip_municipio as m', 'm.id', 'u.municipio_id')
      .leftJoin('msip_centropoblado as cp', 'cp.id', 'u.centropoblado_id')
      .select([
        'c.id as id',
        'c.titulo as titulo',
        'c.memo as hechos',
        'c.fecha as fecha',
        'c.hora as hora',
        'u.lugar as lugar',
        'u.tsitio_id as tsitio_id',
        'd.nombre as departamento',
        'm.nombre as municipio',
        'cp.nombre as centro_poblado',
      ])
      .where('c.id', '=', casoId)
      .executeTakeFirst()

    if (!caso) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })
    }

    const victimasRows = await db
      .selectFrom('sivel2_gen_victima as v')
      .innerJoin('msip_persona as p', 'p.id', 'v.persona_id')
      .select('p.nombres as nombres')
      .select('p.apellidos as apellidos')
      .where('v.caso_id', '=', casoId)
      .execute()

    const presponsablesRows = await db
      .selectFrom('sivel2_gen_caso_presponsable as cp')
      .innerJoin('sivel2_gen_presponsable as pr', 'pr.id', 'cp.presponsable_id')
      .select('pr.nombre as nombre')
      .where('cp.caso_id', '=', casoId)
      .execute()

    const victimas = victimasRows
      .map((v) => `${v.nombres ?? ''} ${v.apellidos ?? ''}`.trim())
      .filter((nombre) => nombre.length > 0)

    const presponsables = presponsablesRows
      .map((p) => p.nombre ?? '')
      .filter((nombre) => nombre.length > 0)

    return NextResponse.json(
      {
        caso: {
          id: String(caso.id),
          titulo: caso.titulo ?? undefined,
          hechos: caso.hechos ?? undefined,
          fecha: formatDate(caso.fecha),
          hora: caso.hora ?? undefined,
          departamento: caso.departamento ?? undefined,
          municipio: caso.municipio ?? undefined,
          centro_poblado: caso.centro_poblado ?? undefined,
          // Rails only exposed "lugar" for "otro sitio" (tsitio_id == 3)
          lugar: caso.tsitio_id === 3 ? (caso.lugar ?? undefined) : undefined,
          victimas,
          presponsables,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    recordEvent({ event_type: 'api_error', metadata: { route: '/api/cases/[id]', status: 500 } })
    return NextResponse.json(
      { error: 'Error al obtener detalle del caso', details: errorMessage },
      { status: 500 },
    )
  }
}
