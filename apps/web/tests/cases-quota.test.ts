import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiDbMocks } from '@pasosdejesus/m/test-utils/kysely-mocks'
import { resetRateLimits } from '@/lib/rateLimit'

// El detalle de caso aplica la cuota de R-#17 y, si el pase de billetera existe y la
// cuota se agotó, cobra 4 créditos. Aquí se aíslan cuota, pase y créditos para probar
// las tres respuestas sin base ni cadena.
const control = {
  cuota: { permitido: true, restantes: 3 } as { permitido: boolean; restantes: number },
  wallet: null as string | null,
  gasto: { ok: true, motivo: 'ok', saldo: 8 } as { ok: boolean; motivo: string; saldo: number },
  aprender: false,
}

vi.mock('@/lib/quota', () => ({
  LIMITES: { anonimo: 1, billetera: 16, verificada: 24 },
  periodoDe: () => '2026-11-26',
  sujetoDe: () => ({ sujeto: 'ip:203.0.113.9', tipo: 'anonimo' }),
  consumirVista: async () => control.cuota,
}))
vi.mock('@/lib/walletPass', () => ({ leerPase: () => control.wallet }))
vi.mock('@/lib/learnTgPartner', () => ({ verificarEnLearnTg: async () => control.aprender }))
vi.mock('@/lib/creditos', async () => {
  const real = await vi.importActual<typeof import('@/lib/creditos')>('@/lib/creditos')
  return { ...real, gastar: async () => control.gasto, saldoDe: async () => control.gasto.saldo }
})
vi.mock('@/app/api/cases/[id]/route', async (original) => original())
vi.mock('@/lib/web-analytics', () => ({ recordEvent: () => undefined }))

const CASO = {
  id: 42,
  titulo: 'Caso',
  hechos: 'Hechos',
  fecha: new Date(2024, 0, 15),
  hora: null,
  lugar: null,
  tsitio_id: 1,
  departamento: 'Cauca',
  municipio: 'Popayán',
  centro_poblado: null,
}

async function pedir(id = '42') {
  const { GET } = await import('@/app/api/cases/[id]/route')
  const res = await (GET as any)(
    new Request(`http://localhost/api/cases/${id}`),
    { params: Promise.resolve({ id }) },
  )
  return { res, cuerpo: await res.clone().json() }
}

describe('cuota y créditos en el detalle de caso', () => {
  beforeEach(() => {
    apiDbMocks.resetMocks()
    resetRateLimits()
    control.cuota = { permitido: true, restantes: 3 }
    control.wallet = null
    control.gasto = { ok: true, motivo: 'ok', saldo: 8 }
    apiDbMocks.mockExecuteTakeFirst.mockResolvedValue(CASO)
    apiDbMocks.mockExecuteTakeFirst.mockResolvedValueOnce(CASO).mockResolvedValueOnce({ count: '2' })
    apiDbMocks.mockExecute.mockResolvedValue([{ nombre: 'Ejército Nacional' }])
  })

  it('sirve el caso anónimo dentro de la cuota y anuncia las vistas restantes', async () => {
    const { res, cuerpo } = await pedir()
    expect(res.status).toBe(200)
    expect(cuerpo.caso.id).toBe('42')
    expect(cuerpo.cuota).toEqual({ restantes: 3, creditos: null })
    expect(res.headers.get('X-Cuota-Restante')).toBe('3')
  })

  it('responde 402 al anónimo que agotó su cuota, explicando cómo seguir', async () => {
    control.cuota = { permitido: false, restantes: 0 }
    const { res, cuerpo } = await pedir()
    expect(res.status).toBe(402)
    expect(cuerpo.code).toBe('cuota_detalle')
    expect(cuerpo.limite).toBe(1)
    expect(res.headers.get('X-Cuota-Restante')).toBeNull()
  })

  it('con billetera y créditos cobra 4 y sirve el caso', async () => {
    control.cuota = { permitido: false, restantes: 0 }
    control.wallet = '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C'
    control.gasto = { ok: true, motivo: 'ok', saldo: 8 }
    const { res, cuerpo } = await pedir()
    expect(res.status).toBe(200)
    expect(cuerpo.cuota.creditos).toBe(8)
    expect(res.headers.get('X-Credito-Saldo')).toBe('8')
  })

  it('con billetera sin créditos responde 402 con el saldo', async () => {
    control.cuota = { permitido: false, restantes: 0 }
    control.wallet = '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C'
    control.gasto = { ok: false, motivo: 'sin_saldo', saldo: 2 }
    const { res, cuerpo } = await pedir()
    expect(res.status).toBe(402)
    expect(cuerpo.code).toBe('creditos_insuficientes')
    expect(cuerpo.saldo).toBe(2)
  })
})
