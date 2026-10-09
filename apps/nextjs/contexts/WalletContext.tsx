'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo, useSyncExternalStore } from 'react'
import { useInAppWallet } from '@pasosdejesus/m/wallet/next'
import {
  subscribeExternalProvider,
  getExternalProviderSnapshot,
  type Eip1193Provider,
} from '@pasosdejesus/m/wallet'
import { donate as donateFn } from '@/lib/donate'
import { useToast } from '@pasosdejesus/m/shadcn-components/ui/use-toast'
import { useTranslation } from '@/hooks/useTranslation'

const sbtToastT = {
  en: { sbtTitle: '🎖️ SBT Obtained!' },
  es: { sbtTitle: '🎖️ ¡SBT Obtenido!' },
}

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
  /** Effective EIP-1193 provider (in-app when unlocked, else external). */
  provider: Eip1193Provider | null
  isInApp: boolean
  /** An external wallet is announced (EIP-6963) or present via `window.ethereum`. */
  externalAvailable: boolean
  disconnect: () => void
  donate: (regionId: number, amount: string, locale?: string) => Promise<{
    txHash: string
    slearn?: { success: boolean; slearnMinted?: string; message?: string; userMessage?: string }
    mintedSbts?: { name: string; imageUrl: string }[]
  }>
  isTransacting: boolean
  isProcessing: boolean
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet debe ser usado dentro de un WalletProvider')
  }
  return context
}

const CHAIN_ID = process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 42220 : 11142220

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const { t } = useTranslation(sbtToastT)
  const inApp = useInAppWallet()
  const externalState = useSyncExternalStore(
    subscribeExternalProvider,
    getExternalProviderSnapshot,
    getExternalProviderSnapshot,
  )
  const external = externalState.provider

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || undefined
  const inAppProvider = useMemo(
    () => (inApp.status === 'unlocked' ? inApp.getProvider(rpcUrl) : null),
    [inApp.status, rpcUrl],
  )
  const provider = inAppProvider ?? external
  const isInApp = !!inAppProvider
  const externalAvailable = !!external

  const [address, setAddress] = useState<`0x${string}` | null>(null)

  useEffect(() => {
    if (!provider) {
      setAddress(null)
      return
    }
    let cancelled = false
    const read = async () => {
      try {
        const accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
        if (!cancelled) setAddress((accounts?.[0] as `0x${string}`) ?? null)
      } catch {
        if (!cancelled) setAddress(null)
      }
    }
    void read()
    const onChange = (accounts: unknown) => {
      const list = accounts as string[] | undefined
      setAddress((list?.[0] as `0x${string}`) ?? null)
    }
    const p = provider as unknown as {
      on?: (e: string, cb: (a: unknown) => void) => void
      removeListener?: (e: string, cb: (a: unknown) => void) => void
    }
    p.on?.('accountsChanged', onChange)
    return () => {
      cancelled = true
      p.removeListener?.('accountsChanged', onChange)
    }
  }, [provider])

  const isConnected = !!provider && !!address
  const effectiveAddress = address

  const [isDonating, setIsDonating] = useState(false)

  const prevConnected = useRef(isConnected)
  useEffect(() => {
    if (prevConnected.current !== isConnected) {
      if (isConnected && effectiveAddress) {
        recordWalletEvent('connect_wallet', effectiveAddress.toLowerCase())
        fetch('/api/credential/mint-connector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: effectiveAddress.toLowerCase() }),
          keepalive: true,
        }).then(async r => {
          if (!r.ok) return
          const data = await r.json()
          if (data.minted && data.mintedSbts) {
            for (const sbt of data.mintedSbts) {
              toast({ title: t('sbtTitle'), description: sbt.name, duration: 4000 })
            }
          }
        }).catch(() => {})
      } else if (!isConnected) {
        recordWalletEvent('disconnect_wallet')
      }
      prevConnected.current = isConnected
    }
  }, [isConnected, effectiveAddress, t, toast])

  const disconnect = useCallback(() => {
    if (isInApp) {
      void inApp.lock()
    }
    setAddress(null)
  }, [isInApp, inApp])

  const donate = useCallback(async (regionId: number, amount: string, locale?: string) => {
    const regionalDonationContractAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`
    const usdtContractAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`

    if (!regionalDonationContractAddress || !usdtContractAddress) {
      throw new Error('Contract addresses not configured')
    }
    if (!effectiveAddress || !provider) {
      throw new Error('Wallet not connected')
    }

    setIsDonating(true)
    try {
      return await donateFn({
        regionId,
        amount,
        effectiveAddress,
        provider,
        usdtContractAddress,
        regionalDonationContractAddress,
      }, locale)
    } finally {
      setIsDonating(false)
    }
  }, [effectiveAddress, provider])

  const value: WalletContextType = {
    isConnected,
    address: effectiveAddress,
    effectiveAddress,
    chainId: CHAIN_ID,
    provider,
    isInApp,
    externalAvailable,
    disconnect,
    donate,
    isTransacting: isDonating,
    isProcessing: isDonating,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
