'use client'

import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import { notFound, useParams } from 'next/navigation'
import { I18nextProvider } from 'react-i18next'
import { useEffect } from 'react'

import '@/app/globals.css'
import Layout from '@/components/Layout'
import i18n from '@/i18n'
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
  params: { locale }
}: Readonly<{
  children: React.ReactNode
  params: { locale: string }
}>) {

  return (
    <html
      lang={locale}
      className={`${dmSans.variable} ${dmMono.variable} antialiased`}
    >
      <body>
        <I18nextProvider i18n={i18n}>
          <LanguageSync locale={locale} />
          <AppProvider messages={messages} locale={locale}>
            <Layout>{children}</Layout>
          </AppProvider>
        </I18nextProvider>
      </body>
    </html>
  )
}

// Componente auxiliar para sincronizar el idioma de i18n con la URL
function LanguageSync({ locale }: { locale: string }) {
   const params = useParams(); // Obtiene los parámetros de la ruta
   const currentLocale = params.locale as string;
   useEffect(() => {
     i18n.changeLanguage(currentLocale);
   }, [currentLocale]);
   return null;
}
