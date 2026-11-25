import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'

const LLAVE_REVISOR = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const LLAVE_AUTOR = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6'
const REVISOR = privateKeyToAccount(LLAVE_REVISOR)
const AUTOR = privateKeyToAccount(LLAVE_AUTOR)

const estado = (globalThis as unknown as Record<string, any>).__prealertaScore ?? {}
;(globalThis as unknown as Record<string, any>).__prealertaScore = estado

vi.mock('@/.config/kysely.config', () => ({
  newKyselyPostgresql: () => (globalThis as unknown as Record<string, any>).__prealertaScore.db,
}))

function crearDb(preAlert: Record<string, any>) {
  const actualizado: Record<string, any> = {}
  const db: any = {
    selectFrom: () => ({
      selectAll: () => ({
        where: () => ({ executeTakeFirst: async () => preAlert }),
      }),
    }),
    updateTable: () => ({
      set: (valores: any) => {
        Object.assign(actualizado, valores)
        return { where: () => ({ execute: async () => undefined }) }
      },
    }),
  }
  return { db, actualizado }
}

async function firmar(id: number, score: number) {
  const timestamp = Math.floor(Date.now() / 1000)
  const mensaje = `score:${id}:${score}:${timestamp}`
  const signature = await REVISOR.signMessage({ message: mensaje })
  return {
    pre_alert_id: id,
    score,
    feedback: 'Revisado',
    documenter_wallet: REVISOR.address,
    timestamp,
    signature,
  }
}

describe('POST /api/pre-alerts/[id]/score con alertas de documentador', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.DOCUMENTER_WALLETS = REVISOR.address
  })

  afterEach(() => {
    delete process.env.DOCUMENTER_WALLETS
  })

  // La primera importación del route handler cuesta segundos en este VM: el
  // margen evita un fallo por plazo cuando la suite corre con cobertura.
  it('aprueba la alerta del documentador sin pago al ciudadano', async () => {
    const fake = crearDb({
      id: 5,
      status: 'converted',
      origin: 'documenter',
      buyer_wallet: null,
      publisher_wallet: AUTOR.address,
      json_data: { departamento: 'Cauca' },
    })
    estado.db = fake.db

    const { POST } = await import('@/app/api/pre-alerts/[id]/score/route')
    const cuerpo = await firmar(5, 4)
    const res = await (POST as any)(
      new NextRequest('http://localhost/api/pre-alerts/5/score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      }),
      { params: Promise.resolve({ id: '5' }) },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('paid')
    expect(body.citizen_reward).toBe('0 USDT')
    expect(fake.actualizado.status).toBe('paid')
    expect(fake.actualizado.score).toBe(4)
  }, 20_000)

  it('impide que el autor revise su propia prealerta', async () => {
    const fake = crearDb({
      id: 6,
      status: 'converted',
      origin: 'documenter',
      buyer_wallet: null,
      publisher_wallet: REVISOR.address,
      json_data: { departamento: 'Cauca' },
    })
    estado.db = fake.db

    const { POST } = await import('@/app/api/pre-alerts/[id]/score/route')
    const cuerpo = await firmar(6, 5)
    const res = await (POST as any)(
      new NextRequest('http://localhost/api/pre-alerts/6/score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      }),
      { params: Promise.resolve({ id: '6' }) },
    )

    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('no_auto_revision')
  }, 20_000)
})
