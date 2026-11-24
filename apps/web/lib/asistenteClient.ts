'use client'

// Cliente del asistente para el navegador (R-#20). El documentador firma cada
// acción con su billetera (EIP-191) y el proxy la verifica antes de llamar al
// agente. El navegador nunca habla con `sivel3agent`.

export interface Eip1193Like {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

export interface ResultadoAsistente<T = unknown> {
  ok: boolean
  status: number
  data: T | null
  texto: string
  contentType: string
}

async function sha256Hex(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function firmaDocumentador(opciones: {
  provider: Eip1193Like
  address: string
  mensaje: string
}): Promise<{ address: string; signature: string; timestamp: number }> {
  const signature = (await opciones.provider.request({
    method: 'personal_sign',
    params: [opciones.mensaje, opciones.address],
  })) as string
  return {
    address: opciones.address.toLowerCase(),
    signature,
    timestamp: Math.floor(Date.now() / 1000),
  }
}

async function llamar<T>(opciones: {
  provider: Eip1193Like
  address: string
  metodo: 'GET' | 'POST'
  ruta: string
  cuerpo?: string
}): Promise<ResultadoAsistente<T>> {
  const cuerpo = opciones.cuerpo ?? ''
  const rutaConQuery = opciones.ruta
  const timestamp = Math.floor(Date.now() / 1000)
  const hash = await sha256Hex(cuerpo)
  const mensaje = `asistente:${opciones.metodo}:${rutaConQuery}:${hash}:${timestamp}`
  const firma = await firmaDocumentador({
    provider: opciones.provider,
    address: opciones.address,
    mensaje,
  })

  const respuesta = await fetch(`/api/asistente/${rutaConQuery}`, {
    method: opciones.metodo,
    headers: {
      'X-Documenter-Address': firma.address,
      'X-Documenter-Signature': firma.signature,
      'X-Documenter-Timestamp': String(timestamp),
      ...(opciones.metodo === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opciones.metodo === 'POST' ? cuerpo : undefined,
  })

  const texto = await respuesta.text()
  const contentType = respuesta.headers.get('content-type') || ''
  let data: T | null = null
  if (contentType.includes('application/json')) {
    try {
      data = JSON.parse(texto) as T
    } catch {
      data = null
    }
  }
  return { ok: respuesta.ok, status: respuesta.status, data, texto, contentType }
}

export async function ingestarUrl(opciones: {
  provider: Eip1193Like
  address: string
  url: string
}): Promise<ResultadoAsistente<{ ingesta_id?: number; estado?: string }>> {
  return llamar({
    provider: opciones.provider,
    address: opciones.address,
    metodo: 'POST',
    ruta: 'ingesta',
    cuerpo: JSON.stringify({ url: opciones.url }),
  })
}

export async function estadoIngesta(opciones: {
  provider: Eip1193Like
  address: string
  id: number
}): Promise<
  ResultadoAsistente<{
    estado?: string
    avisos?: unknown[]
    texto_original?: string
    texto_automatico?: string
    error?: string
  }>
> {
  return llamar({
    provider: opciones.provider,
    address: opciones.address,
    metodo: 'GET',
    ruta: `ingesta/${opciones.id}`,
  })
}

export async function reintentarIngesta(opciones: {
  provider: Eip1193Like
  address: string
  id: number
}): Promise<ResultadoAsistente> {
  return llamar({
    provider: opciones.provider,
    address: opciones.address,
    metodo: 'POST',
    ruta: `ingesta/${opciones.id}/reintentar`,
    cuerpo: '{}',
  })
}

export async function extraerCaso(opciones: {
  provider: Eip1193Like
  address: string
  texto: string
  origen: 'noticia' | 'notas'
  fuente?: Record<string, unknown>
}): Promise<ResultadoAsistente<{ relatos?: unknown[]; avisos?: unknown[]; motor?: string }>> {
  return llamar({
    provider: opciones.provider,
    address: opciones.address,
    metodo: 'POST',
    ruta: 'extraer',
    cuerpo: JSON.stringify({ texto: opciones.texto, origen: opciones.origen, fuente: opciones.fuente }),
  })
}

export async function exportarXrlat(opciones: {
  provider: Eip1193Like
  address: string
  relatos: unknown[]
}): Promise<ResultadoAsistente> {
  return llamar({
    provider: opciones.provider,
    address: opciones.address,
    metodo: 'POST',
    ruta: 'xrlat',
    cuerpo: JSON.stringify({ relatos: opciones.relatos }),
  })
}

export async function saludAsistente(): Promise<ResultadoAsistente<{ ok?: boolean; version?: string; model?: string }>> {
  const respuesta = await fetch('/api/asistente/health', { cache: 'no-store' })
  const texto = await respuesta.text()
  let data = null
  try {
    data = JSON.parse(texto)
  } catch {
    data = null
  }
  return { ok: respuesta.ok, status: respuesta.status, data, texto, contentType: 'application/json' }
}

/** Borrador de prealerta (endpoint del sitio, firmado por el documentador). */
export async function crearPrealerta(opciones: {
  provider: Eip1193Like
  address: string
  relatos: unknown[]
  titulo?: string
  fuente?: Record<string, unknown>
  source_summary?: string
}): Promise<ResultadoAsistente<{ id?: number; status?: string }>> {
  const cuerpo = JSON.stringify({
    relatos: opciones.relatos,
    titulo: opciones.titulo,
    fuente: opciones.fuente,
    source_summary: opciones.source_summary,
  })
  const timestamp = Math.floor(Date.now() / 1000)
  const hash = await sha256Hex(cuerpo)
  const firma = await firmaDocumentador({
    provider: opciones.provider,
    address: opciones.address,
    mensaje: `prealerta:${hash}:${timestamp}`,
  })

  const respuesta = await fetch('/api/pre-alerts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Documenter-Address': firma.address,
      'X-Documenter-Signature': firma.signature,
      'X-Documenter-Timestamp': String(timestamp),
    },
    body: cuerpo,
  })
  const texto = await respuesta.text()
  let data = null
  try {
    data = JSON.parse(texto)
  } catch {
    data = null
  }
  return { ok: respuesta.ok, status: respuesta.status, data, texto, contentType: 'application/json' }
}
