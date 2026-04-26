// lib/errors.ts
// Centralización de errores amigables para el usuario
//
// Local TypeScript Objects para i18n (ver doc/I18N.md)

const walletErrorTranslations = {
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
 * Traduce errores de wallet/blockchain a mensajes legibles para el usuario.
 * @param err - Error a traducir
 * @param locale - Código de locale ('en' | 'es', por defecto 'en')
 * Úsala en cualquier catch de operaciones Web3.
 */
export function parseWalletError(err: unknown, locale: string = 'en'): string {
  const t = locale === 'es' ? walletErrorTranslations.es : walletErrorTranslations.en

  const msg = typeof err === 'object' && err !== null && 'message' in err
    ? String((err as any).message)
    : String(err)
  const code = typeof err === 'object' && err !== null ? (err as any).code : undefined

  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
    return t.insufficientFunds
  }
  if (msg.includes('user rejected') || code === 4001) {
    return t.userRejected
  }
  if (msg.includes('network') || msg.includes('RPC')) {
    return t.networkError
  }
  if (msg.includes('gas')) {
    return t.gasError
  }
  // Mensajes que ya vienen traducidos (desde donate.ts)
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

  return t.fallback.replace('{{0}}', msg || (locale === 'es' ? 'Intenta nuevamente más tarde.' : 'Try again later.'))
}
