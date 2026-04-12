'use client'

import { useEffect, useState } from 'react'
import { useConnect, useAccount } from 'wagmi'
import { injected } from 'wagmi/connectors'

interface MiniPayInfo {
  isMiniPay: boolean
  phoneNumber: string | null
  isConnecting: boolean
  isConnected: boolean
  address: `0x${string}` | null
}

export function useMiniPay(): MiniPayInfo {
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  
  const { connectAsync } = useConnect()
  const { address, isConnected } = useAccount()

  useEffect(() => {
    // Solo ejecutar en cliente
    if (typeof window === 'undefined') {
      console.log('🔍 [MiniPay] No estamos en el navegador')
      return
    }

    const ethereum = window.ethereum as any
    
    console.log('🔍 [MiniPay] Iniciando detección...')
    console.log('🔍 [MiniPay] window.ethereum existe?', !!ethereum)
    
    if (ethereum) {
      console.log('🔍 [MiniPay] isMiniPay flag:', ethereum.isMiniPay)
      console.log('🔍 [MiniPay] chainId:', ethereum.chainId)
    }
    
    // Detectar MiniPay
    const isMiniPayEnv = ethereum?.isMiniPay === true
    console.log('🔍 [MiniPay] ¿Es MiniPay?', isMiniPayEnv)
    setIsMiniPay(isMiniPayEnv)
    
    if (!isMiniPayEnv) {
      console.log('🔍 [MiniPay] No es MiniPay, saliendo...')
      return
    }
    
    console.log('✅ [MiniPay] MiniPay detectado correctamente')
    
    // Si ya está conectado por wagmi, solo obtener phone number
    if (isConnected && address) {
      console.log('✅ [MiniPay] Ya conectado, address:', address)
      console.log('🔍 [MiniPay] Obteniendo número de teléfono...')
      ethereum.request({ method: 'minipay_getPhoneNumber' })
        .then((res: { phoneNumber: string }) => {
          console.log('✅ [MiniPay] Número obtenido:', res?.phoneNumber)
          if (res?.phoneNumber) setPhoneNumber(res.phoneNumber)
        })
        .catch((err: Error) => console.warn('❌ [MiniPay] Error obteniendo número:', err))
      return
    }
    
    // Auto-conectar sin interacción del usuario
    const autoConnect = async () => {
      console.log('🔄 [MiniPay] Iniciando auto-conexión...')
      setIsConnecting(true)
      try {
        console.log('🔄 [MiniPay] Solicitando cuentas a eth_requestAccounts...')
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
        console.log('✅ [MiniPay] Cuentas obtenidas:', accounts)
        
        console.log('🔄 [MiniPay] Conectando con injected connector...')
        await connectAsync({ connector: injected() })
        console.log('✅ [MiniPay] connectAsync completado')
        
        console.log('🔍 [MiniPay] Obteniendo número de teléfono...')
        const result = await ethereum.request({ method: 'minipay_getPhoneNumber' }) as { phoneNumber: string }
        console.log('✅ [MiniPay] Número obtenido:', result?.phoneNumber)
        if (result?.phoneNumber) setPhoneNumber(result.phoneNumber)
        
        console.log('🎉 [MiniPay] Conexión exitosa completa')
      } catch (err) {
        console.error('❌ [MiniPay] Error durante auto-conexión:', err)
        if (err instanceof Error) {
          console.error('❌ [MiniPay] Mensaje:', err.message)
          console.error('❌ [MiniPay] Stack:', err.stack)
        }
      } finally {
        setIsConnecting(false)
        console.log('🔍 [MiniPay] Estado final - isConnecting:', false)
      }
    }
    
    autoConnect()
  }, [connectAsync, isConnected, address])

  return {
    isMiniPay,
    phoneNumber,
    isConnecting,
    isConnected,
    address: address || null
  }
}