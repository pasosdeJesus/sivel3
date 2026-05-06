import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'

// Mock web-analytics (uses server-only modules not available in tests)
vi.mock('@/lib/web-analytics', () => ({ recordEvent: vi.fn() }))

// ============================================================
// Full Kysely chain mock — function-based (not Proxy)
// Every chain method returns a new builder object
// ============================================================
const mockExecute = vi.fn()
const mockExecuteTakeFirst = vi.fn()
const mockSqlExecute = vi.fn()

// sql template tag that supports .as() and .execute()
const mockSql = Object.assign(
  (..._args: any[]) => ({
    as: vi.fn().mockReturnValue({}),
    execute: mockSqlExecute,
  }),
  {
    val: vi.fn((v: any) => v),
  }
)

// Chain builder object — all methods return a fresh builder
function makeBuilder(): Record<string, any> {
  return {
    selectFrom: () => makeBuilder(),
    select: () => makeBuilder(),
    selectAll: () => makeBuilder(),
    innerJoin: () => makeBuilder(),
    leftJoin: () => makeBuilder(),
    where: () => makeBuilder(),
    orderBy: () => makeBuilder(),
    limit: () => makeBuilder(),
    groupBy: () => makeBuilder(),
    insertInto: () => makeBuilder(),
    values: () => makeBuilder(),
    updateTable: () => makeBuilder(),
    set: () => makeBuilder(),
    deleteFrom: () => makeBuilder(),
    returningAll: () => makeBuilder(),
    execute: () => mockExecute(),
    executeTakeFirst: () => mockExecuteTakeFirst(),
    executeTakeFirstOrThrow: () => mockExecuteTakeFirst(),
  }
}

function createDbMock() {
  return makeBuilder()
}

// Mock the config module
vi.mock('@/.config/kysely.config', () => ({
  newKyselyPostgresql: vi.fn(() => createDbMock()),
}))

// Mock kysely module for sql template tag
vi.mock('kysely', () => ({
  Kysely: vi.fn(() => createDbMock()),
  sql: mockSql,
}))

let regionsGET: (request: Request) => Promise<Response>
let categoriesGET: (request: Request) => Promise<Response>
let departmentsGET: (request: Request) => Promise<Response>
let allegedPerpetratorsGET: (request: Request) => Promise<Response>

describe('API reference data endpoints', () => {
  beforeAll(async () => {
    const regionsMod = await import('@/app/api/regions/route')
    regionsGET = regionsMod.GET as unknown as (request: Request) => Promise<Response>

    const categoriesMod = await import('@/app/api/categories/route')
    categoriesGET = categoriesMod.GET as unknown as (request: Request) => Promise<Response>

    const departmentsMod = await import('@/app/api/departments/route')
    departmentsGET = departmentsMod.GET as unknown as (request: Request) => Promise<Response>

    const apMod = await import('@/app/api/alleged-perpetrators/route')
    allegedPerpetratorsGET = apMod.GET as unknown as (request: Request) => Promise<Response>
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    mockExecute.mockReset()
    mockExecuteTakeFirst.mockReset()
    mockSqlExecute.mockReset()
  })

  // ---- Regions ----

  describe('GET /api/regions', () => {
    it('returns donation regions in English by default', async () => {
      mockExecute.mockResolvedValue([
        { id: 1, name: 'Colombia' },
        { id: 2, name: 'Israel/Palestine' },
      ])

      // Regions route uses req.nextUrl.searchParams — provide it as a property
      const req = new Request('http://localhost/api/regions?locale=en') as any
      req.nextUrl = new URL('http://localhost/api/regions?locale=en')

      const res = await regionsGET(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(2)
      expect(body[0].name).toBe('Colombia')
    })

    it('returns donation regions in Spanish when locale=es', async () => {
      mockExecute.mockResolvedValue([
        { id: 1, name: 'Colombia' },
        { id: 2, name: 'Israel/Palestina' },
      ])

      const req = new Request('http://localhost/api/regions?locale=es') as any
      req.nextUrl = new URL('http://localhost/api/regions?locale=es')

      const res = await regionsGET(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body[1].name).toBe('Israel/Palestina')
    })

    it('returns 500 on DB error', async () => {
      mockExecute.mockRejectedValue(new Error('Connection lost'))

      const req = new Request('http://localhost/api/regions') as any
      req.nextUrl = new URL('http://localhost/api/regions')

      const res = await regionsGET(req)

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBeDefined()
    })
  })

  // ---- Categories ----

  describe('GET /api/categories', () => {
    it('returns enabled categories ordered by code', async () => {
      mockExecute.mockResolvedValue([
        { id: 1, nombre: 'A 1 - Homicidio' },
        { id: 2, nombre: 'B 2 - Desplazamiento' },
      ])

      const req = new Request('http://localhost/api/categories')
      const res = await categoriesGET(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(2)
      expect(body[0].nombre).toContain('Homicidio')
    })

    it('returns 500 on DB error', async () => {
      mockExecute.mockRejectedValue(new Error('Connection lost'))

      const req = new Request('http://localhost/api/categories')
      const res = await categoriesGET(req)

      expect(res.status).toBe(500)
    })

    it('returns empty array when no categories enabled', async () => {
      mockExecute.mockResolvedValue([])

      const req = new Request('http://localhost/api/categories')
      const res = await categoriesGET(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(0)
    })
  })

  // ---- Departments ----

  describe('GET /api/departments', () => {
    it('returns Colombian departments ordered by name', async () => {
      mockExecute.mockResolvedValue([
        { id: 1, nombre: 'ANTIOQUIA' },
        { id: 2, nombre: 'BOGOTÁ D.C.' },
        { id: 3, nombre: 'CUNDINAMARCA' },
      ])

      const req = new Request('http://localhost/api/departments')
      const res = await departmentsGET(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(3)
      expect(body[0].nombre).toBe('ANTIOQUIA')
    })

    it('returns 500 on DB error', async () => {
      mockExecute.mockRejectedValue(new Error('Connection lost'))

      const req = new Request('http://localhost/api/departments')
      const res = await departmentsGET(req)

      expect(res.status).toBe(500)
    })
  })

  // ---- Alleged Perpetrators ----

  describe('GET /api/alleged-perpetrators', () => {
    it('returns enabled perpetrators ordered by name', async () => {
      mockExecute.mockResolvedValue([
        { id: 1, nombre: 'Paramilitares' },
        { id: 2, nombre: 'Guerrilla' },
      ])

      const req = new Request('http://localhost/api/alleged-perpetrators')
      const res = await allegedPerpetratorsGET(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(2)
      expect(body[0].nombre).toBe('Paramilitares')
    })

    it('returns 500 on DB error', async () => {
      mockExecute.mockRejectedValue(new Error('Connection lost'))

      const req = new Request('http://localhost/api/alleged-perpetrators')
      const res = await allegedPerpetratorsGET(req)

      expect(res.status).toBe(500)
    })
  })
})
