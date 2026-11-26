// Smoke HTTP: alertas publicadas, revisión firmada, pase de cuota y créditos (R-#22).
// Verifica lo que el despliegue debe dejar funcionando sin Chrome ni billetera:
//   - /api/alerts es público y devuelve la forma esperada;
//   - revisar/publicar/despublicar exigen la firma del documentador (401 sin ella);
//   - el libro de créditos responde y las rutas de administración no son públicas;
//   - el detalle de caso anuncia la cuota (tolerante: 402 si el IP ya la agotó hoy).
// Run with: bin/m test:e2e --smoke
import { siteBase, get, postJson, ok, fail, summary } from '../helpers/site.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const SITE = siteBase()

async function espera(path, status, extra) {
  const res = await get(`${SITE}${path}`)
  if (res.status !== status) {
    fail(`GET ${path} → ${res.status} (esperaba ${status})`)
    return null
  }
  if (extra) {
    const problema = extra(res.json)
    if (problema) {
      fail(`GET ${path} → ${problema}`)
      return null
    }
  }
  ok(`GET ${path} → ${status}`)
  return res
}

async function rechazaPost(path, statusEsperados, cuerpo = {}) {
  const res = await postJson(`${SITE}${path}`, cuerpo)
  if (!statusEsperados.includes(res.status)) {
    fail(`POST ${path} → ${res.status} (esperaba ${statusEsperados.join('/')})`)
    return
  }
  ok(`POST ${path} → ${res.status} (sin credenciales)`)
}

async function main() {
  const t0 = performance.now()
  console.log(`Smoke: alertas, cuota y créditos — ${SITE}\n`)

  await espera('/api/alerts', 200, (j) => {
    if (!Array.isArray(j?.alerts)) return 'falta el arreglo "alerts"'
    if (typeof j?.total !== 'number') return 'falta "total" numérico'
    return null
  })
  await espera('/api/alerts?limit=0&page=-1', 200, (j) =>
    j?.limit === 20 && j?.page === 1 ? null : `limit/page inesperados: ${j?.limit}/${j?.page}`,
  )
  await espera('/api/alerts/999999999', 404, (j) =>
    j?.code === 'no_existe' ? null : `code inesperado: ${j?.code}`,
  )

  // Ventana pública (R-#22): si está activa, los conteos deben cuadrar con el archivo.
  const conteos = await get(`${SITE}/api/cases/counts`)
  if (conteos.status !== 200) {
    fail(`GET /api/cases/counts → ${conteos.status}`)
  } else if (conteos.json?.ventana) {
    const total = Number(conteos.json.total_archivo)
    if (!(total >= Number(conteos.json.casos))) {
      fail(`counts con ventana: total_archivo ${conteos.json.total_archivo} < casos ${conteos.json.casos}`)
    } else {
      ok(`counts con ventana activa: ${conteos.json.casos} de ${total} casos`)
    }
  } else {
    ok('counts sin ventana pública (archivo completo)')
  }

  // `review` es GET: sin firma debe responder 401, no 405.
  await espera('/api/pre-alerts/review', 401)
  await rechazaPost('/api/pre-alerts/1/publish', [401])
  await rechazaPost('/api/pre-alerts/1/unpublish', [401])

  const billetera = '0x84272a6dd0D5fE9ea2Ab28Cf96e72f4F7da00C5C'
  await espera(`/api/credits/balance?wallet=${billetera}`, 200, (j) =>
    typeof j?.credits === 'number' ? null : 'falta "credits" numérico',
  )
  await espera('/api/credits/balance?wallet=nope', 400)

  // Administración de créditos: nunca abierta. 503 = el secreto no está configurado.
  await rechazaPost('/api/credits/grant', [503, 401], { wallet: billetera, credits: 10 })
  await rechazaPost('/api/credits/stipend', [503, 401])
  await rechazaPost('/api/credits/purchase', [503, 400], { wallet: billetera, txHash: '0x' + '0'.repeat(64) })

  // Pase: sin firma válida no se emite (503 si el servidor no tiene SIVEL3_PASS_SECRET).
  await rechazaPost('/api/wallet-pass', [400, 401, 503], { address: billetera, timestamp: 0, signature: '0x' })

  // Detalle de caso: tolerante con la cuota (1/día por IP en anónimo).
  const osm = await get(`${SITE}/api/cases/datos-osm?zoom=14&bbox=-76.65,2.40,-76.55,2.50`)
  const ids =
    osm.json && osm.json.modo === 'marcadores' && typeof osm.json.respuesta === 'object'
      ? Object.keys(osm.json.respuesta)
      : []
  if (ids.length === 0) {
    ok('detalle de caso: sin marcadores en la ventana de prueba (se omite)')
  } else {
    const res = await fetch(`${SITE}/api/cases/${ids[0]}`, {
      signal: AbortSignal.timeout(20000),
    })
    if (res.status === 200) {
      const restante = res.headers.get('x-cuota-restante')
      if (restante === null) fail('detalle 200 sin cabecera X-Cuota-Restante (¿migración sin aplicar?)')
      else ok(`detalle de caso ${ids[0]} → 200, cuota restante ${restante}`)
    } else if (res.status === 402) {
      ok('detalle de caso → 402 (cuota anónima agotada hoy; comportamiento esperado)')
    } else if (res.status === 404 && (await res.clone().json().catch(() => ({})))?.code === 'fuera_de_ventana') {
      ok('detalle de caso → 404 fuera_de_ventana (ventana pública activa)')
    } else {
      fail(`detalle de caso → ${res.status}`)
    }
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
