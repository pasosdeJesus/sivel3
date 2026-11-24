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
