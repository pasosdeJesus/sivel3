// Browser spec: imports the known test wallet (apps/.env `PRIVATE_KEY`) into the
// in-app wallet instead of creating a new one, then unlocks it after a reload.
//
// Why it exists: `in-app-wallet.spec.mjs` creates a fresh wallet, which can mint
// real SBTs on a production chain. Importing a wallet that already holds them
// exercises the same UI without creating keys or minting, so this spec is safe
// to run against production (`SITE_URL=https://sivel.xyz`). The form is driven by
// the shared `setupInAppWallet`/`unlockInAppWallet` (testids of
// `@pasosdejesus/m/wallet/next`), no selectors reimplemented here.
//
//   SITE_URL=http://localhost:4000 bin/m test:e2e in-app-wallet-import
import {
  fail,
  initTestEnv,
  launchBrowser,
  ok,
  resetFailures,
  resolveSiteTarget,
  setupInAppWallet,
  summary,
  unlockInAppWallet,
} from '@pasosdejesus/m/e2e'
import {
  chooseInAppWallet,
  connectedChipText,
  loadPrivateKey,
  openWalletDialog,
  waitForConnected,
} from '../helpers/wallet-ui.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const PASSWORD = 'sivel3-e2e-pass'
const PAGE = '/en'

async function main() {
  const t0 = performance.now()
  resetFailures()

  const privateKey = loadPrivateKey()
  if (!privateKey) {
    fail('no PRIVATE_KEY in apps/.env (needed to import the test wallet)')
    process.exit(summary(t0) > 0 ? 1 : 0)
  }

  const env = await initTestEnv()
  const { base } = resolveSiteTarget(env)
  console.log(`In-app wallet — import known test wallet — ${base}\n`)

  const browser = await launchBrowser(env.headless)
  const page = await browser.newPage()
  try {
    await page.goto(`${base}${PAGE}`, { waitUntil: 'domcontentloaded', timeout: 120000 })

    await openWalletDialog(page)
    await chooseInAppWallet(page)
    await setupInAppWallet(page, { privateKey, password: PASSWORD })

    if (await waitForConnected(page)) ok(`imported wallet connected: ${await connectedChipText(page)}`)
    else fail('imported wallet not connected')

    // Reload locks it; unlock through the UI.
    await page.goto(`${base}${PAGE}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await openWalletDialog(page)
    await unlockInAppWallet(page, { password: PASSWORD })

    if (await waitForConnected(page)) ok('imported wallet unlocked and connected')
    else fail('imported wallet did not connect after unlock')
  } finally {
    await browser.close()
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
