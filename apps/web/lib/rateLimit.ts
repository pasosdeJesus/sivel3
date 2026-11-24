// In-memory fixed-window rate limiting for the public read endpoints
// (https://gitlab.com/pasosdeJesus/sivel3/-/issues/69).
//
// sivel.xyz runs a single Next.js process on adJ, so a shared store (Redis) is
// not needed. Two known limits, documented on purpose: a restart clears the
// counters, and several instances would not share them.

import { NextResponse } from 'next/server'

export interface RateLimitOptions {
  /** Name of the surface, so unrelated endpoints do not share a bucket. */
  scope: string
  /** Requests allowed per window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

/** First hop of `x-forwarded-for`, then `x-real-ip`, else `unknown`. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]
    if (first && first.trim()) return first.trim()
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

function sweep(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number }

export function checkRateLimit(
  request: Request,
  { scope, limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now()
  const key = `${scope}:${clientIp(request)}`
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    sweep(now)
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }

  bucket.count += 1
  return { ok: true }
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

/** Test helper: forget every counter. */
export function resetRateLimits(): void {
  buckets.clear()
}
