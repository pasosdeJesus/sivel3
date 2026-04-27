# app/api/ — Internal Next.js Endpoints

> *"Let your 'yes' be 'yes' and your 'no' be 'no'"* (Matthew 5:37, CSB)

These endpoints are consumed by the frontend and in turn query the sivel2 Rails backend or the blockchain.

## Endpoints

| Route | Method | Purpose | Data source |
|-------|--------|---------|-------------|
| `/api/cases/counts` | GET | Count cases, victims, and acts with filters | Kysely → PostgreSQL |
| `/api/cases/geojson` | GET | GeoJSON of cases for the map | Hardcoded (placeholder) |
| `/api/cases/datos-osm` | GET | OSM data for interactive map | Proxy → Rails API |
| `/api/cases/[id]` | GET | Case detail by ID | Proxy → Rails API |
| `/api/categories` | GET | Enabled violence categories | Kysely → PostgreSQL |
| `/api/departments` | GET | Enabled Colombian departments | Kysely → PostgreSQL |
| `/api/regions` | GET | Donation regions (supports `?locale=es`) | Kysely → PostgreSQL |
| `/api/regions/[id]/balance` | GET | On-chain balance of a region | Viem → Celo blockchain |
| `/api/alleged-perpetrators` | GET | Enabled alleged perpetrators | Kysely → PostgreSQL |
| `/api/donations/assign` | POST | Assign donation: verifies tx on-chain, calls the V2 contract, and increments Learning Points on learn.tg | Viem + Kysely + HTTP |

## Key endpoints detail

### `POST /api/donations/assign`

Full flow documented in `doc/donation-flow.md`. Receives `{ regionId, donor, amount, txHash }`, verifies the USDT transfer on-chain, executes `assignDonation` on the contract, and finally notifies learn.tg to increment Learning Points.

### `GET /api/cases/datos-osm`

Proxies to the Rails API (`NEXT_PUBLIC_API1/casos/datos-osm.json`). Passes through the same filter parameters it receives.

### `GET /api/regions/[id]/balance`

Reads the balance directly from the `RegionalDonation` contract on Celo using Viem. Does not go through Rails.
