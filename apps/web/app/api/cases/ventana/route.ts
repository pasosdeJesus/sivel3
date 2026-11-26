import { NextResponse } from 'next/server'

import { ventanaPublica } from '@/lib/ventanaPublica'

/**
 * `GET /api/cases/ventana` — ventana pública del corpus (R-#22).
 *
 * La UI la necesita para **inicializar** los filtros de fecha con lo configurado en el
 * servidor (`PUBLIC_CASES_FROM`/`PUBLIC_CASES_TO`) y para no mostrar avisos mientras el
 * usuario está dentro de ella. Vacía = archivo completo.
 */
export async function GET() {
  const ventana = ventanaPublica()
  return NextResponse.json(
    { ventana: { desde: ventana.desde, hasta: ventana.hasta, activa: ventana.activa } },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
