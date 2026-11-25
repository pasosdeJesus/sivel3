import { afterEach, describe, expect, it, vi } from 'vitest'
import { privateKeyToAccount } from 'viem/accounts'
import { verifyMessage } from 'viem'
import { borrarIngesta, extraerCaso, nuevoNonce, saludAsistente } from '@/lib/asistenteClient'

const LLAVE = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const CUENTA = privateKeyToAccount(LLAVE)

/** Proveedor EIP-1193 mínimo: firma con la cuenta de prueba. */
function proveedorFirmante() {
  return {
    request: async ({ method, params }: { method: string; params?: unknown[] }) => {
      if (method !== 'personal_sign') throw new Error(`método no soportado: ${method}`)
      const [mensaje] = params as [string, string]
      return CUENTA.signMessage({ message: mensaje })
    },
  }
}

describe('cliente del asistente', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('manda source_id e ingesta_id a /extraer y firma con nonce', async () => {
    const capturado: { url?: string; init?: RequestInit } = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        capturado.url = url
        capturado.init = init
        return new Response('{"relatos":[]}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    const r = await extraerCaso({
      provider: proveedorFirmante(),
      address: CUENTA.address,
      texto: 'Un texto suficientemente largo para el modelo.',
      origen: 'noticia',
      sourceId: 42,
      ingestaId: 7,
    })

    expect(r.ok).toBe(true)
    expect(capturado.url).toBe('/api/asistente/extraer')
    const cuerpo = JSON.parse(String(capturado.init?.body))
    expect(cuerpo.fuente).toEqual({ source_id: 42 })
    expect(cuerpo.ingesta_id).toBe(7)

    const cabeceras = new Headers(capturado.init?.headers)
    const nonce = cabeceras.get('x-documenter-nonce') as string
    const timestamp = cabeceras.get('x-documenter-timestamp') as string
    expect(nonce.length).toBeGreaterThanOrEqual(8)

    const hash = await sha256Hex(String(capturado.init?.body))
    const mensaje = `asistente:POST:extraer:${hash}:${timestamp}:${nonce}`
    await expect(
      verifyMessage({
        address: CUENTA.address,
        message: mensaje,
        signature: cabeceras.get('x-documenter-signature') as `0x${string}`,
      }),
    ).resolves.toBe(true)
  })

  it('no manda fuente cuando no hay descarga ni URL', async () => {
    const capturado: { init?: RequestInit } = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        capturado.init = init
        return new Response('{"relatos":[]}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    await extraerCaso({
      provider: proveedorFirmante(),
      address: CUENTA.address,
      texto: 'Apuntes propios de una masacre.',
      origen: 'notas',
    })

    const cuerpo = JSON.parse(String(capturado.init?.body))
    expect(cuerpo.fuente).toBeUndefined()
    expect(cuerpo.ingesta_id).toBeUndefined()
  })

  it('firma el health como cualquier otra ruta', async () => {
    const capturado: { url?: string; init?: RequestInit } = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        capturado.url = url
        capturado.init = init
        return new Response('{"ok":true}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    const r = await saludAsistente({ provider: proveedorFirmante(), address: CUENTA.address })
    expect(r.ok).toBe(true)
    expect(capturado.url).toBe('/api/asistente/health')
    expect(capturado.init?.method).toBe('GET')
    expect(new Headers(capturado.init?.headers).get('x-documenter-nonce')).toBeTruthy()
  })

  it('usa DELETE para borrar la ingesta', async () => {
    const capturado: { url?: string; init?: RequestInit } = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        capturado.url = url
        capturado.init = init
        return new Response(null, { status: 204 })
      }),
    )

    const r = await borrarIngesta({ provider: proveedorFirmante(), address: CUENTA.address, id: 12 })
    expect(r.ok).toBe(true)
    expect(capturado.url).toBe('/api/asistente/12')
    expect(capturado.init?.method).toBe('DELETE')
    expect(capturado.init?.body).toBeUndefined()
  })

  it('genera nonces distintos', () => {
    expect(nuevoNonce()).not.toBe(nuevoNonce())
  })
})

async function sha256Hex(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
