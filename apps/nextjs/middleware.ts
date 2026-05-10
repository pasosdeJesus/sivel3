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

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages()
    .filter(l => l !== '*')  // negotiator 1.0.0 devuelve ['*'] para headers vacíos
  const locale = match(languages, locales, defaultLocale)

  localeCache.set(cacheKey, locale);
  return locale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // EXCLUIR rutas de API y assets de Next.js (inmediatamente, antes de cualquier lógica)
  if (pathname === '/' || 
      pathname.startsWith('/api/') || 
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon.ico')) {
    return NextResponse.next()
  }
  
  // Verificar si ya tiene locale
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  
  if (pathnameHasLocale) return NextResponse.next()
  
  // Redirigir agregando locale
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
    '/((?!_next/static|_next/image|favicon.ico|public|locales).*)'
  ]
};

