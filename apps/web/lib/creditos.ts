import { sql, type Kysely } from 'kysely'

// Créditos de uso (R-#22 P2, modelo de R-#17).
//
// - 1 crédito = 0,01 USD al comprar con USDT: 100 créditos por USDT.
// - Detalle de caso fuera de la cuota gratuita: 4 créditos.
// - Estipendio del documentador: 4.000 créditos/mes (`DOCUMENTER_WALLETS`).
// - El libro mayor es la fuente de verdad: `reference` es única, así reintentar una
//   compra o el cron del estipendio no acredita dos veces.
export const CREDITOS_POR_USDT = 100
export const CREDITO_DETALLE = 4
export const CREDITOS_ESTIPENDIO = 4000

export type MotivoCredito = 'compra' | 'estipendio' | 'detalle' | 'ajuste'

export async function saldoDe(db: Kysely<any>, wallet: string): Promise<number> {
  const fila = await db
    .selectFrom('credit_balance')
    .select('credits')
    .where('wallet', '=', wallet.toLowerCase())
    .executeTakeFirst()
  return Number(fila?.credits ?? 0)
}

export interface Acreditacion {
  ok: boolean
  duplicada: boolean
  saldo: number
}

/**
 * Acredita créditos una sola vez por `referencia`. Devuelve `duplicada` cuando la
 * referencia ya existía (reintento del mismo `tx_hash` o del cron).
 */
export async function acreditar(
  db: Kysely<any>,
  opciones: { wallet: string; creditos: number; motivo: MotivoCredito; referencia: string },
): Promise<Acreditacion> {
  const wallet = opciones.wallet.toLowerCase()
  if (!Number.isInteger(opciones.creditos) || opciones.creditos <= 0) {
    return { ok: false, duplicada: false, saldo: await saldoDe(db, wallet) }
  }

  const insertado = await db
    .insertInto('credit_ledger')
    .values({
      wallet,
      delta: opciones.creditos,
      reason: opciones.motivo,
      reference: opciones.referencia,
    })
    .onConflict((oc) => oc.column('reference').doNothing())
    .returning('id')
    .executeTakeFirst()

  if (!insertado) {
    return { ok: true, duplicada: true, saldo: await saldoDe(db, wallet) }
  }

  await sql`
    INSERT INTO credit_balance (wallet, credits, updated_at)
    VALUES (${wallet}, ${opciones.creditos}, now())
    ON CONFLICT (wallet) DO UPDATE
      SET credits = credit_balance.credits + ${opciones.creditos}, updated_at = now()
  `.execute(db)

  return { ok: true, duplicada: false, saldo: await saldoDe(db, wallet) }
}

export interface Consumo {
  ok: boolean
  motivo: 'sin_saldo' | 'ok'
  saldo: number
}

/**
 * Gasta créditos sin dejar saldo negativo: el `UPDATE` condicionado es la garantía, así
 * no hace falta leer el saldo antes (ni hay carrera entre dos peticiones).
 */
export async function gastar(
  db: Kysely<any>,
  opciones: { wallet: string; creditos: number; motivo: MotivoCredito; referencia: string },
): Promise<Consumo> {
  const wallet = opciones.wallet.toLowerCase()
  if (!Number.isInteger(opciones.creditos) || opciones.creditos <= 0) {
    return { ok: false, motivo: 'sin_saldo', saldo: await saldoDe(db, wallet) }
  }

  const descontado = await sql<{ credits: number }>`
    UPDATE credit_balance
       SET credits = credits - ${opciones.creditos}, updated_at = now()
     WHERE wallet = ${wallet} AND credits >= ${opciones.creditos}
    RETURNING credits
  `.execute(db)

  const restante = descontado?.rows?.[0]?.credits
  if (restante === undefined) {
    return { ok: false, motivo: 'sin_saldo', saldo: await saldoDe(db, wallet) }
  }

  await db
    .insertInto('credit_ledger')
    .values({
      wallet,
      delta: -opciones.creditos,
      reason: opciones.motivo,
      reference: opciones.referencia,
    })
    .onConflict((oc) => oc.column('reference').doNothing())
    .execute()

  return { ok: true, motivo: 'ok', saldo: Number(restante) }
}
