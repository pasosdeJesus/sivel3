import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { privateKeyToAccount } from 'viem/accounts'
import { verifyMessage } from 'viem'
import { sha256Hex } from '@/lib/sivel3agent'
import { resetRateLimits } from '@/lib/rateLimit'

const LLAVE_DOCUMENTADOR = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const LLAVE_AJENA = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6'
const LLAVE_SERVIDOR = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
const DOCUMENTADOR = privateKeyToAccount(LLAVE_DOCUMENTADOR)
const AJENA = privateKeyToAccount(LLAVE_AJENA)
const SERVIDOR = privateKeyToAccount(LLAVE_SERVIDOR)

type Ruta = typeof import('@/app/api/asistente/[...ruta]/route')

async function ruta(): Promise<Ruta> {
  return import('@/app/api/asistente/[...ruta]/route')
}

function contexto(...partes: string[]) {
  return { params: Promise.resolve({ ruta: partes }) }
}

async function firmarDocumentador(opciones: {
  cuenta: typeof DOCUMENTADOR
  metodo: 'GET' | 'POST' | 'DELETE'
  ruta: string
  cuerpo?: string
  timestamp?: number
  nonce?: string
}) {
  const cuerpo = opciones.cuerpo ?? ''
  const timestamp = opciones.timestamp ?? Math.floor(Date.now() / 1000)
  const nonce = opciones.nonce ?? randomUUID()
  const mensaje = `asistente:${opciones.metodo}:${opciones.ruta}:${sha256Hex(cuerpo)}:${timestamp}:${nonce}`
  const signature = await opciones.cuenta.signMessage({ message: mensaje })
  return {
    'x-documenter-address': opciones.cuenta.address.toLowerCase(),
    'x-documenter-signature': signature,
    'x-documenter-timestamp': String(timestamp),
    'x-documenter-nonce': nonce,
  }
}

