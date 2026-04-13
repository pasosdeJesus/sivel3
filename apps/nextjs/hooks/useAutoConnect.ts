'use client'

import { useEffect } from 'react'
import { useConnect, useConnectors } from 'wagmi'

/**
 * Hook para auto-conectar a MiniPay (y otras wallets inyectadas)
 * Basado en la documentación oficial de MiniPay:
 * https://docs.minipay.xyz/getting-started/quick-start.html#step-3-auto-connect-on-load
 */
export function useAutoConnect() {
  const connectors = useConnectors()
  const { connect } = useConnect()

  useEffect(() => {
    // Auto-conectar al cargar la página - requerido para MiniPay
    if (connectors.length > 0 && !window.ethereum?.isMiniPay) {
      // Solo auto-conectar si NO es MiniPay (MiniPay se maneja aparte)
      connect({ connector: connectors[0] })
    }
  }, [connectors, connect])
}
