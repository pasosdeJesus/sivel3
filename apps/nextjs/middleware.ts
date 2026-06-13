import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['en', 'es'];
const defaultLocale = 'en';
const localeCache = new Map<string, string>();

function getLocale(request: NextRequest): string {
  const cacheKey = request.headers.get('accept-language') || '';

  if (localeCache.has(cacheKey)) {
    return localeCache.get(cacheKey)!;
  }

  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages()
    .filter(l => l !== '*')
  const locale = match(languages, locales, defaultLocale)

  localeCache.set(cacheKey, locale);
  return locale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip redirect for API / assets / agents
  if (pathname === '/' ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/agent/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/img/') ||
      pathname.startsWith('/favicon.ico')) {
    return NextResponse.next()
  }

  // Check if path already has locale
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) return NextResponse.next()

  // Redirect adding locale
  let locale: string
  try {
    locale = getLocale(request)
  } catch (err) {
    console.error('Middleware locale detection failed:', err)
    locale = defaultLocale
  }

  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl, { status: 302 })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|img|public|locales).*)'
  ]
};

