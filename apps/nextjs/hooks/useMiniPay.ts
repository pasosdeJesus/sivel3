'use client'

import { useEffect, useState } from 'react'

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
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<`0x${string}` | null>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMsg = `[${timestamp}] ${message}`
    console.log(logMsg)
    setDebugLogs(prev => [...prev, logMsg])
  }
  
  useEffect(() => {
    const initMiniPay = async () => {
      addLog('🔍 Iniciando detección de MiniPay...')
      
      if (typeof window === 'undefined') {
        addLog('❌ No estamos en navegador')
        return
      }
      
      const ethereum = (window as any).ethereum
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
      
      addLog('✅ MiniPay detectado')
      setIsConnecting(true)
      
      try {
        // En MiniPay, la cuenta ya está disponible sin necesidad de eth_requestAccounts
        // Intentar obtener la cuenta de diferentes maneras
        let account: string | null = null
        
        // Método 1: selectedAddress
        if (ethereum.selectedAddress) {
          account = ethereum.selectedAddress
          addLog(`✅ Cuenta desde selectedAddress: ${account}`)
        }
        
        // Método 2: _state.accounts
        if (!account && ethereum._state?.accounts?.[0]) {
          account = ethereum._state.accounts[0]
          addLog(`✅ Cuenta desde _state.accounts: ${account}`)
        }
        
        // Método 3: eth_accounts (sin request, solo lectura)
        if (!account && ethereum._accounts?.[0]) {
          account = ethereum._accounts[0]
          addLog(`✅ Cuenta desde _accounts: ${account}`)
        }
        
        // Método 4: eth_requestAccounts (si está disponible)
        if (!account) {
          try {
            addLog('🔄 Intentando eth_requestAccounts...')
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
            if (accounts && accounts[0]) {
              account = accounts[0]
              addLog(`✅ eth_requestAccounts devolvió: ${account}`)
            }
          } catch (err: any) {
            addLog(`⚠️ eth_requestAccounts falló: ${err.message}`)
          }
        }
        
        if (account) {
          setAddress(account as `0x${string}`)
          setIsConnected(true)
          addLog(`✅ MiniPay conectado - Address: ${account}`)
        } else {
          addLog('❌ No se pudo obtener ninguna cuenta')
        }
        
        // Obtener número de teléfono
        addLog('🔄 Obteniendo número de teléfono...')
        try {
          let phoneResult: any = null
          
          if (typeof ethereum.minipay_getPhoneNumber === 'function') {
            phoneResult = await ethereum.minipay_getPhoneNumber()
          } else if (ethereum.request) {
            phoneResult = await ethereum.request({ 
              method: 'minipay_getPhoneNumber',
              params: []
            })
          }
          
          addLog(`📞 Respuesta phone: ${JSON.stringify(phoneResult)}`)
          
          if (phoneResult && phoneResult.phoneNumber) {
            setPhoneNumber(phoneResult.phoneNumber)
            addLog(`📞 Número: ${phoneResult.phoneNumber}`)
          } else if (typeof phoneResult === 'string') {
            setPhoneNumber(phoneResult)
            addLog(`📞 Número (string): ${phoneResult}`)
          } else {
            addLog('⚠️ No se pudo obtener número de teléfono')
          }
        } catch (err: any) {
          addLog(`❌ Error obteniendo número: ${err.message}`)
        }
        
      } catch (err: any) {
        addLog(`❌ Error general: ${err.message}`)
      } finally {
        setIsConnecting(false)
      }
    }
    
    initMiniPay()
  }, [])
  
  return {
    isMiniPay,
    phoneNumber,
    isConnecting,
    isConnected,
    address,
    debugLogs
  }
}
