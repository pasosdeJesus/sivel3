import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'
import { randomUUID } from 'node:crypto'

import { resetRateLimits } from '@/lib/rateLimit'

const LLAVE_DOCUMENTADOR = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const LLAVE_AJENA = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6'
const DOCUMENTADOR = privateKeyToAccount(LLAVE_DOCUMENTADOR)
const AJENA = privateKeyToAccount(LLAVE_AJENA)

const estado = (globalThis as unknown as Record<string, any>).__publicacionPrueba ?? {}
;(globalThis as unknown as Record<string, any>).__publicacionPrueba = estado

vi.mock('@/.config/kysely.config', () => ({
  newKyselyPostgresql: () => (globalThis as unknown as Record<string, any>).__publicacionPrueba.db,
}))

async function firmar(opciones: {
  cuenta: typeof DOCUMENTADOR
  mensaje: string
  timestamp?: number
  nonce?: string
}) {
  const timestamp = opciones.timestamp ?? Math.floor(Date.now() / 1000)
  const nonce = opciones.nonce ?? randomUUID()
  const mensaje = opciones.mensaje.replace('{ts}', String(timestamp)).replace('{nonce}', nonce)
  const signature = await opciones.cuenta.signMessage({ message: mensaje })
  return {
    'content-type': 'application/json',
    'x-documenter-address': opciones.cuenta.address.toLowerCase(),
    'x-documenter-signature': signature,
    'x-documenter-timestamp': String(timestamp),
    'x-documenter-nonce': nonce,
  }
}

function dbDeActualizacion(resultado: unknown) {
  const capturado: Record<string, any> = {}
  const cadena: any = {
    set: (valores: any) => {
      capturado.valores = { ...capturado.valores, ...valores }
      return cadena
    },
    where: () => cadena,
    returning: () => cadena,
    executeTakeFirst: async () => resultado,
  }
  return { db: { updateTable: (tabla: string) => ((capturado.tabla = tabla), cadena) }, capturado }
}

describe('publicación de alertas (R-#22 P0)', () => {
  beforeEach(() => {
    vi.resetModules()
    resetRateLimits()
    process.env.DOCUMENTER_WALLETS = DOCUMENTADOR.address
  })

  afterEach(() => {
    delete process.env.DOCUMENTER_WALLETS
  })

  it('publica una alerta convertida y registra quién y cuándo', async () => {
    const fake = dbDeActualizacion({ id: 5, status: 'published', published_at: new Date() })
    estado.db = fake.db

    const { POST } = await import('@/app/api/pre-alerts/[id]/publish/route')
    const headers = await firmar({ cuenta: DOCUMENTADOR, mensaje: 'publicar:5:{ts}:{nonce}' })
    const res = await POST(
      new NextRequest('http://localhost/api/pre-alerts/5/publish', { method: 'POST', headers }),
      { params: Promise.resolve({ id: '5' }) },
    )

    expect(res.status).toBe(200)
    expect(fake.capturado.tabla).toBe('pre_alert')
    expect(fake.capturado.valores.status).toBe('published')
    expect(fake.capturado.valores.published_by).toBe(DOCUMENTADOR.address.toLowerCase())
    expect(fake.capturado.valores.published_at).toBeInstanceOf(Date)
  })

  it('no publica si la alerta no está convertida', async () => {
    estado.db = dbDeActualizacion(undefined).db
    const { POST } = await import('@/app/api/pre-alerts/[id]/publish/route')
    const headers = await firmar({ cuenta: DOCUMENTADOR, mensaje: 'publicar:9:{ts}:{nonce}' })
    const res = await POST(
      new NextRequest('http://localhost/api/pre-alerts/9/publish', { method: 'POST', headers }),
      { params: Promise.resolve({ id: '9' }) },
    )
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('no_publicable')
  })

  it('ata la firma al id: la de la alerta 5 no publica la 6', async () => {
    estado.db = dbDeActualizacion({ id: 6, status: 'published' }).db
    const { POST } = await import('@/app/api/pre-alerts/[id]/publish/route')
    const headers = await firmar({ cuenta: DOCUMENTADOR, mensaje: 'publicar:5:{ts}:{nonce}' })
    const res = await POST(
      new NextRequest('http://localhost/api/pre-alerts/6/publish', { method: 'POST', headers }),
      { params: Promise.resolve({ id: '6' }) },
    )
    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe('firma_invalida')
  })

  it('rechaza a una billetera sin rol y una firma reutilizada', async () => {
    estado.db = dbDeActualizacion({ id: 5, status: 'published' }).db
    const { POST } = await import('@/app/api/pre-alerts/[id]/publish/route')

    const ajena = await firmar({ cuenta: AJENA, mensaje: 'publicar:5:{ts}:{nonce}' })
    const resAjena = await POST(
      new NextRequest('http://localhost/api/pre-alerts/5/publish', { method: 'POST', headers: ajena }),
      { params: Promise.resolve({ id: '5' }) },
    )
    expect(resAjena.status).toBe(403)

    const nonce = randomUUID()
    const primera = await firmar({ cuenta: DOCUMENTADOR, mensaje: 'publicar:5:{ts}:{nonce}', nonce })
    const segunda = await firmar({ cuenta: DOCUMENTADOR, mensaje: 'publicar:5:{ts}:{nonce}', nonce })
    const peticion = (headers: HeadersInit) =>
      POST(
        new NextRequest('http://localhost/api/pre-alerts/5/publish', { method: 'POST', headers }),
        { params: Promise.resolve({ id: '5' }) },
      )
    expect((await peticion(primera)).status).toBe(200)
    expect((await peticion(segunda)).status).toBe(401)
  })

  it('despublica y limpia las marcas de publicación', async () => {
    const fake = dbDeActualizacion({ id: 5, status: 'converted' })
    estado.db = fake.db
    const { POST } = await import('@/app/api/pre-alerts/[id]/unpublish/route')
    const headers = await firmar({ cuenta: DOCUMENTADOR, mensaje: 'despublicar:5:{ts}:{nonce}' })
    const res = await POST(
      new NextRequest('http://localhost/api/pre-alerts/5/unpublish', { method: 'POST', headers }),
      { params: Promise.resolve({ id: '5' }) },
    )
    expect(res.status).toBe(200)
    expect(fake.capturado.valores.status).toBe('converted')
    expect(fake.capturado.valores.published_at).toBeNull()
    expect(fake.capturado.valores.published_by).toBeNull()
  })
})
