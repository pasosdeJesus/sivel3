'use client'

// Firmas del documentador para la revisión y publicación de alertas (R-#22 P0).
// El navegador firma `personal_sign` (EIP-191) sobre las mismas cadenas que verifica
// `lib/prealertaFirma.ts` en el servidor; el nonce es de un solo uso.
import { nuevoNonce } from '@/lib/asistenteClient'

export interface Eip1193Like {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

export interface ResultadoRevision<T = unknown> {
  ok: boolean
  status: number
  data: T | null
}

async function firmar(opciones: {
  provider: Eip1193Like
  address: string
  mensaje: string
}): Promise<Record<string, string>> {
  const signature = (await opciones.provider.request({
    method: 'personal_sign',
    params: [opciones.mensaje, opciones.address],
  })) as string
  return {
    'X-Documenter-Address': opciones.address.toLowerCase(),
    'X-Documenter-Signature': signature,
  }
}

async function llamar<T>(opciones: {
  provider: Eip1193Like
  address: string
  metodo: 'GET' | 'POST'
  ruta: string
  mensaje: (timestamp: number, nonce: string) => string
}): Promise<ResultadoRevision<T>> {
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = nuevoNonce()
  const cabeceras = await firmar({
    provider: opciones.provider,
    address: opciones.address,
    mensaje: opciones.mensaje(timestamp, nonce),
  })

  const respuesta = await fetch(opciones.ruta, {
    method: opciones.metodo,
    headers: {
      ...cabeceras,
      'X-Documenter-Timestamp': String(timestamp),
      'X-Documenter-Nonce': nonce,
      ...(opciones.metodo === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opciones.metodo === 'POST' ? '{}' : undefined,
  })

  let data: T | null = null
  try {
    data = (await respuesta.json()) as T
  } catch {
    data = null
  }
  return { ok: respuesta.ok, status: respuesta.status, data }
}

/** Cola de alertas `converted`/`published` del documentador, para revisar y publicar. */
export async function listarRevision(opciones: {
  provider: Eip1193Like
  address: string
}): Promise<ResultadoRevision<{ alerts: unknown[] }>> {
  return llamar({
    ...opciones,
    metodo: 'GET',
    ruta: '/api/pre-alerts/review',
    mensaje: (timestamp, nonce) => `revisar:${timestamp}:${nonce}`,
  })
}

export async function publicarAlerta(opciones: {
  provider: Eip1193Like
  address: string
  id: number
}): Promise<ResultadoRevision<{ alert?: { id?: number; status?: string } }>> {
  return llamar({
    ...opciones,
    metodo: 'POST',
    ruta: `/api/pre-alerts/${opciones.id}/publish`,
    mensaje: (timestamp, nonce) => `publicar:${opciones.id}:${timestamp}:${nonce}`,
  })
}

export async function despublicarAlerta(opciones: {
  provider: Eip1193Like
  address: string
  id: number
}): Promise<ResultadoRevision<{ alert?: { id?: number; status?: string } }>> {
  return llamar({
    ...opciones,
    metodo: 'POST',
    ruta: `/api/pre-alerts/${opciones.id}/unpublish`,
    mensaje: (timestamp, nonce) => `despublicar:${opciones.id}:${timestamp}:${nonce}`,
  })
}
