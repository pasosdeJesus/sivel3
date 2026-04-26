// lib/errors.ts
// Centralización de errores amigables para el usuario

/**
 * Traduce errores de wallet/blockchain a mensajes legibles para el usuario.
 * Úsala en cualquier catch de operaciones Web3.
 */
export function parseWalletError(err: unknown): string {
  const msg = typeof err === 'object' && err !== null && 'message' in err
    ? String((err as any).message)
    : String(err)
  const code = typeof err === 'object' && err !== null ? (err as any).code : undefined

  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
    return '❌ Saldo insuficiente.\n\nNo tienes suficientes USDT para realizar esta donación.'
  }
  if (msg.includes('user rejected') || code === 4001) {
    return '⚠️ Transacción cancelada.\n\nCancelaste la transacción en tu wallet.'
  }
  if (msg.includes('network') || msg.includes('RPC')) {
    return '🌐 Error de red.\n\nNo se pudo conectar con la red. Verifica tu conexión.'
  }
  if (msg.includes('gas')) {
    return '⛽ Error de gas.\n\nNo tienes suficiente CELO para pagar la transacción.'
  }
  if (msg.includes('monto mínimo')) {
    return msg
  }

  return `❌ Error en la operación.\n\n${msg || 'Intenta nuevamente más tarde.'}`
}
