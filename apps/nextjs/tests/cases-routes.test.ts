import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { apiDbMocks } from '@pasosdejesus/m/test-utils/kysely-mocks'

// Mock web-analytics (uses server-only modules not available in tests)
vi.mock('@/lib/web-analytics', () => ({ recordEvent: vi.fn() }))

// A5: the Kysely mock comes from `@pasosdejesus/m/test-utils` (the global
// `tests/setup.ts` already mocks `kysely` with this same singleton). The factory
// is async because `vi.mock` is hoisted and cannot reference the import binding
// (see the m test-utils README §8).
vi.mock('@/.config/kysely.config', async () => {
  const { apiDbMocks } = await import('@pasosdejesus/m/test-utils/kysely-mocks')
  return { newKyselyPostgresql: () => new apiDbMocks.MockKysely() }
})

// `m`'s `mockEb` hands the bare expression builder to the `eb('col','in',cb)`
// callback, which lacks `selectFrom` (real Kysely's `eb` has it). sivel3's
// `datos-osm` route builds subqueries there, so extend the shared `eb` with a
// chainable subquery builder (reported to `m`; remove once it is covered).
function wireEbSubqueries() {
  const eb = apiDbMocks.mockEb as any
  eb.mockImplementation((lhs: any, op: any, rhs: any) => {
    const target = Object.assign(eb, { selectFrom: () => new apiDbMocks.MockKysely() })
    if (typeof op === 'function') op(target)
    else if (typeof rhs === 'function') rhs(target)
    return { __expr: true, lhs, op, rhs }
  })
}

let datosOsmGET: (request: Request) => Promise<Response>
let casoGET: (
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) => Promise<Response>

describe('GET /api/cases/datos-osm', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/cases/datos-osm/route')
    datosOsmGET = mod.GET as unknown as (request: Request) => Promise<Response>
  })

  beforeEach(() => {
    apiDbMocks.resetMocks()
    wireEbSubqueries()
  })

  it('returns the { respuesta } envelope with mapped markers', async () => {
    apiDbMocks.mockExecute.mockResolvedValue([
      {
        caso_id: 1,
        latitud: 2.4419,
        longitud: -76.6063,
        departamento: 'Cauca',
        municipio: 'Popayán',
        fecha: new Date(2024, 0, 15),
      },
      {
        caso_id: 2,
        latitud: null,
        longitud: null,
        departamento: null,
        municipio: null,
        fecha: '2023-12-31',
      },
    ])

    const req = new Request('http://localhost/api/cases/datos-osm')
    const res = await datosOsmGET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.respuesta).toEqual({
      '1': {
        latitud: '2.4419',
        longitud: '-76.6063',
        departamento: 'Cauca',
        municipio: 'Popayán',
        fecha: '2024-01-15',
      },
      '2': {
        latitud: '',
        longitud: '',
        departamento: '',
        municipio: '',
        fecha: '2023-12-31',
      },
    })
  })

  it('returns an empty respuesta when there are no markers', async () => {
    apiDbMocks.mockExecute.mockResolvedValue([])

    const req = new Request('http://localhost/api/cases/datos-osm')
    const res = await datosOsmGET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.respuesta).toEqual({})
  })

  it('accepts every filter without error', async () => {
    apiDbMocks.mockExecute.mockResolvedValue([])

    const params = new URLSearchParams({
      'filtro[fechaini]': '2024-01-01',
      'filtro[fechafin]': '2024-12-31',
      'filtro[departamento_id]': '7',
      'filtro[presponsable_id]': '3',
      'filtro[categoria_id]': '12',
    })
    const req = new Request(`http://localhost/api/cases/datos-osm?${params}`)
    const res = await datosOsmGET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.respuesta).toEqual({})
  })

  it('returns 500 on DB error', async () => {
    apiDbMocks.mockExecute.mockImplementation(() => {
      throw new Error('Connection refused')
    })

    const req = new Request('http://localhost/api/cases/datos-osm')
    const res = await datosOsmGET(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})

describe('GET /api/cases/[id]', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/cases/[id]/route')
    casoGET = mod.GET as unknown as (
      request: Request,
      ctx: { params: Promise<{ id: string }> },
    ) => Promise<Response>
  })

  beforeEach(() => {
    apiDbMocks.resetMocks()
  })

  function ctx(id: string) {
    return { params: Promise.resolve({ id }) }
  }

  it('returns the { caso } envelope with victims and perpetrators', async () => {
    apiDbMocks.mockExecuteTakeFirst.mockResolvedValue({
      id: 42,
      titulo: 'Masacre de X',
      hechos: 'Descripción de los hechos',
      fecha: new Date(2024, 0, 15),
      hora: '14:30',
      lugar: null,
      tsitio_id: 1,
      departamento: 'Cauca',
      municipio: 'Popayán',
      centro_poblado: 'El Tambo',
    })
    apiDbMocks.mockExecute
      .mockResolvedValueOnce([
        { nombres: 'Ana', apellidos: 'Pérez' },
        { nombres: 'Luis', apellidos: 'Gómez' },
      ])
      .mockResolvedValueOnce([{ nombre: 'Ejército Nacional' }])

    const req = new Request('http://localhost/api/cases/42')
    const res = await casoGET(req, ctx('42'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.caso).toEqual({
      id: '42',
      titulo: 'Masacre de X',
      hechos: 'Descripción de los hechos',
      fecha: '2024-01-15',
      hora: '14:30',
      departamento: 'Cauca',
      municipio: 'Popayán',
      centro_poblado: 'El Tambo',
      victimas: ['Ana Pérez', 'Luis Gómez'],
      presponsables: ['Ejército Nacional'],
    })
  })

  it('exposes lugar only for "otro sitio" (tsitio_id == 3)', async () => {
    apiDbMocks.mockExecuteTakeFirst.mockResolvedValue({
      id: 7,
      titulo: 'Caso',
      hechos: 'Hechos',
      fecha: '2024-02-01',
      hora: null,
      lugar: 'Vereda La Esperanza',
      tsitio_id: 3,
      departamento: null,
      municipio: null,
      centro_poblado: null,
    })
    apiDbMocks.mockExecute.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    const req = new Request('http://localhost/api/cases/7')
    const res = await casoGET(req, ctx('7'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.caso.lugar).toBe('Vereda La Esperanza')
    expect(body.caso.victimas).toEqual([])
    expect(body.caso.presponsables).toEqual([])
  })

  it('returns 404 when the case does not exist', async () => {
    apiDbMocks.mockExecuteTakeFirst.mockResolvedValue(undefined)

    const req = new Request('http://localhost/api/cases/999')
    const res = await casoGET(req, ctx('999'))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 404 for a non-numeric id', async () => {
    const req = new Request('http://localhost/api/cases/abc')
    const res = await casoGET(req, ctx('abc'))

    expect(res.status).toBe(404)
    expect(apiDbMocks.mockExecuteTakeFirst).not.toHaveBeenCalled()
  })

  it('returns 500 on DB error', async () => {
    apiDbMocks.mockExecuteTakeFirst.mockImplementation(() => {
      throw new Error('Connection refused')
    })

    const req = new Request('http://localhost/api/cases/1')
    const res = await casoGET(req, ctx('1'))

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})
