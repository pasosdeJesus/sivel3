// lib/buyPreAlert.ts
// Client-side purchase of pre-alerts — sends USDT directly to PreAlertMarket
// contract with preAlertId encoded in the transfer data.
// Follows the same MiniPay-compatible pattern as lib/donate.ts.
// No approve step needed — uses a single USDT transfer.

import { parseUnits } from 'viem'
import { PREALERT_MARKET_ADDRESS, USDT_ADDRESS } from '@/lib/contractAddresses'
import { debugLog, logger } from '@/lib/debug'

const PRICE_USDT = 1 // Fixed $1 price (MVP)

const tS = {
  en: {
    noWallet: 'No wallet provider available',
    verifying: 'Sending purchase transaction…',
    success: 'Pre-alert purchased! You have 7 days to convert it.',
    error: 'Purchase failed',
    insufficient: 'Insufficient USDT balance',
    cancelled: 'Transaction cancelled',
    network: 'Network error',
  },
  es: {
    noWallet: 'No hay billetera disponible',
    verifying: 'Enviando transacción de compra…',
    success: '¡Pre-alerta comprada! Tienes 7 días para convertirla.',
    error: 'Compra fallida',
    insufficient: 'Saldo USDT insuficiente',
    cancelled: 'Transacción cancelada',
    network: 'Error de red',
  },
}

export interface BuyPreAlertResult {
  txHash: string
}

/**
 * Purchase a pre-alert by sending USDT directly to the PreAlertMarket contract
 * with the preAlertId encoded in the transfer data.
 *
 * Works with MiniPay (legacy eth_sendTransaction) and MetaMask.
 */
export async function buyPreAlert(
  preAlertId: number,
  effectiveAddress: `0x${string}`,
  locale: string = 'en',
): Promise<BuyPreAlertResult> {
  const t = (k: keyof typeof tS.en) => (tS[locale as keyof typeof tS]?.[k] || tS.en[k]) as string

  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error(t('noWallet'))
  }

  const ethereum = (window as any).ethereum
  const isMiniPay = ethereum.isMiniPay === true
  const contractAddress = PREALERT_MARKET_ADDRESS
  const usdtAddress = USDT_ADDRESS
  const amount = parseUnits(String(PRICE_USDT), 6)

  // Encode: ERC-20 transfer(address,uint256) + regionId-style encoding of preAlertId
  // selector(4) + to(32) + amount(32) + preAlertId(32)
  const selector = '0xa9059cbb'
  const to = contractAddress.slice(2).padStart(64, '0')
  const amt = amount.toString(16).padStart(64, '0')
  const pid = BigInt(preAlertId).toString(16).padStart(64, '0')
  const data = (selector + to + amt + pid) as `0x${string}`

  const txParams: Record<string, any> = {
    to: usdtAddress,
    data,
    value: '0x0',
    from: effectiveAddress,
  }

  // MiniPay doesn't support eth_estimateGas — set explicit gas limit
  if (isMiniPay) {
    txParams.gas = '0x30d40' // 200,000 gas
  }

  let txHash: string

  if (isMiniPay) {
    const raw = await ethereum.send({
      method: 'eth_sendTransaction',
      params: [txParams],
    })
    txHash = extractMiniPayHash(raw)
  } else {
    txHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    })
  }

  // Call backend to verify and record purchase (with retries)
  // The backend verifies the on-chain transfer — may fail if tx not yet confirmed.
  // 4xx errors continue retrying (tx may confirm in next seconds).
  // 5xx and network errors retry.
  let backendResponse: Response | null = null
  let lastError: string = ''
  let lastStatus: string = ''
  let isClientError = false

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      logger.info(
        `[buyPreAlert #${preAlertId}] Backend attempt ${attempt}/5 — txHash: ${txHash}`,
        'buyPreAlert',
      )
      backendResponse = await fetch(`/api/pre-alerts/${preAlertId}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_wallet: effectiveAddress, tx_hash: txHash }),
      })

      if (backendResponse.ok) break

      const errorBody = await backendResponse.json().catch(() => ({}))
      lastError = errorBody.error || `HTTP ${backendResponse.status}`
      lastStatus = `HTTP ${backendResponse.status}`
      debugLog(`buyPreAlert #${preAlertId} attempt ${attempt}/5`, {
        status: lastStatus,
        error: lastError,
      })

      if (backendResponse.status >= 400 && backendResponse.status < 500) {
        isClientError = true
      }
    } catch (err: any) {
      lastError = err.message
      debugLog(`buyPreAlert #${preAlertId} attempt ${attempt}/5 network error`, {
        error: lastError,
      })
    }

    if (attempt < 5) await new Promise((r) => setTimeout(r, 2000))
  }

  if (!backendResponse || !backendResponse.ok) {
    const msg = isClientError
      ? `Could not verify purchase (${lastStatus}). ${lastError}. Contact the team if the problem persists.`
      : `Purchase verification failed after 5 attempts. Funds are safe in the contract. Hash: ${txHash.slice(0, 16)}…`
    debugLog(`buyPreAlert #${preAlertId} FAILED`, { status: lastStatus, error: lastError, txHash })
    throw new Error(msg)
  }

  logger.info(
    `[buyPreAlert #${preAlertId}] Purchase verified by backend. TX: ${txHash}`,
    'buyPreAlert',
  )
  return { txHash }
}

function extractMiniPayHash(response: any): string {
  if (typeof response === 'string') return response
  if (response?.result?.hash) return response.result.hash
  if (response?.result) return response.result
  if (response?.hash) return response.hash
  if (response?.transactionHash) return response.transactionHash
  throw new Error('Unexpected MiniPay response: ' + JSON.stringify(response))
}
