'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAccount, useDisconnect, useChainId, useWriteContract, useConnect } from 'wagmi'
import { parseUnits } from 'viem'
import { useMiniPay } from '@/hooks/useMiniPay'
import { logger } from '@/lib/logger'

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
  chainId: number | null
  disconnect: () => void
  approveUSDT: (spender: `0x${string}`, amount: string) => Promise<`0x${string}`>
  donateToRegion: (regionId: number, amount: string) => Promise<void>
  isTransacting: boolean
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

  const donateToRegion = useCallback(async (regionId: number, amount: string) => {
    logger.info(`Donate called - Region: ${regionId}, Amount: ${amount}, isMiniPay: ${isMiniPay}`, 'Donate')
    
    const regionalDonationContractAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`
    
    if (!regionalDonationContractAddress) {
      const errorMsg = "Donation contract not configured"
      logger.error(errorMsg, 'Donate')
      throw new Error(errorMsg)
    }
    
    const amountInSmallestUnit = parseUnits(amount, 6)
    
    // Para MiniPay: usar sendTransaction directo
    if (isMiniPay && typeof window !== 'undefined' && window.ethereum) {
      logger.info('MiniPay detectado, usando sendTransaction directo...', 'Donate')
      
      // Codificar los datos de la función donate(uint256,uint256)
      const { encodeFunctionData } = await import('viem')
      const data = encodeFunctionData({
        abi: regionalDonationAbi,
        functionName: 'donate',
        args: [BigInt(regionId), amountInSmallestUnit]
      })
      
      logger.info(`Data encodeada: ${data}`, 'Donate')
      
      const txParams = {
        from: effectiveAddress,
        to: regionalDonationContractAddress,
        data: data,
        value: '0x0',
      }
      
      try {
        const ethereum = window.ethereum as any
        
        if (typeof ethereum.request !== 'function') {
          logger.error('ethereum.request no es una función', 'Donate')
          throw new Error('MiniPay provider no está completamente inicializado')
        }
        
        logger.info('Enviando transacción con eth_sendTransaction...', 'Donate')
        const txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        })
        
        logger.success(`Transacción enviada. Hash: ${txHash}`, 'Donate')
        return txHash
      } catch (sendErr: any) {
        logger.error(`sendTransaction falló: ${sendErr.message}`, 'Donate')
        throw sendErr
      }
    }
    
    // Para wallets normales: usar writeContract (igual que approve)
    logger.info('Usando writeContract para donate...', 'Donate')
    
    // Devolver una promesa que se resuelve cuando la transacción es confirmada
    return new Promise((resolve, reject) => {
      writeContract({
        address: regionalDonationContractAddress,
        abi: regionalDonationAbi,
        functionName: 'donate',
        args: [BigInt(regionId), amountInSmallestUnit],
      }, {
        onSuccess: (hash) => {
          logger.success(`donate transaction confirmed! Hash: ${hash}`, 'Donate')
          resolve(hash)
        },
        onError: (error) => {
          logger.error(`donate transaction failed: ${error.message}`, 'Donate')
          reject(error)
        }
      })
    })
  }, [effectiveAddress, isMiniPay, writeContract])

  const value: WalletContextType = {
    isConnected: effectiveIsConnected,
    address: effectiveAddress || state.address,
    chainId: state.chainId,
    disconnect,
    approveUSDT,
    donateToRegion,
    isTransacting: isPending,
    error,
    isMiniPay,
    phoneNumber,
    connectMiniPay,
  }

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  )
}
