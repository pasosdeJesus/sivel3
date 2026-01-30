"use server"

import { Kysely, sql } from 'kysely';
import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'


export async function GET(req: NextRequest) {
  try {

    const db = newKyselyPostgresql()

    // Obtener categorías con su código como en Rails: [d.presenta_con_codigo, d.id]
    const categorias = await db
      .selectFrom('sivel2_gen_categoria as c')
      .innerJoin('sivel2_gen_supracategoria as s', 's.id', 'c.supracategoria_id')
      .innerJoin('sivel2_gen_tviolencia as t', 't.id', 's.tviolencia_id')
      .select([
        'c.id',
        sql<string>`CONCAT(t.nomcorto, ' ', c.id, ' - ', c.nombre)`.as('nombre')
      ])
      .where('c.fechadeshabilitacion', 'is', null) // Habilitados
      .orderBy('t.nomcorto')
      .orderBy('c.id')
      .execute();

    return NextResponse.json(categorias, { status: 200 });

  } catch (error) {
    console.error("Error en categorias:", error);
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}
