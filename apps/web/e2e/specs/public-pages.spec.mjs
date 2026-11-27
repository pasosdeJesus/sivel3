// Browser spec: public client pages hydrate and render their data in both
// locales (map, stats, wallet profile). No wallet interaction is required.
//
//   SITE_URL=http://localhost:4000 bin/m test:e2e public-pages
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

async function waitForText(page, text, timeout = 60000) {
  try {
    await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text)
    return true
  } catch {
    return false
  }
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
}

async function waitForLeaflet(page, timeout = 60000) {
  try {
    await page.waitForSelector('.leaflet-container', { timeout })
    return true
  } catch {
    return false
  }
}

async function checkWindowFilters(page, base) {
  let ventana
  try {
    const res = await fetch(`${base}/api/cases/ventana`, { signal: AbortSignal.timeout(20000) })
    ventana = (await res.json())?.ventana ?? null
  } catch (err) {
    fail(`window endpoint failed: ${err.message}`)
    return
  }

  if (!ventana?.activa) {
    ok('no public window configured; date filters stay empty')
    return
  }

  const valores = await page.$$eval('input[type="date"]', (els) => els.map((el) => el.value))
  if (valores.includes(ventana.desde) && valores.includes(ventana.hasta)) {
    ok(`date filters initialised with the window (${ventana.desde} – ${ventana.hasta})`)
  } else {
    fail(
      `date filters ${JSON.stringify(valores)} do not show the window ${ventana.desde} – ${ventana.hasta}`,
    )
  }

  const aviso = await page.$('[data-testid="mapa-aviso-acceso"]')
  if (aviso) fail('access notice is shown while the default window keeps the view under the cap')
  else ok('no access notice with the default window')
}

// Regression: cluster bubbles used to count cells (88) instead of cases (403), and
// the initial view clipped the southern cases. Every visible bubble must add cases
// and the initial view must draw the whole filtered set.
async function checkBubblesAddUpToCases(page, base) {
  const conteos = await fetch(`${base}/api/cases/counts`, {
    signal: AbortSignal.timeout(30000),
  })
    .then((res) => res.json())
    .catch(() => null)
  if (!conteos || typeof conteos.casos !== 'number') {
    fail('counts endpoint unavailable; cannot compare the map bubbles')
    return
  }

  const suma = await page.$$eval('.sivel3-cluster, .sivel3-celda', (els) =>
    els.reduce((total, el) => total + Number(el.textContent || 0), 0),
  )
  if (suma === conteos.casos) {
    ok(`map bubbles add up to the ${conteos.casos} cases of the counts`)
  } else {
    fail(`map bubbles add up to ${suma} but the counts say ${conteos.casos}`)
  }
}

async function checkWidenedRangeNotice(page, base) {
  const ancho = await fetch(
    `${base}/api/cases/counts?filtro%5Bfechaini%5D=1990-01-01&filtro%5Bfechafin%5D=2030-12-31`,
    { signal: AbortSignal.timeout(30000) },
  )
    .then((res) => res.json())
    .catch(() => null)

  if (!ancho || !(Number(ancho.casos) > 2000)) {
    ok(`archive under the row cap (${ancho?.casos ?? '?'} cases); widened notice not exercised`)
    return
  }

  const inputs = await page.$$('input[type="date"]')
  if (inputs.length < 2) {
    fail(`expected the From/To date inputs, found ${inputs.length}`)
    return
  }

  await page.$$eval('input[type="date"]', (els) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    ;['1990-01-01', '2030-12-31'].forEach((valor, i) => {
      if (!els[i]) return
      setter.call(els[i], valor)
      els[i].dispatchEvent(new Event('input', { bubbles: true }))
      els[i].dispatchEvent(new Event('change', { bubbles: true }))
    })
  })

  const mostrado = await page
    .waitForSelector('[data-testid="mapa-aviso-acceso"]', { timeout: 30000 })
    .then(() => true, () => false)
  if (!mostrado) {
    fail('widened range above the row cap did not show the access notice')
    return
  }
  ok(`widened range over ${ancho.casos} cases shows the access notice`)

  // The notice invites the wallet and says nothing about credits or balance
  // (the operator postponed that subject, 2026-11-26).
  const texto = await page.$eval('[data-testid="mapa-aviso-acceso"]', (el) => el.textContent || '')
  if (/cr[eé]dito|saldo|balance/i.test(texto)) {
    fail(`access notice mentions credits or balance: ${texto.trim()}`)
  } else if (!/billetera|wallet/i.test(texto)) {
    fail(`access notice does not invite the wallet: ${texto.trim()}`)
  } else {
    ok('access notice invites the wallet and does not mention credits')
  }
}

async function main() {
  const t0 = performance.now()
  resetFailures()

  const env = await initTestEnv()
  const { base } = resolveSiteTarget(env)
  console.log(`Public pages (browser) — ${base}\n`)

  const browser = await launchBrowser(env.headless)
  const page = await browser.newPage()
  try {
    await goto(page, `${base}/en/cases/osmmap`)
    if (!(await waitForText(page, 'Map of Cases'))) {
      fail('map page did not render its heading')
    } else {
      let rendered = await waitForLeaflet(page)
      if (!rendered) {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 })
        rendered = await waitForLeaflet(page)
      }
      if (rendered) {
        ok('map page rendered the Leaflet container')
        await checkWindowFilters(page, base)
        await checkBubblesAddUpToCases(page, base)
        await checkWidenedRangeNotice(page, base)
      } else fail('map page did not render the Leaflet container')
    }

    await goto(page, `${base}/en/stats`)
    if (await waitForText(page, 'Site Statistics')) ok('EN stats page rendered')
    else fail('EN stats page did not render its heading')

    await goto(page, `${base}/es/stats`)
    if (await waitForText(page, 'Estadísticas del Sitio')) ok('ES stats page rendered')
    else fail('ES stats page did not render its heading')

    await goto(page, `${base}/en/wallet/${env.account.address}`)
    if (!(await waitForText(page, 'Wallet Profile'))) {
      fail('wallet profile page did not render its heading')
    } else {
      const loaded = await page.waitForFunction(
        () =>
          !document.body.innerText.includes('Loading...') &&
          (document.body.innerText.includes('Activity') ||
            document.body.innerText.includes('not found')),
        { timeout: 60000 },
      ).then(() => true, () => false)
      if (loaded) ok('wallet profile page loaded its data')
      else fail('wallet profile page stayed in the loading state')
    }
  } finally {
    await browser.close()
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
