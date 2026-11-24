import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { privateKeyToAccount } from 'viem/accounts'
import { verifyMessage } from 'viem'

const LLAVE_SERVIDOR = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
const CUENTA_SERVIDOR = privateKeyToAccount(LLAVE_SERVIDOR)

describe('cliente del asistente (sivel3agent)', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.SIVEL3AGENT_API_URL = 'https://agente.test'
    process.env.SIVEL3_MESSAGES_PRIVATE_KEY = LLAVE_SERVIDOR
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.SIVEL3AGENT_API_URL
    delete process.env.SIVEL3_MESSAGES_PRIVATE_KEY
  })

  it('construye el mensaje canónico en el mismo orden que el agente', async () => {
    const { mensajeServicio, sha256Hex } = await import('@/lib/sivel3agent')
    const mensaje = mensajeServicio({
      metodo: 'post',
      ruta: '/api/revision/ingesta',
      cuerpo: '{"url":"https://ejemplo.test"}',
      timestamp: '2026-11-24T12:00:00.000Z',
      nonce: 'nonce-12345678',
      usuario: '0xabc',
    })
    const lineas = mensaje.split('\n')
    expect(lineas[0]).toBe('sivel3agent:1')
    expect(lineas[1]).toBe('POST')
    expect(lineas[2]).toBe('/api/revision/ingesta')
    expect(lineas[3]).toBe(sha256Hex('{"url":"https://ejemplo.test"}'))
    expect(lineas[6]).toBe('0xabc')
    expect(lineas).toHaveLength(7)
  })

  it('firma una petición verificable y la envía con las cabeceras del canal', async () => {
    const { llamarAgente } = await import('@/lib/sivel3agent')
    const capturado: { url?: string; init?: RequestInit } = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        capturado.url = url
        capturado.init = init
        return new Response('{"estado":"en_cola"}', {
          status: 202,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    const respuesta = await llamarAgente({
      metodo: 'POST',
      ruta: '/api/revision/ingesta',
      cuerpo: '{"url":"https://ejemplo.test"}',
      usuario: '0xabc',
    })

    expect(respuesta.status).toBe(202)
    expect(capturado.url).toBe('https://agente.test/api/revision/ingesta')
    const headers = new Headers(capturado.init?.headers)
    expect(headers.get('x-sivel3-address')?.toLowerCase()).toBe(CUENTA_SERVIDOR.address.toLowerCase())
    expect(headers.get('x-sivel3-user')).toBe('0xabc')

    const mensaje = [
      'sivel3agent:1',
      'POST',
      '/api/revision/ingesta',
      (await import('@/lib/sivel3agent')).sha256Hex('{"url":"https://ejemplo.test"}'),
      headers.get('x-sivel3-timestamp') as string,
      headers.get('x-sivel3-nonce') as string,
      '0xabc',
    ].join('\n')

    await expect(
      verifyMessage({
        address: CUENTA_SERVIDOR.address,
        message: mensaje,
        signature: headers.get('x-sivel3-signature') as `0x${string}`,
      }),
    ).resolves.toBe(true)
  })

  it('traduce los fallos a códigos estables', async () => {
    const { codigoDeError } = await import('@/lib/sivel3agent')
    expect(codigoDeError(409, '{"code":"duplicada"}')).toBe('duplicada')
    expect(codigoDeError(403, '')).toBe('no_documenter')
    expect(codigoDeError(429, '')).toBe('cuota')
    expect(codigoDeError(503, '')).toBe('agente_ocupado')
    expect(codigoDeError(500, '')).toBe('agente_caido')
  })
})
