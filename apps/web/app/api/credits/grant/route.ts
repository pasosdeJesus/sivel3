import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { acreditar, type MotivoCredito } from '@/lib/creditos'

/**
 * `POST /api/credits/grant` — acredita créditos a una billetera **sin cripto** (R-#22).
 *
 * Es la vía del operador para el estipendio de documentadores (R-#17: créditos para usar
 * la plataforma, no dinero) o un ajuste puntual. Se autentica con
 * `x-credits-secret: $SIVEL3_CREDITS_SECRET`; sin la variable el endpoint no existe.
 *
 * Idempotente: se pasa una `reference` estable (p. ej. `estipendio:2026-11:0x…`) y
 * repetir la llamada no duplica el saldo. `make credits-stipend` es el atajo mensual para
 * todos los documentadores; esta ruta es la manual para uno solo.
 */
export async function POST(req: NextRequest) {
  const secreto = process.env.SIVEL3_CREDITS_SECRET
  if (!secreto) {
    return NextResponse.json(
      { error: 'La acreditación manual no está configurada', code: 'creditos_no_configurado' },
      { status: 503 },
    )
  }
  if (req.headers.get('x-credits-secret') !== secreto) {
    return NextResponse.json({ error: 'No autorizado', code: 'sin_permiso' }, { status: 401 })
  }

  let cuerpo: { wallet?: unknown; credits?: unknown; reason?: unknown; reference?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo no es JSON', code: 'json_invalido' }, { status: 400 })
  }

  const wallet = typeof cuerpo.wallet === 'string' ? cuerpo.wallet.toLowerCase() : ''
  const creditos = Number(cuerpo.credits)
  const motivo: MotivoCredito = cuerpo.reason === 'estipendio' ? 'estipendio' : 'ajuste'
  const referencia =
    typeof cuerpo.reference === 'string' && cuerpo.reference.trim()
      ? cuerpo.reference.trim()
      : `ajuste:${wallet}:${Date.now()}`

  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Billetera inválida', code: 'datos_invalidos' }, { status: 400 })
  }
  if (!Number.isInteger(creditos) || creditos <= 0 || creditos > 100_000) {
    return NextResponse.json(
      { error: 'Los créditos deben ser un entero entre 1 y 100000', code: 'datos_invalidos' },
      { status: 400 },
    )
  }

  try {
    const resultado = await acreditar(newKyselyPostgresql(), {
      wallet,
      creditos,
      motivo,
      referencia,
    })
    return NextResponse.json(
      { wallet, creditos, motivo, referencia, duplicada: resultado.duplicada, saldo: resultado.saldo },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('POST /api/credits/grant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
