# Mobile Debug Console - SIVeL 3

## What is it?

The mobile debug console is a visual tool that displays logs and errors in **real time** within the application itself, without needing to access browser developer tools.

It is especially useful in **MiniPay** and other embedded browsers where there is no easy access to the debug console.

---

## For End Users

### When does it appear?

The console **only appears** when:
- The URL contains the parameter `?debug=1` (e.g., `https://sivel.xyz/en/cases/osmmap?debug=1`)
- Or the environment variable `NEXT_PUBLIC_M_DEBUGGER_CONSOLE=1` is enabled at build time

Under normal conditions (without the parameter), **the console does not appear** to avoid interfering with the user experience.

> **Note:** Regardless of the floating console, the Logger class (`lib/logger.ts`) always writes all messages to `console.log`/`console.error` via the browser DevTools. This means logs are always accessible via F12 even without `?debug=1`.

### What does it look like?

- A circular button with a terminal icon (`>_`) in the **bottom right corner** of the screen
- Clicking it opens a floating window with logs
- Logs include:
  - Timestamp (exact time)
  - Source of the message (e.g., `[MiniPay]`, `[Donate]`, `[Balance]`)
  - Level icon (📢 info, ✅ success, ❌ error, ⚠️ warning)
  - Descriptive message

### How to use it?

| Action | Result |
|--------|--------|
| **Open console** | Tap the `>_` button in the bottom right corner |
| **Close console** | Tap the `×` in the top right corner of the console |
| **Copy logs** | Tap the copy icon |
| **Clear logs** | Tap the trash icon |
| **Minimize** | Tap the chevron-down / chevron-up icon |

### What is it for?

- **Debug donations** (see if the transaction was sent, if the backend responded)
- **Report errors** to the support team (copy logs and send them)
- **Check connection status** with the blockchain

---

## For Developers

### How to enable the console during development?

| Method | Code / Action |
|--------|----------------|
| **Via URL (recommended)** | Add `?debug=1` to the URL: `https://sivel.xyz/en/cases/osmmap?debug=1` |
| **Environment variable** | `NEXT_PUBLIC_M_DEBUGGER_CONSOLE=1` in `.env` |

### How does it work internally?

The console is implemented in `components/DebugConsole.tsx` and uses the unified logging system (`lib/logger.ts`). It is rendered in the client layout (`components/ClientLayout.tsx`) so it is available on all pages.

Architecture:
```
ClientLayout.tsx
  └── <DebugConsole />         ← rendered always (returns null when disabled)
        └── useLogger()        ← reads from Logger singleton

Any component/fn              ← writes via
  └── logger.info('msg')       → Logger singleton → console.log (always)
                                                    → subscribers (console UI)
```

The Logger class stores a buffer of up to 500 entries and notifies subscribers (`useLogger()` hook) in real-time when the floating console is enabled.

```typescript
// Activate via URL (logger.ts)
const urlParams = new URLSearchParams(window.location.search)
const debugParam = urlParams.get('debug')
if (debugParam === '1') {
  this.floatingConsoleEnabled = true
}
```

### Log messages

| Source | Logged when... |
|--------|----------------|
| `[MiniPay]` | Detection, connection, `_request` errors |
| `[OSMMapData]` | Initial data loading (departments, regions, etc.) |
| `[Balance]` | Regional balance update |
| `[Donate]` | Donation start, success, or error |
| `[Approve]` | Approval transactions (legacy flow) |
| `[DonatePage]` | Donation page events |

### How to simulate errors for testing

| Error | How to simulate |
|-------|-----------------|
| Insufficient balance | Use a wallet with less USDT than the donation amount |
| Transaction cancelled | Cancel the transaction in the wallet when the popup appears |
| Network error | Disconnect WiFi/mobile before donating |
| Contract error | Use an invalid region (e.g., ID 99) |

### Best practices

1. **Always use `?debug=1`** when testing in MiniPay
2. **Copy logs** before reporting an error to the team
3. **Clear logs** between tests to avoid confusion
4. **Use the `?debug=1` parameter** instead of modifying environment variables in production

---

## Example Logs

### Successful donation

```
[12:05:23][MiniPay]📢Starting MiniPay detection...
[12:05:23][MiniPay]✅MiniPay detected
[12:05:23][MiniPay]✅MiniPay connected - Address: 0x383b...
[12:05:35][Donate]📢Starting - Region: 1, Amount: 1
[12:05:35][Donate]✅ Contract addresses: USDT=0x4806..., Donation=0x563A...
[12:05:38][Donate]📱 Using ethereum.send (MiniPay)...
[12:05:42][Donate]✅ Transaction sent. Hash: 0x04fb9e...
[12:05:42][Donate]🔄 Calling backend to assign donation...
[12:05:47][Donate]✅ Donation assigned successfully.
```

### Insufficient balance error

```
[12:05:35][Donate]📢Starting - Region: 1, Amount: 10
[12:05:38][Donate]📢Error detected:
[12:05:38][Donate]   ❌ Insufficient balance.
   You don't have enough USDT for this donation.
```

---

## FAQ

### Why doesn't the console appear in MiniPay?

- Make sure the URL has `?debug=1`
- Restart the application in MiniPay (close and reopen the tab)

### Are logs saved anywhere?

No, logs are volatile. To preserve them, tap the **copy** icon (📋) before closing the console.

### Can I use the console on desktop?

Yes, it works in any browser with `?debug=1`. On desktop you can also use F12 (DevTools) to see all logs via `console.log` — the Logger class writes there regardless of the floating console state.

### How do I disable the console in production?

Use the URL without `?debug=1`. Regular users will **never** see the console.
