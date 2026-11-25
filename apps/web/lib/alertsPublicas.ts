// Proyección pública de una alerta publicada (R-#22 P0).
//
// La lista y el detalle públicos no devuelven la fila de `pre_alert`: sólo los campos
// del caso propuesto, la fuente y las fechas. Así, aunque alguien amplíe el `select`,
// no se filtran `citizen_notes`, `buyer_wallet`, `publisher_wallet` ni `score`
// (minimización; el circuito del mercado no es contenido público).
export interface FilaAlerta {
  id: number
  json_data?: unknown
  source_urls?: unknown
  source_summary?: string | null
  published_at?: unknown
  created_at?: unknown
}

export interface ResumenAlerta {
  id: number
  titulo: string
  fecha: string
  departamento: string
  municipio: string
  fuentes: number
  publicada: unknown
}

export interface AlertaPublica extends ResumenAlerta {
  hechos: string
  relatos: unknown[]
  resumen_fuente: string | null
}

function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor)
  return ''
}

function datosDe(fila: FilaAlerta): Record<string, unknown> {
  return fila.json_data && typeof fila.json_data === 'object'
    ? (fila.json_data as Record<string, unknown>)
    : {}
}

function cuantasFuentes(fila: FilaAlerta): number {
  if (Array.isArray(fila.source_urls)) return fila.source_urls.length
  if (typeof fila.source_urls === 'string') {
    try {
      const lista = JSON.parse(fila.source_urls)
      return Array.isArray(lista) ? lista.length : 0
    } catch {
      return 0
    }
  }
  return 0
}

export function resumenAlerta(fila: FilaAlerta): ResumenAlerta {
  const datos = datosDe(fila)
  return {
    id: fila.id,
    titulo: texto(datos.titulo),
    fecha: texto(datos.fecha),
    departamento: texto(datos.departamento),
    municipio: texto(datos.municipio),
    fuentes: cuantasFuentes(fila),
    publicada: fila.published_at ?? null,
  }
}

export function alertaPublica(fila: FilaAlerta): AlertaPublica {
  const datos = datosDe(fila)
  const relatos = Array.isArray(datos.relatos)
    ? (datos.relatos as unknown[])
    : Array.isArray(fila.json_data)
      ? (fila.json_data as unknown[])
      : []
  return {
    ...resumenAlerta(fila),
    hechos: texto(datos.hechos ?? datos.descripcion ?? datos.memo),
    relatos,
    resumen_fuente: typeof fila.source_summary === 'string' ? fila.source_summary : null,
  }
}
