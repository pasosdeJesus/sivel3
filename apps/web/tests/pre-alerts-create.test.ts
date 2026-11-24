import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'
import { createHash } from 'node:crypto'

const LLAVE_DOCUMENTADOR = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const LLAVE_AJENA = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6'
const DOCUMENTADOR = privateKeyToAccount(LLAVE_DOCUMENTADOR)
const AJENA = privateKeyToAccount(LLAVE_AJENA)

const estado = (globalThis as unknown as Record<string, any>).__prealertaPrueba ?? {}
;(globalThis as unknown as Record<string, any>).__prealertaPrueba = estado

vi.mock('@/.config/kysely.config', () => ({
  newKyselyPostgresql: () => (globalThis as unknown as Record<string, any>).__prealertaPrueba.db,
}))

type Ruta = typeof import('@/app/api/pre-alerts/route')

function sha256Hex(texto: string): string {
  return createHash('sha256').update(texto).digest('hex')
}

async function firmar(opciones: {
  cuenta: typeof DOCUMENTADOR
  cuerpo: string
  timestamp?: number
}) {
  const timestamp = opciones.timestamp ?? Math.floor(Date.now() / 1000)
  const mensaje = `prealerta:${sha256Hex(opciones.cuerpo)}:${timestamp}`
  const signature = await opciones.cuenta.signMessage({ message: mensaje })
  return {
    'content-type': 'application/json',
    'x-documenter-address': opciones.cuenta.address.toLowerCase(),
    'x-documenter-signature': signature,
    'x-documenter-timestamp': String(timestamp),
  }
}

function crearDb(resultado: unknown) {
  const capturado: Record<string, any> = {}
  const cadena: any = {
    values: (valores: any) => {
      capturado.valores = valores
      return cadena
    },
    onConflict: () => cadena,
    returning: () => cadena,
    executeTakeFirst: async () => resultado,
  }
  return {
    db: { insertInto: (tabla: string) => (capturado.tabla = tabla) && cadena },
    capturado,
  }
}

describe('POST /api/pre-alerts (borrador del asistente)', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.DOCUMENTER_WALLETS = DOCUMENTADOR.address
  })

  afterEach(() => {
    delete process.env.DOCUMENTER_WALLETS
  })

  it('crea la alerta del documentador en revisión, con dueño y event_hash', async () => {
    const fake = crearDb({ id: 9, status: 'converted' })
    estado.db = fake.db

    const { POST } = await import('@/app/api/pre-alerts/route')
    const cuerpo = JSON.stringify({
      relatos: [{ titulo: 'Caso X', fecha: '2026-11-01', departamento: 'Cauca', municipio: 'Popayán' }],
      fuente: { url: 'https://ejemplo.test/nota' },
    })
    const headers = await firmar({ cuenta: DOCUMENTADOR, cuerpo })
    const req = new NextRequest('http://localhost/api/pre-alerts', {
      method: 'POST',
      headers,
      body: cuerpo,
    })

    const res = await (POST as Ruta['POST'])(req)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 9, status: 'converted' })

    expect(fake.capturado.tabla).toBe('pre_alert')
    expect(fake.capturado.valores.publisher_wallet).toBe(DOCUMENTADOR.address.toLowerCase())
    expect(fake.capturado.valores.status).toBe('converted')
    expect(fake.capturado.valores.origin).toBe('documenter')
    expect(fake.capturado.valores.converted_at).toBeInstanceOf(Date)
    expect(fake.capturado.valores.event_hash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(fake.capturado.valores.json_data.titulo).toBe('Caso X')
    expect(fake.capturado.valores.source_urls).toEqual(['https://ejemplo.test/nota'])
  })

  it('responde 409 si el caso ya tiene prealerta', async () => {
    const fake = crearDb(undefined)
    estado.db = fake.db

    const { POST } = await import('@/app/api/pre-alerts/route')
    const cuerpo = JSON.stringify({ relatos: [{ titulo: 'Caso Y' }] })
    const headers = await firmar({ cuenta: DOCUMENTADOR, cuerpo })
    const req = new NextRequest('http://localhost/api/pre-alerts', {
      method: 'POST',
      headers,
      body: cuerpo,
    })

    const res = await (POST as Ruta['POST'])(req)
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('duplicada')
  })

  it('rechaza billeteras sin rol y firmas ajenas', async () => {
    const fake = crearDb({ id: 1, status: 'pending' })
    estado.db = fake.db

    const { POST } = await import('@/app/api/pre-alerts/route')
    const cuerpo = JSON.stringify({ relatos: [{ titulo: 'Caso Z' }] })

    const ajena = await firmar({ cuenta: AJENA, cuerpo })
    const resAjena = await (POST as Ruta['POST'])(
      new NextRequest('http://localhost/api/pre-alerts', { method: 'POST', headers: ajena, body: cuerpo }),
    )
    expect(resAjena.status).toBe(403)

    const firmada = await firmar({ cuenta: DOCUMENTADOR, cuerpo })
    const resMala = await (POST as Ruta['POST'])(
      new NextRequest('http://localhost/api/pre-alerts', {
        method: 'POST',
        headers: { ...firmada, 'x-documenter-signature': `0x${'11'.repeat(65)}` },
        body: cuerpo,
      }),
    )
    expect(resMala.status).toBe(401)
  })
})
