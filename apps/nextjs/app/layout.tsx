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
  params: Promise<{ locale: string }>
}>) {

  const { locale } = await params
  const lang = typeof locale != "undefined" && 
    ["en", "es"].includes(locale) ? locale : "en"
  return (
    <html lang={lang}>
    <body className={inter.className}>
      {children}
    </body>
    </html>
  )
}
