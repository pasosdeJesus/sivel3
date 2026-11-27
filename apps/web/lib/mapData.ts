// Map data surface helpers (https://gitlab.com/pasosdeJesus/sivel3/-/issues/69):
// bounding box parsing, zoom parsing and the cell size used to aggregate cases
// on the server when the map is zoomed out.

export interface Bbox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

/** Hard cap for one response, in rows (markers or cells). */
export const MAX_ROWS = 5_000

/** Zoom from which individual markers are served. */
export const MARKERS_FROM_ZOOM = 11

/** Zoom used when the request does not send one (country view). */
export const DEFAULT_ZOOM = 4

export type Parsed<T> = { value: T } | { error: string }

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value)
}

/** `minLng,minLat,maxLng,maxLat`. Absent is valid (no viewport). */
export function parseBbox(raw: string | null): Parsed<Bbox | null> {
  if (raw === null || raw.trim() === '') return { value: null }

  const parts = raw.split(',').map((part) => Number(part.trim()))
  if (parts.length !== 4 || !parts.every(isFiniteNumber)) {
    return { error: 'bbox debe ser minLng,minLat,maxLng,maxLat' }
  }

  const [minLng, minLat, maxLng, maxLat] = parts as [number, number, number, number]
  if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
    return { error: 'bbox fuera de rango' }
  }
  if (minLng >= maxLng || minLat >= maxLat) {
    return { error: 'bbox vacío o invertido' }
  }
  return { value: { minLng, minLat, maxLng, maxLat } }
}

export function parseZoom(raw: string | null): Parsed<number> {
  if (raw === null || raw.trim() === '') return { value: DEFAULT_ZOOM }
  const zoom = Number(raw)
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 20) {
    return { error: 'zoom debe ser un entero entre 0 y 20' }
  }
  return { value: zoom }
}

/**
 * Cell size in degrees for the given zoom, or `null` when individual markers
 * are served. Initial steps: 0.5 (below 6), 0.1 (below 9), 0.02 (below 11).
 */
export function cellStepForZoom(zoom: number): number | null {
  if (zoom >= MARKERS_FROM_ZOOM) return null
  if (zoom < 6) return 0.5
  if (zoom < 9) return 0.1
  return 0.02
}

/**
 * Casos que representa un marcador: una celda agregada vale su `n` y un caso
 * individual vale 1. Sin esto la burbuja de un clúster contaba celdas y mostraba
 * un número que no cuadraba con los conteos.
 */
export function casosDeMarcador(marker: { options?: { n?: unknown } }): number {
  const n = Number(marker.options?.n)
  return Number.isFinite(n) && n > 0 ? n : 1
}

/** Total de casos de los marcadores de un clúster. */
export function casosDeCluster(markers: Array<{ options?: { n?: unknown } }>): number {
  return markers.reduce((total, marker) => total + casosDeMarcador(marker), 0)
}
