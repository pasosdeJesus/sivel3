"use server"

import { Kysely, sql } from 'kysely';
import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'

// Definir tipo para los resultados de count
interface CountResult {
  count: string | number | bigint;
}

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
    let casoQuery = db.selectFrom('sivel2_gen_caso').select(sql<string>`count(*)`.as('count'));
    let victimaQuery = db.selectFrom('sivel2_gen_victima').select(sql<string>`count(*)`.as('count'));
    let actoQuery = db.selectFrom('sivel2_gen_acto').select(sql<string>`count(*)`.as('count'));
    
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
      casoQuery.executeTakeFirst(),
      victimaQuery.executeTakeFirst(),
      actoQuery.executeTakeFirst(),
      sql<{ count: string }>`
      SELECT COUNT(*) as count FROM (
        SELECT DISTINCT categoria_id, persona_id, caso_id 
          FROM sivel2_gen_acto
      ) AS sub
      `.execute(db).then(res => res.rows[0] || { count: '0' })
    ]);

    const toNumber = (countObj: { count?: string | number | bigint } | undefined): number => {
      if (!countObj || !countObj.count) return 0;
      const count = countObj.count;
      return typeof count === 'string' ? parseInt(count, 10) : Number(count);
    };

    return NextResponse.json({
      casos: toNumber(casosRes),
      victimas: toNumber(victimasRes),
      actos: toNumber(actosRes),
      victimizaciones: toNumber(victimizacionesRes)
    }, { status: 200 });

  } catch (error) {
    console.error("Error en conteos:", error);
    recordEvent({ event_type: 'api_error', metadata: { route: '/api/cases/counts', status: 500 } });
    return NextResponse.json(
      { 
        error: 'Error al obtener conteos',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
