# Hard-to-Update: vitest & pnpm en OpenBSD/adJ

> *"So the last will be first, and the first will be last"* (Matthew 20:16)

Este documento registra las dificultades encontradas al actualizar **vitest** y **pnpm**
en proyectos del ecosistema Pasos de Jesús (sivel.xyz, learn.tg) sobre **OpenBSD/adJ**.

---

## 1. pnpm 11 — Overrides rotos para dependencias transitivas

### Síntoma

`pnpm.overrides` en `package.json` deja de funcionar para dependencias transitivas.
Ejemplo: `"lightningcss": "npm:lightningcss-wasm@1.32.0"` en overrides no reemplaza
`lightningcss` cuando lo resuelve `@tailwindcss/node` o `vite`.

```json
// package.json (pnpm 11 — NO funciona)
"pnpm": {
  "overrides": {
    "lightningcss": "npm:lightningcss-wasm"
  }
}
```

El lockfile sigue incluyendo `lightningcss@1.32.0` (nativa) además de
`lightningcss-wasm@1.32.0`. La resolución solo se aplica al nivel superior,
no a paquetes anidados.

### Causa

pnpm 11 cambió cómo se aplican los overrides. El lockfile generado en pnpm 11
**no incluye** la sección `overrides:` en su cabecera (presente en lockfiles de
pnpm 10). Sin esa sección, los overrides no se propagan a dependencias transitivas.

### Solución adoptada

**Fijar pnpm 10** via `packageManager`:

```json
"packageManager": "pnpm@10.33.0+sha512.10568bb4a6afb58c9eb3630da90cc9516417abebd3fabbe6739f0ae795728da1491e9db5a544c76ad8eb7570f5c4bb3d6c637b2cb41bfdcdb47fa823c8649319"
```

Esto hace que corepack use pnpm 10 aunque el sistema tenga pnpm 11 instalado.

### Alternativas descartadas

1. **Agregar la dependencia directamente como alias**
   `"lightningcss": "npm:lightningcss-wasm@1.32.0"` en `dependencies` —
   resuelve el nivel superior pero NO las transitivas.

2. **Parche manual en postinstall** — modificar
   `node_modules/.pnpm/lightningcss@1.32.0/node_modules/lightningcss/node/index.js`
   para que caiga a WASM en OpenBSD. Funciona pero es frágil (se pierde al
   regenerar lockfile).

3. **Agregar la sobreescritura a nivel de package.json**
   `"overrides": { "lightningcss": "npm:lightningcss-wasm@1.32.0" }`
   (top-level, no dentro de `pnpm`). Tampoco funciona en pnpm 11.

### Lección

No actualizar a pnpm 11 hasta que se confirme que los overrides transitivos
vuelven a funcionar. Verificar con:

```sh
# El lockfile DEBE tener overrides: en la cabecera
head -20 pnpm-lock.yaml | grep overrides
# Debe mostrar: overrides:
```

Si no aparece, los overrides no funcionan para transitivas.

---

## 2. vitest ≥ 2.x — Dependencia de rolldown (sin soporte OpenBSD)

### Síntoma

vitest 2.x+ depende de **rolldown** (bundler ESM) que incluye bindings
nativos NAPI-RS. rolldown **no tiene binarios para OpenBSD/x64** y su loader
no incluye fallback WASI funcional.

```
Error: Unsupported OS: openbsd, architecture: x64
  at requireNative (binding-Cf9ARhL0.mjs:473)
```

### Causa

El binding loader en `dist/shared/binding-*.mjs` solo maneja `linux`, `darwin`,
`win32` y `ohos`. OpenBSD termina en:

```js
else loadErrors.push(new Error(`Unsupported OS: ${process.platform}, architecture: ${process.arch}`));
```

A diferencia de `lightningcss` y `@tailwindcss/oxide` — que incluyen archivos
`.wasi.cjs` de respaldo activables con `NAPI_RS_FORCE_WASI=1` — rolldown
**no incluye ningún mecanismo de fallback** para plataformas no soportadas.

### Solución adoptada

**Mantener vitest en ^1.6.1** (la última versión 1.x que no usa rolldown).
Actualmente learn.tg y sivel3 usan vitest 1.6.1.

### Alternativas descartadas

1. **Parchear el binding de rolldown** en `postinstall` — intentamos
   reemplazar `loadErrors.push(...)` con un mock binding que devuelve
   un objeto vacío. Esto permite que el módulo se cargue pero vitest
   falla más adelante porque necesita funcionalidades reales de rolldown
   (parseo de AST, transformación de módulos).

2. **Forzar WASI con `NAPI_RS_FORCE_WASI=1`** — rolldown no incluye el
   archivo `.wasi.cjs` necesario, a diferencia de lightningcss que sí lo
   incluye.

3. **Usar vitest 4.x con `--ignore-scripts`** — evita scripts de build
   pero no resuelve bindings nativos que se cargan en runtime.

### Lección

vitest ≥ 2.x no funcionará en OpenBSD/adJ hasta que rolldown:
- Incluya un fallback WASI funcional, o
- Compile bindings nativos para OpenBSD, o
- Lo eliminen como dependencia obligatoria.

El issue de rolldown está documentado en
`/home/vtamara/rolldown-openbsd-repro/ISSUE.md` (reproducción mínima
para reportar al upstream).

---

## 3. Resumen de versiones seguras para OpenBSD/adJ

| Paquete | Versión segura | Problema en versiones superiores |
|---------|---------------|----------------------------------|
| pnpm | 10.x | Overrides no funcionan para transitivas en 11.x |
| vitest | ^1.6.1 | Versiones ≥2.x dependen de rolldown (sin OpenBSD) |
| lightningcss | Usar `lightningcss-wasm` | Binarios nativos no existen para OpenBSD |
| @tailwindcss/oxide | Usar `@tailwindcss/oxide-wasm32-wasi` | Binarios nativos no existen para OpenBSD |
| rolldown | No usar (ninguna versión) | No soporta OpenBSD |

### Configuración de dependencias WASM en package.json

```json
"dependencies": {
  "lightningcss": "npm:lightningcss-wasm@1.32.0"
},
"devDependencies": {
  "@tailwindcss/oxide-wasm32-wasi": "^4.2.4"
},
"pnpm": {
  "overrides": {
    "lightningcss": "npm:lightningcss-wasm",
    "@tailwindcss/oxide": "npm:@tailwindcss/oxide-wasm32-wasi"
  }
}
```

> **Nota:** los overrides dentro de `pnpm` solo funcionan en pnpm 10.
> En pnpm 11 hay que usar la sintaxis de dependencia directa con alias
> (ver sección 1).
