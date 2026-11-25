import { describe, expect, it } from 'vitest'

import { alertaPublica, resumenAlerta } from '@/lib/alertsPublicas'

const FILA = {
  id: 7,
  json_data: {
    titulo: 'Caso X',
    fecha: '2026-11-01',
    departamento: 'Cauca',
    municipio: 'Popayán',
    hechos: 'Texto de los hechos',
    relatos: [{ titulo: 'Caso X' }],
  },
  source_urls: ['https://ejemplo.test/nota'],
  source_summary: 'Resumen de la fuente',
  published_at: '2026-11-26T12:00:00.000Z',
  // Campos internos que NO deben salir aunque la fila los traiga.
  citizen_notes: 'notas del ciudadano',
  buyer_wallet: '0x1111111111111111111111111111111111111111',
  publisher_wallet: '0x2222222222222222222222222222222222222222',
  score: 4,
  event_hash: '0xabc',
} as any

describe('proyección pública de una alerta', () => {
  it('el resumen no incluye datos del mercado ni personales', () => {
    const resumen = resumenAlerta(FILA)
    expect(resumen).toEqual({
      id: 7,
      titulo: 'Caso X',
      fecha: '2026-11-01',
      departamento: 'Cauca',
      municipio: 'Popayán',
      fuentes: 1,
      publicada: '2026-11-26T12:00:00.000Z',
    })
    for (const prohibido of ['citizen_notes', 'buyer_wallet', 'publisher_wallet', 'score', 'event_hash']) {
      expect(JSON.stringify(resumen)).not.toContain(prohibido)
    }
  })

  it('el detalle publica el caso y la fuente, nunca las notas del ciudadano', () => {
    const alerta = alertaPublica(FILA)
    expect(alerta.hechos).toBe('Texto de los hechos')
    expect(alerta.relatos).toEqual([{ titulo: 'Caso X' }])
    expect(alerta.resumen_fuente).toBe('Resumen de la fuente')
    expect(JSON.stringify(alerta)).not.toContain('notas del ciudadano')
    expect(JSON.stringify(alerta)).not.toContain('0x1111')
    expect(JSON.stringify(alerta)).not.toContain('0x2222')
  })

  it('tolera filas incompletas o con json_data inesperado', () => {
    expect(resumenAlerta({ id: 1 }).titulo).toBe('')
    expect(alertaPublica({ id: 2, json_data: 'texto' }).relatos).toEqual([])
    expect(resumenAlerta({ id: 3, source_urls: '{"no": "lista"}' }).fuentes).toBe(0)
  })
})
