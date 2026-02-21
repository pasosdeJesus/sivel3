'use client'

import { DM_Sans, DM_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'

import '@/app/globals.css'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
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

export default function LocaleLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode
  params: { locale: string }
}>) {
  // Validar locale
  if (!['en', 'es'].includes(locale)) {
    notFound()
  }

  return (
    <html lang={locale}>
      <body className={`${dmSans.variable} ${dmMono.variable} font-sans`}>
        <AppProvider locale={locale}>
          <div className="bg-gypsum overflow-hidden flex flex-col min-h-screen">
            <Header lang={locale} />
            <main role="main">{children}</main>
            <Footer lang={locale} />
          </div>
        </AppProvider>
      </body>
    </html>
  )
}
