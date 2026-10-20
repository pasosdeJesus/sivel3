# Mobile Debug Console — SIVeL 3

> *"Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres"* (Colosenses 3:23)

Floating debug console for MiniPay and embedded browsers. Displays logs in real
time inside the application without needing browser DevTools.

Uses `@pasosdejesus/m/debug` for all logging and the debug UI. See the
[package documentation](../../node_modules/@pasosdejesus/m/dist/debug/README.md)
for the full API reference.

## Activation

| Method | How |
|--------|-----|
| **URL parameter** | Add `?debug=1` to the URL |
| **Environment variable** | Set `NEXT_PUBLIC_M_DEBUGGER_CONSOLE=1` in `.env` |

Under normal conditions (without the parameter), the console does not appear.

> **Note:** Regardless of the floating console, all messages are always written
> to `console.log`/`console.error` via browser DevTools — accessible via F12
> even without `?debug=1`.

## Usage

| Action | Result |
|--------|--------|
| **Open console** | Tap the `>_` button in the bottom right corner |
| **Close console** | Tap the `✕` in the top right corner |
| **Copy logs** | Tap the 📋 icon |
| **Clear logs** | Tap the 🗑 icon |
| **Minimize** | Tap the ▲/▼ icon |

## Log sources

| Source | Logged when... |
|--------|----------------|
| `[MiniPay]` | Detection, connection, `_request` errors |
| `[OSMMapData]` | Initial data loading (departments, regions, etc.) |
| `[Balance]` | Regional balance update |
| `[Donate]` | Donation start, success, or error |
| `[DonatePage]` | Donation page events |
