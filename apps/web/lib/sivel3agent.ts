// Cliente del asistente de documentación (`sivel3agent`, R-#20).
//
// El canal es servidor a servidor: el navegador nunca llama al agente. El proxy
// de `app/api/asistente` verifica al documentador y luego firma aquí el mensaje
// canónico con la llave dedicada del canal. La llave on-chain (`PRIVATE_KEY`) no
// se usa: si se filtra este canal no se puede mover valor.

import { createHash, randomUUID } from 'node:crypto'
import { privateKeyToAccount } from 'viem/accounts'

export const DOMINIO_AGENTE = 'sivel3agent:1'

/** Tope por omisión de una llamada al agente. */
export const TIMEOUT_MS = Number(process.env.SIVEL3AGENT_TIMEOUT_MS || 30_000)

export function sha256Hex(texto: string): string {
  return createHash('sha256').update(texto).digest('hex')
}

/** Mismo formato que `sivel3agent/apps/web/lib/authServicio.ts`. */
export function mensajeServicio(s: {
  metodo: string
  ruta: string
  cuerpo: string
  timestamp: string
  nonce: string
  usuario?: string
}): string {
  return [
    DOMINIO_AGENTE,
    s.metodo.toUpperCase(),
    s.ruta,
    sha256Hex(s.cuerpo),
    s.timestamp,
    s.nonce,
    s.usuario || '-',
  ].join('\n')
}

export class AgenteNoConfigurado extends Error {
  constructor() {
    super('Falta SIVEL3AGENT_API_URL o SIVEL3_MESSAGES_PRIVATE_KEY')
    this.name = 'AgenteNoConfigurado'
  }
}

export interface RespuestaAgente {
  status: number
  contentType: string
  body: string
}

export function agenteConfigurado(): boolean {
  return Boolean(process.env.SIVEL3AGENT_API_URL && process.env.SIVEL3_MESSAGES_PRIVATE_KEY)
}

/**
 * Firma y envía una petición al agente. `ruta` es la del agente (incluye
 * `/api/revision/...` y la query, sin el host). `cuerpo` se envía tal cual: el
 * hash del mensaje canónico y el cuerpo deben ser el mismo texto.
 */
export async function llamarAgente(opciones: {
  metodo: 'GET' | 'POST'
  ruta: string
  cuerpo?: string
  usuario: string
  timeoutMs?: number
}): Promise<RespuestaAgente> {
  const base = process.env.SIVEL3AGENT_API_URL
  const llave = process.env.SIVEL3_MESSAGES_PRIVATE_KEY
  if (!base || !llave) throw new AgenteNoConfigurado()

  const cuerpo = opciones.cuerpo ?? ''
  const timestamp = new Date().toISOString()
  const nonce = randomUUID()
  const mensaje = mensajeServicio({
    metodo: opciones.metodo,
    ruta: opciones.ruta,
    cuerpo,
    timestamp,
    nonce,
    usuario: opciones.usuario,
  })

  const cuenta = privateKeyToAccount(llave as `0x${string}`)
  const firma = await cuenta.signMessage({ message: mensaje })

  const respuesta = await fetch(`${base.replace(/\/$/, '')}${opciones.ruta}`, {
    method: opciones.metodo,
    headers: {
      Accept: 'application/json, application/xml;q=0.9, */*;q=0.1',
      ...(opciones.metodo === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      'X-Sivel3-Address': cuenta.address,
      'X-Sivel3-Signature': firma,
      'X-Sivel3-Timestamp': timestamp,
      'X-Sivel3-Nonce': nonce,
      'X-Sivel3-User': opciones.usuario,
    },
    body: opciones.metodo === 'POST' ? cuerpo : undefined,
    signal: AbortSignal.timeout(opciones.timeoutMs ?? TIMEOUT_MS),
  })

  const texto = await respuesta.text()
  return {
    status: respuesta.status,
    contentType: respuesta.headers.get('content-type') || 'application/json',
    body: texto,
  }
}

/** Traduce el fallo del agente a un `code` estable para la UI. */
export function codigoDeError(status: number, cuerpo: string): string {
  try {
    const datos = JSON.parse(cuerpo)
    if (datos && typeof datos.code === 'string') return datos.code
  } catch {
    /* no era JSON */
  }
  if (status === 401 || status === 403) return 'no_documenter'
  if (status === 409) return 'duplicada'
  if (status === 413) return 'texto_largo'
  if (status === 422) return 'texto_corto'
  if (status === 429) return 'cuota'
  if (status === 503) return 'agente_ocupado'
  if (status >= 500) return 'agente_caido'
  return 'error'
}
