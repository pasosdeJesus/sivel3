'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAccount, useDisconnect, useChainId, useConnect } from 'wagmi'
import { useMiniPay } from '@/hooks/useMiniPay'
import { donate as donateFn } from '@/lib/donate'
import { useToast } from '@pasosdejesus/m/shadcn-components/ui/use-toast'

function recordWalletEvent(eventType: string, wallet?: string | null) {
  if (typeof window === 'undefined') return
  try {
    fetch('/api/web-analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, wallet }),
      keepalive: true,
    })
  } catch (_) {}
}

interface WalletContextType {
  isConnected: boolean
  address: `0x${string}` | null
  effectiveAddress: `0x${string}` | null
  chainId: number | null
  disconnect: () => void
  donate: (regionId: number, amount: string, locale?: string) => Promise<{ txHash: string; learningPoints?: { success: boolean; newScore?: number; message?: string } }>
  isTransacting: boolean
  isProcessing: boolean
  // Nuevas propiedades para MiniPay
  isMiniPay: boolean
  phoneNumber: string | null
  connectMiniPay: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet debe ser usado dentro de un WalletProvider')
  }
  return context
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect, connectors } = useConnect()
  const chainId = useChainId()
  const { isMiniPay, phoneNumber, isConnected: isMiniPayConnected, address: miniPayAddress } = useMiniPay()

  // Sincronizar el estado de MiniPay con el estado de wagmi
  const effectiveIsConnected = isConnected || (isMiniPay && isMiniPayConnected)
  const effectiveAddress = address || miniPayAddress

  const [state, setState] = useState({
    isConnected: false,
    address: null as `0x${string}` | null,
    chainId: null as number | null,
  })

  const connectMiniPay = useCallback(async () => {
    // Detectar si MiniPay está disponible
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No se detectó ninguna wallet. Asegúrate de tener MiniPay instalado.')
    }

    try {
      // Solicitar conexión a MiniPay
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      // Si hay un connector específico para MiniPay, usarlo
      const miniPayConnector = connectors?.find((c: { id: string }) => c.id === 'minipay')
      if (miniPayConnector) {
        await connect({ connector: miniPayConnector })
      }
    } catch (err) {
      console.error('Error conectando a MiniPay:', err)
      throw new Error('No se pudo conectar a MiniPay. Verifica que esté instalado y desbloqueado.')
    }
  }, [connect, connectors])

  useEffect(() => {
    setState({
      isConnected,
      address: address || null,
      chainId: chainId || 0,
    })
  }, [isConnected, address, chainId])

  // Auto-conectar si es MiniPay y no está conectado
  useEffect(() => {
    const autoConnectMiniPay = async () => {
      if (isMiniPay && !isConnected && typeof window !== 'undefined' && window.ethereum) {
        try {
          console.log('MiniPay detectado, conectando automáticamente...')
          await window.ethereum.request({ method: 'eth_requestAccounts' })
        } catch (err) {
          console.warn('No se pudo conectar automáticamente a MiniPay:', err)
        }
      }
    }
    autoConnectMiniPay()
  }, [isMiniPay, isConnected])

  // Estado local para donación en curso
  const [isDonating, setIsDonating] = useState(false)

  // Track wallet connection changes for analytics
  const prevConnected = useRef(effectiveIsConnected)

  useEffect(() => {
    if (prevConnected.current !== effectiveIsConnected) {
      if (effectiveIsConnected && effectiveAddress) {
        recordWalletEvent('connect_wallet', effectiveAddress)
        // Mint Connector SBT
        fetch('/api/credential/mint-connector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: effectiveAddress }),
          keepalive: true,
        }).then(async r => {
          if (!r.ok) return
          const data = await r.json()
          if (data.minted) {
            console.log('Connector SBT minted')
          } else if (data.reason === 'not_verified') {
            console.info('Self-verification on learn.tg required for SBTs')
          }
        }).catch(() => {})
      } else if (!effectiveIsConnected) {
        recordWalletEvent('disconnect_wallet')
      }
      prevConnected.current = effectiveIsConnected
    }
  }, [effectiveIsConnected, effectiveAddress])

  // FUNCIÓN DE DONACIÓN UNIFICADA (usa lib/donate.ts)
  const donate = useCallback(async (regionId: number, amount: string, locale?: string): Promise<{ txHash: string; learningPoints?: any }> => {
    const regionalDonationContractAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`
    const usdtContractAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`

    if (!regionalDonationContractAddress || !usdtContractAddress) {
      throw new Error('Contract addresses not configured')
    }

    if (!effectiveAddress) {
      throw new Error('Wallet not connected')
    }

    setIsDonating(true)
    try {
      return await donateFn({
        regionId,
        amount,
        effectiveAddress,
        usdtContractAddress,
        regionalDonationContractAddress,
      }, locale)
    } finally {
      setIsDonating(false)
    }
  }, [effectiveAddress])

  // isTransacting e isProcessing reflejan solo el estado local de donación
  // (el flujo unificado no usa wagmi writeContract)
  const isTransacting = isDonating
  const isProcessing = isDonating

  const value: WalletContextType = {
    isConnected: effectiveIsConnected,
    address: effectiveAddress || state.address,
    effectiveAddress: effectiveAddress || state.address,
    chainId: state.chainId,
    disconnect,
    donate,
    isTransacting,
    isProcessing,
    isMiniPay,
    phoneNumber,
    connectMiniPay,
  }

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  )
}
