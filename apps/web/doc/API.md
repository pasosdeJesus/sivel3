# SIVeL 3 — Public API Reference

> "The truth will set you free" (John 8:32)

All endpoints are read-only except where noted. Base URL: `https://sivel.xyz`.

---

## Reference Data

### `GET /api/regions`

Donation-enabled regions.

**Query:** `?locale=en|es`

**Response:** `{ id: number, nombre: string }[]`

---

### `GET /api/regions/[id]/balance`

On-chain balance for a region's donation contract.

**Response:** `{ regionId: number, balance: string }`

---

### `GET /api/departments`

Colombian departments with active cases.

**Response:** `{ id: number, nombre: string }[]`

---

### `GET /api/categories`

Violence categories aligned with International Humanitarian Law.

**Response:** `{ id: number, nombre: string }[]`

---

### `GET /api/alleged-perpetrators`

Alleged perpetrators (state actors, armed groups, corporations).

**Response:** `{ id: number, nombre: string }[]`

---

## Cases

### `GET /api/cases/datos-osm`

Geo-referenced case data for the interactive map. Read from PostgreSQL with Kysely (no Rails). It
serves only what the map draws: the case id and its coordinates, bounded by the viewport and
aggregated when zoomed out (https://gitlab.com/pasosdeJesus/sivel3/-/issues/69).

**Query:** `bbox=minLng,minLat,maxLng,maxLat`, `zoom=0..20` (default 4), plus the filters
`filtro[fechaini]`, `filtro[fechafin]`, `filtro[departamento_id]`, `filtro[categoria_id]`,
`filtro[presponsable_id]`.

**Response:** `{ modo: 'marcadores' | 'celdas', total, respuesta: { "<id>": { latitud, longitud } },
celdas?: [{ latitud, longitud, n }] }`. Below zoom 11 the server aggregates into cells (0.5°,
0.1° and 0.02° by zoom); from zoom 11 it returns markers. Maximum 5,000 rows (`413`),
`Cache-Control: public, s-maxage=300` with `ETag`/`304`, and 60 requests/min per IP (`429`).

---

### `GET /api/cases/counts`

Aggregated case counts matching filters. Used by the map for marker counts.

**Query:** Same filter params as `datos-osm`.

**Response:** `{ casos: number, victimas: number, actos: number, victimizaciones: number }`. Limited to 60 requests/min per IP (`429`).

---

### `GET /api/cases/[id]`

Single case detail.

**Response:** Case object with acts, the victims count (`victimas_count`) and the alleged
perpetrators. Victim names are not returned to anonymous callers (confidentiality, `PRINCIPLES.md`
§2). The endpoint is limited to 120 requests/min per IP; wallets' free quota and credits are
tracked in https://gitlab.com/pasosdeJesus/sivel3/-/issues/17.

---

## Credentials (SBTs)

All credential endpoints read from `credential_emission` + `credential_metadata` cache tables
and the `PasosDeJesusCredentials` contract on Celo.

### `GET /api/credential/[tokenId]`

**Public.** ERC-1155 metadata JSON for a credential badge. Immutable (cached 1 year).

**Response:**
```json
{
  "name": "Connector",
  "description": "SIVeL 3 Credentials — Achievement",
  "image": "https://sivel.xyz/img/credential/2.png",
  "attributes": [
    { "trait_type": "Collection", "value": "SIVeL 3 Credentials" },
    { "trait_type": "Type", "value": "Achievement" }
  ]
}
```

---

### `GET /api/credential/breakdown`

**Public.** SBT types with mint counts. Used by `/stats` page.

**Response:** `{ tokenId: number, chainId: string, name: string, imageUrl: string, count: number }[]`

---

### `GET /api/credential/leaderboard?limit=10`

**Public.** Top donors by total USDT donated, with SBTs earned.

**Response:** `{ wallet: string, totalDonatedUsdt: string, sbtCount: number }[]`

---

### `GET /api/credential/wallet/[wallet]`

**Public.** Wallet profile: SBT badges earned, donation summary, first activity.

**Response:**
```json
{
  "sbts": [{ "tokenId": number, "name": string, "imageUrl": string, "earnedAt": string }],
  "totalDonated": "string",
  "donationCount": number,
  "firstActivity": "ISO date"
}
```

---

## Web Analytics

All analytics read from `web_event` table.

### `GET /api/web-analytics/summary`

**Public.** Aggregated stats: page views, unique wallets/IPs, donation conversion, top pages, on-chain KPIs.

**Response:**
```json
{
  "pageViews": { "24h": number, "7d": number, "30d": number },
  "uniqueSessions": { "24h": number, "7d": number, "30d": number },
  "uniqueWallets": { "24h": number, "7d": number },
  "uniqueIps": { "24h": number, "7d": number },
  "donationConversion": { "started": number, "completed": number, "rate": number },
  "errors24h": number,
  "topPages": [{ "path": string, "views": number }],
  "onChain": {
    "totalDonations": number,
    "totalUsdtDonated": string,
    "uniqueDonors": number,
    "totalLearningPoints": string,
    "donationsByRegion": [{ "regionId": number, "count": number, "total": string }]
  }
}
```

---

### `GET /api/web-analytics/timeline?metric=<name>&days=<n>`

**Public.** Daily aggregated counts for chart rendering.

**Params:**
- `metric` — `pageviews` (default), `uniqueWallets`, `uniqueIps`, `errors`, `donations`
- `days` — number of days (default 30, max 90)

**Response:** `{ metric: string, days: number, data: [{ date: string, count: number }] }`

---

## Health

### `GET /api/health/credentials`

Checks if credential contracts are reachable on Celo and Base.

**Response:** `{ celo: boolean, base: boolean, timestamp: string }`
- Status 200 if at least one chain is healthy; 503 if both unreachable.

---

## Internal Endpoints

These are called by the frontend/backend and are **not intended for direct public use**:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/credential/mint-connector` | POST | Mints Connector SBT on wallet connect |
| `/api/credential/mint-explorer` | POST | Mints Explorer SBT after 3+ case views |
| `/api/donations/assign` | POST | Verifies on-chain donation, assigns to region, awards LP |
| `/api/web-analytics/event` | POST | Records a client-side analytics event |
| `/api/asistente/[...ruta]` | GET/POST/DELETE | Signed proxy to the documentation assistant (`sivel3agent`): ingestion, status, extraction, XRLAT, candidates, deletion |
| `/api/pre-alerts` | POST | Documenter's pre-alert draft from the assistant |
| `/api/verify` | GET | Is this wallet verified on learn.tg? Signs with the partner key (`lib/learnTgPartner.ts`), caches 5 min, fails closed, returns only `verified` |
| `/api/alerts` | GET | Published alerts (reviewed documenter cases): paginated, no personal data |
| `/api/pre-alerts/review` | GET | Documenter-signed queue of `converted`/`published` documenter alerts |
| `/api/pre-alerts/[id]/publish` | POST | Documenter-signed publish (`converted` → `published`, records who/when) |
| `/api/pre-alerts/[id]/unpublish` | POST | Documenter-signed rollback (`published` → `converted`) |
| `/api/wallet-pass` | POST | EIP-191 `pase:{address}:{ts}` → HttpOnly signed cookie (12 h) that raises the detail quota |
| `/api/credits/balance` | GET | Credit balance of a wallet |
| `/api/credits/purchase` | POST | Verifies a USDT transfer to `CREDITS_TREASURY_ADDRESS` and credits 100 per USDT (idempotent by `tx_hash`) |
| `/api/credits/stipend` | POST | Monthly 4.000-credit stipend to `DOCUMENTER_WALLETS` (cron secret, idempotent per month) |
| `/api/credits/grant` | POST | Operator-granted credits without crypto (`x-credits-secret`), idempotent by `reference` |

### Assistant proxy (`/api/asistente/[...ruta]`)

The browser signs `asistente:{METHOD}:{ruta}:{sha256(cuerpo)}:{timestamp}:{nonce}` with the
documenter wallet (`personal_sign`) and sends `X-Documenter-Address`, `X-Documenter-Signature`,
`X-Documenter-Timestamp` and `X-Documenter-Nonce`; the proxy verifies the role
(`DOCUMENTER_WALLETS`), the 5-minute window and that the nonce is new (a replayed action
returns `401 nonce_repetido`) before signing the server-to-server request with
`SIVEL3_MESSAGES_PRIVATE_KEY` (`sivel3agent:1` canonical message with the documenter's
opaque user). Allowed routes: `ingesta` (POST), `ingesta/:id` (GET),
`ingesta/:id/reintentar` (POST), `extraer` (POST), `xrlat` (POST), `health` (GET),
`:id` (GET), `:id/candidato` (POST), `candidato` (POST: candidates from the
documenter's own notes, no ingestion) and `:id` (DELETE). The agent responses pass through
unchanged, with `Cache-Control: no-store`, and `Retry-After`/`Location` are propagated
(the UI can wait as long as the agent asks).

The browser sends `fuente.source_id` (the agent's `source_id` from `GET /ingesta/:id`,
**not** the ingestion id) plus `ingesta_id` to `POST /extraer`: the ingestion id applies
the per-ingestion generation quota, feeds the trace (`GET /:id` → `generaciones`) and lets
the candidate copy the generation metadata.

`POST /api/pre-alerts` (documenter signed,
`prealerta:{sha256(cuerpo)}:{timestamp}:{nonce}`)
creates the pre-alert as a documenter **alert under review**: status `converted`,
`origin = 'documenter'`, the documenter as publisher and deduplication by
`event_hash` (the same case returns `409`). It never enters the market (buying
requires `pending`), pays no citizen reward, and cannot be scored by its own
author; the payment for the documented case comes from the documenters fund.

### Public corpus window (R-#22)

`PUBLIC_CASES_FROM` / `PUBLIC_CASES_TO` (YYYY-MM-DD, inclusive; empty = whole archive)
bound what the public endpoints show: `GET /api/cases/datos-osm`, `GET /api/cases/counts`
and `GET /api/cases/:id` apply the window **server-side** (a client-sent
`filtro[fechaini]`/`filtro[fechafin]` wins) and a case outside it answers `404
fuera_de_ventana`. `counts` now restricts the four numbers (cases, victims, acts,
victimizations) to the **same** case set as the map — only cases **with a location and at
least one act** (the plottable ones: 39.866 of 48.187 in dev), and before only `casos`
honoured the dates while the legend did not match — and, when the window is active, returns
`ventana` and `total_archivo` (also plottable) so the map can say "showing 454 of 39.866". Exports are never free: only
credits (R-#17) may export, and the AI surface runs on `sivel3agent`'s local model, never a
paid remote API.

### Alerts, quota and credits (R-#22)

`GET /api/alerts` y `GET /api/alerts/:id` son públicas y sólo devuelven alertas
`published`: el caso propuesto, la fuente y las fechas. La proyección vive en
`lib/alertsPublicas.ts` y **nunca** incluye `citizen_notes`, `buyer_wallet` ni la billetera
del documentador (hay prueba que falla si aparecen). Publicar y despublicar exigen la
firma del documentador (`publicar:{id}:{ts}:{nonce}` / `despublicar:…`) y dejan
`published_by`/`published_at` para auditar.

`GET /api/cases/:id` aplica la cuota de detalle de R-#17: 1/día anónimo por IP, 16/mes con
el pase de billetera y 24/mes si learn.tg la considera verificada. Al agotarse responde
`402` con `code: cuota_detalle` (o `creditos_insuficientes`) y el mapa ofrece activar el
pase o comprar créditos. El pase es una cookie firmada con `SIVEL3_PASS_SECRET` (no es una
sesión ni identifica a nadie); si la tabla de cuota no está disponible, la lectura sigue
(falla abierto y se registra el incidente).

Los créditos (1 USDT = 100; detalle fuera de cuota = 4) usan un libro mayor idempotente por
`referencia`. **El estipendio de documentadores es en créditos, no en cripto**: `make
credits-stipend` acredita 4.000 al mes a cada billetera de `DOCUMENTER_WALLETS` con
referencia `stipend:YYYY-MM:<wallet>`, y `POST /api/credits/grant` permite al operador
acreditar o ajustar una billetera concreta con `x-credits-secret` (sin token, sin cadena).
La compra con USDT es opcional y está desactivada hasta definir
`CREDITS_TREASURY_ADDRESS`: sin esa variable responde `503` en vez de inventar un destino.

### Partner verification (`/api/verify`)

`GET /api/verify?wallet=0x…` answers whether the wallet is verified on learn.tg (the map
uses it to invite visitors to verify). The signing happens server-side
(`lib/learnTgPartner.ts`) with the **dedicated partner key**
(`LEARNTG_AUTHPARTNER_PRIVATE_KEY`; `LEARNTG_ADDRESS` decides which key signs, with
fallback `PRIVATE_KEY` then `SIVEL3_MESSAGES_PRIVATE_KEY`), the boolean is cached for five
minutes and **every failure is a `false`** (no key, timeout, `403`, invalid body), so no
SBT is minted on an outage. learn.tg also returns the person's name and country; sivel3
discards them. The endpoint is rate limited (60/min per IP) and rejects calls declared as
cross-site (`Sec-Fetch-Site`), but a header-less client cannot be told apart: the real
contract is the signed claims token planned in `m`'s REQ/78 (work item pending).
