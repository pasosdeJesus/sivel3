# sivel3

Political Violence Information System (SIVeL)

## Quick Start

### Prerequisites

- Node.js
- pnpm
- PostgreSQL (running service)
- make

### Installation

1.  Install the project dependencies:

    ```bash
    pnpm install
    ```

2.  Review the newly created `.env` file. It contains the initial configuration for your development environment:

    ```env
    # Development database credentials
    PGUSER=sivel3
    PGPASSWORD=changeme
    PGDATABASE=sivel3_dev

    # PostgreSQL superuser credentials (for local administrative tasks)
    PG_SUPERUSER=postgres
    PG_SUPERUSER_PASSWORD=
    
    # -- Web3 Configuration --

    # WalletConnect Project ID (get yours from https://cloud.walletconnect.com/)
    NEXT_PUBLIC_WC_PROJECT_ID=0123

    # Application Name (displayed in wallet providers)
    NEXT_PUBLIC_APPNAME="SIVeL 3"

    # Celo Network Selection
    # Determines the blockchain network for the application.
    # Use 'celo' for the production environment.
    # Use 'celoSepolia' for the development or testing environment.
    NEXT_PUBLIC_NETWORK=celoSepolia

    # -- Learning Points (learn.tg Integration) --
    # URL of the learn.tg endpoint that increments Learning Points after donation
    LEARNTG_INCREMENT_API_URL=https://learn.tg/api/learning-points/increment

    # Ethereum address that identifies sivel.xyz (must match learn.tg's SIVEL_ADDRESS)
    LEARNTG_ADDRESS=0x9F636E5653b649b44c9375E6E103600AE55aF979
    ```

    **Important!** This database configuration is a starting point. You **must** verify that these values match your local system's setup. For example, the `PG_SUPERUSER` might be different (e.g., `postgres`, `user`, etc.) depending on your PostgreSQL installation. Adjust these variables as needed before proceeding.

## Available Commands

This project uses a `Makefile` for common development tasks.

- **`make type`**: Type-checks the TypeScript code using `tsc --noEmit`. This is the recommended way to verify that all type definitions are correct after making changes.
- **`make type-check-tests`**: Type-checks test files using `tsc --noEmit -p tsconfig.test.json`.
- **`make test`**: Runs the test suite with `vitest`.
- **`make format`**: Formats code with `prettier`.
- **`make dev`**: Starts the development server via `./bin/dev`.
- **`make prod`**: Builds and starts production server in background.


## CLI Usage

This project is managed through a Command Line Interface (CLI) named `m`, inspired by the modularity and power of Ruby on Rails.

### `db:super:createuser`

Creates a new role and database using the variables from `.env`.

- **Authentication:** Connects using `PG_SUPERUSER` and `PG_SUPERUSER_PASSWORD`.
- **Creation:** Creates the user (`PGUSER`), password (`PGPASSWORD`), and database (`PGDATABASE`).

**Usage:**

```bash
./bin/m db:super:createuser
```

## Project Structure

The application uses the Next.js **App Router**:

- `app/`: Pages and API routes (`[locale]/`, `api/`)
- `components/`: React components (maps, UI, layout)
- `hooks/`: Custom React hooks (`useTranslation`, `useMiniPay`, `useAutoConnect`)
- `lib/`: Logic modules (donations, learning points, errors, i18n)
- `providers/`: Global providers (`AppProvider` with Wagmi/RainbowKit)
- `contexts/`: React contexts (`WalletContext`)
- `db/`: Database schema, migrations, types (Kysely)
- `tests/`: Test suite (Vitest)
- `bin/m`: The CLI executable.
- `.env`: Environment configuration file.
- `package.json`: Project dependencies and scripts.
- `tsconfig.json`: TypeScript configuration.

## Reference Documentation

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Documentation and testing policies
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Application architecture and data flow
- **[doc/donation-flow.md](doc/donation-flow.md)** — Complete donation flow documentation
- **[doc/mobile-debug-console.md](doc/mobile-debug-console.md)** — Debug console for testing in MiniPay and embedded browsers
- **[doc/I18N.md](doc/I18N.md)** — Internationalization strategy and patterns
