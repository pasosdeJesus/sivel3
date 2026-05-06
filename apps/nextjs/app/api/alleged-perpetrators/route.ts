"use server"

import { Kysely } from 'kysely';
import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'


export async function GET(req: NextRequest) {
  try {
    const db = newKyselyPostgresql()

    const presponsables = await db
      .selectFrom('sivel2_gen_presponsable')
      .select(['id', 'nombre'])
      .where('fechadeshabilitacion', 'is', null) // Habilitados
      .orderBy('nombre')
      .execute();

    return NextResponse.json(presponsables, { status: 200 });

  } catch (error) {
    console.error("Error en presponsables:", error);
    recordEvent({ event_type: 'api_error', metadata: { route: '/api/alleged-perpetrators', status: 500 } });
    return NextResponse.json(
      { error: 'Error al obtener presuntos responsables' },
      { status: 500 }
    );
  }
}
