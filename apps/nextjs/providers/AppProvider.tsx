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
import { useAutoConnect } from '@/hooks/useAutoConnect'

interface AppProviderProps {
  children: React.ReactNode
  autoConnect?: boolean
  locale?: string
}

// Componente interno que usa useAutoConnect
function AppContent({ children }: { children: React.ReactNode }) {
  useAutoConnect()
  return <>{children}</>
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

// Detectar MiniPay
const isMiniPay = typeof window !== 'undefined' && (window.ethereum as any)?.isMiniPay

// Configuración base de transports
const baseTransports = {
  [celo.id]: http(),
  [celoSepolia.id]: http(),
}

const config = createConfig({
  connectors,
  chains:
    process.env.NEXT_PUBLIC_NETWORK == 'celo'
      ? [celo]
      : [celoSepolia],
  transports: baseTransports,
})

// Para MiniPay, necesitamos interceptar y modificar las transacciones
// Esto se hace a nivel de wallet client, no en http()
if (isMiniPay && typeof window !== 'undefined') {
  const originalEthSendTransaction = window.ethereum?.request
  if (window.ethereum && originalEthSendTransaction) {
    window.ethereum.request = async (request: { method: string; params?: any[] }) => {
      // Forzar legacy transactions eliminando EIP-1559 params
      if (request.method === 'eth_sendTransaction' && request.params) {
        const tx = request.params[0]
        if (tx.maxFeePerGas || tx.maxPriorityFeePerGas) {
          delete tx.maxFeePerGas
          delete tx.maxPriorityFeePerGas
        }
      }
      return originalEthSendTransaction(request)
    }
  }
}

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
          <WalletProvider>
            <AppContent>{children}</AppContent>
          </WalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
