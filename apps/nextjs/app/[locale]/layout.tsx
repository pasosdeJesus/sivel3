import { DM_Sans, DM_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { headers, cookies } from 'next/headers'

import '@/app/globals.css'
import ClientLayout from '@/components/ClientLayout'
import { recordEvent } from '@/lib/web-analytics'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
})

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  weight: ['300', '400', '500'],
  subsets: ['latin'],
})

export default async function LocaleLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode, 
  params: { locale: string } 
}) {
  const { locale } = await params;
  // Validar locale en el servidor
  if (!['en', 'es'].includes(locale)) {
    notFound()
  }

  // Record page view (server-side, no client JS needed)
  const h = await headers()
  const pathname = h.get('x-invoke-path') || h.get('next-url') || undefined
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('sid')?.value
  recordEvent({ event_type: 'pageview', session_id: sessionId, pathname, locale })

  return (
    <ClientLayout locale={locale}>{children}</ClientLayout>
  )
}
