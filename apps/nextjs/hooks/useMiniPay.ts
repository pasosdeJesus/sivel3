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
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  
  const { connectAsync } = useConnect()
  const { address, isConnected } = useAccount()
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMsg = `[${timestamp}] ${message}`
    console.log(logMsg)
    setDebugLogs(prev => [...prev, logMsg])
  }
  
  useEffect(() => {
    // Detectar MiniPay según documentación oficial
    const ethereum = window.ethereum as any
    const isMiniPayEnv = ethereum?.isMiniPay === true
    setIsMiniPay(isMiniPayEnv)
    
    if (!isMiniPayEnv) {
      addLog('❌ No es MiniPay')
      return
    }
    
    addLog('✅ MiniPay detectado')
    
    // Según documentación: Auto-conectar sin botón
    const autoConnect = async () => {
      setIsConnecting(true)
      try {
        // Conectar usando injected connector (funciona con MiniPay)
        await connectAsync({ connector: injected() })
        addLog('✅ Conectado a MiniPay')
        
        // Obtener número de teléfono si está disponible
        try {
          const result = await ethereum.request({ 
            method: 'minipay_getPhoneNumber' 
          })
          if (result?.phoneNumber) {
            setPhoneNumber(result.phoneNumber)
            addLog(`📞 Número: ${result.phoneNumber}`)
          }
        } catch (err) {
          addLog('⚠️ No se pudo obtener número de teléfono')
        }
      } catch (err) {
        addLog(`❌ Error conectando: ${err}`)
      } finally {
        setIsConnecting(false)
      }
    }
    
    autoConnect()
  }, [connectAsync])
  
  return {
    isMiniPay,
    phoneNumber,
    isConnecting,
    isConnected,
    address: address || null,
    debugLogs
  }
}