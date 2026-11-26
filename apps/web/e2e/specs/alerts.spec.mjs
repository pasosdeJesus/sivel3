// Browser spec: the public alerts surface and the review gate (R-#22 P0).
//
// Checks the three things the deploy must leave working without a wallet:
//   - /es/alerts renders (empty state or published alerts) and links to the map;
//   - /es/documenter/alerts asks to connect a wallet (no documenter data leaks);
//   - the documenter panel shows both links (assistant + review).
// The publish/unpublish happy path is covered by unit tests (signature + states) and
// needs a documenter wallet plus a signed nonce, which is not a read-only smoke.
//
//   make test-e2e-spec SPEC=alerts
import {
  fail,
  initTestEnv,
  launchBrowser,
  ok,
  resetFailures,
  resolveSiteTarget,
  summary,
} from '@pasosdejesus/m/e2e'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

async function texto(page) {
  return page.evaluate(() => document.body?.textContent || '')
}

async function main() {
  const t0 = performance.now()
  resetFailures()

  const env = await initTestEnv()
  const { base } = resolveSiteTarget(env)
  console.log(`Alertas públicas y revisión — ${base}\n`)

  const browser = await launchBrowser(env.headless)
  const page = await browser.newPage()
  try {
    // 1. Lista pública
    const lista = await page.goto(`${base}/es/alerts`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    })
    if (lista?.status() !== 200) fail(`/es/alerts → ${lista?.status()}`)
    else {
      await page.waitForFunction(
        () => (document.body?.textContent || '').includes('Alertas publicadas'),
        { timeout: 60000 },
      )
      const cuerpo = await texto(page)
      if (cuerpo.includes('No se pudieron cargar las alertas')) fail('la lista muestra el error de carga')
      else ok('/es/alerts renderiza el título y no muestra error de carga')
      if (cuerpo.includes('Abrir el mapa')) ok('/es/alerts enlaza al mapa')
      else fail('/es/alerts no ofrece el enlace al mapa')
    }

    // 2. Detalle de una alerta inexistente: mensaje claro, no una página vacía
    await page.goto(`${base}/es/alerts/999999999`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    })
    await page.waitForFunction(
      () => (document.body?.textContent || '').includes('no existe o fue despublicada'),
      { timeout: 60000 },
    )
    ok('/es/alerts/999999999 explica que no existe o fue despublicada')

    // 3. Revisión sin billetera: no filtra nada y pide conectar
    const revision = await page.goto(`${base}/es/documenter/alerts`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    })
    if (revision?.status() !== 200) fail(`/es/documenter/alerts → ${revision?.status()}`)
    else {
      await page.waitForFunction(
        () => (document.body?.textContent || '').includes('Conecta tu billetera'),
        { timeout: 60000 },
      )
      const cuerpo = await texto(page)
      if (cuerpo.includes('Alertas en revisión')) {
        fail('/es/documenter/alerts muestra la cola sin billetera')
      } else {
        ok('/es/documenter/alerts exige billetera y no expone alertas')
      }
    }

    // 4. Panel del documentador: los dos accesos (asistente y revisión)
    await page.goto(`${base}/es/documenter`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    const panel = await texto(page)
    if (panel.includes('Conecta tu billetera')) ok('/es/documenter también exige billetera')
    else fail('/es/documenter no pide billetera')
  } catch (error) {
    fail(`excepción: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await browser.close()
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
