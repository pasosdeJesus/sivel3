"use server"

import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'

/**
 * GET /api/geocode?municipio=Puerto+Asís&departamento=Putumayo
 *
 * Returns approximate coordinates (city center) for a municipality.
 * Used by sivel3agent to place pre-alerts on the map.
 *
 * Municipality coordinates come from msip_municipio (latitud/longitud =
 * approximate city center). When unavailable, falls back to the department.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const municipio = url.searchParams.get('municipio')?.trim()
    const departamento = url.searchParams.get('departamento')?.trim()

    if (!municipio && !departamento) {
      return NextResponse.json(
        { error: 'Provide municipio or departamento query param' },
        { status: 400 },
      )
    }

    const db = newKyselyPostgresql()

    // Try municipality first (with latitud/longitud)
    if (municipio) {
      const mun = await db
        .selectFrom('msip_municipio')
        .innerJoin('msip_departamento', 'msip_departamento.id', 'msip_municipio.departamento_id')
        .select([
          'msip_municipio.id',
          'msip_municipio.nombre as municipio',
          'msip_municipio.latitud',
          'msip_municipio.longitud',
          'msip_departamento.nombre as departamento',
        ])
        .where('msip_municipio.nombre', 'ilike', municipio)
        .where('msip_municipio.fechadeshabilitacion', 'is', null)
        .where('msip_municipio.latitud', 'is not', null)
        .where('msip_municipio.longitud', 'is not', null)
        .$if(departamento !== undefined, (q) =>
          q.where('msip_departamento.nombre', 'ilike', departamento!),
        )
        .orderBy('msip_municipio.id')
        .limit(1)
        .executeTakeFirst()

      if (mun?.latitud !== null && mun?.latitud !== undefined && mun?.longitud !== undefined) {
        return NextResponse.json({
          municipio: mun.municipio,
          departamento: mun.departamento,
          latitud: Number(mun.latitud),
          longitud: Number(mun.longitud),
        })
      }
    }

    // Fallback: department center
    const dept = await db
      .selectFrom('msip_departamento')
      .select(['id', 'nombre', 'latitud', 'longitud'])
      .where('fechadeshabilitacion', 'is', null)
      .where('latitud', 'is not', null)
      .where('longitud', 'is not', null)
      .$if(departamento !== undefined, (q) => q.where('nombre', 'ilike', departamento!))
      .orderBy('id')
      .limit(1)
      .executeTakeFirst()

    if (dept && dept.latitud !== null && dept.latitud !== undefined && dept.longitud !== undefined) {
      return NextResponse.json({
        municipio: municipio || null,
        departamento: dept.nombre,
        latitud: Number(dept.latitud),
        longitud: Number(dept.longitud),
      })
    }

    return NextResponse.json(
      { error: `No coordinates found for municipio=${municipio || ''} departamento=${departamento || ''}` },
      { status: 404 },
    )
  } catch (error) {
    console.error('GET /api/geocode error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
