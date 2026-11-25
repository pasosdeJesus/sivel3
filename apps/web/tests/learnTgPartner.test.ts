import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { privateKeyToAccount } from 'viem/accounts'
import { recoverMessageAddress } from 'viem'

const LLAVE_SOCIO = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const LLAVE_MENSAJES = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6'
const LLAVE_ONCHAIN = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
const SOCIO = privateKeyToAccount(LLAVE_SOCIO)
const MENSAJES = privateKeyToAccount(LLAVE_MENSAJES)
const ONCHAIN = privateKeyToAccount(LLAVE_ONCHAIN)
const WALLET = '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C'

type Modulo = typeof import('@/lib/learnTgPartner')

async function modulo(): Promise<Modulo> {
  vi.resetModules()
  return import('@/lib/learnTgPartner')
}

function respuesta(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('canal de socio con learn.tg', () => {
  beforeEach(() => {
    delete process.env.LEARNTG_AUTHPARTNER_PRIVATE_KEY
    delete process.env.SIVEL3_MESSAGES_PRIVATE_KEY
    delete process.env.PRIVATE_KEY
    delete process.env.LEARNTG_API_URL
    process.env.NEXT_PUBLIC_NETWORK = 'celo'
  })

  afterEach(() => {
    delete process.env.LEARNTG_AUTHPARTNER_PRIVATE_KEY
    delete process.env.SIVEL3_MESSAGES_PRIVATE_KEY
    delete process.env.PRIVATE_KEY
    delete process.env.LEARNTG_API_URL
    delete process.env.NEXT_PUBLIC_NETWORK
  })

  it('prefiere LEARNTG_AUTHPARTNER_PRIVATE_KEY y cae a las demás en desarrollo', async () => {
    const m = await modulo()
    expect(m.llaveDeSocio()).toBeNull()

    process.env.PRIVATE_KEY = LLAVE_ONCHAIN
    expect(m.llaveDeSocio()?.fuente).toBe('PRIVATE_KEY')

    // La llave del asistente no desplaza a la histórica: así una instalación que ya
    // funcionaba sigue firmando con la misma.
    process.env.SIVEL3_MESSAGES_PRIVATE_KEY = LLAVE_MENSAJES
    expect(m.llaveDeSocio()?.fuente).toBe('PRIVATE_KEY')

    process.env.LEARNTG_AUTHPARTNER_PRIVATE_KEY = LLAVE_SOCIO
    expect(m.llaveDeSocio()?.fuente).toBe('LEARNTG_AUTHPARTNER_PRIVATE_KEY')
    expect(m.llaveDeSocio()?.cuenta.address).toBe(SOCIO.address)
    expect(m.direccionDeSocio()).toBe(SOCIO.address)
  })

  it('manda LEARNTG_ADDRESS: firma con la llave que learn.tg conoce, sin romper despliegues', async () => {
    process.env.LEARNTG_AUTHPARTNER_PRIVATE_KEY = LLAVE_SOCIO
    process.env.PRIVATE_KEY = LLAVE_ONCHAIN
    process.env.SIVEL3_MESSAGES_PRIVATE_KEY = LLAVE_MENSAJES

    // Un despliegue que aún tiene la dirección histórica sigue firmando con su llave.
    process.env.LEARNTG_ADDRESS = ONCHAIN.address
    let m = await modulo()
    expect(m.llaveDeSocio()?.fuente).toBe('PRIVATE_KEY')

    // Al separar la llave en producción basta actualizar LEARNTG_ADDRESS.
    process.env.LEARNTG_ADDRESS = SOCIO.address
    vi.resetModules()
    m = await import('@/lib/learnTgPartner')
    expect(m.llaveDeSocio()?.fuente).toBe('LEARNTG_AUTHPARTNER_PRIVATE_KEY')
    expect(m.direccionDeSocio()).toBe(SOCIO.address)
  })

  it('firma el mensaje que verifica learn.tg (EIP-191 sobre keccak(encodePacked))', async () => {
    process.env.LEARNTG_AUTHPARTNER_PRIVATE_KEY = LLAVE_SOCIO
    const m = await modulo()
    const capturado: { url?: string } = {}

    const verificado = await m.verificarEnLearnTg(WALLET, async (url) => {
      capturado.url = url
      return respuesta({ verified: true })
    })

    expect(verificado).toBe(true)
    const url = new URL(capturado.url as string)
    expect(url.origin).toBe('https://learn.tg')
    expect(url.searchParams.get('wallet')).toBe(WALLET.toLowerCase())

    const timestamp = Number(url.searchParams.get('timestamp'))
    const firma = url.searchParams.get('signature') as `0x${string}`
    const recuperado = await recoverMessageAddress({
      message: m.mensajeDeVerificacion(WALLET.toLowerCase(), timestamp),
      signature: firma,
    })
    expect(recuperado).toBe(SOCIO.address)
  })

  it('falla cerrado: sin llave, con error de red, con 403 o con cuerpo inválido', async () => {
    const m = await modulo()
    expect(await m.verificarEnLearnTg(WALLET, async () => respuesta({ verified: true }))).toBe(false)

    process.env.LEARNTG_AUTHPARTNER_PRIVATE_KEY = LLAVE_SOCIO
    const m2 = await modulo()
    expect(
      await m2.verificarEnLearnTg(WALLET, async () => {
        throw new Error('timeout')
      }),
    ).toBe(false)

    m2.limpiarCacheDeVerificacion()
    expect(await m2.verificarEnLearnTg(WALLET, async () => respuesta({ error: 'x' }, 403))).toBe(false)

    m2.limpiarCacheDeVerificacion()
    expect(await m2.verificarEnLearnTg(WALLET, async () => respuesta({ verified: 'yes' }))).toBe(false)
  })

  it('descarta el nombre y el país que learn.tg devuelve junto al booleano', async () => {
    process.env.LEARNTG_AUTHPARTNER_PRIVATE_KEY = LLAVE_SOCIO
    const m = await modulo()
    let visto: unknown = null
    const verificado = await m.verificarEnLearnTg(WALLET, async () => {
      const r = respuesta({ verified: true, name: 'Nombre Real', countryId: 170 })
      visto = r
      return r
    })
    expect(verificado).toBe(true)
    expect(visto).toBeInstanceOf(Response)
    // El booleano es lo único que sale del módulo.
    expect(Object.keys({ verificado })).toEqual(['verificado'])
  })

  it('cachea el booleano 5 minutos y no repite la llamada', async () => {
    process.env.LEARNTG_AUTHPARTNER_PRIVATE_KEY = LLAVE_SOCIO
    const m = await modulo()
    const consultar = vi.fn(async () => respuesta({ verified: true }))

    await m.verificarEnLearnTg(WALLET, consultar)
    await m.verificarEnLearnTg(WALLET.toUpperCase().replace('0X', '0x'), consultar)

    expect(consultar).toHaveBeenCalledTimes(1)

    m.limpiarCacheDeVerificacion()
    await m.verificarEnLearnTg(WALLET, consultar)
    expect(consultar).toHaveBeenCalledTimes(2)
  })

  it('usa LEARNTG_API_URL cuando está definida y :9001 fuera de mainnet', async () => {
    process.env.LEARNTG_AUTHPARTNER_PRIVATE_KEY = LLAVE_SOCIO
    const m = await modulo()
    expect(m.urlDeLearnTg()).toBe('https://learn.tg')

    process.env.NEXT_PUBLIC_NETWORK = 'celoSepolia'
    vi.resetModules()
    expect((await import('@/lib/learnTgPartner')).urlDeLearnTg()).toBe('https://learn.tg:9001')

    process.env.LEARNTG_API_URL = 'https://aprende.test/'
    vi.resetModules()
    expect((await import('@/lib/learnTgPartner')).urlDeLearnTg()).toBe('https://aprende.test')
  })
})
