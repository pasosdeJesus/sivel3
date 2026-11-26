import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { fueraDeVentana, textoDeVentana, ventanaPublica } from '@/lib/ventanaPublica'

describe('ventana pública del corpus (R-#22)', () => {
  beforeEach(() => {
    delete process.env.PUBLIC_CASES_FROM
    delete process.env.PUBLIC_CASES_TO
  })
  afterEach(() => {
    delete process.env.PUBLIC_CASES_FROM
    delete process.env.PUBLIC_CASES_TO
  })

  it('sin variables no hay ventana', () => {
    expect(ventanaPublica()).toEqual({ desde: null, hasta: null, activa: false })
    expect(fueraDeVentana('2024-01-01')).toBe(false)
    expect(textoDeVentana()).toBeNull()
  })

  it('acepta fechas ISO e ignora valores inválidos', () => {
    process.env.PUBLIC_CASES_FROM = '2026-01-01'
    process.env.PUBLIC_CASES_TO = '2026-06-30'
    expect(ventanaPublica()).toEqual({ desde: '2026-01-01', hasta: '2026-06-30', activa: true })

    process.env.PUBLIC_CASES_FROM = 'ene-2026'
    expect(ventanaPublica()).toEqual({ desde: null, hasta: '2026-06-30', activa: true })
  })

  it('ignora un rango invertido en vez de devolver cero casos', () => {
    process.env.PUBLIC_CASES_FROM = '2026-06-30'
    process.env.PUBLIC_CASES_TO = '2026-01-01'
    expect(ventanaPublica().activa).toBe(false)
  })

  it('decide si una fecha queda fuera, en los dos extremos', () => {
    process.env.PUBLIC_CASES_FROM = '2026-01-01'
    process.env.PUBLIC_CASES_TO = '2026-06-30'
    expect(fueraDeVentana('2025-12-31')).toBe(true)
    expect(fueraDeVentana('2026-01-01')).toBe(false)
    expect(fueraDeVentana('2026-06-30')).toBe(false)
    expect(fueraDeVentana('2026-07-01')).toBe(true)
    // Sin fecha no se bloquea: el detalle ya decide con sus datos.
    expect(fueraDeVentana(undefined)).toBe(false)
  })

  it('describe la ventana para la UI en español e inglés', () => {
    process.env.PUBLIC_CASES_FROM = '2026-01-01'
    process.env.PUBLIC_CASES_TO = '2026-06-30'
    const es = textoDeVentana(ventanaPublica(), 'es')
    const en = textoDeVentana(ventanaPublica(), 'en')
    expect(es).toContain('2026')
    expect(es).toContain('–')
    expect(en).toContain('2026')
    expect(en).toContain('–')
  })
})
