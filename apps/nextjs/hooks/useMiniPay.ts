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
    
    // FUNCIÓN AUTO-CONEXIÓN INMEDIATA
    const performAutoConnect = async () => {
      console.log('🔄 [MiniPay] Iniciando auto-conexión INMEDIATA...')
      setIsConnecting(true)
      try {
        // PASO 1: Forzar la red a Celo Sepolia (44787)
        const targetChainId = '0x1a4b' // 44787 en hex
        const currentChainId = await ethereum.request({ method: 'eth_chainId' })
        console.log('🔍 [MiniPay] ChainId actual:', currentChainId, 'Target:', targetChainId)
        
        if (currentChainId !== targetChainId) {
          console.log('🔄 [MiniPay] Cambiando de red...')
          try {
            await ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: targetChainId }]
            })
            console.log('✅ [MiniPay] Red cambiada exitosamente')
          } catch (switchError) {
            console.error('❌ [MiniPay] Error cambiando de red:', switchError)
          }
        }
        
        // PASO 2: Solicitar cuentas
        console.log('🔄 [MiniPay] Solicitando cuentas...')
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
        console.log('✅ [MiniPay] Cuentas obtenidas:', accounts)
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No se obtuvieron cuentas')
        }
        
        // PASO 3: Conectar usando wagmi (solo si no está conectado)
        if (!isConnected && !address) {
          console.log('🔄 [MiniPay] Conectando con injected connector...')
          try {
            await connectAsync({ connector: injected() })
            console.log('✅ [MiniPay] connectAsync completado')
          } catch (connectErr) {
            console.error('❌ [MiniPay] Error en connectAsync:', connectErr)
            // No fallamos, ya tenemos las cuentas
          }
        }
        
        // PASO 4: Obtener número de teléfono
        console.log('🔍 [MiniPay] Obteniendo número de teléfono...')
        try {
          const result = await ethereum.request({ method: 'minipay_getPhoneNumber' }) as { phoneNumber: string }
          console.log('✅ [MiniPay] Número obtenido:', result?.phoneNumber)
          if (result?.phoneNumber) setPhoneNumber(result.phoneNumber)
        } catch (phoneErr) {
          console.warn('❌ [MiniPay] Error obteniendo número:', phoneErr)
        }
        
        console.log('🎉 [MiniPay] Auto-conexión completada')
      } catch (err) {
        console.error('❌ [MiniPay] Error durante auto-conexión:', err)
        if (err instanceof Error) {
          console.error('❌ [MiniPay] Mensaje:', err.message)
        }
      } finally {
        setIsConnecting(false)
      }
    }
    
    // Ejecutar inmediatamente
    performAutoConnect()
  }, []) // Dependencias vacías - solo ejecutar una vez al montar

  return {
    isMiniPay,
    phoneNumber,
    isConnecting,
    isConnected,
    address: address || null
  }
}