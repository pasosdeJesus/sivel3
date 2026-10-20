"use server"

import { Kysely, sql } from 'kysely';
import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'

export async function GET(req: NextRequest) {
  try {

    const db = newKyselyPostgresql()

    // Obtener departamentos habilitados de Colombia (pais_id = 170)
    const departamentos = await db
      .selectFrom('msip_departamento')
      .select(['id', 'nombre'])
      .where('pais_id', '=', 170) // Colombia
      .where('fechadeshabilitacion', 'is', null) // Habilitados
      .orderBy('nombre')
      .execute();

    return NextResponse.json(departamentos, { status: 200 });

  } catch (error) {
    console.error("Error en departamentos:", error);
    recordEvent({ event_type: 'api_error', metadata: { route: '/api/departments', status: 500 } });
    return NextResponse.json(
      { error: 'Error al obtener departamentos' },
      { status: 500 }
    );
  }
}
