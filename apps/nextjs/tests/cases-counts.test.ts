import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'

// Mock web-analytics (uses server-only modules not available in tests)
vi.mock('@/lib/web-analytics', () => ({ recordEvent: vi.fn() }))

// ============================================================
// Full Kysely chain mock — function-based builder
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

// Mock the config module
vi.mock('@/.config/kysely.config', () => ({
  newKyselyPostgresql: vi.fn(() => makeBuilder()),
}))

// Mock kysely module for sql template tag
vi.mock('kysely', () => ({
  Kysely: vi.fn(() => makeBuilder()),
  sql: mockSql,
}))

let GET: (request: Request) => Promise<Response>

describe('GET /api/cases/counts', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/cases/counts/route')
    GET = mod.GET as unknown as (request: Request) => Promise<Response>
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    mockExecute.mockReset()
    mockExecuteTakeFirst.mockReset()
    mockSqlExecute.mockReset()
  })

  it('returns counts with default values when DB is empty', async () => {
    mockExecuteTakeFirst.mockResolvedValue(null)
    mockSqlExecute.mockResolvedValue({ rows: [{ count: '0' }] })

    const req = new Request('http://localhost/api/cases/counts')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.casos).toBe(0)
    expect(body.victimas).toBe(0)
    expect(body.actos).toBe(0)
    expect(body.victimizaciones).toBe(0)
  })

  it('returns counts from DB', async () => {
    mockExecuteTakeFirst.mockResolvedValue({ count: '250' })
    mockSqlExecute.mockResolvedValue({ rows: [{ count: '300' }] })

    const req = new Request('http://localhost/api/cases/counts')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.casos).toBe(250)
    expect(body.victimas).toBe(250)
    expect(body.actos).toBe(250)
    expect(body.victimizaciones).toBe(300)
  })

  it('returns 500 on DB error', async () => {
    mockExecuteTakeFirst.mockRejectedValue(new Error('Connection refused'))

    const req = new Request('http://localhost/api/cases/counts')
    const res = await GET(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns integer counts when DB returns bigint', async () => {
    mockExecuteTakeFirst.mockResolvedValue({ count: BigInt(999) })
    mockSqlExecute.mockResolvedValue({ rows: [{ count: '555' }] })

    const req = new Request('http://localhost/api/cases/counts')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.casos).toBe(999)
    expect(body.victimas).toBe(999)
    expect(body.actos).toBe(999)
    expect(body.victimizaciones).toBe(555)
  })
})
