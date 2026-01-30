import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

import '@/app/globals.css'
import Layout from '@/components/Layout'
import { AppProvider } from '@/providers/AppProvider'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
})

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  weight: ['300', '400', '500'],
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'SIVEL 3',
  description: 'Information System of Political Violence',
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode
  params: { locale: string }
}>) {

  const messages = await getMessages({ locale });

  return (
    <html
      lang={locale}
      className={`${dmSans.variable} ${dmMono.variable} antialiased`}
    >
      <body>
        <AppProvider messages={messages} locale={locale}>
          <Layout>{children}</Layout>
        </AppProvider>
      </body>
    </html>
  )
}

// Generar rutas estáticas
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
