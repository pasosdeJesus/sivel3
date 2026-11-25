import { createHmac, timingSafeEqual } from 'node:crypto'

// Pase de cuota de billetera (R-#22 P1). No es una sesión ni una cuenta: es una cookie
// firmada con `{wallet, expira}` que permite al servidor contar la cuota por billetera
// en vez de por IP. Se emite tras un `personal_sign` de una sola vez.
//
// Firma con `SIVEL3_PASS_SECRET`; si no está, con la llave del canal del asistente
// (ambas son secretos del servidor y nunca llegan al navegador).

export const COOKIE_PASE = 'sivel3_pase'
export const DURACION_PASE_S = 12 * 60 * 60
/** Ventana del `personal_sign` que emite el pase. */
export const VENTANA_FIRMA_PASE_S = 300

function secreto(): string | null {
  const valor = process.env.SIVEL3_PASS_SECRET || process.env.SIVEL3_MESSAGES_PRIVATE_KEY
  return valor && valor.length >= 32 ? valor : null
}

export function mensajePase(address: string, timestamp: number): string {
  return `pase:${address.toLowerCase()}:${timestamp}`
}

function firmar(payload: string): string {
  const clave = secreto()
  if (!clave) throw new Error('Falta SIVEL3_PASS_SECRET')
  return createHmac('sha256', clave).update(payload).digest('base64url')
}

export interface Pase {
  wallet: string
  expira: number
}

export function crearPase(wallet: string, ahora = Date.now()): { valor: string; maxAge: number } | null {
  if (!secreto()) return null
  const pase: Pase = { wallet: wallet.toLowerCase(), expira: ahora + DURACION_PASE_S * 1000 }
  const payload = Buffer.from(JSON.stringify(pase)).toString('base64url')
  return { valor: `${payload}.${firmar(payload)}`, maxAge: DURACION_PASE_S }
}

/**
 * Billetera del pase válido, o `null` (cookie ausente, manipulada o vencida).
 * Acepta un `Request` cualquiera: `cookies` sólo existe en `NextRequest`, y así las
 * pruebas y los handlers que reciben un `Request` pelado no revientan.
 */
export function leerPase(req: Request, ahora = Date.now()): string | null {
  const cookies = (req as { cookies?: { get?: (nombre: string) => { value: string } | undefined } })
    .cookies
  const valor = cookies?.get?.(COOKIE_PASE)?.value
  if (!valor) return null
  const [payload, firma] = valor.split('.')
  if (!payload || !firma) return null
  try {
    const esperada = Buffer.from(firmar(payload))
    const recibida = Buffer.from(firma)
    if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null
    const pase = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<Pase>
    if (typeof pase.wallet !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(pase.wallet)) return null
    if (typeof pase.expira !== 'number' || pase.expira <= ahora) return null
    return pase.wallet.toLowerCase()
  } catch {
    return null
  }
}
