import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'

// Mock web-analytics (uses server-only modules not available in tests)
vi.mock('@/lib/web-analytics', () => ({ recordEvent: vi.fn() }))

// Kysely chain mock
const mockExecute = vi.fn()
const mockExecuteTakeFirst = vi.fn()

const mockSql = vi.fn(() => ({
  as: vi.fn().mockReturnValue({}),
  execute: vi.fn(),
  val: vi.fn((v: any) => v),
}))

function makeBuilder(): Record<string, any> {
  return {
    selectFrom: () => makeBuilder(),
    select: () => makeBuilder(),
    selectAll: () => makeBuilder(),
    innerJoin: () => makeBuilder(),
    leftJoin: () => makeBuilder(),
    where: () => makeBuilder(),
    $if: (cond: boolean, cb: (q: any) => any) => cond ? cb(makeBuilder()) : makeBuilder(),
    orderBy: () => makeBuilder(),
    limit: () => makeBuilder(),
    groupBy: () => makeBuilder(),
    insertInto: () => makeBuilder(),
    values: () => makeBuilder(),
    updateTable: () => makeBuilder(),
    set: () => makeBuilder(),
    deleteFrom: () => makeBuilder(),
    execute: () => mockExecute(),
    executeTakeFirst: () => mockExecuteTakeFirst(),
    executeTakeFirstOrThrow: () => mockExecuteTakeFirst(),
  }
}

vi.mock('@/.config/kysely.config', () => ({
  newKyselyPostgresql: vi.fn(() => makeBuilder()),
}))

vi.mock('kysely', () => ({
  Kysely: vi.fn(() => makeBuilder()),
  PostgresDialect: vi.fn(),
  sql: mockSql,
}))

let geocodeGET: (request: Request) => Promise<Response>

describe('GET /api/geocode', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/geocode/route')
    geocodeGET = mod.GET as unknown as (request: Request) => Promise<Response>
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    mockExecute.mockReset()
    mockExecuteTakeFirst.mockReset()
  })

  it('returns municipality coordinates', async () => {
    mockExecuteTakeFirst.mockResolvedValue({
      id: 1,
      municipio: 'PUERTO ASÍS',
      departamento: 'PUTUMAYO',
      latitud: 0.51,
      longitud: -76.51,
    })

    const req = new Request('http://localhost/api/geocode?municipio=Puerto+As%C3%ADs&departamento=Putumayo')
    const res = await geocodeGET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.municipio).toBe('PUERTO ASÍS')
    expect(body.latitud).toBe(0.51)
    expect(body.longitud).toBe(-76.51)
  })

  it('falls back to department when municipality has no coordinates', async () => {
    // First call (municipality) returns null
    mockExecuteTakeFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 8,
        nombre: 'PUTUMAYO',
        latitud: 1.15,
        longitud: -76.6,
      })

    const req = new Request('http://localhost/api/geocode?municipio=Puerto+As%C3%ADs&departamento=Putumayo')
    const res = await geocodeGET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.departamento).toBe('PUTUMAYO')
    expect(body.latitud).toBe(1.15)
  })

  it('returns 400 when no params provided', async () => {
    const req = new Request('http://localhost/api/geocode')
    const res = await geocodeGET(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 404 when no coordinates found', async () => {
    mockExecuteTakeFirst
      .mockResolvedValueOnce(null)  // municipality
      .mockResolvedValueOnce(null)  // department

    const req = new Request('http://localhost/api/geocode?municipio=Nowhere&departamento=Nowhere')
    const res = await geocodeGET(req)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('No coordinates found')
  })

  it('returns 500 on DB error', async () => {
    mockExecuteTakeFirst.mockRejectedValue(new Error('Connection lost'))

    const req = new Request('http://localhost/api/geocode?municipio=Puerto+As%C3%ADs')
    const res = await geocodeGET(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})
