// lib/web-analytics.ts
// Server-side analytics event recording.
//
// Thin wrapper around @pasosdejesus/m/wba that enriches events with
// request headers before recording.
//
// For page views, call recordEvent from server components (layout.tsx).
// For client-only events (wallet connect), POST to /api/web-analytics/event.
// For server-side events (donation completed), call recordEvent directly.

import 'server-only'
import { headers } from 'next/headers'
import { newKyselyPostgresql } from '@/.config/kysely.config'
import { recordEvent as wbaRecordEvent } from '@pasosdejesus/m/wba'

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
  const h = await headers()
  const referrer = h.get('referer') || h.get('referrer') || undefined
  const userAgent = h.get('user-agent') || undefined
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    undefined

  await wbaRecordEvent(newKyselyPostgresql() as any, 'web_event', {
    ...event,
    referrer,
    user_agent: userAgent,
    ip,
  })
}
