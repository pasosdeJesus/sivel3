// lib/donate.ts
// Lógica de donación unificada (transferencia USDT + backend)

import { parseUnits } from 'viem'
import { logger } from './logger'
import { safeStringify, debugLog } from './debug'
import { parseWalletError } from './errors'

export interface DonateParams {
  regionId: number
  amount: string
  effectiveAddress: `0x${string}`
  usdtContractAddress: `0x${string}`
  regionalDonationContractAddress: `0x${string}`
}

export interface DonateResult {
  txHash: string
  learningPoints?: {
    success: boolean
    newScore?: number
    message?: string
  }
  mintedSbts?: { name: string; imageUrl: string }[]
}

// Local TypeScript Objects para i18n (ver doc/I18N.md)
const donateTranslations = {
  en: {
    minAmount: 'The minimum donation amount is 0.02 USDT. You entered {{0}} USDT.',
    noWallet: 'No wallet provider available',
    walletIncompatible: 'Incompatible wallet: neither send nor request available',
    verifying: 'Sending transaction to the network...',
    backendCalling: 'Calling backend to assign donation...',
    backend4xx: 'The transaction could not be verified by the server.\n\nReason: {{0}}\n\nContact the team if the problem persists.',
    backend5xx: 'We received your donation. Thank you!\n\nWe couldn\'t assign it to your chosen region automatically. Please contact support with this hash to complete the assignment:\n{{1}}',
  },
  es: {
    minAmount: 'El monto mínimo de donación es 0.02 USDT. Ingresaste {{0}} USDT.',
    noWallet: 'No hay wallet disponible',
    walletIncompatible: 'Wallet no compatible: ni send ni request disponibles',
    verifying: 'Enviando transacción a la red...',
    backendCalling: 'Llamando al backend para asignar donación...',
    backend4xx: 'La transacción no pudo ser verificada por el servidor.\n\nMotivo: {{0}}\n\nContacta al equipo si el problema persiste.',
    backend5xx: 'Hemos recibido su donación. ¡Gracias!\n\nNo pudimos asignarla a la región que eligió automáticamente. Por favor contacte a soporte con este hash para completar la asignación:\n{{1}}',
  },
}

