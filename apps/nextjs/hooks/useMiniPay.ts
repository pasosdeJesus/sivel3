'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

interface MiniPayInfo {
  isMiniPay: boolean
  phoneNumber: string | null
  isAvailable: boolean
}

export function useMiniPay(): MiniPayInfo {
  const { connector } = useAccount()
  const [info, setInfo] = useState<MiniPayInfo>({
    isMiniPay: false,
    phoneNumber: null,
    isAvailable: false,
  })

  useEffect(() => {
    const detectMiniPay = async () => {
      // 1. Detectar por user agent (Opera Mini)
      const ua = navigator.userAgent
      const isOperaMini = ua.includes('OPR') || 
                          ua.includes('Opera') || 
                          /MiniPay/i.test(ua)

      // 2. Detectar por window.ethereum (si está disponible)
      let isMiniPayWallet = false
      let phoneNumber: string | null = null

      if (typeof window !== 'undefined' && window.ethereum) {
        // Extender el tipo de window.ethereum para incluir isMiniPay
        isMiniPayWallet = !!(window.ethereum as { isMiniPay?: boolean }).isMiniPay
        
        // 3. Intentar obtener número de teléfono (solo si está conectado)
        if (connector?.id === 'minipay' || isMiniPayWallet) {
          try {
            // Solicitar phone number a MiniPay
            const result = await window.ethereum.request({
              method: 'minipay_getPhoneNumber',
              params: [],
            }) as { phoneNumber: string }
            
            if (result?.phoneNumber) {
              phoneNumber = result.phoneNumber
            }
          } catch (err) {
            console.warn('No se pudo obtener el número de teléfono de MiniPay:', err)
          }
        }
      }

      setInfo({
        isMiniPay: isOperaMini || isMiniPayWallet,
        phoneNumber,
        isAvailable: true,
      })
    }

    detectMiniPay()
  }, [connector])

  return info
}