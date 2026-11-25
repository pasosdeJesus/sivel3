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

export type MetodoAsistente = 'GET' | 'POST' | 'DELETE'

async function sha256Hex(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Nonce de un solo uso: el proxy rechaza la segunda firma con el mismo valor. */
export function nuevoNonce(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function firmaDocumentador(opciones: {
  provider: Eip1193Like
  address: string
  mensaje: string
  timestamp: number
  nonce: string
}): Promise<{ address: string; signature: string; timestamp: number; nonce: string }> {
  const signature = (await opciones.provider.request({
    method: 'personal_sign',
    params: [opciones.mensaje, opciones.address],
  })) as string
  return {
    address: opciones.address.toLowerCase(),
    signature,
    timestamp: opciones.timestamp,
    nonce: opciones.nonce,
  }
}

async function llamar<T>(opciones: {
  provider: Eip1193Like
  address: string
  metodo: MetodoAsistente
  ruta: string
  cuerpo?: string
}): Promise<ResultadoAsistente<T>> {
  const cuerpo = opciones.cuerpo ?? ''
  const rutaConQuery = opciones.ruta
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = nuevoNonce()
  const hash = await sha256Hex(cuerpo)
  const mensaje = `asistente:${opciones.metodo}:${rutaConQuery}:${hash}:${timestamp}:${nonce}`
  const firma = await firmaDocumentador({
    provider: opciones.provider,
    address: opciones.address,
    mensaje,
    timestamp,
    nonce,
  })

  const conCuerpo = opciones.metodo === 'POST'
  const respuesta = await fetch(`/api/asistente/${rutaConQuery}`, {
    method: opciones.metodo,
    headers: {
      'X-Documenter-Address': firma.address,
      'X-Documenter-Signature': firma.signature,
      'X-Documenter-Timestamp': String(firma.timestamp),
      'X-Documenter-Nonce': nonce,
      ...(conCuerpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: conCuerpo ? cuerpo : undefined,
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

export interface TrazaIngesta {
  ingesta_id?: number
  estado?: string
  url?: string
  avisos?: unknown[]
  source_id?: number | null
  texto_original?: string | null
  texto_automatico?: string | null
  generaciones?: number
  candidatos?: unknown[]
  error?: string
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
}): Promise<ResultadoAsistente<TrazaIngesta>> {
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
  /** Fuente de prensa ya descargada (`source_id` del agente). */
  sourceId?: number | null
  /** Ingesta que produjo el texto: activa la cuota por ingesta y la traza. */
  ingestaId?: number | null
  url?: string
}): Promise<ResultadoAsistente<{ relatos?: unknown[]; avisos?: unknown[]; motor?: string }>> {
  const fuente: Record<string, unknown> = {}
  if (opciones.sourceId) fuente.source_id = opciones.sourceId
  if (opciones.url) fuente.url = opciones.url
  return llamar({
    provider: opciones.provider,
    address: opciones.address,
    metodo: 'POST',
    ruta: 'extraer',
    cuerpo: JSON.stringify({
      texto: opciones.texto,
      origen: opciones.origen,
      fuente: Object.keys(fuente).length > 0 ? fuente : undefined,
      ingesta_id: opciones.ingestaId ?? undefined,
    }),
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

export async function guardarCandidato(opciones: {
  provider: Eip1193Like
  address: string
  ingestaId: number
  texto: string
  relatos: unknown[]
  origen: 'noticia' | 'notas'
  consentimiento: boolean
}): Promise<ResultadoAsistente<{ candidato_id?: number; estado?: string; anonimizado?: boolean }>> {
  return llamar({
    provider: opciones.provider,
    address: opciones.address,
    metodo: 'POST',
    ruta: `${opciones.ingestaId}/candidato`,
    cuerpo: JSON.stringify({
      texto: opciones.texto,
      relatos: opciones.relatos,
      origen: opciones.origen,
      consentimiento: opciones.consentimiento,
    }),
  })
}

/** Borra del agente la ingesta con sus generaciones y candidatos. */
export async function borrarIngesta(opciones: {
  provider: Eip1193Like
  address: string
  id: number
}): Promise<ResultadoAsistente> {
  return llamar({
    provider: opciones.provider,
    address: opciones.address,
    metodo: 'DELETE',
    ruta: `${opciones.id}`,
  })
}

export async function saludAsistente(opciones: {
  provider: Eip1193Like
  address: string
}): Promise<ResultadoAsistente<{ ok?: boolean; version?: string; model?: string }>> {
  return llamar({
    provider: opciones.provider,
    address: opciones.address,
    metodo: 'GET',
    ruta: 'health',
  })
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
  const nonce = nuevoNonce()
  const hash = await sha256Hex(cuerpo)
  const firma = await firmaDocumentador({
    provider: opciones.provider,
    address: opciones.address,
    mensaje: `prealerta:${hash}:${timestamp}:${nonce}`,
    timestamp,
    nonce,
  })

  const respuesta = await fetch('/api/pre-alerts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Documenter-Address': firma.address,
      'X-Documenter-Signature': firma.signature,
      'X-Documenter-Timestamp': String(firma.timestamp),
      'X-Documenter-Nonce': nonce,
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
