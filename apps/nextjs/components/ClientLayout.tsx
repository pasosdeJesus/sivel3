'use client'

import { ReactNode, useEffect } from 'react'
import { usePathname } from 'next/navigation'

import Footer from './Footer'
import Header from './Header'
import { AppProvider } from '@/providers/AppProvider'
import { DebugConsole } from '@pasosdejesus/m/debug'
import { Toaster } from '@pasosdejesus/m/shadcn-components/ui/toaster'

interface ClientLayoutProps {
  children: ReactNode
  locale: string
}

export default function ClientLayout({ children, locale }: ClientLayoutProps) {
  const pathname = usePathname()

  // Record page view on mount and on navigation (client-side, 1 per real view)
  useEffect(() => {
    fetch('/api/web-analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'pageview', pathname, locale }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname, locale])

  return (
    <AppProvider locale={locale}>
      <div className="bg-gypsum overflow-hidden flex flex-col min-h-screen">
        <Header lang={locale} />
        <main role="main">{children}</main>
        <Footer lang={locale} />
        <DebugConsole />
        <Toaster />
      </div>
    </AppProvider>
  )
}
