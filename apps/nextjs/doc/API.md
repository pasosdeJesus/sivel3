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

Geo-referenced case data for the interactive map. Proxies to SIVeL 2 Rails backend.

**Query:** Filter params: `filtro[fechaini]`, `filtro[fechafin]`, `filtro[departamento_id]`, `filtro[categoria_id]`, `filtro[presponsable_id]`

**Response:** GeoJSON-like array with case coordinates, titles, and metadata.

---

### `GET /api/cases/counts`

Aggregated case counts matching filters. Used by the map for marker counts.

**Query:** Same filter params as `datos-osm`.

**Response:** `{ total: number, counts?: object }`

---

### `GET /api/cases/[id]`

Single case detail.

**Response:** Case object with actos, víctimas, presuntos responsables.

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
