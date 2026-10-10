// Browser spec: the external-wallet path of the header ConnectWalletButton.
//
// An EIP-6963 provider is injected by the shared mock; with a private key
// `personal_sign` is real (viem). The mock answers `eth_accounts` with the
// address, so the app discovers it via EIP-6963 and shows it as connected (the
// same auto-reconnect a real injected wallet gets). The in-app path lives in
// `in-app-wallet.spec.mjs`; the OSM map route is covered by the HTTP smoke layer.
//
//   SITE_URL=http://localhost:4000 bin/m test:e2e connect-wallet
import {
  fail,
  initTestEnv,
  injectEIP6963,
  launchBrowser,
  ok,
  resetFailures,
  resolveSiteTarget,
  summary,
} from '@pasosdejesus/m/e2e'
import { connectedChipText, loadPrivateKey, waitForConnected } from '../helpers/wallet-ui.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

function shorten(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

async function main() {
  const t0 = performance.now()
  resetFailures()

  const env = await initTestEnv()
  const { base } = resolveSiteTarget(env)
  console.log(`Connect wallet (external EIP-6963) — ${base}\n`)

  const browser = await launchBrowser(env.headless)
  const page = await browser.newPage()
  try {
    const pk = loadPrivateKey()
    await injectEIP6963(page, {
      address: env.account.address,
      privateKey: pk || undefined,
      chainId: env.chainId,
    })

    await page.goto(`${base}/en`, { waitUntil: 'domcontentloaded', timeout: 120000 })

    if (!(await waitForConnected(page, { timeout: 30000 }))) {
      fail('external wallet (EIP-6963) not discovered/connected')
    } else {
      ok('external wallet discovered via EIP-6963 and shown as connected')
      const text = await connectedChipText(page)
      const expected = shorten(env.account.address)
      if (text && text.includes(expected)) ok(`chip shows the injected address (${text})`)
      else fail(`chip "${text}" does not show the injected address (expected ${expected})`)
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
