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
      if (rendered) ok('map page rendered the Leaflet container')
      else fail('map page did not render the Leaflet container')
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
