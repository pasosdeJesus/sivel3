import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'

import { isDocumenterWallet, nonceNuevo, VENTANA_FIRMA_S } from '@/lib/documenter'

// Firmas del documentador para la revisión y publicación de alertas (R-#22 P0).
// El navegador firma con `personal_sign` (EIP-191) un mensaje de una línea que
// ata la acción y, cuando aplica, el id de la alerta; el nonce evita repetirla.
// Las mismas cadenas viven en `lib/documenterClient.ts` (navegador).

export function mensajeListadoRevision(timestamp: number, nonce: string): string {
  return `revisar:${timestamp}:${nonce}`
}

export function mensajePublicar(id: number, timestamp: number, nonce: string): string {
  return `publicar:${id}:${timestamp}:${nonce}`
}

export function mensajeDespublicar(id: number, timestamp: number, nonce: string): string {
  return `despublicar:${id}:${timestamp}:${nonce}`
}

export type ResultadoFirma = { ok: true; wallet: string } | { ok: false; respuesta: NextResponse }

function error(status: number, code: string, mensaje: string): NextResponse {
  return NextResponse.json({ error: mensaje, code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Verifica la firma del documentador sobre `mensaje`. Mismo contrato que
 * `POST /api/pre-alerts`: cabeceras `X-Documenter-*`, ventana de 5 minutos, rol por
 * `DOCUMENTER_WALLETS` y nonce de un solo uso.
 */
export async function autorizarDocumentador(
  req: NextRequest,
  mensaje: string,
): Promise<ResultadoFirma> {
  const wallet = (req.headers.get('x-documenter-address') || '').toLowerCase()
  const firma = req.headers.get('x-documenter-signature') || ''
  const timestamp = Number(req.headers.get('x-documenter-timestamp') || 0)
  const nonce = req.headers.get('x-documenter-nonce') || ''

  if (!wallet || !firma || !timestamp || nonce.length < 8) {
    return { ok: false, respuesta: error(401, 'sin_firma', 'Falta la firma del documentador') }
  }
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > VENTANA_FIRMA_S) {
    return { ok: false, respuesta: error(401, 'firma_vencida', 'La firma del documentador venció') }
  }
  if (!isDocumenterWallet(wallet)) {
    return {
      ok: false,
      respuesta: error(403, 'no_documenter', 'La billetera no tiene permiso de documentador'),
    }
  }
  if (!nonceNuevo(nonce)) {
    return { ok: false, respuesta: error(401, 'nonce_repetido', 'La acción ya se envió') }
  }

  let valida = false
  try {
    valida = await verifyMessage({
      address: wallet as `0x${string}`,
      message: mensaje,
      signature: firma as `0x${string}`,
    })
  } catch {
    valida = false
  }
  if (!valida) {
    return { ok: false, respuesta: error(401, 'firma_invalida', 'La firma no corresponde a la acción') }
  }
  return { ok: true, wallet }
}
