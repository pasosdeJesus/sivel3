import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'

import { isDocumenterWallet, nonceNuevo, VENTANA_FIRMA_S } from '@/lib/documenter'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import {
  AgenteNoConfigurado,
  agenteConfigurado,
  codigoDeError,
  llamarAgente,
  sha256Hex,
} from '@/lib/sivel3agent'

// Proxy del asistente de documentación (R-#20). El navegador nunca habla con
// `sivel3agent`: firma aquí su acción, este route handler verifica el rol de
// documentador y la firma, y reenvía al agente firmado con la llave dedicada del
// canal. La ruta es una lista blanca para no convertir el proxy en un túnel.

const RUTAS_PERMITIDAS: Array<{ metodo: 'GET' | 'POST' | 'DELETE'; patron: RegExp }> = [
  { metodo: 'POST', patron: /^ingesta$/ },
  { metodo: 'GET', patron: /^ingesta\/\d+$/ },
  { metodo: 'POST', patron: /^ingesta\/\d+\/reintentar$/ },
  { metodo: 'POST', patron: /^extraer$/ },
  { metodo: 'POST', patron: /^xrlat$/ },
  { metodo: 'GET', patron: /^health$/ },
  { metodo: 'GET', patron: /^\d+$/ },
  { metodo: 'POST', patron: /^\d+\/candidato$/ },
  { metodo: 'DELETE', patron: /^\d+$/ },
]

function autorizada(metodo: string, ruta: string): boolean {
  return RUTAS_PERMITIDAS.some((r) => r.metodo === metodo && r.patron.test(ruta))
}

function jsonError(status: number, code: string, mensaje: string): NextResponse {
  return NextResponse.json({ error: mensaje, code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

type Ctx = { params: Promise<{ ruta: string[] }> }

async function manejar(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const limited = checkRateLimit(req, { scope: 'asistente', limit: 120, windowMs: 60_000 })
  if (!limited.ok) return rateLimitResponse(limited.retryAfter)

  if (!agenteConfigurado()) {
    return jsonError(503, 'agente_no_configurado', 'El asistente no está configurado')
  }

  const { ruta: partes } = await ctx.params
  const ruta = (partes ?? []).join('/')
  const metodo = req.method === 'POST' ? 'POST' : req.method === 'DELETE' ? 'DELETE' : 'GET'
  if (!autorizada(metodo, ruta)) {
    return jsonError(404, 'ruta_desconocida', 'Ruta del asistente no permitida')
  }

  const cuerpo = metodo === 'POST' ? await req.text() : ''

  const wallet = (req.headers.get('x-documenter-address') || '').toLowerCase()
  const firma = req.headers.get('x-documenter-signature') || ''
  const timestamp = Number(req.headers.get('x-documenter-timestamp') || 0)
  const nonce = req.headers.get('x-documenter-nonce') || ''
  if (!wallet || !firma || !timestamp || nonce.length < 8) {
    return jsonError(401, 'sin_firma', 'Falta la firma del documentador')
  }
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > VENTANA_FIRMA_S) {
    return jsonError(401, 'firma_vencida', 'La firma del documentador venció')
  }
  if (!isDocumenterWallet(wallet)) {
    return jsonError(403, 'no_documenter', 'La billetera no tiene permiso de documentador')
  }

  const rutaConQuery = `${ruta}${new URL(req.url).search}`
  if (!nonceNuevo(nonce)) {
    return jsonError(401, 'nonce_repetido', 'La acción ya se envió')
  }
  const mensaje = `asistente:${metodo}:${rutaConQuery}:${sha256Hex(cuerpo)}:${timestamp}:${nonce}`
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
  if (!valida) return jsonError(401, 'firma_invalida', 'La firma no corresponde a la acción')

  try {
    const respuesta = await llamarAgente({
      metodo,
      ruta: `/api/revision/${rutaConQuery}`,
      cuerpo,
      usuario: wallet,
    })

    if (respuesta.status >= 400) {
      const code = codigoDeError(respuesta.status, respuesta.body)
      return new NextResponse(respuesta.body || JSON.stringify({ error: code, code }), {
        status: respuesta.status,
        headers: {
          'Content-Type': respuesta.contentType,
          'Cache-Control': 'no-store',
          ...reencabezadosAgente(respuesta.headers),
        },
      })
    }

    const sinCuerpo = respuesta.status === 204 || respuesta.status === 205 || respuesta.status === 304
    return new NextResponse(sinCuerpo ? null : respuesta.body, {
      status: respuesta.status,
      headers: {
        'Content-Type': respuesta.contentType,
        'Cache-Control': 'no-store',
        ...reencabezadosAgente(respuesta.headers),
      },
    })
  } catch (error) {
    if (error instanceof AgenteNoConfigurado) {
      return jsonError(503, 'agente_no_configurado', 'El asistente no está configurado')
    }
    const esTimeout = error instanceof Error && /timeout|abort/i.test(error.message)
    return jsonError(esTimeout ? 504 : 502, esTimeout ? 'agente_tiempo' : 'agente_caido', 'El asistente no respondió')
  }
}

function reencabezadosAgente(cabeceras: Record<string, string>): Record<string, string> {
  const salida: Record<string, string> = {}
  if (cabeceras['retry-after']) salida['Retry-After'] = cabeceras['retry-after']
  if (cabeceras['location']) salida.Location = cabeceras['location']
  return salida
}

export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  return manejar(req, ctx)
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  return manejar(req, ctx)
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  return manejar(req, ctx)
}
