"use server"

import { Kysely, sql } from 'kysely';
import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const db = newKyselyPostgresql()

    // Obtener filtros de la URL
    const fechaini = searchParams.get('filtro[fechaini]');
    const fechafin = searchParams.get('filtro[fechafin]');
    const departamentoId = searchParams.get('filtro[departamento_id]');
    const presponsableId = searchParams.get('filtro[presponsable_id]');
    const categoriaId = searchParams.get('filtro[categoria_id]');

    // Consultas condicionales con filtros
    let casoQuery = db.selectFrom('sivel2_gen_caso').select(sql`count(*)`.as('count'));
    let victimaQuery = db.selectFrom('sivel2_gen_victima').select(sql`count(*)`.as('count'));
    let actoQuery = db.selectFrom('sivel2_gen_acto').select(sql`count(*)`.as('count'));
    
    // Aplicar filtros a la consulta de casos (para otros necesitaríamos joins)
    if (fechaini) {
      casoQuery = casoQuery.where('fecha', '>=', new Date(fechaini));
    }
    if (fechafin) {
      casoQuery = casoQuery.where('fecha', '<=', new Date(fechafin));
    }

    // Para victimas y actos necesitaríamos joins complejos con filtros
    // Por ahora devolvemos conteos totales
    
    const [casosRes, victimasRes, actosRes, victimizacionesRes] = await Promise.all([
      casoQuery.execute(),
      victimaQuery.execute(),
      actoQuery.execute(),
      sql<any>`
        SELECT COUNT(*) FROM (
          SELECT DISTINCT categoria_id, persona_id, caso_id 
          FROM sivel2_gen_acto
        ) AS sub
      `.execute(db)
    ]);

    return NextResponse.json({
      casos: parseInt(casosRes[0]?.count || '0'),
      victimas: parseInt(victimasRes[0]?.count || '0'),
      actos: parseInt(actosRes[0]?.count || '0'),
      victimizaciones: parseInt(victimizacionesRes.rows[0]?.count || '0')
    }, { status: 200 });

  } catch (error) {
    console.error("Error en conteos:", error);
    return NextResponse.json(
      { error: 'Error al obtener conteos' },
      { status: 500 }
    );
  }
}
