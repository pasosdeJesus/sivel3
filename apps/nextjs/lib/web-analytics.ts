// lib/web-analytics.ts
// Server-side analytics event recording.
//
// For page views, call recordEvent from server components (layout.tsx).
// For client-only events (wallet connect), POST to /api/web-analytics/event.
// For server-side events (donation completed), call recordEvent directly.

import 'server-only'
import { headers } from 'next/headers'
import { newKyselyPostgresql } from '@/.config/kysely.config'

export interface WebEvent {
  session_id?: string
  event_type: string
  pathname?: string
  locale?: string
  wallet?: string
  metadata?: Record<string, unknown>
}

/**
 * Record a web analytics event.
 *
 * Works in server components and API routes. Automatically captures
 * referrer, user-agent, and IP from the request headers.
 *
 * For client-only events use POST /api/web-analytics/event instead.
 */
export async function recordEvent(event: WebEvent): Promise<void> {
  // Skip if ?no-track=1 is present
  // (checked by caller, but double-check for server-only callers)

  const h = await headers()
  const referrer = h.get('referer') || h.get('referrer') || undefined
  const userAgent = h.get('user-agent') || undefined
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    undefined

  try {
    const db = newKyselyPostgresql()
    await db
      .insertInto('web_event')
      .values({
        session_id: event.session_id || null,
        event_type: event.event_type,
        pathname: event.pathname || null,
        locale: event.locale || null,
        referrer: referrer || null,
        user_agent: userAgent || null,
        ip: ip || null,
        wallet: event.wallet || null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      })
      .execute()
  } catch (error) {
    // Non-critical: never fail the page or action due to analytics
    console.error('[analytics] Failed to record event:', error)
  }
}
