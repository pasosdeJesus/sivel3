// Failure diagnostics for the browser specs.
//
// A timeout alone says nothing (learned from learn.tg's in-app wallet spec): the
// wallet usually painted an error the spec never read. On failure this dumps the
// visible testids, the tail of the page text and the console/page errors collected
// since the page was created, so the next red run is not a guess.

export function captureDiagnostics(page) {
  const lines = []

  page.on('pageerror', (error) => lines.push(`[pageerror] ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') lines.push(`[console.error] ${message.text()}`)
  })

  async function dump(context = 'failure') {
    const testids = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll('[data-testid]'))
          .map((el) => el.getAttribute('data-testid'))
          .join(', '),
      )
      .catch(() => '(no page)')
    const text = await page
      .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(-900))
      .catch(() => '(no page)')

    console.error(`[diag] ${context}`)
    console.error(`[diag] testids: ${testids || '(none)'}`)
    console.error(`[diag] page text: ${text || '(empty)'}`)
    if (lines.length > 0) {
      console.error('[diag] console:')
      for (const line of lines.slice(-10)) console.error(`  ${line}`)
    }
  }

  return { lines, dump }
}
