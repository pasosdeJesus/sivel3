// Browser-spec helpers that drive sivel3's own ConnectWalletButton.
//
// The in-app wallet form itself is NOT reimplemented here: it is delegated to the
// shared driver `@pasosdejesus/m/e2e` (`setupInAppWallet`/`unlockInAppWallet`), which
// targets the testids of `@pasosdejesus/m/wallet/next`. These helpers only cover the
// sivel3-specific shell (opening the dialog, picking the in-app path, reading the
// connected chip).

import * as fs from 'node:fs'
import * as path from 'node:path'

/** Reads the test private key from the env or `apps/.env` (same source as `initTestEnv`). */
export function loadPrivateKey() {
  if (process.env.TEST_PRIVATE_KEY) return process.env.TEST_PRIVATE_KEY
  const candidates = [
    path.join(process.cwd(), '..', '.env'), // apps/.env
    path.join(process.cwd(), '.env'), // cwd
    path.join(process.cwd(), '..', '..', '.env'), // repo root
  ]
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue
      const content = fs.readFileSync(p, 'utf8')
      const pk = content.match(/PRIVATE_KEY="([^"]+)"/)?.[1] || content.match(/PRIVATE_KEY=(\S+)/)?.[1]
      if (pk) return pk
    } catch {
      /* next candidate */
    }
  }
  return null
}

/** Waits for the header connect button and clicks it (opens the wallet dialog). */
export async function openWalletDialog(page, { timeout = 90000 } = {}) {
  await page.waitForFunction(() => !!document.querySelector('[data-testid="connect-wallet"]'), {
    timeout,
  })
  const btn = await page.$('[data-testid="connect-wallet"]')
  await btn.click()
}

/** In the dialog menu (no in-app wallet yet) picks the in-app path. */
export async function chooseInAppWallet(page, { timeout = 60000 } = {}) {
  await page.waitForFunction(() => !!document.querySelector('[data-testid="use-in-app-wallet"]'), {
    timeout,
  })
  const btn = await page.$('[data-testid="use-in-app-wallet"]')
  await btn.click()
  await page.waitForFunction(() => !!document.querySelector('[data-testid="in-app-wallet-setup"]'), {
    timeout,
  })
}

/** Picks the external-wallet path from the dialog menu (only offered when detected). */
export async function chooseExternalWallet(page, { timeout = 60000 } = {}) {
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="use-external-wallet"]'),
    { timeout },
  )
  const btn = await page.$('[data-testid="use-external-wallet"]')
  await btn.click()
}

/** True when the header shows the connected chip. */
export async function waitForConnected(page, { timeout = 90000 } = {}) {
  try {
    await page.waitForFunction(
      () => !!document.querySelector('[data-testid="connected-wallet"]'),
      { timeout },
    )
    return true
  } catch {
    return false
  }
}

/** Text of the connected chip (short address), or null. */
export function connectedChipText(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="connected-wallet"]')
    return el ? el.textContent.trim() : null
  })
}

/** True once the in-app setup form shows the recovery phrase (create finished). */
export async function waitForRecoveryPhrase(page, { timeout = 60000 } = {}) {
  try {
    await page.waitForFunction(
      () => !!document.querySelector('[data-testid="recovery-phrase"]'),
      { timeout },
    )
    return true
  } catch {
    return false
  }
}

/** True when the viewport contains any of the given (case-insensitive) markers. */
export function bodyHas(page, needles) {
  return page.evaluate(
    (list) => {
      const body = document.body?.textContent || ''
      const lower = body.toLowerCase()
      return list.some((n) => lower.includes(n.toLowerCase()))
    },
    needles,
  )
}
