import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetRateLimits } from '@/lib/rateLimit'

const control = {
  pago: { ok: true, monto: 2 } as { ok: boolean; monto: number | null; motivo?: string },
  acreditacion: { ok: true, duplicada: false, saldo: 200 },
}

vi.mock('@/.config/kysely.config', () => ({ newKyselyPostgresql: () => ({}) }))
vi.mock('@/lib/usdtTransfer', () => ({ verificarTransferenciaUSDT: async () => control.pago }))
vi.mock('@/lib/creditos', async () => {
  const real = await vi.importActual<typeof import('@/lib/creditos')>('@/lib/creditos')
  return {
    ...real,
    acreditar: async () => control.acreditacion,
    saldoDe: async () => control.acreditacion.saldo,
  }
})

const WALLET = '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C'
const TX = '0x' + 'a'.repeat(64)

async function comprar(cuerpo: unknown) {
  const { POST } = await import('@/app/api/credits/purchase/route')
  const res = await (POST as any)(
    new Request('http://localhost/api/credits/purchase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }),
  )
  return { res, body: await res.json() }
}

describe('compra de créditos con USDT', () => {
  beforeEach(() => {
    resetRateLimits()
    control.pago = { ok: true, monto: 2 }
    control.acreditacion = { ok: true, duplicada: false, saldo: 200 }
  })

  afterEach(() => {
    delete process.env.CREDITS_TREASURY_ADDRESS
  })

  it('responde 503 mientras no haya tesorería configurada', async () => {
    delete process.env.CREDITS_TREASURY_ADDRESS
    const { res, body } = await comprar({ wallet: WALLET, txHash: TX })
    expect(res.status).toBe(503)
    expect(body.code).toBe('tesoreria_no_configurada')
  })

  it('valida billetera y hash antes de consultar la cadena', async () => {
    process.env.CREDITS_TREASURY_ADDRESS = '0x1111111111111111111111111111111111111111'
    const { res, body } = await comprar({ wallet: 'no-es-billetera', txHash: 'x' })
    expect(res.status).toBe(400)
    expect(body.code).toBe('datos_invalidos')
  })

  it('acredita 100 créditos por USDT y es idempotente por referencia', async () => {
    process.env.CREDITS_TREASURY_ADDRESS = '0x1111111111111111111111111111111111111111'
    const { res, body } = await comprar({ wallet: WALLET, txHash: TX })
    expect(res.status).toBe(200)
    expect(body.creditos).toBe(200)
    expect(body.saldo).toBe(200)

    control.acreditacion = { ok: true, duplicada: true, saldo: 200 }
    const repetida = await comprar({ wallet: WALLET, txHash: TX })
    expect(repetida.res.status).toBe(200)
    expect(repetida.body.duplicada).toBe(true)
    expect(repetida.body.saldo).toBe(200)
  })

  it('rechaza un pago que no coincide', async () => {
    process.env.CREDITS_TREASURY_ADDRESS = '0x1111111111111111111111111111111111111111'
    control.pago = { ok: false, monto: null, motivo: 'no_coincide' }
    const { res, body } = await comprar({ wallet: WALLET, txHash: TX })
    expect(res.status).toBe(422)
    expect(body.code).toBe('no_coincide')
  })
})

describe('acreditación manual de créditos (sin cripto)', () => {
  const SECRETO = 'secreto-creditos-1234567890'

  async function otorgar(cuerpo: unknown, secreto?: string) {
    const { POST } = await import('@/app/api/credits/grant/route')
    const res = await (POST as any)(
      new Request('http://localhost/api/credits/grant', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(secreto ? { 'x-credits-secret': secreto } : {}),
        },
        body: JSON.stringify(cuerpo),
      }),
    )
    return { res, body: await res.json() }
  }

  afterEach(() => {
    delete process.env.SIVEL3_CREDITS_SECRET
  })

  it('no existe sin secreto configurado y rechaza un secreto equivocado', async () => {
    delete process.env.SIVEL3_CREDITS_SECRET
    expect((await otorgar({ wallet: WALLET, credits: 100 }, SECRETO)).res.status).toBe(503)

    process.env.SIVEL3_CREDITS_SECRET = SECRETO
    expect((await otorgar({ wallet: WALLET, credits: 100 }, 'otro')).res.status).toBe(401)
  })

  it('valida billetera y monto antes de tocar el libro mayor', async () => {
    process.env.SIVEL3_CREDITS_SECRET = SECRETO
    expect((await otorgar({ wallet: 'nope', credits: 100 }, SECRETO)).res.status).toBe(400)
    expect((await otorgar({ wallet: WALLET, credits: 0 }, SECRETO)).res.status).toBe(400)
    expect((await otorgar({ wallet: WALLET, credits: 1.5 }, SECRETO)).res.status).toBe(400)
  })

  it('acredita con una referencia estable y es idempotente', async () => {
    process.env.SIVEL3_CREDITS_SECRET = SECRETO
    control.acreditacion = { ok: true, duplicada: false, saldo: 4000 }
    const { res, body } = await otorgar(
      { wallet: WALLET, credits: 4000, reason: 'estipendio', reference: `estipendio:2026-11:${WALLET}` },
      SECRETO,
    )
    expect(res.status).toBe(200)
    expect(body).toMatchObject({ creditos: 4000, motivo: 'estipendio', duplicada: false, saldo: 4000 })

    control.acreditacion = { ok: true, duplicada: true, saldo: 4000 }
    const repetida = await otorgar(
      { wallet: WALLET, credits: 4000, reason: 'estipendio', reference: `estipendio:2026-11:${WALLET}` },
      SECRETO,
    )
    expect(repetida.body.duplicada).toBe(true)
  })
})

describe('estipendio mensual del documentador', () => {
  async function estipendio(secreto?: string) {
    const { POST } = await import('@/app/api/credits/stipend/route')
    const res = await (POST as any)(
      new Request('http://localhost/api/credits/stipend', {
        method: 'POST',
        headers: secreto ? { 'x-stipend-secret': secreto } : {},
      }),
    )
    return { res, body: await res.json() }
  }

  afterEach(() => {
    delete process.env.SIVEL3_STIPEND_SECRET
    delete process.env.DOCUMENTER_WALLETS
  })

  it('no existe sin secreto configurado y rechaza un secreto equivocado', async () => {
    delete process.env.SIVEL3_STIPEND_SECRET
    expect((await estipendio('x')).res.status).toBe(503)

    process.env.SIVEL3_STIPEND_SECRET = 'secreto-largo-de-prueba-1234567890'
    expect((await estipendio('otro')).res.status).toBe(401)
  })

  it('acredita a cada documentador y reporta el mes', async () => {
    process.env.SIVEL3_STIPEND_SECRET = 'secreto-largo-de-prueba-1234567890'
    process.env.DOCUMENTER_WALLETS = `${WALLET},0x1111111111111111111111111111111111111111`
    control.acreditacion = { ok: true, duplicada: false, saldo: 4000 }
    const { res, body } = await estipendio('secreto-largo-de-prueba-1234567890')
    expect(res.status).toBe(200)
    expect(body.month).toMatch(/^\d{4}-\d{2}$/)
    expect(body.acreditados).toHaveLength(2)
    expect(body.creditos).toBe(4000)
  })
})
