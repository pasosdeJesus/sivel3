'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAccount, useDisconnect, useChainId, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'

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
  approveUSDT: (spender: `0x${string}`, amount: string) => Promise<void>
  donateToRegion: (regionId: number, amount: string) => Promise<void>
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

  const approveUSDT = useCallback(async (spender: `0x${string}`, amount: string) => {
    const usdtContractAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`
    if (!usdtContractAddress) {
      console.error("La dirección del contrato USDT no está configurada en las variables de entorno.")
      throw new Error("La dirección del contrato USDT no está configurada.")
    }
    const amountInSmallestUnit = parseUnits(amount, 6)

    writeContract({
      address: usdtContractAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amountInSmallestUnit],
    })
  }, [writeContract])

  const donateToRegion = useCallback(async (regionId: number, amount: string) => {
    const regionalDonationContractAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`
    if (!regionalDonationContractAddress) {
      console.error("La dirección del contrato RegionalDonation no está configurada en las variables de entorno.")
      throw new Error("La dirección del contrato RegionalDonation no está configurada.")
    }
    const amountInSmallestUnit = parseUnits(amount, 6)

    writeContract({
      address: regionalDonationContractAddress,
      abi: regionalDonationAbi,
      functionName: 'donate',
      args: [BigInt(regionId), amountInSmallestUnit],
    })
  }, [writeContract])

  const value: WalletContextType = {
    isConnected: state.isConnected,
    address: state.address,
    chainId: state.chainId,
    disconnect,
    approveUSDT,
    donateToRegion,
    isTransacting: isPending,
    error,
  }

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  )
}
