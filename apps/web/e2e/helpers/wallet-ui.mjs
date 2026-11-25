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

/**
 * Waits for the header wallet trigger and clicks it until a dialog shows.
 *
 * Since REQ/75 of `m` the engine has two dialogs: its own choice dialog
 * (`use-in-app-wallet` / `use-external-wallet` / `disconnect-wallet`) when there
 * is no in-app wallet or the visitor is connected, and `WalletDialog`
 * (`wallet-dialog`: create, import, unlock…) when an in-app wallet already
 * exists. The trigger is `connect-wallet`, or `connected-wallet` once connected.
 *
 * Retries the click: on a remote (slow to hydrate) site the first click can land
 * before React attaches the handler, so a single click is not reliable.
 */
export async function openWalletDialog(page, { timeout = 90000 } = {}) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  await page.waitForFunction(
    () =>
      !!document.querySelector('[data-testid="connect-wallet"]') ||
      !!document.querySelector('[data-testid="connected-wallet"]'),
    { timeout },
  )

  /**
   * The engine shows the choice dialog while the in-app store is still loading
   * (`Loading…` + the in-app button). Clicking the trigger in that window opens
   * the choice dialog even when a wallet exists, so the helper waits for the
   * store to settle and closes the transient dialog instead of mistaking it for
   * the real menu.
   */
  const sigueCargando = () =>
    page.evaluate(() => {
      const btn = document.querySelector('[data-testid="use-in-app-wallet"]')
      if (!btn) return false
      const dialogo = btn.closest('[role="dialog"]')
      return /loading|cargando/i.test(dialogo?.textContent ?? '')
    })

  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await page.$('[data-testid="wallet-dialog"]')) return

    if (await sigueCargando()) {
      await page.keyboard.press('Escape').catch(() => {})
      await sleep(600)
      continue
    }

    if (await page.$('[data-testid="use-in-app-wallet"], [data-testid="disconnect-wallet"]')) return

    const btn = await page.$('[data-testid="connected-wallet"], [data-testid="connect-wallet"]')
    if (btn) await btn.click().catch(() => {})
    await sleep(800)
  }
  throw new Error('wallet dialog did not open (wallet trigger not interactive?)')
}

/**
 * In the choice dialog (no in-app wallet yet) picks the in-app path, which now
 * opens `WalletDialog` directly (the choice dialog closes first).
 */
export async function chooseInAppWallet(page, { timeout = 60000 } = {}) {
  await page.waitForFunction(() => !!document.querySelector('[data-testid="use-in-app-wallet"]'), {
    timeout,
  })
  const btn = await page.$('[data-testid="use-in-app-wallet"]')
  await btn.click()
  await page.waitForFunction(() => !!document.querySelector('[data-testid="wallet-dialog"]'), {
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

/** True once `WalletDialog` shows the recovery phrase (create finished, backup pending). */
export async function waitForRecoveryPhrase(page, { timeout = 60000 } = {}) {
  try {
    await page.waitForFunction(
      () => !!document.querySelector('[data-testid="wallet-recovery-words"]'),
      { timeout },
    )
    return true
  } catch {
    return false
  }
}

/** True once `WalletDialog` shows the created/unlocked wallet address. */
export async function waitForWalletAddress(page, { timeout = 60000 } = {}) {
  try {
    await page.waitForFunction(
      () => !!document.querySelector('[data-testid="wallet-address"]'),
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
