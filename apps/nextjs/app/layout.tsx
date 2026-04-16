import { redirect } from 'next/navigation';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

export const metadata: Metadata = {
  title: 'SIVEL 3',
  description: 'Information System of Political Violence',
}

const inter = Inter({ subsets: ['latin'] })

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode
  params?: Promise<{ locale: string }>
}>) {

  let lang = 'en';
  if (params) {
    try {
      const { locale } = await params;
      if (locale && ['en', 'es'].includes(locale)) {
        lang = locale;
      }
    } catch (e) {
      // Si no hay params (raíz), usar 'en'
    }
  }
  
  return (
    <html lang={lang}>
      <head>
        <meta name="talentapp:project_verification" content="f6b919387e34e3d13e8d6569e6c9899cedb623bd1d4a901885f2fd4f43e60df63214ab0b2451f93892729bffba84fec96cec9555461a6fb625e4c30f72020cda"/>
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
