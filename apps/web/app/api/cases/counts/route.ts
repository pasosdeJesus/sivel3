"use server"

import { sql } from 'kysely';
import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { ventanaPublica } from '@/lib/ventanaPublica'

const aNumero = (valor: { count?: string | number | bigint } | undefined): number => {
  if (!valor || valor.count === undefined || valor.count === null) return 0
  return typeof valor.count === 'string' ? parseInt(valor.count, 10) : Number(valor.count)
}

/**
 * `GET /api/cases/counts` — conteos del mapa (R-#69), con los filtros del mapa y la
 * ventana pública (R-#22).
 *
 * Los cuatro conteos se restringen al **mismo** conjunto de casos que el mapa: antes sólo
 * `casos` respetaba `fechaini/fechafin` y las víctimas/actos/victimizaciones devolvían
 * siempre el total (medido 2026-11-25), así que la leyenda no cuadraba con el mapa. Cuando
 * la ventana pública está activa se informa `total_archivo` para que la UI pueda avisar
 * cuánto se está mostrando.
 */
export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, { scope: 'cases-counts', limit: 60, windowMs: 60_000 })
  if (!limited.ok) return rateLimitResponse(limited.retryAfter)

  try {
    const { searchParams } = new URL(req.url);
    const db = newKyselyPostgresql()

    const ventana = ventanaPublica()
    const fechaini = searchParams.get('filtro[fechaini]') || ventana.desde
    const fechafin = searchParams.get('filtro[fechafin]') || ventana.hasta
    const departamentoId = searchParams.get('filtro[departamento_id]');
    const presponsableId = searchParams.get('filtro[presponsable_id]');
    const categoriaId = searchParams.get('filtro[categoria_id]');

    /**
     * Subconsulta con el **mismo** conjunto de casos que el mapa: sólo los que tienen
     * ubicación (latitud/longitud) y al menos un acto. Los conteos deben decir lo que se
     * ve, no lo que hay en la base: en desarrollo hay 48.187 casos y 39.866 con
     * ubicación, y el mapa sólo puede dibujar estos últimos.
     */
    const casosFiltrados = (incluirFechas = true) => {
      let q: any = db
        .selectFrom('sivel2_gen_caso as c')
        .innerJoin('msip_ubicacion as u', 'u.id', 'c.ubicacion_id')
        .select('c.id')
        .where('u.latitud', 'is not', null)
        .where('u.longitud', 'is not', null)
        .where('c.id', 'in', (eb: any) =>
          eb.selectFrom('sivel2_gen_acto as a').select('a.caso_id'),
        )
      if (incluirFechas && fechaini) q = q.where(sql<boolean>`c.fecha >= ${fechaini}::date`)
      if (incluirFechas && fechafin) q = q.where(sql<boolean>`c.fecha <= ${fechafin}::date`)
      if (departamentoId) {
        q = q.where('c.id', 'in', (eb: any) =>
          eb.selectFrom('msip_ubicacion as uf').select('uf.caso_id')
            .where('uf.departamento_id', '=', Number(departamentoId)),
        )
      }
      if (presponsableId) {
        q = q.where('c.id', 'in', (eb: any) =>
          eb.selectFrom('sivel2_gen_caso_presponsable as cp').select('cp.caso_id')
            .where('cp.presponsable_id', '=', Number(presponsableId)),
        )
      }
      if (categoriaId) {
        const catId = Number(categoriaId)
        q = q.where((eb: any) =>
          eb.or([
            eb('c.id', 'in', (eb2: any) =>
              eb2.selectFrom('sivel2_gen_acto as a').select('a.caso_id')
                .where('a.categoria_id', '=', catId),
            ),
            eb('c.id', 'in', (eb2: any) =>
              eb2.selectFrom('sivel2_gen_actocolectivo as ac').select('ac.caso_id')
                .where('ac.categoria_id', '=', catId),
            ),
          ]),
        )
      }
      return q
    }

    const [casosRes, victimasRes, actosRes, victimizacionesRes, archivoRes] = await Promise.all([
      db
        .selectFrom('sivel2_gen_caso as c')
        .select(sql<string>`count(*)`.as('count'))
        .where('c.id', 'in', casosFiltrados())
        .executeTakeFirst(),
      db
        .selectFrom('sivel2_gen_victima as v')
        .select(sql<string>`count(*)`.as('count'))
        .where('v.caso_id', 'in', casosFiltrados())
        .executeTakeFirst(),
      db
        .selectFrom('sivel2_gen_acto as a')
        .select(sql<string>`count(*)`.as('count'))
        .where('a.caso_id', 'in', casosFiltrados())
        .executeTakeFirst(),
      sql<{ count: string }>`
        SELECT COUNT(*) as count FROM (
          SELECT DISTINCT categoria_id, persona_id, caso_id
            FROM sivel2_gen_acto
           WHERE caso_id IN (${casosFiltrados()})
        ) AS sub
      `.execute(db).then((res) => res.rows[0] || { count: '0' }),
      // Cuántos casos hay en el archivo completo **visible** (con ubicación y actos),
      // para el aviso de la UI: el total del mapa, no el de la base.
      ventana.activa
        ? db
            .selectFrom('sivel2_gen_caso as c')
            .select(sql<string>`count(*)`.as('count'))
            .where('c.id', 'in', casosFiltrados(false))
            .executeTakeFirst()
        : Promise.resolve(undefined),
    ]);

    return NextResponse.json(
      {
        casos: aNumero(casosRes),
        victimas: aNumero(victimasRes),
        actos: aNumero(actosRes),
        victimizaciones: aNumero(victimizacionesRes),
        ventana: ventana.activa ? { desde: ventana.desde, hasta: ventana.hasta } : null,
        ...(archivoRes ? { total_archivo: aNumero(archivoRes) } : {}),
      },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } },
    );
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
