"use server"

import { Kysely, sql } from 'kysely';
import { NextRequest, NextResponse } from 'next/server'
import type { DB } from '@/db/db.d.ts';
import defineConfig from '@/.config/kysely.config.ts'

export async function GET(req: NextRequest) {
  try {
    const db = new Kysely<DB>({
      dialect: defineConfig.dialect
    })

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
    return NextResponse.json(
      { error: 'Error al obtener departamentos' },
      { status: 500 }
    );
  }
}
