'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAccount, useDisconnect, useChainId, useWriteContract, useConnect } from 'wagmi'
import { parseUnits } from 'viem'
import { useMiniPay } from '@/hooks/useMiniPay'
import { logger } from '@/lib/logger'
import { donate as donateFn } from '@/lib/donate'

const erc20Abi = [
  {
    "name": "transfer",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "type": "address", "name": "to" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": [
      { "type": "bool", "name": "" }
    ]
  },
  {
    "name": "approve",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "type": "address", "name": "spender" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": [
      { "type": "bool", "name": "" }
    ]
  }
] as const

const regionalDonationAbi = [
  {
    "name": "donate",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "type": "uint256", "name": "regionId" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": []
  }
] as const

interface WalletContextType {
  isConnected: boolean
  address: `0x${string}` | null
  effectiveAddress: `0x${string}` | null
  chainId: number | null
  disconnect: () => void
  donate: (regionId: number, amount: string) => Promise<{ txHash: string; learningPoints?: { success: boolean; newScore?: number; message?: string } }>
  isTransacting: boolean
  isProcessing: boolean
  error: Error | null
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
  const { address, isConnected, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect, connectors } = useConnect()
  const chainId = useChainId()
  const { data: hash, error, isPending, writeContract } = useWriteContract()
  
  // Log para depurar isTransacting
  console.log('🔍 [WalletContext] isPending (isTransacting):', isPending);
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

  const approveUSDT = useCallback(async (spender: `0x${string}`, amount: string): Promise<`0x${string}`> => {
    logger.info(`approveUSDT llamado - Spender: ${spender}, Amount: ${amount}`, 'Approve')
    
    const usdtContractAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`
    if (!usdtContractAddress) {
      logger.error("USDT contract address not configured", 'Approve')
      throw new Error("La dirección del contrato USDT no está configurada.")
    }
    
    logger.info(`USDT contract address: ${usdtContractAddress}`, 'Approve')
    logger.info(`Spender (RegionalDonation): ${spender}`, 'Approve')
    
    const amountInSmallestUnit = parseUnits(amount, 6)
    logger.info(`Amount in smallest unit: ${amountInSmallestUnit.toString()}`, 'Approve')
    
    const expectedContract = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS
    if (spender.toLowerCase() !== expectedContract?.toLowerCase()) {
      logger.error(`Spender mismatch! Got: ${spender}, Expected: ${expectedContract}`, 'Approve')
    }
    
    logger.info('Calling writeContract for approve...', 'Approve')
    
    return new Promise((resolve, reject) => {
      writeContract({
        address: usdtContractAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, amountInSmallestUnit],
      }, {
        onSuccess: (hash) => {
          logger.success(`approve transaction confirmed! Hash: ${hash}`, 'Approve')
          resolve(hash)
        },
        onError: (error) => {
          logger.error(`approve transaction failed: ${error.message}`, 'Approve')
          reject(error)
        }
      })
    })
  }, [writeContract])

  // Función legacy para wallets tradicionales
  const donateToRegion = useCallback(async (regionId: number, amount: string): Promise<void> => {
    logger.info(`Donate called - Region: ${regionId}, Amount: ${amount}, isMiniPay: ${isMiniPay}`, 'Donate')
    
    const regionalDonationContractAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`
    
    if (!regionalDonationContractAddress) {
      const errorMsg = "Donation contract not configured"
      logger.error(errorMsg, 'Donate')
      throw new Error(errorMsg)
    }
    
    const amountInSmallestUnit = parseUnits(amount, 6)
    
    // Para wallets normales: usar writeContract
    logger.info('Usando writeContract para donate...', 'Donate')
    
    return new Promise((resolve, reject) => {
      writeContract({
        address: regionalDonationContractAddress,
        abi: regionalDonationAbi,
        functionName: 'donate',
        args: [BigInt(regionId), amountInSmallestUnit],
      }, {
        onSuccess: () => {
          logger.success(`donate transaction confirmed!`, 'Donate')
          resolve()
        },
        onError: (error) => {
          logger.error(`donate transaction failed: ${error.message}`, 'Donate')
          reject(error)
        }
      })
    })
  }, [writeContract])

  // Estado local para donación en curso
  const [isDonating, setIsDonating] = useState(false)
  
  // FUNCIÓN DE DONACIÓN UNIFICADA (usa lib/donate.ts)
  const donate = useCallback(async (regionId: number, amount: string): Promise<{ txHash: string; learningPoints?: any }> => {
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
      })
    } finally {
      setIsDonating(false)
    }
  }, [effectiveAddress])
  
  // Combinar isTransacting (de wagmi) con isDonating (local)
  const isProcessing = isPending || isDonating

  const value: WalletContextType = {
    isConnected: effectiveIsConnected,
    address: effectiveAddress || state.address,
    effectiveAddress: effectiveAddress || state.address,
    chainId: state.chainId,
    disconnect,
    donate,
    isTransacting: isPending,
    isProcessing,
    error,
    isMiniPay,
    phoneNumber,
    connectMiniPay,
  }

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  )
}
