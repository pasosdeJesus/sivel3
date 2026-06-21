// lib/buyPreAlert.ts
// Client-side purchase of pre-alerts — sends USDT directly to PreAlertMarket
// contract with preAlertId encoded in the transfer data.
// Follows the same MiniPay-compatible pattern as lib/donate.ts.
// No approve step needed — uses a single USDT transfer.

import { parseUnits } from 'viem'
import { PREALERT_MARKET_ADDRESS, USDT_ADDRESS } from '@/lib/contractAddresses'

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

  const txParams = {
    to: usdtAddress,
    data,
    value: '0x0',
    from: effectiveAddress,
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

  // Call backend to verify and record purchase
  const res = await fetch(`/api/pre-alerts/${preAlertId}/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyer_wallet: effectiveAddress, tx_hash: txHash }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || t('error'))
  }

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
