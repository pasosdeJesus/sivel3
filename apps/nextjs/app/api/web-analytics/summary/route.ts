import { makeSummaryHandler } from '@pasosdejesus/m/wba/routes'
import { newKyselyPostgresql } from '@/.config/kysely.config'

/**
 * GET /api/web-analytics/summary
 *
 * Returns aggregated web + on-chain analytics for the dashboard.
 */
export const GET = makeSummaryHandler(
  () => newKyselyPostgresql() as any,
  { transactionTable: 'transaction' },
)
