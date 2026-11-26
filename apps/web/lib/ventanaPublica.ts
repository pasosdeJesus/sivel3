// Ventana pública del corpus (R-#22, decisión del operador 2026-11-25).
//
// `PUBLIC_CASES_FROM` / `PUBLIC_CASES_TO` (YYYY-MM-DD, inclusivas) limitan qué casos
// ven los endpoints públicos (mapa, conteos y detalle). Vacías = archivo completo.
// Es un alcance de lanzamiento anunciado en la UI, reversible, no un paywall del
// archivo: se aplica por servidor para que la vista y los conteos cuenten lo mismo.
export interface VentanaPublica {
  desde: string | null
  hasta: string | null
  activa: boolean
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

function fechaValida(valor: string | undefined): string | null {
  if (!valor) return null
  const limpia = valor.trim()
  if (!FECHA.test(limpia)) return null
  const fecha = new Date(`${limpia}T00:00:00Z`)
  return Number.isNaN(fecha.getTime()) ? null : limpia
}

export function ventanaPublica(env = process.env): VentanaPublica {
  const desde = fechaValida(env.PUBLIC_CASES_FROM)
  const hasta = fechaValida(env.PUBLIC_CASES_TO)
  const activa = Boolean(desde || hasta)
  if (desde && hasta && desde > hasta) {
    // Configuración incoherente: se ignora para no devolver cero casos por error.
    console.warn(`[ventana] PUBLIC_CASES_FROM (${desde}) > PUBLIC_CASES_TO (${hasta}); se ignora`)
    return { desde: null, hasta: null, activa: false }
  }
  return { desde, hasta, activa }
}

/** `true` si la fecha (YYYY-MM-DD) queda fuera de la ventana activa. */
export function fueraDeVentana(fecha: string | undefined, ventana = ventanaPublica()): boolean {
  if (!ventana.activa || !fecha) return false
  if (ventana.desde && fecha < ventana.desde) return true
  if (ventana.hasta && fecha > ventana.hasta) return true
  return false
}

/** Texto para la UI (o `null` si no hay ventana). */
export function textoDeVentana(ventana = ventanaPublica(), locale = 'es'): string | null {
  if (!ventana.activa) return null
  const formato = (fecha: string) =>
    new Date(`${fecha}T00:00:00Z`).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-GB', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  if (ventana.desde && ventana.hasta) return `${formato(ventana.desde)} – ${formato(ventana.hasta)}`
  if (ventana.desde) return locale === 'es' ? `desde ${formato(ventana.desde)}` : `from ${formato(ventana.desde)}`
  return locale === 'es' ? `hasta ${formato(ventana.hasta as string)}` : `up to ${formato(ventana.hasta as string)}`
}
