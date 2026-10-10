import { describe, it, expect } from 'vitest'
import { newKyselyPostgresql } from '@/.config/kysely.config'

// Regression (REQ/66 §12): `newKyselyPostgresql()` used to create a new
// `pg.Pool` per call and never end it, exhausting Postgres connections under
// load. All callers must share one process-wide pool.
describe('newKyselyPostgresql', () => {
  it('reuses one process-wide pool across calls', () => {
    newKyselyPostgresql()
    const first = (globalThis as any).__sivelPgPool
    newKyselyPostgresql()
    const second = (globalThis as any).__sivelPgPool

    expect(first).toBeDefined()
    expect(second).toBe(first)
  })
})
