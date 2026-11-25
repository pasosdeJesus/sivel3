import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  COOKIE_PASE,
  crearPase,
  DURACION_PASE_S,
  leerPase,
  mensajePase,
  VENTANA_FIRMA_PASE_S,
} from '@/lib/walletPass'
import { decidir, LIMITES, periodoDe, sujetoDe } from '@/lib/quota'

const WALLET = '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C'

function peticionCon(valor?: string): Request {
  return {
    cookies: { get: (nombre: string) => (nombre === COOKIE_PASE && valor ? { value: valor } : undefined) },
  } as unknown as Request
}

describe('pase de cuota de billetera', () => {
  beforeEach(() => {
    process.env.SIVEL3_PASS_SECRET = 'x'.repeat(48)
  })

  afterEach(() => {
    delete process.env.SIVEL3_PASS_SECRET
    delete process.env.SIVEL3_MESSAGES_PRIVATE_KEY
  })

  it('emite y lee un pase válido para la billetera que firmó', () => {
    const pase = crearPase(WALLET)
    expect(pase?.maxAge).toBe(DURACION_PASE_S)
    expect(leerPase(peticionCon(pase!.valor))).toBe(WALLET.toLowerCase())
  })

  it('rechaza un pase manipulado, vencido o ausente', () => {
    const pase = crearPase(WALLET)!.valor
    const [payload] = pase.split('.')
    expect(leerPase(peticionCon(`${payload}.firma-falsa`))).toBeNull()
    expect(leerPase(peticionCon('sin-punto'))).toBeNull()
    expect(leerPase(peticionCon())).toBeNull()

    const vencido = crearPase(WALLET, Date.now() - (DURACION_PASE_S + 60) * 1000)!.valor
    expect(leerPase(peticionCon(vencido))).toBeNull()
  })

  it('sin secreto no emite pase', () => {
    delete process.env.SIVEL3_PASS_SECRET
    expect(crearPase(WALLET)).toBeNull()
  })

  it('el mensaje que firma el navegador ata la billetera y el timestamp', () => {
    expect(mensajePase(WALLET, 1764115200)).toBe(`pase:${WALLET.toLowerCase()}:1764115200`)
    expect(VENTANA_FIRMA_PASE_S).toBe(300)
  })
})

describe('cuota de detalle (R-#17)', () => {
  it('usa 1/día para anónimo y 16/24 por mes para billetera', () => {
    expect(LIMITES).toEqual({ anonimo: 1, billetera: 16, verificada: 24 })
    const dia = new Date('2026-11-26T12:00:00Z')
    expect(periodoDe('anonimo', dia)).toBe('2026-11-26')
    expect(periodoDe('billetera', dia)).toBe('2026-11')
    expect(periodoDe('verificada', dia)).toBe('2026-11')
  })

  it('el sujeto distingue IP de billetera', () => {
    expect(sujetoDe('203.0.113.9', null)).toEqual({ sujeto: 'ip:203.0.113.9', tipo: 'anonimo' })
    expect(sujetoDe('203.0.113.9', WALLET)).toEqual({
      sujeto: `wallet:${WALLET.toLowerCase()}`,
      tipo: 'billetera',
    })
  })

  it('decide sin pasar del límite', () => {
    expect(decidir(0, 1)).toEqual({ permitido: true, restantes: 1 })
    expect(decidir(1, 1)).toEqual({ permitido: false, restantes: 0 })
    expect(decidir(15, 16)).toEqual({ permitido: true, restantes: 1 })
  })
})
