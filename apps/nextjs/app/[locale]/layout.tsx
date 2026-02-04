'use client'

import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import { notFound, useParams } from 'next/navigation'
import { I18nextProvider } from 'react-i18next'
import { use, useEffect } from 'react'

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
  params
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {

  const { locale } = use(params)

  // Validar locale antes de renderizar
  if (!['en', 'es'].includes(locale)) {
    notFound()
  }
  
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageSync locale={locale} />
      <AppProvider locale={locale}>
        <Layout>{children}</Layout>
      </AppProvider>
    </I18nextProvider>
  )
}

// Componente auxiliar para sincronizar el idioma de i18n con la URL
function LanguageSync({ locale }: { locale: string }) {
   useEffect(() => {
     i18n.changeLanguage(locale);
   }, [locale]);
   return null;
}
