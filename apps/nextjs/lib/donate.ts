// lib/donate.ts
// Lógica de donación unificada (transferencia USDT + backend)

import { parseUnits } from 'viem'
import { logger } from './logger'

export interface DonateParams {
  regionId: number
  amount: string
  effectiveAddress: `0x${string}`
  usdtContractAddress: `0x${string}`
  regionalDonationContractAddress: `0x${string}`
}

export async function donate(params: DonateParams): Promise<string> {
  const { regionId, amount, effectiveAddress, usdtContractAddress, regionalDonationContractAddress } = params
  
  const logMsg = (msg: string) => {
    console.log(`🔍 [donate] ${msg}`)
    logger.info(msg, 'Donate')
  }
  
  logMsg(`Iniciando - Región: ${regionId}, Monto: ${amount}`)
  logMsg(`✅ Contract addresses: USDT=${usdtContractAddress}, Donation=${regionalDonationContractAddress}`)
  
  const amountInSmallestUnit = parseUnits(amount, 6)
  logMsg(`Monto en unidades pequeñas: ${amountInSmallestUnit.toString()}`)
  
  // Codificar el data con el regionId (32 bytes)
  const regionIdHex = BigInt(regionId).toString(16).padStart(64, '0')
  logMsg(`RegionId hex: ${regionIdHex}`)
  
  // Codificar transferencia ERC-20: transfer(address to, uint256 amount)
  const transferSelector = '0xa9059cbb'
  const toHex = regionalDonationContractAddress.slice(2).toLowerCase().padStart(64, '0')
  const amountHex = amountInSmallestUnit.toString(16).padStart(64, '0')
  const transferData = transferSelector + toHex + amountHex + regionIdHex
  
  logMsg(`Transfer data (primeros 100 chars): ${transferData.substring(0, 100)}...`)
  
  if (typeof window === 'undefined' || !window.ethereum) {
    logMsg(`❌ No hay wallet disponible`)
    throw new Error('No wallet provider available')
  }
  
  const ethereum = window.ethereum as any
  const txParams = {
    from: effectiveAddress,
    to: usdtContractAddress,
    data: transferData,
    value: '0x0',
  }
  
  /**
   * NOTA: Métodos de transacción según wallet (Abril 2026)
   * 
   * Durante la integración de MiniPay, se descubrió que:
   * - MiniPay NO soporta ethereum.request (error: Cannot read properties of undefined (reading '_request'))
   * - MiniPay SÍ soporta ethereum.send
   * 
   * Por otro lado:
   * - MetaMask NO soporta ethereum.send sin callback (error: does not support synchronous methods)
   * - MetaMask SÍ soporta ethereum.request
   * 
   * Por tanto, debemos detectar la wallet y usar el método apropiado.
   * 
   * Referencia: https://github.com/pasosdeJesus/sivel3/issues/24
   * Fecha de las pruebas: 21-24 de abril de 2026
   */
  const isMiniPay = ethereum.isMiniPay === true
  
  try {
    let txHash: string
    
    if (isMiniPay && typeof ethereum.send === 'function') {
      logMsg(`📱 Usando ethereum.send (MiniPay)...`)
      txHash = await ethereum.send({
        method: 'eth_sendTransaction',
        params: [txParams],
      })
    } else if (typeof ethereum.request === 'function') {
      logMsg(`🔄 Usando ethereum.request (MetaMask/OneKey)...`)
      txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      })
    } else {
      logMsg(`⚠️ No se encontró método compatible`)
      throw new Error('Wallet no compatible: ni send ni request disponibles')
    }
    
    logMsg(`✅ Transacción enviada. Hash: ${txHash}`)
    
    // ESPERAR CONFIRMACIÓN (hasta 10 segundos)
    logMsg(`⏳ Esperando confirmación de la transacción...`)
    let confirmed = false
    
    for (let i = 0; i < 15; i++) {
      try {
        const receipt = await ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        })
        if (receipt) {
          confirmed = true
          logMsg(`✅ Transacción confirmada en bloque ${receipt.blockNumber}`)
          break
        }
      } catch (err) {
        // No hacer nada, solo esperar
      }
      await new Promise(r => setTimeout(r, 1000))
    }
    
    if (!confirmed) {
      logMsg(`⚠️ No se pudo confirmar la transacción después de 15 segundos, continuando de todos modos...`)
    }
    
    // Llamar al backend para asignar la donación (con reintentos)
    logMsg(`🔄 Llamando al backend para asignar donación...`)
    let backendResponse: Response | null = null
    let lastError: string = ''
    
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        backendResponse = await fetch('/api/donations/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            regionId,
            donor: effectiveAddress,
            amount,
            txHash,
          }),
        })
        
        if (backendResponse.ok) break
        
        const errorText = await backendResponse.text()
        lastError = `HTTP ${backendResponse.status}: ${errorText}`
        logMsg(`⚠️ Intento ${attempt}/5 falló: ${lastError}`)
      } catch (err: any) {
        lastError = err.message
        logMsg(`⚠️ Intento ${attempt}/5 error: ${lastError}`)
      }
      
      if (attempt < 5) await new Promise(r => setTimeout(r, 2000))
    }
    
    if (!backendResponse || !backendResponse.ok) {
      // Mensaje de error detallado para el usuario
      const errorMsg = `⚠️ ERROR EN LA DONACIÓN ⚠️\n\n` +
        `La transferencia de USDT se realizó correctamente (hash: ${txHash.substring(0, 16)}...), ` +
        `pero NO se pudo asignar a la región ${regionId}.\n\n` +
        `Motivo: ${lastError}\n\n` +
        `📋 Datos para soporte:\n` +
        `- Región: ${regionId}\n` +
        `- Monto: ${amount} USDT\n` +
        `- Donante: ${effectiveAddress}\n` +
        `- Hash: ${txHash}\n\n` +
        `Por favor, contacta al equipo con estos datos para que asignen manualmente tu donación.\n` +
        `Los fondos están seguros en el contrato.`
      
      logMsg(`❌ ${errorMsg}`)
      
      if (typeof window !== 'undefined') {
        alert(errorMsg)
      }
      
      throw new Error('Backend assignment failed after retries')
    }
    
    const result = await backendResponse.json()
    logMsg(`✅ Donación asignada correctamente. TX: ${result.txHash || 'pendiente'}`)
    return txHash
  } catch (err: any) {
    logMsg(`❌ Error detectado:`)
    if (err?.message) logMsg(`   Mensaje: ${err.message}`)
    if (err?.code) logMsg(`   Código: ${err.code}`)
    if (err?.data) logMsg(`   Data: ${JSON.stringify(err.data)}`)
    logMsg(`   Error original: ${String(err)}`)
    throw err
  }
}