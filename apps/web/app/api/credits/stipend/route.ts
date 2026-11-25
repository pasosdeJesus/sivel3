import { NextRequest, NextResponse } from 'next/server'

import { newKyselyPostgresql } from '@/.config/kysely.config'
import { acreditar, CREDITOS_ESTIPENDIO } from '@/lib/creditos'

/**
 * `POST /api/credits/stipend` — estipendio mensual de créditos para los documentadores
 * (R-#22 P2, R-#17: 4.000 créditos/mes).
 *
 * Lo llama un cron con `x-stipend-secret: $SIVEL3_STIPEND_SECRET`; sin la variable el
 * endpoint no existe (503). Idempotente por referencia `stipend:YYYY-MM:<wallet>`: correr
 * el cron dos veces el mismo mes no duplica el estipendio.
 */
export async function POST(req: NextRequest) {
  const secreto = process.env.SIVEL3_STIPEND_SECRET
  if (!secreto) {
    return NextResponse.json(
      { error: 'El estipendio no está configurado', code: 'estipendio_no_configurado' },
      { status: 503 },
    )
  }
  if (req.headers.get('x-stipend-secret') !== secreto) {
    return NextResponse.json({ error: 'No autorizado', code: 'sin_permiso' }, { status: 401 })
  }

  const ahora = new Date()
  const mes = `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, '0')}`
  const wallets = (process.env.DOCUMENTER_WALLETS || '')
    .split(',')
    .map((wallet) => wallet.trim().toLowerCase())
    .filter((wallet) => /^0x[0-9a-f]{40}$/.test(wallet))

  if (wallets.length === 0) {
    return NextResponse.json({ month: mes, acreditados: [], motivo: 'sin_documentadores' })
  }

  try {
    const db = newKyselyPostgresql()
    const acreditados: Array<{ wallet: string; duplicada: boolean }> = []
    for (const wallet of wallets) {
      const resultado = await acreditar(db, {
        wallet,
        creditos: CREDITOS_ESTIPENDIO,
        motivo: 'estipendio',
        referencia: `stipend:${mes}:${wallet}`,
      })
      acreditados.push({ wallet, duplicada: resultado.duplicada })
    }
    return NextResponse.json({ month: mes, creditos: CREDITOS_ESTIPENDIO, acreditados })
  } catch (error) {
    console.error('POST /api/credits/stipend error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
