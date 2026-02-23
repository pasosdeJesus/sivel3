'use client'

interface ExtendedWindow extends Window {
  ethereum?: {
    selectedAddress?: string
  }
}
import { AppProps } from 'next/app'
import {
  connectorsForWallets,
  lightTheme,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import {
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { celo, celoSepolia } from 'wagmi/chains'

import { WalletProvider } from '@/contexts/WalletContext'

interface AppProviderProps {
  children: React.ReactNode
  autoConnect?: boolean
  locale?: string
}

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [okxWallet, walletConnectWallet, metaMaskWallet, injectedWallet],
    },
  ],
  {
    appName: process.env.NEXT_PUBLIC_APPNAME ?? 'SIVEL 3',
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '0123',
  },
)

const config = createConfig({
  connectors,
  chains:
    process.env.NEXT_PUBLIC_NETWORK == 'celo'
      ? [celo]
      : [celoSepolia],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
  },
})

const queryClient = new QueryClient()

// Taking ideas of
// https://github.com/0xRowdy/nextauth-siwe-route-handlers/blob/main/src/app/providers/web3-providers.tsx
export function AppProvider({
  children,
  autoConnect,
  locale = 'en',
}: AppProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={lightTheme()}>
          <WalletProvider>{children}</WalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
