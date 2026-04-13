'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

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
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<`0x${string}` | null>(null)
  
  useEffect(() => {
    const initMiniPay = async () => {
      logger.info('Iniciando detección de MiniPay...', 'MiniPay')
      
      if (typeof window === 'undefined') {
        logger.error('No estamos en navegador', 'MiniPay')
        return
      }
      
      const ethereum = (window as any).ethereum
      logger.info(`window.ethereum existe? ${!!ethereum}`, 'MiniPay')
      
      if (!ethereum) {
        logger.error('No hay proveedor Ethereum', 'MiniPay')
        return
      }
      
      const isMiniPayEnv = ethereum.isMiniPay === true
      logger.info(`isMiniPay flag: ${isMiniPayEnv}`, 'MiniPay')
      setIsMiniPay(isMiniPayEnv)
      
      if (!isMiniPayEnv) {
        logger.info('No es MiniPay, saliendo', 'MiniPay')
        return
      }
      
      logger.success('MiniPay detectado', 'MiniPay')
      setIsConnecting(true)
      
      try {
        // Obtener cuenta
        let account: string | null = null
        
        if (ethereum.selectedAddress) {
          account = ethereum.selectedAddress
          logger.success(`Cuenta desde selectedAddress: ${account}`, 'MiniPay')
        }
        
        if (!account && ethereum._state?.accounts?.[0]) {
          account = ethereum._state.accounts[0]
          logger.success(`Cuenta desde _state.accounts: ${account}`, 'MiniPay')
        }
        
        if (!account && ethereum._accounts?.[0]) {
          account = ethereum._accounts[0]
          logger.success(`Cuenta desde _accounts: ${account}`, 'MiniPay')
        }
        
        if (!account) {
          try {
            logger.info('Intentando eth_requestAccounts...', 'MiniPay')
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
            if (accounts && accounts[0]) {
              account = accounts[0]
              logger.success(`eth_requestAccounts devolvió: ${account}`, 'MiniPay')
            }
          } catch (err: any) {
            logger.warning(`eth_requestAccounts falló: ${err.message}`, 'MiniPay')
          }
        }
        
        if (account) {
          setAddress(account as `0x${string}`)
          setIsConnected(true)
          logger.success(`MiniPay conectado - Address: ${account}`, 'MiniPay')
        } else {
          logger.error('No se pudo obtener ninguna cuenta', 'MiniPay')
        }
        
        // Obtener número de teléfono
        logger.info('Obteniendo número de teléfono...', 'MiniPay')
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
          
          if (phoneResult && phoneResult.phoneNumber) {
            setPhoneNumber(phoneResult.phoneNumber)
            logger.success(`Número: ${phoneResult.phoneNumber}`, 'MiniPay')
          } else if (typeof phoneResult === 'string') {
            setPhoneNumber(phoneResult)
            logger.success(`Número (string): ${phoneResult}`, 'MiniPay')
          } else {
            logger.warning('No se pudo obtener número de teléfono', 'MiniPay')
          }
        } catch (err: any) {
          logger.error(`Error obteniendo número: ${err.message}`, 'MiniPay')
        }
        
      } catch (err: any) {
        logger.error(`Error general: ${err.message}`, 'MiniPay')
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
  }
}