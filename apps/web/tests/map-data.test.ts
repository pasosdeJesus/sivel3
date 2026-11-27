import { describe, expect, it } from 'vitest'

import { casosDeCluster, casosDeMarcador } from '@/lib/mapData'

describe('casos que representa un marcador del mapa', () => {
  it('una celda agregada vale su n y un caso individual vale 1', () => {
    expect(casosDeMarcador({ options: { n: 7 } })).toBe(7)
    expect(casosDeMarcador({ options: {} })).toBe(1)
    expect(casosDeMarcador({})).toBe(1)
  })

  it('ignora n inválidos en vez de sumar NaN', () => {
    expect(casosDeMarcador({ options: { n: Number.NaN } })).toBe(1)
    expect(casosDeMarcador({ options: { n: 0 } })).toBe(1)
    expect(casosDeMarcador({ options: { n: 'no' } })).toBe(1)
  })

  it('el clúster suma los casos, no la cantidad de celdas', () => {
    const celdas = [
      { options: { n: 7 } },
      { options: { n: 14 } },
      { options: { n: 29 } },
    ]
    expect(casosDeCluster(celdas)).toBe(50)
    // Marcadores individuales (sin n): cada uno es un caso.
    expect(casosDeCluster([{}, {}, {}])).toBe(3)
  })
})