export async function donate(params: DonateParams, locale: string = 'en'): Promise<DonateResult> {
  const { regionId, amount, effectiveAddress, usdtContractAddress, regionalDonationContractAddress } = params
  const t = locale === 'es' ? donateTranslations.es : donateTranslations.en

  const logMsg = (msg: string) => {
    console.log(`🔍 [donate] ${msg}`)
    logger.info(msg, 'Donate')
  }

  logMsg(`Iniciando - Región: ${regionId}, Monto: ${amount}`)
  logMsg(`✅ Contract addresses: USDT=${usdtContractAddress}, Donation=${regionalDonationContractAddress}`)

  const amountNum = parseFloat(amount)
  if (amountNum < 0.02) {
    const errorMsg = t.minAmount.replace('{{0}}', String(amountNum))
    logMsg(`❌ ${errorMsg}`)
    throw new Error(errorMsg)
  }

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
    throw new Error(t.noWallet)
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

    let rawHash: any
    if (isMiniPay && typeof ethereum.send === 'function') {
      logMsg(`📱 Usando ethereum.send (MiniPay)...`)
      rawHash = await ethereum.send({
        method: 'eth_sendTransaction',
        params: [txParams],
      })

      // Depuración: serializar la respuesta usando debugLog
      debugLog('MiniPay Response', rawHash)
      logMsg(`📦 Respuesta MiniPay (tipo: ${typeof rawHash}): ${safeStringify(rawHash)}`)

      // Intentar extraer el hash de diferentes propiedades
      if (typeof rawHash === 'string') {
        txHash = rawHash
      } else if (typeof rawHash === 'object' && rawHash !== null) {
        // Buscar propiedades comunes donde puede estar el hash
        if (rawHash.result) {
          txHash = rawHash.result
        } else if (rawHash.hash) {
          txHash = rawHash.hash
        } else if (rawHash.transactionHash) {
          txHash = rawHash.transactionHash
        } else if (rawHash.txHash) {
          txHash = rawHash.txHash
        } else {
          // Si no encontramos el hash, mostrar la estructura completa usando safeStringify
          const serialized = safeStringify(rawHash)
          debugLog('MiniPay Unknown Response', rawHash)
          logMsg(`❌ No se pudo extraer hash. Respuesta completa: ${serialized}`)
          throw new Error(`Formato inesperado de MiniPay. Respuesta: ${serialized.substring(0, 200)}`)
        }
      } else {
        debugLog('MiniPay Invalid Type', { type: typeof rawHash, value: rawHash })
        throw new Error(`Tipo de respuesta inesperado: ${typeof rawHash}`)
      }

      debugLog('MiniPay Extracted Hash', { hash: txHash })
      logMsg(`📱 Hash extraído: ${txHash}`)
    } else if (typeof ethereum.request === 'function') {
      logMsg(`🔄 Usando ethereum.request (MetaMask/OneKey)...`)
      txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      })
      logMsg(`✅ Hash: ${txHash}`)
    } else {
      logMsg(`⚠️ No se encontró método compatible`)
      throw new Error(t.walletIncompatible)
    }

    logMsg(`✅ Transacción enviada. Hash: ${txHash}`)

    // Llamar al backend para asignar la donación (con reintentos)
    // El backend verificará la transacción en la blockchain
    // Los errores 4xx NO se reintentan (el backend rechazó la solicitud)
    // Los errores 5xx y de red SÍ se reintentan (problema temporal del servidor)
    logMsg(`🔄 Llamando al backend para asignar donación...`)
    let backendResponse: Response | null = null
    let lastError: string = ''
    let lastStatus: string = ''
    let isClientError = false

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
        lastStatus = `HTTP ${backendResponse.status}`
        logMsg(`⚠️ Intento ${attempt}/5 falló: ${lastError}`)

        // 4xx: error del backend (p. ej. transacción no confirmada aún)
        // Se marca como clientError para el mensaje final, pero se sigue reintentando
        // porque la transacción puede confirmarse en los próximos segundos.
        if (backendResponse.status >= 400 && backendResponse.status < 500) {
          isClientError = true
        }
      } catch (err: any) {
        lastError = err.message
        logMsg(`⚠️ Intento ${attempt}/5 error de red: ${lastError}`)
      }

      if (attempt < 5) await new Promise(r => setTimeout(r, 2000))
    }

    if (!backendResponse || !backendResponse.ok) {
      logMsg(`❌ Error en asignación: ${lastError}`)

      const userMsg = isClientError
        ? t.backend4xx.replace('{{0}}', lastStatus)
        : t.backend5xx
            .replace('{{1}}', txHash.substring(0, 16))

      throw new Error(userMsg)
    }

    const result = await backendResponse.json()
    logMsg(`✅ Donación asignada correctamente. TX: ${result.txHash || 'pendiente'}`)
    return {
      txHash: result.txHash || txHash,
      learningPoints: result.learningPoints,
      mintedSbts: result.mintedSbts || [],
    } as DonateResult
  } catch (err: any) {
    logMsg(`❌ Error detectado:`)

    const userFriendlyMessage = parseWalletError(err, locale)

    logMsg(`   ❌ ${userFriendlyMessage}`)
    debugLog('Donation Error', err)

    // Record donation_failed (fire-and-forget)
    try {
      fetch('/api/web-analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'donation_failed',
          metadata: { region_id: params.regionId, amount: params.amount, error: userFriendlyMessage },
        }),
        keepalive: true,
      })
    } catch (_) {}

    throw new Error(userFriendlyMessage)
  }
}
