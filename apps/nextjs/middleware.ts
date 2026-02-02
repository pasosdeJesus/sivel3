import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['en', 'es']; // inglés primero
const defaultLocale = 'en';
const localeCache = new Map<string, string>();

function getLocale(request: NextRequest): string {
  const cacheKey = request.headers.get('accept-language') || '';

  if (localeCache.has(cacheKey)) {
    return localeCache.get(cacheKey)!;
  }

  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  const locale = match(languages, locales, defaultLocale);

  localeCache.set(cacheKey, locale);
  return locale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Verificar si ya tiene locale
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  
  if (pathnameHasLocale) return NextResponse.next()
  
  // Redirigir agregando locale
  const locale = getLocale(request)
  // IMPORTANTE: Asegurar que la redirección no cree bucles
  // Si la ruta ya comienza con /api o /_next, no redirigir
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }
  request.nextUrl.pathname = `/${locale}${pathname}`
  
  return NextResponse.redirect(request.nextUrl, { status: 302 })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|locales).*)'
  ]
};

