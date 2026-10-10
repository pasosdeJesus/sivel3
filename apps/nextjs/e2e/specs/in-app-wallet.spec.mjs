// Browser spec: the in-app wallet (sivel3's default after REQ/67) is created and,
// after a reload (which locks it), unlocked through the UI. The form itself is
// driven by the shared `setupInAppWallet`/`unlockInAppWallet`, which target the
// testids of `@pasosdejesus/m/wallet/next` — no selectors reimplemented here.
//
//   SITE_URL=http://localhost:4000 bin/m test:e2e in-app-wallet
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
  openWalletDialog,
  waitForConnected,
  waitForRecoveryPhrase,
} from '../helpers/wallet-ui.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const PASSWORD = 'sivel3-e2e-pass'
const PAGE = '/en'

async function main() {
  const t0 = performance.now()
  resetFailures()

  const env = await initTestEnv()
  const { base } = resolveSiteTarget(env)
  console.log(`In-app wallet — create/unlock — ${base}\n`)

  const browser = await launchBrowser(env.headless)
  const page = await browser.newPage()
  try {
    await page.goto(`${base}${PAGE}`, { waitUntil: 'domcontentloaded', timeout: 120000 })

    // ── Create ──
    await openWalletDialog(page)
    await chooseInAppWallet(page)
    await setupInAppWallet(page, { password: PASSWORD })

    if (await waitForRecoveryPhrase(page)) ok('in-app wallet created — recovery phrase shown')
    else fail('recovery phrase not shown after create')

    if (await waitForConnected(page)) ok(`in-app wallet connected: ${await connectedChipText(page)}`)
    else fail('in-app wallet not connected after create')

    // ── Reload (locks it) → unlock through the UI ──
    await page.goto(`${base}${PAGE}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await openWalletDialog(page)
    await unlockInAppWallet(page, { password: PASSWORD })

    if (await waitForConnected(page)) ok('in-app wallet unlocked and connected')
    else fail('in-app wallet did not connect after unlock')
  } finally {
    await browser.close()
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
