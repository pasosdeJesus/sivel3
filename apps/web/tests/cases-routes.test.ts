import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { apiDbMocks } from '@pasosdejesus/m/test-utils/kysely-mocks'
import { resetRateLimits } from '@/lib/rateLimit'

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

let datosOsmGET: (request: Request) => Promise<Response>
let casoGET: (
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) => Promise<Response>

const MARKERS_URL = 'http://localhost/api/cases/datos-osm?bbox=-77,2,-76,3&zoom=13'

describe('GET /api/cases/datos-osm', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/cases/datos-osm/route')
    datosOsmGET = mod.GET as unknown as (request: Request) => Promise<Response>
  })

  beforeEach(() => {
    apiDbMocks.resetMocks()
    resetRateLimits()
  })

  it('returns markers with only coordinates when zoomed in', async () => {
    apiDbMocks.mockExecute.mockResolvedValue([
      { caso_id: 1, latitud: '2.4419', longitud: '-76.6063' },
      { caso_id: 2, latitud: null, longitud: null },
    ])

    const res = await datosOsmGET(new Request(MARKERS_URL))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.modo).toBe('marcadores')
    expect(body.total).toBe(1)
    expect(body.respuesta).toEqual({ '1': { latitud: 2.4419, longitud: -76.6063 } })
    expect(body.celdas).toBeUndefined()
    expect(res.headers.get('cache-control')).toContain('s-maxage=300')
    expect(res.headers.get('etag')).toBeTruthy()
  })

  it('aggregates into cells when the map is zoomed out', async () => {
    apiDbMocks.mockExecute.mockResolvedValue([
      { cell_lat: 2.5, cell_lng: -76.5, n: '2' },
      { cell_lat: 3.5, cell_lng: -75.5, n: '1' },
    ])

    const res = await datosOsmGET(new Request('http://localhost/api/cases/datos-osm'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.modo).toBe('celdas')
    expect(body.total).toBe(3)
    expect(body.respuesta).toEqual({})
    expect(body.celdas).toEqual([
      { latitud: 2.5, longitud: -76.5, n: 2 },
      { latitud: 3.5, longitud: -75.5, n: 1 },
    ])
  })

  it('never returns individual markers without a bbox, even at high zoom', async () => {
    apiDbMocks.mockExecute.mockResolvedValue([
      { cell_lat: 2.02, cell_lng: -76.58, n: '4' },
    ])

    const res = await datosOsmGET(
      new Request('http://localhost/api/cases/datos-osm?zoom=13'),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.modo).toBe('celdas')
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
    expect(body.modo).toBe('celdas')
    expect(body.celdas).toEqual([])
  })

  it('answers 304 when the client already has the payload', async () => {
    apiDbMocks.mockExecute.mockResolvedValue([
      { caso_id: 1, latitud: '2.4', longitud: '-76.6' },
    ])

    const first = await datosOsmGET(new Request(MARKERS_URL))
    const etag = first.headers.get('etag')
    expect(etag).toBeTruthy()

    const second = await datosOsmGET(
      new Request(MARKERS_URL, { headers: { 'if-none-match': etag as string } }),
    )

    expect(second.status).toBe(304)
    expect(second.headers.get('etag')).toBe(etag)
  })

  it('rejects a malformed bbox or zoom', async () => {
    const urls = [
      'http://localhost/api/cases/datos-osm?bbox=1,2,3',
      'http://localhost/api/cases/datos-osm?bbox=-70,2,-71,3',
      'http://localhost/api/cases/datos-osm?bbox=-77,2,-76,3&zoom=99',
      'http://localhost/api/cases/datos-osm?bbox=-77,2,-76,3&zoom=abc',
    ]

    for (const url of urls) {
      const res = await datosOsmGET(new Request(url))
      expect(res.status).toBe(400)
    }
    expect(apiDbMocks.mockExecute).not.toHaveBeenCalled()
  })

  it('answers 413 above the row cap', async () => {
    apiDbMocks.mockExecute.mockResolvedValue(
      Array.from({ length: 5001 }, (_, index) => ({
        caso_id: index + 1,
        latitud: '1',
        longitud: '-1',
      })),
    )

    const res = await datosOsmGET(new Request(MARKERS_URL))

    expect(res.status).toBe(413)
    const body = await res.json()
    expect(body.cap).toBe(5000)
  })

  it('answers 429 after the per-IP limit', async () => {
    apiDbMocks.mockExecute.mockResolvedValue([])

    let last: Response | undefined
    for (let index = 0; index < 61; index += 1) {
      last = await datosOsmGET(new Request('http://localhost/api/cases/datos-osm'))
    }

    expect(last?.status).toBe(429)
    expect(last?.headers.get('retry-after')).toBeTruthy()
  })

  it('returns 500 on DB error', async () => {
    apiDbMocks.mockExecute.mockImplementation(() => {
      throw new Error('Connection refused')
    })

    const res = await datosOsmGET(new Request('http://localhost/api/cases/datos-osm'))

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
    resetRateLimits()
  })

  function ctx(id: string) {
    return { params: Promise.resolve({ id }) }
  }

  it('returns the { caso } envelope with the victims count, not their names', async () => {
    apiDbMocks.mockExecuteTakeFirst
      .mockResolvedValueOnce({
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
      .mockResolvedValueOnce({ count: '2' })
    apiDbMocks.mockExecute.mockResolvedValueOnce([{ nombre: 'Ejército Nacional' }])

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
      victimas_count: 2,
      presponsables: ['Ejército Nacional'],
    })
    expect(body.caso.victimas).toBeUndefined()
  })

  it('exposes lugar only for "otro sitio" (tsitio_id == 3)', async () => {
    apiDbMocks.mockExecuteTakeFirst
      .mockResolvedValueOnce({
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
      .mockResolvedValueOnce({ count: '0' })
    apiDbMocks.mockExecute.mockResolvedValueOnce([])

    const req = new Request('http://localhost/api/cases/7')
    const res = await casoGET(req, ctx('7'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.caso.lugar).toBe('Vereda La Esperanza')
    expect(body.caso.victimas_count).toBe(0)
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
