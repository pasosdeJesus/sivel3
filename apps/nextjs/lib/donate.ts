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
  
  const isMiniPayEnv = ethereum.isMiniPay === true
  
  try {
    logMsg(`🔄 Enviando transacción a ${isMiniPayEnv ? 'MiniPay' : 'wallet'}...`)
    let txHash: string
    
    if (isMiniPayEnv && typeof ethereum.send === 'function') {
      logMsg(`📱 Usando ethereum.send para MiniPay...`)
      txHash = await ethereum.send({
        method: 'eth_sendTransaction',
        params: [txParams],
      })
    } else if (typeof ethereum.request === 'function') {
      txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      })
    } else {
      logMsg(`⚠️ Usando sendAsync como fallback...`)
      txHash = await new Promise((resolve, reject) => {
        ethereum.sendAsync({
          method: 'eth_sendTransaction',
          params: [txParams],
        }, (err: any, result: any) => {
          if (err) reject(err)
          else resolve(result.result)
        })
      })
    }
    
    logMsg(`✅ Transacción enviada. Hash: ${txHash}`)
    
    // Llamar al backend para asignar la donación
    logMsg(`🔄 Llamando al backend para asignar donación...`)
    const response = await fetch('/api/donations/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionId,
        donor: effectiveAddress,
        amount,
        txHash,
      }),
    })
    
    const result = await response.json()
    if (!response.ok) {
      logMsg(`❌ Backend error: ${result.error}`)
      throw new Error(result.error || 'Error al asignar donación')
    }
    
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