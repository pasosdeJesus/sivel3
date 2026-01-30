import { redirect } from 'next/navigation';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

export const metadata: Metadata = {
  title: 'SIVEL 3',
  description: 'Information System of Political Violence',
}

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
    <body className={inter.className}>
      {children}
    </body>
    </html>
  )
}
