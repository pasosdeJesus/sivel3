"use server"

import { Kysely } from 'kysely';
import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'


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
    return NextResponse.json(
      { error: 'Error al obtener presuntos responsables' },
      { status: 500 }
    );
  }
}
