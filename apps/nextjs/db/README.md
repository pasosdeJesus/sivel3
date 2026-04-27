# db/ — Database

> *"The wise woman builds her house"* (Proverbs 14:1, CSB)

## Architecture

The database is shared with the sivel2 Rails backend. Migrations are managed with **Kysely** (not Rails ActiveRecord).

Tables prefixed with `sivel2_*`, `msip_*`, `heb412_*`, `mr519_*` belong to the Rails backend and must not be modified from here.

## Tables owned by Next.js

| Table | Purpose |
|-------|---------|
| `region` | Geographic regions for donations (Colombia, Israel/Palestine). Created in initial migration. |
| `site_nonces` | Nonces for the Learning Points protocol with learn.tg. Controls replay attacks and site balance. |

## Migrations

Migrations live in `db/migrations/`. All database commands go through `bin/m`:

```bash
cd apps/nextjs
bin/m db:migrate               # run pending migrations
bin/m db:mig:make <name>       # create a new migration file
bin/m db:rollback              # revert the last migration
```

After running `bin/m db:migrate`, both `db/structure.sql` and `db/db.d.ts` are automatically updated:
- `db/structure.sql` — reference schema dump (`pg_dump -s`)
- `db/db.d.ts` — auto-generated TypeScript types via `kysely-codegen`

To only refresh `db/structure.sql` without running migrations:

```bash
bin/m db:structure:dump
```

## Kysely

Configuration is in `.config/kysely.config.ts`. The `newKyselyPostgresql()` function creates a connection using environment variables (`PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`).

TypeScript types in `db/db.d.ts` are auto-generated. Do not edit manually.

For more details on `bin/m` commands, see the [`@pasosdejesus/m` documentation](https://gitlab.com/pasosdeJesus/m).
