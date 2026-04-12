'use client'

import { ReactNode } from 'react'

import Footer from './Footer'
import Header from './Header'
import { AppProvider } from '@/providers/AppProvider'
import { MiniPayDebugger } from './MiniPayDebugger'

interface ClientLayoutProps {
  children: ReactNode
  locale: string
}

export default function ClientLayout({ children, locale }: ClientLayoutProps) {
  return (
    <AppProvider locale={locale}>
      <div className="bg-gypsum overflow-hidden flex flex-col min-h-screen">
        <Header lang={locale} />
        <main role="main">{children}</main>
        <Footer lang={locale} />
        <MiniPayDebugger />
      </div>
    </AppProvider>
  )
}
