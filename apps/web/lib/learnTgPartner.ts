// Canal de socio con learn.tg (`GET /api/verify`).
//
// sivel3 pregunta a learn.tg si una billetera está verificada (KYC/Self/GoodDollar)
// firmando una consulta con una llave **dedicada, sin valor on-chain**. La llave del
// socio se separa por entorno: en producción debe ser propia
// (`LEARNTG_AUTHPARTNER_PRIVATE_KEY`); en desarrollo se acepta reusar la del canal del
// asistente o la `PRIVATE_KEY` para no multiplicar secretos.
//
// Criterios de este módulo (https://gitlab.com/pasosDeJesus/m/-/issues/78, P0):
// - **Falla cerrado**: sin llave, con timeout o con respuesta inválida, la billetera no
//   se considera verificada. Antes, `mint-connector`/`mint-explorer` devolvían `true`
//   ante un fallo de learn.tg y minteaban sin verificación.
// - **Caché corta** (5 min) por billetera: menos llamadas, menos enumeración y la
//   compra de prealertas no depende de un learn.tg caído.
// - **Sólo el booleano**: learn.tg devuelve hoy `name`/`countryId`; aquí se descartan a
//   propósito (minimización de datos personales).
import { keccak256, encodePacked } from 'viem'
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'

/**
 * Variables que pueden firmar el canal, en orden de precedencia. `PRIVATE_KEY` va antes
 * que la del asistente para **no cambiar la llave en instalaciones existentes**: mientras
 * `LEARNTG_ADDRESS` (la dirección que conoce learn.tg) siga siendo la suya, ese es el
 * firmante aunque las otras estén definidas.
 */
export const FUENTES_DE_LLAVE = [
  'LEARNTG_AUTHPARTNER_PRIVATE_KEY',
  'PRIVATE_KEY',
  'SIVEL3_MESSAGES_PRIVATE_KEY',
] as const

export type FuenteDeLlave = (typeof FUENTES_DE_LLAVE)[number]

export interface LlaveDeSocio {
  cuenta: PrivateKeyAccount
  fuente: FuenteDeLlave
}

const CACHE_TTL_MS = 5 * 60 * 1000
// Un «no verificado» se recuerda menos: puede ser un fallo pasajero de learn.tg y no
// conviene dejar a la persona bloqueada 5 minutos por un timeout.
const CACHE_TTL_NEGATIVO_MS = 60 * 1000
const TIMEOUT_MS = Number(process.env.LEARNTG_TIMEOUT_MS || 5_000)
const LLAVE_VALIDA = /^0x[0-9a-fA-F]{64}$/

let avisoSinLlave = false
const cache = new Map<string, { verificado: boolean; expira: number }>()

let avisoDireccion = false

/**
 * Llave del canal. Manda `LEARNTG_ADDRESS` (la dirección dada de alta en learn.tg): si
 * alguna de las llaves definidas la produce, ésa firma, así que una instalación que ya
 * funcionaba **sigue firmando con la misma** aunque se agreguen otras variables. Si
 * ninguna coincide se usa la primera y se avisa: learn.tg responderá 403 hasta que su
 * `AUTHORIZED_VERIFIERS` incluya esa dirección.
 */
export function llaveDeSocio(): LlaveDeSocio | null {
  const candidatas: LlaveDeSocio[] = []
  for (const fuente of FUENTES_DE_LLAVE) {
    const valor = process.env[fuente]
    if (!valor) continue
    if (!LLAVE_VALIDA.test(valor)) {
      console.error(`[learn.tg] ${fuente} no es una llave privada hex de 32 bytes`)
      continue
    }
    candidatas.push({ cuenta: privateKeyToAccount(valor as `0x${string}`), fuente })
  }
  if (candidatas.length === 0) return null

  const esperada = (process.env.LEARNTG_ADDRESS || '').trim().toLowerCase()
  if (esperada) {
    const coincide = candidatas.find((c) => c.cuenta.address.toLowerCase() === esperada)
    if (coincide) return coincide
    if (!avisoDireccion) {
      avisoDireccion = true
      console.error(
        `[learn.tg] ninguna llave produce LEARNTG_ADDRESS (${esperada}); se usará ${candidatas[0].fuente} (${candidatas[0].cuenta.address}). Agregue esa dirección a AUTHORIZED_VERIFIERS o corrija LEARNTG_ADDRESS.`,
      )
    }
  }
  return candidatas[0]
}

