
'use client'

import { ReactNode, useEffect } from 'react'
import { usePathname } from 'next/navigation';

import Footer from './Footer'
import Header from './Header'
import { AppProvider } from '@/providers/AppProvider'

interface ClientLayoutProps {
  children: ReactNode
  locale: string
}

export default function ClientLayout({ children, locale }: ClientLayoutProps) {
  const pathname = usePathname();

  useEffect(() => {
    const sendVisitEvent = async () => {
      try {
        await fetch('/api/userevent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'visit', path: pathname }),
        });
      } catch (error) {
        console.error('Error sending visit event:', error);
      }
    };

    sendVisitEvent();
  }, [pathname]);

  return (
    <AppProvider locale={locale}>
      <div className="bg-gypsum overflow-hidden flex flex-col min-h-screen">
        <Header lang={locale} />
        <main role="main">{children}</main>
        <Footer lang={locale} />
      </div>
    </AppProvider>
  )
}
