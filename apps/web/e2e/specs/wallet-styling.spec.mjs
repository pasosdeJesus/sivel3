// Browser spec: the in-app wallet dialog is actually styled (not bare HTML).
//
// The primitives of `@pasosdejesus/m/wallet/next` ship semantic HTML without
// classes, so sivel3 styles them by `data-testid`. A missing `@source`, a lost
// CSS layer or a Tailwind change leaves the dialog usable but ugly, and no other
// spec notices. This one asserts the computed styles, not the pixels.
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
    await page.waitForSelector('[data-testid="in-app-wallet-setup"]', { timeout: 60000 })

    const styles = await page.evaluate(() => {
      const setup = document.querySelector('[data-testid="in-app-wallet-setup"]')
      const input = setup?.querySelector('input')
      const submit = setup?.querySelector('button[type="submit"]')
      const group = setup?.querySelector('[role="group"]')
      const heading = setup?.querySelector('h2')
      const dialog = document.querySelector('[role="dialog"]')
      const read = (el) => (el ? getComputedStyle(el) : null)
      const inputStyle = read(input)
      const submitStyle = read(submit)
      const groupStyle = read(group)
      const headingStyle = read(heading)
      const dialogBox = dialog?.getBoundingClientRect()

      return {
        dialogWidth: dialogBox ? Math.round(dialogBox.width) : 0,
        input: inputStyle
          ? { radius: inputStyle.borderRadius, border: inputStyle.borderWidth, padding: inputStyle.paddingTop }
          : null,
        submit: submitStyle
          ? { radius: submitStyle.borderRadius, background: submitStyle.backgroundColor, padding: submitStyle.paddingTop }
          : null,
        groupDisplay: groupStyle?.display ?? null,
        headingWeight: headingStyle?.fontWeight ?? null,
      }
    })

    console.log(`  dialog: ${styles.dialogWidth}px`)
    console.log(`  input: ${JSON.stringify(styles.input)}`)
    console.log(`  submit: ${JSON.stringify(styles.submit)}`)
    console.log(`  group: ${styles.groupDisplay} | h2: ${styles.headingWeight}`)

    if (styles.dialogWidth < 260) fail('dialog is narrower than 260px')
    else ok('dialog has a usable width')

    if (!styles.input) fail('setup form has no input')
    else if (styles.input.radius === '0px') fail('input has no border radius (unstyled)')
    else if (styles.input.border === '0px') fail('input has no border (unstyled)')
    else if (styles.input.padding === '0px') fail('input has no padding (unstyled)')
    else ok('input is themed')

    if (!styles.submit) fail('setup form has no submit button')
    else if (styles.submit.radius === '0px') fail('submit has no border radius (unstyled)')
    else if (styles.submit.padding === '0px') fail('submit has no padding (unstyled)')
    else if (styles.submit.background === 'rgba(0, 0, 0, 0)') fail('submit has no background color (unstyled)')
    else ok('submit button is themed')

    if (styles.groupDisplay !== 'grid' && styles.groupDisplay !== 'flex') {
      fail(`create/import switch is not laid out (display: ${styles.groupDisplay})`)
    } else {
      ok('create/import switch is laid out')
    }

    if (styles.headingWeight !== '600') fail(`title weight is ${styles.headingWeight}`)
    else ok('title uses the heading weight')
  } catch (error) {
    fail(`unexpected error: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await browser.close()
  }

  process.exit(summary(t0) > 0 ? 1 : 0)
}

main()
