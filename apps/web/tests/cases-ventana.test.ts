import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiDbMocks } from '@pasosdejesus/m/test-utils/kysely-mocks'
import { resetRateLimits } from '@/lib/rateLimit'

// La ventana pública (R-#22) impide abrir por detalle un caso que el mapa no muestra.
// La cuota se permite aquí para aislar el efecto de la ventana.
vi.mock('@/lib/quota', () => ({
  LIMITES: { anonimo: 1, billetera: 16, verificada: 24 },
  periodoDe: () => '2026-11-26',
  sujetoDe: () => ({ sujeto: 'ip:203.0.113.9', tipo: 'anonimo' }),
  consumirVista: async () => ({ permitido: true, restantes: 5 }),
}))
vi.mock('@/lib/walletPass', () => ({ leerPase: () => null }))
vi.mock('@/lib/learnTgPartner', () => ({ verificarEnLearnTg: async () => false }))
vi.mock('@/lib/web-analytics', () => ({ recordEvent: () => undefined }))

const CASO = {
  id: 42,
  titulo: 'Caso',
  hechos: 'Hechos',
  fecha: new Date(2024, 4, 15),
  hora: null,
  lugar: null,
  tsitio_id: 1,
  departamento: 'Cauca',
  municipio: 'Popayán',
  centro_poblado: null,
}

async function pedir(id = '42') {
  const { GET } = await import('@/app/api/cases/[id]/route')
  const res = await (GET as any)(new Request(`http://localhost/api/cases/${id}`), {
    params: Promise.resolve({ id }),
  })
  return { res, cuerpo: await res.clone().json() }
}

describe('ventana pública en el detalle de caso', () => {
  beforeEach(() => {
    apiDbMocks.resetMocks()
    resetRateLimits()
    apiDbMocks.mockExecuteTakeFirst
      .mockResolvedValueOnce(CASO)
      .mockResolvedValueOnce({ count: '2' })
    apiDbMocks.mockExecute.mockResolvedValue([{ nombre: 'Ejército Nacional' }])
  })

  afterEach(() => {
    delete process.env.PUBLIC_CASES_FROM
    delete process.env.PUBLIC_CASES_TO
  })

  it('sin ventana configurada sirve el caso aunque sea antiguo', async () => {
    const { res, cuerpo } = await pedir()
    expect(res.status).toBe(200)
    expect(cuerpo.caso.id).toBe('42')
  })

  it('con ventana activa responde 404 fuera_de_ventana y explica el rango', async () => {
    process.env.PUBLIC_CASES_FROM = '2026-01-01'
    process.env.PUBLIC_CASES_TO = '2026-06-30'
    const { res, cuerpo } = await pedir()
    expect(res.status).toBe(404)
    expect(cuerpo.code).toBe('fuera_de_ventana')
    expect(cuerpo.ventana).toEqual({ desde: '2026-01-01', hasta: '2026-06-30' })
  })
})
