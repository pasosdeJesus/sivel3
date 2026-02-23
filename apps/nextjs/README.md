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
    ```

    **Important!** This database configuration is a starting point. You **must** verify that these values match your local system's setup. For example, the `PG_SUPERUSER` might be different (e.g., `postgres`, `user`, etc.) depending on your PostgreSQL installation. Adjust these variables as needed before proceeding.

## Available Commands

This project uses a `Makefile` for common development tasks.

- **`make type`**: Type-checks the TypeScript code using `tsc --noEmit`. This is the recommended way to verify that all type definitions are correct after making changes.
- **`pnpm test`**: Runs the test suite with `vitest`.


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

- `bin/m`: The CLI executable.
- `src/index.ts`: The main application entry point.
- `tests/`: Contains test files.
- `.env`: Environment configuration file.
- `package.json`: Project dependencies and scripts.
- `tsconfig.json`: TypeScript configuration.
