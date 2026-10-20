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

let GET: (request: Request) => Promise<Response>

describe('GET /api/cases/counts', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/cases/counts/route')
    GET = mod.GET as unknown as (request: Request) => Promise<Response>
  })

  beforeEach(() => {
    apiDbMocks.resetMocks()
  })

  it('returns counts with default values when DB is empty', async () => {
    apiDbMocks.mockExecuteTakeFirst.mockResolvedValue(null)
    apiDbMocks.mockSqlExecute.mockResolvedValue({ rows: [{ count: '0' }] })

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
    apiDbMocks.mockExecuteTakeFirst.mockResolvedValue({ count: '250' })
    apiDbMocks.mockSqlExecute.mockResolvedValue({ rows: [{ count: '300' }] })

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
    apiDbMocks.mockExecuteTakeFirst.mockImplementation(() => {
      throw new Error('Connection refused')
    })

    const req = new Request('http://localhost/api/cases/counts')
    const res = await GET(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns integer counts when DB returns bigint', async () => {
    apiDbMocks.mockExecuteTakeFirst.mockResolvedValue({ count: BigInt(999) })
    apiDbMocks.mockSqlExecute.mockResolvedValue({ rows: [{ count: '555' }] })

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