describe('proxy /api/asistente', () => {
  beforeEach(() => {
    vi.resetModules()
    resetRateLimits()
    process.env.DOCUMENTER_WALLETS = DOCUMENTADOR.address
    process.env.SIVEL3_MESSAGES_PRIVATE_KEY = LLAVE_SERVIDOR
    process.env.SIVEL3AGENT_API_URL = 'https://agente.test'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.DOCUMENTER_WALLETS
    delete process.env.SIVEL3_MESSAGES_PRIVATE_KEY
    delete process.env.SIVEL3AGENT_API_URL
  })

  it('reenvía firmado al agente y verifica al documentador', async () => {
    const cuerpo = JSON.stringify({ url: 'https://ejemplo.test/nota' })
    const headers = await firmarDocumentador({
      cuenta: DOCUMENTADOR,
      metodo: 'POST',
      ruta: 'ingesta',
      cuerpo,
    })
    const capturado: { url?: string; init?: RequestInit } = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        capturado.url = url
        capturado.init = init
        return new Response('{"ingesta_id":7,"estado":"en_cola"}', {
          status: 202,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    const { POST } = await ruta()
    const req = new NextRequest('http://localhost/api/asistente/ingesta', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: cuerpo,
    })
    const res = await POST(req, contexto('ingesta'))

    expect(res.status).toBe(202)
    expect(capturado.url).toBe('https://agente.test/api/revision/ingesta')

    const enviadas = new Headers(capturado.init?.headers)
    expect(enviadas.get('x-sivel3-address')?.toLowerCase()).toBe(SERVIDOR.address.toLowerCase())
    expect(enviadas.get('x-sivel3-user')).toBe(DOCUMENTADOR.address.toLowerCase())

    const mensajeAgente = [
      'sivel3agent:1',
      'POST',
      '/api/revision/ingesta',
      sha256Hex(cuerpo),
      enviadas.get('x-sivel3-timestamp') as string,
      enviadas.get('x-sivel3-nonce') as string,
      DOCUMENTADOR.address.toLowerCase(),
    ].join('\n')
    await expect(
      verifyMessage({
        address: SERVIDOR.address,
        message: mensajeAgente,
        signature: enviadas.get('x-sivel3-signature') as `0x${string}`,
      }),
    ).resolves.toBe(true)
  })

  it('responde 403 con una billetera sin rol de documentador', async () => {
    const headers = await firmarDocumentador({
      cuenta: AJENA,
      metodo: 'POST',
      ruta: 'ingesta',
      cuerpo: '{}',
    })
    const { POST } = await ruta()
    const req = new NextRequest('http://localhost/api/asistente/ingesta', {
      method: 'POST',
      headers,
      body: '{}',
    })
    const res = await POST(req, contexto('ingesta'))
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('no_documenter')
  })

  it('rechaza firmas vencidas y rutas fuera de la lista blanca', async () => {
    const vencida = await firmarDocumentador({
      cuenta: DOCUMENTADOR,
      metodo: 'POST',
      ruta: 'ingesta',
      cuerpo: '{}',
      timestamp: Math.floor(Date.now() / 1000) - 3600,
    })
    const { POST } = await ruta()
    const req = new NextRequest('http://localhost/api/asistente/ingesta', {
      method: 'POST',
      headers: vencida,
      body: '{}',
    })
    expect((await POST(req, contexto('ingesta'))).status).toBe(401)

    const reqRuta = new NextRequest('http://localhost/api/asistente/desconocido', { method: 'POST' })
    expect((await POST(reqRuta, contexto('desconocido'))).status).toBe(404)
  })

  it('rechaza el reenvío de la misma acción (nonce repetido)', async () => {
    const nonce = randomUUID()
    const headers = await firmarDocumentador({
      cuenta: DOCUMENTADOR,
      metodo: 'POST',
      ruta: 'ingesta',
      cuerpo: '{}',
      nonce,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('{"ingesta_id":3,"estado":"en_cola"}', {
          status: 202,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    const { POST } = await ruta()
    const peticion = () =>
      new NextRequest('http://localhost/api/asistente/ingesta', {
        method: 'POST',
        headers,
        body: '{}',
      })

    expect((await POST(peticion(), contexto('ingesta'))).status).toBe(202)
    const repetida = await POST(peticion(), contexto('ingesta'))
    expect(repetida.status).toBe(401)
    expect((await repetida.json()).code).toBe('nonce_repetido')
  })

  it('reenvía el DELETE y propaga Retry-After y Location', async () => {
    const headers = await firmarDocumentador({
      cuenta: DOCUMENTADOR,
      metodo: 'DELETE',
      ruta: '7',
    })
    const capturado: { init?: RequestInit } = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        capturado.init = init
        return new Response(null, {
          status: 204,
          headers: { 'retry-after': '7', location: '/api/revision/ingesta/7' },
        })
      }),
    )
    const { DELETE } = await ruta()
    const res = await DELETE(
      new NextRequest('http://localhost/api/asistente/7', { method: 'DELETE', headers }),
      contexto('7'),
    )
    expect(res.status).toBe(204)
    expect(capturado.init?.method).toBe('DELETE')
    expect(res.headers.get('Retry-After')).toBe('7')
    expect(res.headers.get('Location')).toBe('/api/revision/ingesta/7')
  })

  it('propaga los errores del agente sin inventar el estado', async () => {
    const headers = await firmarDocumentador({
      cuenta: DOCUMENTADOR,
      metodo: 'POST',
      ruta: 'extraer',
      cuerpo: '{}',
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('{"error":"cola llena","code":"cuota_cola"}', {
          status: 429,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    const { POST } = await ruta()
    const req = new NextRequest('http://localhost/api/asistente/extraer', {
      method: 'POST',
      headers,
      body: '{}',
    })
    const res = await POST(req, contexto('extraer'))
    expect(res.status).toBe(429)
    expect((await res.json()).code).toBe('cuota_cola')
  })
})
