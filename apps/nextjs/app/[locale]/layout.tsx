import { DM_Sans, DM_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'

import '@/app/globals.css'
import ClientLayout from '@/components/ClientLayout'

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
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  // Validar locale en el servidor
  if (!['en', 'es'].includes(locale)) {
    notFound()
  }

  return (
    <html lang={locale}>
      <body className={`${dmSans.variable} ${dmMono.variable} font-sans`}>
        <ClientLayout locale={locale}>{children}</ClientLayout>
      </body>
    </html>
  )
}
