// lib/donate.ts
// Lógica de donación unificada (transferencia USDT + backend)
//
// Helpers de parseo desde el motor usdt (https://gitlab.com/pasosdeJesus/m/-/work_items/35 §15.7):
// @pasosdejesus/usdt/lib/donate-utils.

import { logger } from './logger'
import { debugLog } from './debug'
import { parseWalletError } from './errors'
import { parseUserAmount, safeParseFloat } from '@pasosdejesus/usdt/lib/donate-utils'
import type { Eip1193Provider } from '@pasosdejesus/m/wallet'

export interface DonateParams {
  regionId: number
  amount: string
  effectiveAddress: `0x${string}`
  /** Effective EIP-1193 provider (in-app or external). */
  provider: Eip1193Provider
  usdtContractAddress: `0x${string}`
  regionalDonationContractAddress: `0x${string}`
}

export interface DonateResult {
  txHash: string
  slearn?: {
    success: boolean
    slearnMinted?: string
    message?: string
    userMessage?: string
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
  const { regionId, amount, effectiveAddress, provider, usdtContractAddress, regionalDonationContractAddress } = params
  const t = locale === 'es' ? donateTranslations.es : donateTranslations.en

  const logMsg = (msg: string) => {
    console.log(`🔍 [donate] ${msg}`)
    logger.info(msg, 'Donate')
  }

  logMsg(`Iniciando - Región: ${regionId}, Monto: ${amount}`)
  logMsg(`✅ Contract addresses: USDT=${usdtContractAddress}, Donation=${regionalDonationContractAddress}`)

  const amountNum = safeParseFloat(amount)
  if (amountNum < 0.02) {
    const errorMsg = t.minAmount.replace('{{0}}', String(amountNum))
    logMsg(`❌ ${errorMsg}`)
    throw new Error(errorMsg)
  }

  const amountInSmallestUnit = parseUserAmount(amount, 6)
  logMsg(`Monto en unidades pequeñas: ${amountInSmallestUnit.toString()}`)

  // Codificar el data con el regionId (32 bytes)
  const regionIdHex = BigInt(regionId).toString(16).padStart(64, '0')
  logMsg(`RegionId hex: ${regionIdHex}`)

  // Codificar transferencia ERC-20: transfer(address to, uint256 amount)
  // Donation goes to sivel.xyz backend (splits 90% to RegionalDonation, 10% to SLEARN reserve)
  const transferSelector = '0xa9059cbb'
  const backendAddress = (process.env.NEXT_PUBLIC_ADDRESS || regionalDonationContractAddress) as string
  const toHex = backendAddress.slice(2).toLowerCase().padStart(64, '0')
  const amountHex = amountInSmallestUnit.toString(16).padStart(64, '0')
  const transferData = transferSelector + toHex + amountHex + regionIdHex

  logMsg(`Transfer data (primeros 100 chars): ${transferData.substring(0, 100)}...`)

  if (!provider) {
    logMsg(`❌ No hay wallet disponible`)
    throw new Error(t.noWallet)
  }

  const txParams = {
    from: effectiveAddress,
    to: usdtContractAddress,
    data: transferData,
    value: '0x0',
  }

  try {
    // The effective EIP-1193 provider is the in-app wallet or the external one;
    // both support `eth_sendTransaction` via `request` (no MiniPay `send` path).
    logMsg(`🔄 Enviando transacción con la billetera (provider EIP-1193)...`)
    const txHash = (await provider.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    })) as string
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
      slearn: result.slearn,
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