/** Dirección que hay que dar de alta en `AUTHORIZED_VERIFIERS` de learn.tg. */
export function direccionDeSocio(): string | null {
  return llaveDeSocio()?.cuenta.address ?? null
}

/** Base de learn.tg: `LEARNTG_API_URL` o la red configurada (dev en :9001). */
export function urlDeLearnTg(): string {
  const explicita = process.env.LEARNTG_API_URL
  if (explicita) return explicita.replace(/\/+$/, '')
  return process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'https://learn.tg' : 'https://learn.tg:9001'
}

/** Mensaje que verifica learn.tg: EIP-191 sobre `keccak256(encodePacked(wallet, ts))`. */
export function mensajeDeVerificacion(wallet: string, timestamp: number): `0x${string}` {
  return keccak256(
    encodePacked(['address', 'uint256'], [wallet as `0x${string}`, BigInt(timestamp)]),
  )
}

export function limpiarCacheDeVerificacion(): void {
  cache.clear()
  avisoSinLlave = false
  avisoDireccion = false
}

function enCache(wallet: string): boolean | undefined {
  const entrada = cache.get(wallet)
  if (!entrada) return undefined
  if (entrada.expira <= Date.now()) {
    cache.delete(wallet)
    return undefined
  }
  return entrada.verificado
}

function guardar(wallet: string, verificado: boolean): void {
  const ttl = verificado ? CACHE_TTL_MS : CACHE_TTL_NEGATIVO_MS
  cache.set(wallet, { verificado, expira: Date.now() + ttl })
}

/**
 * ¿La billetera está verificada en learn.tg? Falla cerrado y cachea el booleano.
 * `consultar` se inyecta sólo en pruebas.
 */
export async function verificarEnLearnTg(
  wallet: string,
  consultar: (url: string) => Promise<Response> = (url) =>
    fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' }),
): Promise<boolean> {
  const direccion = wallet.toLowerCase()
  const guardado = enCache(direccion)
  if (guardado !== undefined) return guardado

  const llave = llaveDeSocio()
  if (!llave) {
    if (!avisoSinLlave) {
      avisoSinLlave = true
      console.warn(
        '[learn.tg] sin llave de socio (LEARNTG_AUTHPARTNER_PRIVATE_KEY): ninguna billetera se considerará verificada',
      )
    }
    return false
  }

  const timestamp = Math.floor(Date.now() / 1000)
  let firma: string
  try {
    firma = await llave.cuenta.signMessage({
      message: mensajeDeVerificacion(direccion, timestamp),
    })
  } catch (error) {
    console.error('[learn.tg] no se pudo firmar la consulta de socio:', error)
    return false
  }

  const url = `${urlDeLearnTg()}/api/verify?wallet=${direccion}&timestamp=${timestamp}&signature=${firma}`
  try {
    const respuesta = await consultar(url)
    if (!respuesta.ok) {
      if (respuesta.status === 403) {
        console.error(
          `[learn.tg] el socio no está autorizado (${llave.fuente}): agregue ${llave.cuenta.address} a AUTHORIZED_VERIFIERS`,
        )
      }
      return false
    }
    const datos = (await respuesta.json()) as { verified?: unknown }
    const verificado = datos?.verified === true
    guardar(direccion, verificado)
    return verificado
  } catch (error) {
    console.error('[learn.tg] la consulta de verificación falló:', error)
    return false
  }
}
