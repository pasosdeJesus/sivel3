import { sql, type Kysely } from 'kysely'

// Cuota de detalle de caso (R-#22 P1) con los números de R-#17.
//
// Anónimo: 1 por día y por IP. Billetera: 16 por mes. Billetera verificada en learn.tg:
// 24 por mes. El mapa, los filtros, los conteos y la lista de casos siguen libres: lo
// que se cuenta es el detalle (`/api/cases/:id`), que es lo que R-#17 declara facturable
// más allá de la cuota.
export const LIMITES = {
  anonimo: 1,
  billetera: 16,
  verificada: 24,
} as const

export type TipoCuota = keyof typeof LIMITES

/** `YYYY-MM-DD` para anónimo (diario) y `YYYY-MM` para billetera (mensual). */
export function periodoDe(tipo: TipoCuota, fecha = new Date()): string {
  const anio = fecha.getUTCFullYear()
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  if (tipo === 'anonimo') return `${anio}-${mes}-${String(fecha.getUTCDate()).padStart(2, '0')}`
  return `${anio}-${mes}`
}

export function sujetoDe(ip: string, wallet: string | null): { sujeto: string; tipo: TipoCuota } {
  if (wallet) return { sujeto: `wallet:${wallet.toLowerCase()}`, tipo: 'billetera' }
  return { sujeto: `ip:${ip}`, tipo: 'anonimo' }
}

export function decidir(usado: number, limite: number): { permitido: boolean; restantes: number } {
  const permitido = usado < limite
  return { permitido, restantes: Math.max(0, limite - usado) }
}

export interface ResultadoCuota {
  permitido: boolean
  restantes: number
}

/**
 * Consume una vista del sujeto en el periodo, sin pasar del límite. Una sola sentencia
 * con `ON CONFLICT`: el `UPDATE` no aplica cuando el contador llegó al límite, así que
 * dos peticiones simultáneas no pueden colarse por encima.
 */
export async function consumirVista(
  db: Kysely<any>,
  sujeto: string,
  periodo: string,
  limite: number,
): Promise<ResultadoCuota> {
  const fila = await sql<{ count: number }>`
    INSERT INTO view_quota (subject, period, count, updated_at)
    VALUES (${sujeto}, ${periodo}, 1, now())
    ON CONFLICT (subject, period) DO UPDATE
      SET count = view_quota.count + 1, updated_at = now()
      WHERE view_quota.count < ${limite}
    RETURNING count
  `.execute(db)

  const nuevo = fila.rows[0]?.count
  if (nuevo === undefined) {
    // El `WHERE` bloqueó el incremento: la cuota ya estaba agotada.
    return { permitido: false, restantes: 0 }
  }
  return { permitido: true, restantes: Math.max(0, limite - Number(nuevo)) }
}
