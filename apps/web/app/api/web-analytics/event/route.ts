import { makeEventHandler } from '@pasosdejesus/m/wba/routes'
import { newKyselyPostgresql } from '@/.config/kysely.config'

/**
 * POST /api/web-analytics/event
 *
 * Records client-side analytics events (wallet connect/disconnect,
 * donation start, donation failure) that can only be observed
 * in the browser.
 *
 * Body: { event_type, wallet?, metadata?, session_id? }
 */
export const POST = makeEventHandler(
  () => newKyselyPostgresql() as any,
  'web_event',
)
