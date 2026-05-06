// lib/errors.ts
// Centralized wallet/blockchain error parsing with user-friendly messages.
//
// Uses @pasosdejesus/m/i18n createTranslator for consistent i18n pattern.

import { createTranslator } from '@pasosdejesus/m/i18n'
import type { TranslationSet } from '@pasosdejesus/m/i18n'

const walletErrorTranslations: TranslationSet = {
  en: {
    insufficientFunds: "❌ Insufficient balance.\n\nYou don't have enough USDT for this donation.",
    userRejected: '⚠️ Transaction cancelled.\n\nYou cancelled the transaction in your wallet.',
    networkError: '🌐 Network error.\n\nCould not connect to the network. Check your connection.',
    gasError: "⛽ Gas error.\n\nYou don't have enough CELO to pay for the transaction.",
    fallback: '❌ Operation error.\n\n{{0}}',
  },
  es: {
    insufficientFunds: '❌ Saldo insuficiente.\n\nNo tienes suficientes USDT para realizar esta donación.',
    userRejected: '⚠️ Transacción cancelada.\n\nCancelaste la transacción en tu wallet.',
    networkError: '🌐 Error de red.\n\nNo se pudo conectar con la red. Verifica tu conexión.',
    gasError: '⛽ Error de gas.\n\nNo tienes suficiente CELO para pagar la transacción.',
    fallback: '❌ Error en la operación.\n\n{{0}}',
  },
}

/**
 * Translates wallet/blockchain errors to user-friendly messages.
 * @param err - Error to translate
 * @param locale - Locale code ('en' | 'es', default 'en')
 * Use in any Web3 operation catch block.
 */
export function parseWalletError(err: unknown, locale: string = 'en'): string {
  const t = createTranslator(locale, walletErrorTranslations)

  const msg = typeof err === 'object' && err !== null && 'message' in err
    ? String((err as any).message)
    : String(err)
  const code = typeof err === 'object' && err !== null ? (err as any).code : undefined

  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
    return t('insufficientFunds')
  }
  if (msg.includes('user rejected') || code === 4001) {
    return t('userRejected')
  }
  if (msg.includes('network') || msg.includes('RPC')) {
    return t('networkError')
  }
  if (msg.includes('gas')) {
    return t('gasError')
  }
  // Pre-translated messages from donate.ts
  if (
    msg.includes('monto mínimo') ||
    msg.includes('minimum amount') ||
    msg.includes('no pudo ser verificada') ||
    msg.includes('no se pudo asignar') ||
    msg.includes('could not be verified') ||
    msg.includes('could not be assigned')
  ) {
    return msg
  }

  return t('fallback', msg || (locale === 'es' ? 'Intenta nuevamente más tarde.' : 'Try again later.'))
}
