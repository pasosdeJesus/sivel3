import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acreditar, CREDITOS_POR_USDT, CREDITO_DETALLE, gastar, saldoDe } from '@/lib/creditos'

const WALLET = '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C'

function dbConSaldo(saldo: number, insertado: unknown = { id: 1 }, descuento?: { credits: number }) {
  const capturado: { ledger?: any; conflictos?: string[] } = {}
  const cadenaInsert: any = {
    values: (valores: any) => {
      capturado.ledger = valores
      return cadenaInsert
    },
    onConflict: (cb: any) => {
      const oc: any = { column: (columna: string) => ((capturado.conflictos = [columna]), oc), doNothing: () => oc }
      cb(oc)
      return cadenaInsert
    },
    returning: () => cadenaInsert,
    executeTakeFirst: async () => insertado,
    execute: async () => undefined,
  }
  const db: any = {
    selectFrom: () => ({
      select: () => ({ where: () => ({ executeTakeFirst: async () => ({ credits: saldo }) }) }),
    }),
    insertInto: () => cadenaInsert,
    __capturado: capturado,
    __descuento: descuento,
  }
  return db
}

describe('créditos de uso (R-#17)', () => {
  beforeEach(() => {
    process.env.CREDITS_TREASURY_ADDRESS = '0x1111111111111111111111111111111111111111'
  })
  afterEach(() => {
    delete process.env.CREDITS_TREASURY_ADDRESS
  })

  it('el precio y el costo del detalle son los de R-#17', () => {
    expect(CREDITOS_POR_USDT).toBe(100)
    expect(CREDITO_DETALLE).toBe(4)
  })

  it('acredita una sola vez por referencia', async () => {
    const db = dbConSaldo(100)
    const primera = await acreditar(db, {
      wallet: WALLET,
      creditos: 100,
      motivo: 'compra',
      referencia: '0x' + 'a'.repeat(64),
    })
    expect(primera.ok).toBe(true)
    expect(primera.duplicada).toBe(false)
    expect(db.__capturado.ledger).toMatchObject({ delta: 100, reason: 'compra' })

    const repetida = await acreditar(dbConSaldo(100, null), {
      wallet: WALLET,
      creditos: 100,
      motivo: 'compra',
      referencia: '0x' + 'a'.repeat(64),
    })
    expect(repetida.duplicada).toBe(true)
    expect(repetida.saldo).toBe(100)
  })

  it('no acredita montos inválidos ni deja saldo negativo', async () => {
    const cero = await acreditar(dbConSaldo(0), {
      wallet: WALLET,
      creditos: 0,
      motivo: 'ajuste',
      referencia: 'ajuste:0',
    })
    expect(cero.ok).toBe(false)

    // Sin fila devuelta por el UPDATE condicionado no hay saldo suficiente.
    const sinSaldo = await gastar(
      { selectFrom: () => ({ select: () => ({ where: () => ({ executeTakeFirst: async () => ({ credits: 2 }) }) }) }) } as any,
      { wallet: WALLET, creditos: 4, motivo: 'detalle', referencia: 'detalle:1' },
    )
    expect(sinSaldo).toMatchObject({ ok: false, motivo: 'sin_saldo', saldo: 2 })
  })

  it('el saldo por omisión es 0', async () => {
    const vacio = {
      selectFrom: () => ({ select: () => ({ where: () => ({ executeTakeFirst: async () => undefined }) }) }),
    } as any
    expect(await saldoDe(vacio, WALLET)).toBe(0)
  })
})
