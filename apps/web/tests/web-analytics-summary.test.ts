import { beforeEach, describe, expect, it, vi } from 'vitest'

// The summary route must not end the process-wide pg pool. It used to call
// `db.destroy()` in a `finally`, which ended the shared pool and made every
// later API route fail with "Cannot use a pool after calling end on the pool".
const mocks = vi.hoisted(() => {
  const destroy = vi.fn()
  const db: any = {
    destroy,
    selectFrom: () => db,
    select: () => db,
    where: () => db,
    groupBy: () => db,
    orderBy: () => db,
    execute: vi.fn(async () => []),
  }
  return { db, destroy }
})

vi.mock('@/.config/kysely.config', () => ({
  newKyselyPostgresql: () => mocks.db,
}))

vi.mock('@pasosdejesus/m/wba/routes', () => ({
  makeSummaryHandler: () => async () =>
    new Response(JSON.stringify({ onChain: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
}))

vi.mock('kysely', () => {
  const sql: any = () => ({
    as: () => ({}),
    execute: async () => ({ rows: [] }),
  })
  sql.raw = sql
  sql.ref = sql
  sql.val = (v: unknown) => v
  return { sql }
})

describe('GET /api/web-analytics/summary', () => {
  beforeEach(() => {
    mocks.destroy.mockClear()
    mocks.db.execute.mockClear()
  })

  it('does not end the shared pg pool', async () => {
    const { GET } = await import('@/app/api/web-analytics/summary/route')

    const res = await GET(
      new Request('http://localhost/api/web-analytics/summary') as any,
    )

    expect(res.status).toBe(200)
    expect(mocks.destroy).not.toHaveBeenCalled()
  })
})
