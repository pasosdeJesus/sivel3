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
  debugLogs: string[]
}

export function useMiniPay(): MiniPayInfo {
  const HOOK_VERSION = 'v3.0.1-fixed-loop'
  
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)
  
  const { connectAsync } = useConnect()
  const { address, isConnected } = useAccount()
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMsg = `[${timestamp}] ${message}`
    console.log(logMsg)
    setDebugLogs(prev => [...prev, logMsg])
  }
  
  // Solo ejecutar logs iniciales una vez
  useEffect(() => {
    if (!initialized) {
      addLog(`🚀 Hook ${HOOK_VERSION} iniciado`)
      addLog(`📱 User Agent: ${navigator.userAgent.substring(0, 80)}...`)
      setInitialized(true)
    }
  }, [initialized])
  
  useEffect(() => {
    addLog('🔍 useEffect ejecutándose...')
    
    if (typeof window === 'undefined') {
      addLog('❌ No estamos en navegador')
      return
    }
    
    const ethereum = window.ethereum as any
    addLog(`🔍 window.ethereum existe? ${!!ethereum}`)
    
    if (!ethereum) {
      addLog('❌ No hay proveedor Ethereum')
      return
    }
    
    const isMiniPayEnv = ethereum.isMiniPay === true
    addLog(`🔍 isMiniPay flag: ${isMiniPayEnv}`)
    setIsMiniPay(isMiniPayEnv)
    
    if (!isMiniPayEnv) {
      addLog('❌ No es MiniPay, saliendo')
      return
    }
    
    addLog('✅ MiniPay detectado correctamente')
    
    // Si ya está conectado, solo obtener número
    if (isConnected && address) {
      addLog(`✅ Ya conectado: ${address}`)
      ethereum.request({ method: 'minipay_getPhoneNumber' })
        .then((res: { phoneNumber: string }) => {
          if (res?.phoneNumber) {
            addLog(`📞 Número: ${res.phoneNumber}`)
            setPhoneNumber(res.phoneNumber)
          }
        })
        .catch((err: Error) => addLog(`❌ Error obteniendo número: ${err.message}`))
      return
    }
    
    // Auto-conectar
    const autoConnect = async () => {
      addLog('🔄 Iniciando auto-conexión...')
      setIsConnecting(true)
      
      try {
        // Forzar red a Celo Sepolia (44787)
        const targetChainId = '0x1a4b'
        const currentChainId = await ethereum.request({ method: 'eth_chainId' })
        addLog(`🔍 ChainId actual: ${currentChainId}, target: ${targetChainId}`)
        
        if (currentChainId !== targetChainId) {
          addLog('🔄 Cambiando de red...')
          try {
            await ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: targetChainId }]
            })
            addLog('✅ Red cambiada')
          } catch (err: any) {
            addLog(`❌ Error cambiando red: ${err.message}`)
          }
        }
        
        // Solicitar cuentas
        addLog('🔄 Solicitando cuentas...')
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
        addLog(`✅ Cuentas obtenidas: ${JSON.stringify(accounts)}`)
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No se obtuvieron cuentas')
        }
        
        // Conectar con wagmi
        addLog('🔄 Conectando con injected connector...')
        try {
          await connectAsync({ connector: injected() })
          addLog('✅ connectAsync completado')
        } catch (err: any) {
          addLog(`⚠️ connectAsync falló: ${err.message}`)
        }
        
        // Obtener número de teléfono
        addLog('🔄 Obteniendo número de teléfono...')
        try {
          const result = await ethereum.request({ method: 'minipay_getPhoneNumber' })
          addLog(`📞 Resultado: ${JSON.stringify(result)}`)
          if (result && typeof result === 'object' && 'phoneNumber' in result) {
            const phone = (result as { phoneNumber: string }).phoneNumber
            addLog(`📞 Número: ${phone}`)
            setPhoneNumber(phone)
          }
        } catch (err: any) {
          addLog(`❌ Error obteniendo número: ${err.message}`)
        }
        
        addLog('🎉 Auto-conexión completada')
      } catch (err: any) {
        addLog(`❌ Error: ${err.message}`)
      } finally {
        setIsConnecting(false)
      }
    }
    
    autoConnect()
  }, []) // Solo una vez

  return {
    isMiniPay,
    phoneNumber,
    isConnecting,
    isConnected,
    address: address || null,
    debugLogs
  }
}