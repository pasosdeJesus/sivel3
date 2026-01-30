import { redirect } from 'next/navigation';
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SIVEL 3',
  description: 'Information System of Political Violence',
}

// Redirigir siempre a /en/
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  redirect('/en');
}
