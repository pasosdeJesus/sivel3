# app/api/ — Internal Next.js Endpoints

> *"Let your 'yes' be 'yes' and your 'no' be 'no'"* (Matthew 5:37, CSB)

These endpoints are consumed by the frontend and in turn query the shared PostgreSQL database with Kysely or the blockchain.

## Endpoints

| Route | Method | Purpose | Data source |
|-------|--------|---------|-------------|
| `/api/cases/counts` | GET | Count cases, victims, and acts with filters | Kysely → PostgreSQL |
| `/api/cases/geojson` | GET | GeoJSON of cases for the map | Hardcoded (placeholder) |
| `/api/cases/datos-osm` | GET | OSM data for interactive map | Kysely → PostgreSQL |
| `/api/cases/[id]` | GET | Case detail by ID (case, victims, alleged perpetrators) | Kysely → PostgreSQL |
| `/api/categories` | GET | Enabled violence categories | Kysely → PostgreSQL |
| `/api/departments` | GET | Enabled Colombian departments | Kysely → PostgreSQL |
| `/api/regions` | GET | Donation regions (supports `?locale=es`) | Kysely → PostgreSQL |
| `/api/regions/[id]/balance` | GET | On-chain balance of a region | Viem → Celo blockchain |
| `/api/alleged-perpetrators` | GET | Enabled alleged perpetrators | Kysely → PostgreSQL |
| `/api/donations/assign` | POST | Assign donation: verifies tx on-chain, calls the V2 contract, mints donation SBTs, and increments Learning Points on learn.tg | Viem + Kysely + HTTP |
|| `/api/credential/breakdown` | GET | SBT counts by type (JOIN `credential_emission` + `credential_metadata`) | Kysely → PostgreSQL |
|| `/api/credential/leaderboard` | GET | Top donors with SBT counts (`?limit=10`) | Kysely → PostgreSQL |
|| `/api/credential/wallet/[wallet]` | GET | SBTs + donation summary for a specific wallet | Kysely → PostgreSQL |
|| `/api/credential/mint-connector` | POST | Mints Connector + Global Founder SBTs on wallet connect | Viem + Kysely |
|| `/api/credential/mint-explorer` | POST | Mints Explorer SBT when user has viewed ≥3 distinct cases | Viem + Kysely |
|| `/api/web-analytics/event` | POST | Records a web event (pageview, donation, wallet connect) | Kysely → PostgreSQL |
|| `/api/web-analytics/summary` | GET | Aggregated analytics (page views, wallets, IPs, donations, SBTs) | Kysely → PostgreSQL |
|| `/api/web-analytics/timeline` | GET | Daily timeline for a metric (`?metric=pageviews&days=30`) | Kysely → PostgreSQL |

## Key endpoints detail

### `POST /api/donations/assign`

Full flow documented in `doc/donation-flow.md`. Receives `{ regionId, donor, amount, txHash }`, verifies the USDT transfer on-chain, executes `assignDonation` on the contract, mints cumulative donation SBTs (Donor, Bronze, Silver, Gold, Diamond) when thresholds are reached, and finally notifies learn.tg to increment Learning Points.

### `GET /api/cases/datos-osm`

Reads the markers directly from the shared database (`sivel2_gen_caso` JOIN `msip_ubicacion`, plus the geo names), replicating the `Sivel2Gen::Conscaso` filter scopes (`filtro[fechaini]`, `filtro[fechafin]`, `filtro[departamento_id]`, `filtro[presponsable_id]`, `filtro[categoria_id]`). No longer goes through Rails.

### `GET /api/cases/[id]`

Reads a case, its victims and its alleged perpetrators from the shared database with Kysely. No longer goes through Rails.

### `GET /api/regions/[id]/balance`

Reads the balance directly from the `RegionalDonation` contract on Celo using Viem.
