"use server"

import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent } from '@/lib/web-analytics'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rateLimit'
import { CREDITO_DETALLE, gastar, saldoDe } from '@/lib/creditos'
import { verificarEnLearnTg } from '@/lib/learnTgPartner'
import { consumirVista, LIMITES, periodoDe, sujetoDe } from '@/lib/quota'
import { leerPase } from '@/lib/walletPass'
import { fueraDeVentana, ventanaPublica } from '@/lib/ventanaPublica'

/**
 * Cuota de detalle (R-#22 P1, números de R-#17). Si la cuota no se puede consultar
 * (migración sin aplicar, base caída) la lectura sigue: el mapa y los casos son bien
 * público y no deben caerse por un contador. Se registra el incidente.
 */
async function aplicarCuota(
  db: ReturnType<typeof newKyselyPostgresql>,
  request: NextRequest,
  casoId: number,
): Promise<
  | { permitido: true; restantes: number | null; creditos: number | null }
  | { permitido: false; code: 'cuota_detalle' | 'creditos_insuficientes' }
> {
  const wallet = leerPase(request)
  try {
    const tipo = wallet
      ? (await verificarEnLearnTg(wallet))
        ? 'verificada'
        : 'billetera'
      : 'anonimo'
    const { sujeto } = sujetoDe(clientIp(request), wallet)
    const cuota = await consumirVista(db, sujeto, periodoDe(tipo), LIMITES[tipo])
    if (cuota.permitido) return { permitido: true, restantes: cuota.restantes, creditos: null }

    if (!wallet) return { permitido: false, code: 'cuota_detalle' }

    const consumo = await gastar(db, {
      wallet,
      creditos: CREDITO_DETALLE,
      motivo: 'detalle',
      referencia: `detalle:${casoId}:${Date.now()}`,
    })
    if (!consumo.ok) return { permitido: false, code: 'creditos_insuficientes' }
    return { permitido: true, restantes: 0, creditos: consumo.saldo }
  } catch (error) {
    console.error('cuota de detalle no disponible:', error)
    return { permitido: true, restantes: null, creditos: null }
  }
}

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
  const limited = checkRateLimit(request, { scope: 'case-detail', limit: 120, windowMs: 60_000 })
  if (!limited.ok) return rateLimitResponse(limited.retryAfter)

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

    // Ventana pública (R-#22): el detalle no puede abrir lo que el mapa no muestra.
    const fechaCaso = formatDate(caso.fecha)
    const ventana = ventanaPublica()
    if (fueraDeVentana(fechaCaso, ventana)) {
      return NextResponse.json(
        {
          error: 'Ese caso está fuera de la ventana pública del archivo',
          code: 'fuera_de_ventana',
          ventana: ventana.activa ? { desde: ventana.desde, hasta: ventana.hasta } : null,
        },
        { status: 404 },
      )
    }

    const cuota = await aplicarCuota(db, request, casoId)
    if (!cuota.permitido) {
      const wallet = leerPase(request)
      return NextResponse.json(
        {
          error:
            cuota.code === 'cuota_detalle'
              ? 'Alcanzaste la cuota gratuita de detalles por hoy. Conecta tu billetera (sube la cuota) o compra créditos.'
              : 'No te quedan créditos para más detalles. Compra créditos o espera el próximo periodo.',
          code: cuota.code,
          limite: cuota.code === 'cuota_detalle' ? LIMITES.anonimo : LIMITES.billetera,
          billetera: wallet ?? undefined,
          saldo: wallet ? await saldoDe(db, wallet) : undefined,
        },
        { status: 402 },
      )
    }

    // Victim names are personal data (PRINCIPLES.md §2, confidentiality of the
    // sources). The public read is anonymous, so it only gets the count; a
    // role-gated endpoint for names is a separate requirement.
    const victimasCountRow = await db
      .selectFrom('sivel2_gen_victima as v')
      .select(sql<string>`count(*)`.as('count'))
      .where('v.caso_id', '=', casoId)
      .executeTakeFirst()

    const presponsablesRows = await db
      .selectFrom('sivel2_gen_caso_presponsable as cp')
      .innerJoin('sivel2_gen_presponsable as pr', 'pr.id', 'cp.presponsable_id')
      .select('pr.nombre as nombre')
      .where('cp.caso_id', '=', casoId)
      .execute()

    const victimas_count = Number(victimasCountRow?.count ?? 0)

    const presponsables = presponsablesRows
      .map((p) => p.nombre ?? '')
      .filter((nombre) => nombre.length > 0)

    return NextResponse.json(
      {
        cuota: { restantes: cuota.restantes, creditos: cuota.creditos },
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
          victimas_count,
          presponsables,
        },
      },
      {
        status: 200,
        headers: {
          ...(cuota.restantes !== null ? { 'X-Cuota-Restante': String(cuota.restantes) } : {}),
          ...(cuota.creditos !== null ? { 'X-Credito-Saldo': String(cuota.creditos) } : {}),
        },
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('GET /api/cases/[id] error:', errorMessage)
    recordEvent({ event_type: 'api_error', metadata: { route: '/api/cases/[id]', status: 500 } })
    return NextResponse.json(
      { error: 'Error al obtener detalle del caso', details: errorMessage },
      { status: 500 },
    )
  }
}
