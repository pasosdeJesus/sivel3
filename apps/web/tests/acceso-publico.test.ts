import { describe, expect, it } from 'vitest'

import {
  TOPE_FILAS_ANONIMO,
  TOPE_FILAS_BILLETERA,
  consultaAmpliada,
  requiereAvisoAcceso,
  topeDeFilas,
} from '@/lib/accesoPublico'

const VENTANA = { desde: '2026-01-01', hasta: '2026-06-30', activa: true }

describe('topes de filas del corpus público', () => {
  it('sube el tope con la billetera conectada', () => {
    expect(topeDeFilas(false)).toBe(TOPE_FILAS_ANONIMO)
    expect(topeDeFilas(true)).toBe(TOPE_FILAS_BILLETERA)
    expect(TOPE_FILAS_ANONIMO).toBe(2000)
    expect(TOPE_FILAS_BILLETERA).toBe(10000)
  })

  it('la ventana por omisión no cuenta como consulta ampliada', () => {
    expect(consultaAmpliada({ desde: '2026-01-01', hasta: '2026-06-30' }, VENTANA)).toBe(false)
    expect(consultaAmpliada({ desde: '2026-02-01', hasta: '2026-05-31' }, VENTANA)).toBe(false)
    // Fechas vacías: el servidor vuelve a aplicar la ventana.
    expect(consultaAmpliada({ desde: '', hasta: '' }, VENTANA)).toBe(false)
  })

  it('detecta cuándo el usuario amplía el rango por cualquier extremo', () => {
    expect(consultaAmpliada({ desde: '2025-06-01', hasta: '2026-06-30' }, VENTANA)).toBe(true)
    expect(consultaAmpliada({ desde: '2026-01-01', hasta: '2026-12-31' }, VENTANA)).toBe(true)
    expect(consultaAmpliada({ desde: '2020-01-01', hasta: '2030-12-31' }, VENTANA)).toBe(true)
  })

  it('sin ventana configurada sólo una fecha pedida por el usuario es explícita', () => {
    expect(consultaAmpliada({ desde: '', hasta: '' }, null)).toBe(false)
    expect(consultaAmpliada({ desde: '2026-01-01', hasta: '' }, null)).toBe(true)
    expect(consultaAmpliada({ desde: '', hasta: '2026-06-30' }, { desde: null, hasta: null })).toBe(
      true,
    )
  })
})

describe('aviso de acceso del mapa', () => {
  it('no aparece con la ventana pública por omisión', () => {
    expect(
      requiereAvisoAcceso(403, { desde: '2026-01-01', hasta: '2026-06-30' }, VENTANA, false),
    ).toBe(false)
  })

  it('no aparece si la consulta ampliada no supera el tope', () => {
    expect(
      requiereAvisoAcceso(1800, { desde: '2025-01-01', hasta: '2026-06-30' }, VENTANA, false),
    ).toBe(false)
  })

  it('aparece con filtro ampliado y más de 2.000 casos anónimos', () => {
    expect(
      requiereAvisoAcceso(25_000, { desde: '2025-01-01', hasta: '2026-06-30' }, VENTANA, false),
    ).toBe(true)
  })

  it('con billetera exige superar los 10.000 y no los 2.000', () => {
    const consulta = { desde: '2025-01-01', hasta: '2026-06-30' }
    expect(requiereAvisoAcceso(25_000, consulta, VENTANA, true)).toBe(true)
    expect(requiereAvisoAcceso(5_000, consulta, VENTANA, true)).toBe(false)
  })

  it('ignora conteos vacíos o inválidos', () => {
    const consulta = { desde: '2025-01-01', hasta: '2026-06-30' }
    expect(requiereAvisoAcceso(0, consulta, VENTANA, false)).toBe(false)
    expect(requiereAvisoAcceso(Number.NaN, consulta, VENTANA, false)).toBe(false)
  })
})
