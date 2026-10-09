'use client'

import { useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureInAppWallet } from '@pasosdejesus/m/wallet/next'
import { WalletProvider } from '@/contexts/WalletContext'

// sivel3 wallet storage namespaces. They are the identity of the stored funds:
// changing them makes existing wallets unreadable (IndexedDB name, destinations
// prefix, passkey RP name).
configureInAppWallet({
  dbName: 'sivel3-wallet',
  destinationsPrefix: 'sivel3-wallet',
  rpName: 'sivel.xyz',
})

interface AppProviderProps {
  children: React.ReactNode
  locale?: string
}

// Taking ideas of
// https://github.com/0xRowdy/nextauth-siwe-route-handlers/blob/main/src/app/providers/web3-providers.tsx
export function AppProvider({ children }: AppProviderProps) {
  const queryClient = useMemo(() => new QueryClient(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>{children}</WalletProvider>
    </QueryClientProvider>
  )
}
