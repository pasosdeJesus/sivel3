// Rol de documentador de sivel3 (R-#20, «Interfaz en sivel3»).
//
// Por ahora la lista vive en `DOCUMENTER_WALLETS`; el paso al SBT
// `DOCUMENTER_ROLE` es el TODO(#9) y no bloquea la mesa asistida.

export function isDocumenterWallet(wallet: string | null | undefined): boolean {
  if (!wallet) return false
  const permitidas = (process.env.DOCUMENTER_WALLETS || '')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
  return permitidas.includes(wallet.toLowerCase())
}

/** Ventana anti-repetición de las firmas del navegador (5 min). */
export const VENTANA_FIRMA_S = 300

// Nonces vistos dentro de la ventana de firma: una acción firmada no se puede
// reenviar. Vive en memoria del proceso; con varias instancias sigue evitando la
// repetición accidental del navegador, no un atacante distribuido.
const noncesVistos = new Map<string, number>()

export function nonceNuevo(nonce: string, ahora = Date.now()): boolean {
  for (const [clave, expiraEn] of noncesVistos) {
    if (expiraEn <= ahora) noncesVistos.delete(clave)
  }
  if (noncesVistos.has(nonce)) return false
  noncesVistos.set(nonce, ahora + VENTANA_FIRMA_S * 1000)
  return true
}

export function olvidarNonces(): void {
  noncesVistos.clear()
}
