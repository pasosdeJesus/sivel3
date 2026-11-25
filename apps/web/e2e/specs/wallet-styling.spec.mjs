// Browser spec: the in-app wallet dialog is actually styled (not bare HTML) and
// it lands inside the viewport.
//
// Since REQ/75 of `m` the dialog is `WalletDialog` (`wallet-dialog`), which has
// no app CSS: it relies on Tailwind scanning `@pasosdejesus/m/dist/wallet`. A
// missing `@source` does not just look plain, it removes `fixed`/`translate-*`
// and the dialog renders below the fold (measured 2026-11-24: `rect.top = 800`
// on an 800px viewport), so this spec asserts the computed styles and the box,
// not the pixels.
//
//   make test-e2e-spec SPEC=wallet-styling

import {
  fail,
  initTestEnv,
  launchBrowser,
  ok,
  resetFailures,
  resolveSiteTarget,
  summary,
} from '@pasosdejesus/m/e2e'
import { openWalletDialog, chooseInAppWallet } from '../helpers/wallet-ui.mjs'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

async function main() {
  const t0 = performance.now()
  resetFailures()

  const env = await initTestEnv()
  const { base } = resolveSiteTarget(env)
  console.log(`Wallet styling — ${base}\n`)

  const browser = await launchBrowser(env.headless)
  const page = await browser.newPage()
  try {
    await page.goto(`${base}/en`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await openWalletDialog(page)
    await chooseInAppWallet(page)
    await page.waitForSelector('[data-testid="wallet-dialog"]', { timeout: 60000 })

    const styles = await page.evaluate(() => {
      const dialog = document.querySelector('[data-testid="wallet-dialog"]')
      const input = document.querySelector('[data-testid="wallet-password"]')
      const confirm = document.querySelector('[data-testid="wallet-password-confirm"]')
      const create = document.querySelector('[data-testid="wallet-create"]')
      const modeCreate = document.querySelector('[data-testid="wallet-mode-create"]')
      const modeImport = document.querySelector('[data-testid="wallet-mode-import"]')
      const trigger = document.querySelector('[data-testid="connect-wallet"]')
      const heading = dialog?.querySelector('h2')
      const read = (el) => (el ? getComputedStyle(el) : null)
      const box = dialog?.getBoundingClientRect()

      const inputStyle = read(input)
      const createStyle = read(create)
      const triggerStyle = read(trigger)
      const modeStyle = read(modeCreate)

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        box: box ? { top: Math.round(box.top), bottom: Math.round(box.bottom), width: Math.round(box.width) } : null,
        position: read(dialog)?.position ?? null,
        radius: read(dialog)?.borderRadius ?? null,
        input: inputStyle
          ? {
              radius: inputStyle.borderRadius,
              border: inputStyle.borderWidth,
              padding: inputStyle.paddingTop,
              background: inputStyle.backgroundColor,
            }
          : null,
        hasConfirm: Boolean(confirm),
        create: createStyle
          ? {
              radius: createStyle.borderRadius,
              padding: createStyle.paddingTop,
              background: createStyle.backgroundColor,
              color: createStyle.color,
            }
          : null,
        triggerBackground: triggerStyle?.backgroundColor ?? null,
        mode: modeStyle ? { display: modeStyle.display, radius: modeStyle.borderRadius } : null,
        modes: {
          create: read(modeCreate)?.backgroundColor ?? null,
          import: read(modeImport)?.backgroundColor ?? null,
        },
        headingWeight: read(heading)?.fontWeight ?? null,
      }
    })

    console.log(`  viewport: ${styles.viewport.width}x${styles.viewport.height}`)
    console.log(`  dialog: ${JSON.stringify(styles.box)} position=${styles.position}`)
    console.log(`  input: ${JSON.stringify(styles.input)}`)
    console.log(`  create: ${JSON.stringify(styles.create)} (trigger ${styles.triggerBackground})`)
    console.log(`  mode: ${JSON.stringify(styles.mode)} | h2: ${styles.headingWeight}`)

    if (!styles.box) fail('wallet-dialog is not in the DOM')
    else if (styles.position !== 'fixed') fail(`wallet-dialog is not position:fixed (${styles.position}): Tailwind is not scanning the package`)
    else if (styles.box.top < 0 || styles.box.bottom > styles.viewport.height) {
      fail(`wallet-dialog is outside the viewport: ${JSON.stringify(styles.box)}`)
    } else if (styles.box.width < 260) fail(`wallet-dialog is narrower than 260px (${styles.box.width})`)
    else ok(`wallet-dialog is fixed and centered (${styles.box.width}px, top ${styles.box.top})`)

    if (styles.radius === '0px') fail('wallet-dialog has no border radius (unstyled)')
    else ok(`wallet-dialog is rounded (${styles.radius})`)

    if (!styles.input) fail('create form has no password input')
    else if (styles.input.radius === '0px') fail('password input has no border radius (unstyled)')
    else if (styles.input.border === '0px') fail('password input has no border (unstyled)')
    else if (styles.input.padding === '0px') fail('password input has no padding (unstyled)')
    else ok('password input is themed')

    if (!styles.hasConfirm) fail('create form has no confirmation input')
    else ok('create form asks for the password twice')

    if (!styles.create) fail('create form has no create button')
    else if (styles.create.radius === '0px') fail('create button has no border radius (unstyled)')
    else if (styles.create.padding === '0px') fail('create button has no padding (unstyled)')
    else if (styles.create.background === 'rgba(0, 0, 0, 0)') fail('create button has no background (unstyled)')
    else if (styles.triggerBackground && styles.create.background !== styles.triggerBackground) {
      fail(`create button does not use the site primary (${styles.create.background} vs ${styles.triggerBackground})`)
    } else ok(`create button is themed with the site primary (${styles.create.background})`)

    if (!styles.mode || (styles.mode.display !== 'inline-flex' && styles.mode.display !== 'flex')) {
      fail(`create/import switch is not laid out (display: ${styles.mode?.display})`)
    } else if (styles.modes.create === styles.modes.import) {
      fail('create/import switch does not highlight the active mode')
    } else ok('create/import switch is laid out and highlights the active mode')

    if (!(Number(styles.headingWeight) >= 600)) fail(`title weight is ${styles.headingWeight}`)
    else ok(`title uses a heading weight (${styles.headingWeight})`)
  } catch (error) {
    fail(`unexpected error: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await browser.close()
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
