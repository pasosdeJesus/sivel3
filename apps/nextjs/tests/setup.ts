// Shared test setup (REQ/66 A5): install the global mocks published by
// `@pasosdejesus/m/test-utils` so the unit suite stops hand-rolling builders.
//
// `vi.mock()` is hoisted only in the file vitest transforms, so it MUST live at
// module scope here (not inside `setupMocks()`); see the m test-utils README §8.
// The factory uses a dynamic import (async) to avoid the hoisting/TDZ problem of
// referencing an imported binding. Test files may still override this per file.
import { vi } from 'vitest'

vi.mock('kysely', async () => {
  const { apiDbMocks } = await import('@pasosdejesus/m/test-utils/kysely-mocks')
  return {
    Kysely: apiDbMocks.MockKysely,
    PostgresDialect: vi.fn(),
    sql: apiDbMocks.mockSql,
  }
})
