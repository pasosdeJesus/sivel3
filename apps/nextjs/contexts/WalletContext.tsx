'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAccount, useDisconnect, useChainId, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'

// ABI mínimo para una transferencia ERC20 (como USDT)
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
  }
] as const

interface WalletContextType {
  isConnected: boolean
  address: `0x${string}` | null
  chainId: number | null
  disconnect: () => void
  transferUSDT: (to: `0x${string}`, amount: string) => Promise<void>
  isTransacting: boolean
  error: Error | null
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
  const chainId = useChainId()
  const { data: hash, error, isPending, writeContract } = useWriteContract()

  const [state, setState] = useState({
    isConnected: false,
    address: null as `0x${string}` | null,
    chainId: null as number | null,
  })

  useEffect(() => {
    setState({
      isConnected,
      address: address || null,
      chainId: chainId || 0,
    })
  }, [isConnected, address, chainId])

  const transferUSDT = useCallback(async (to: `0x${string}`, amount: string) => {
    const usdtContractAddress = process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS as `0x${string}`
    if (!usdtContractAddress) {
      console.error("La dirección del contrato USDT no está configurada en las variables de entorno.")
      throw new Error("La dirección del contrato USDT no está configurada.")
    }

    // USDT en Celo (y muchos otros) tiene 6 decimales.
    const amountInSmallestUnit = parseUnits(amount, 6)

    writeContract({
      address: usdtContractAddress,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to, amountInSmallestUnit],
    })
  }, [writeContract])

  const value: WalletContextType = {
    isConnected: state.isConnected,
    address: state.address,
    chainId: state.chainId,
    disconnect,
    transferUSDT,
    isTransacting: isPending,
    error,
  }

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  )
}
