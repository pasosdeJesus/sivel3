#!/usr/bin/env node
// Estipendio mensual de créditos para los documentadores (R-#22 P2, R-#17: 4.000/mes).
//
// El cálculo y el libro mayor viven en el servidor (`POST /api/credits/stipend`,
// idempotente por `stipend:YYYY-MM:<wallet>`); este script sólo lo dispara para el cron.
//
//   SIVEL3_STIPEND_SECRET=… SITE_URL=https://sivel.xyz node bin/credits-stipend.mjs
//
// Correrlo dos veces en el mismo mes no duplica el estipendio.
const base = (process.env.SITE_URL || 'http://localhost:4000').replace(/\/+$/, '')
const secreto = process.env.SIVEL3_STIPEND_SECRET

if (!secreto) {
  console.error('Falta SIVEL3_STIPEND_SECRET')
  process.exit(2)
}

const respuesta = await fetch(`${base}/api/credits/stipend`, {
  method: 'POST',
  headers: { 'x-stipend-secret': secreto },
})

const texto = await respuesta.text()
if (!respuesta.ok) {
  console.error(`Estipendio falló (${respuesta.status}): ${texto}`)
  process.exit(1)
}

try {
  const datos = JSON.parse(texto)
  const acreditados = (datos.acreditados || []).filter((a) => !a.duplicada).length
  const repetidos = (datos.acreditados || []).length - acreditados
  console.log(
    `Estipendio ${datos.month}: ${acreditados} acreditado(s), ${repetidos} ya estaba(n) (idempotente)`,
  )
} catch {
  console.log(texto)
}
