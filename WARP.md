# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Key commands

All commands are run from the repository root.

### Development server
- Start the API in watch mode:
  - `npm run dev` (runs `node --watch src/index.js`).

### Linting and formatting
- Lint all source files:
  - `npm run lint`
- Auto-fix lint issues where possible:
  - `npm run lint:fix`
- Format all source files with Prettier:
  - `npm run format`
- Check formatting without writing changes:
  - `npm run format:check`

### Database (Drizzle ORM + Neon/Postgres)
Environment: `DATABASE_URL` must be set for all Drizzle commands.

- Generate Drizzle SQL from the models in `src/models/*.js`:
  - `npm run db:generate`
- Apply pending migrations to the database configured by `DATABASE_URL`:
  - `npm run db:migrate`
- Open Drizzle Studio for inspecting the schema/data:
  - `npm run db:studio`

## Environment configuration

The application relies on the following environment variables (typically loaded via `dotenv`):

- `PORT` – Port the HTTP server listens on (defaults to `3000` if unset).
- `DATABASE_URL` – Postgres connection string used by Drizzle/Neon.
- `NODE_ENV` – Controls production vs non-production behavior (e.g., logger console transport, cookie security flags).
- `LOG_LEVEL` – Minimum log level for Winston logger (defaults to `info`).
- `JWT_SECRET` – Secret key used to sign and verify JWTs (`src/utils/jwt.js`).

## Application architecture

### Entry point and server bootstrap
- `src/index.js`
  - Loads environment variables via `dotenv/config`.
  - Imports `src/server.js` to start the HTTP server.
- `src/server.js`
  - Imports the Express app from `src/app.js`.
  - Reads `PORT` from the environment (fallback `3000`).
  - Calls `app.listen(PORT, ...)` to start the server.

### Express app and HTTP layer
- `src/app.js`
  - Creates the Express instance and wires core middleware:
    - `helmet` for security headers.
    - `cors` with default settings.
    - JSON and URL-encoded body parsers.
    - `cookie-parser` for cookie handling.
    - `morgan` HTTP logging, piped into the shared Winston logger (`#config/logger.js`).
  - Defines basic health and root endpoints:
    - `GET /` – Simple text response plus a log entry.
    - `GET /health` – Returns `{ status, timestamp, uptime }`.
    - `GET /api` – Returns a simple JSON status message.
  - Mounts feature routes:
    - `/api/auth` → `src/routes/auth.routes.js`.

### Routing, controllers, and validation

- `src/routes/auth.routes.js`
  - Creates an Express router for authentication-related endpoints.
  - Routes:
    - `POST /sign-in` – Placeholder handler returning a simple response.
    - `POST /sign-up` – Delegates to `signup` in `src/controllers/auth.controller.js`.
    - `POST /sign-out` – Placeholder handler returning a simple response.

- `src/controllers/auth.controller.js`
  - `signup(req, res, next)`:
    - Validates the incoming payload with `signupSchema` from `src/validations/auth.validation.js` (Zod).
    - On validation failure, returns HTTP 400 with a structured `details` field produced by `formatValidationErrors` from `src/utils/format.js`.
    - On success, calls `createUser` from `src/services/auth.service.js` with the validated data.
    - On success, returns HTTP 201 with a summary of the created user.
    - Logs and maps domain errors, specifically handling the "user with this email already exists" case with HTTP 409.

- `src/validations/auth.validation.js`
  - Uses Zod to define schemas for auth flows:
    - `signupSchema` – Validates `name`, `email`, `password`, and `role` (`'user' | 'admin'`, default `'user'`).
    - `singinSchema` – Validates sign-in payload (`email`, `password`).

- `src/utils/format.js`
  - `formatValidationErrors` – Normalizes Zod error objects into a single readable string.

### Services and persistence (Drizzle ORM + Neon)

- `src/services/auth.service.js`
  - Depends on the shared logger, Drizzle database instance (`#config/database.js`), and the `users` table model.
  - `hashPassword(password)` – Wraps `bcrypt.hash` with logging and a generic error message on failure.
  - `createUser({ name, email, password, role })`:
    - Checks for an existing user by email using `drizzle-orm` and `eq(users.email, email)`.
    - Throws a domain error if the user already exists.
    - Hashes the password and inserts a new user row via Drizzle, returning a selected subset of columns.
    - Logs success and propagates errors after logging them.

- `src/models/user.model.js`
  - Defines the `users` table using `drizzle-orm/pg-core`:
    - `id` – UUID primary key with `gen_random_uuid()` default.
    - `name`, `email` (unique), `password`, `role` (default `'user'`).
    - `created_at`, `updated_at` timestamps with `defaultNow()`.

- `src/config/database.js`
  - Configures Neon serverless Postgres driver with WebSockets (`ws`).
  - Creates a `Pool` using `process.env.DATABASE_URL`.
  - Exposes a Drizzle `db` instance (`drizzle(pool)`) used by services.

- `drizzle.config.js`
  - Points Drizzle CLI at the schema in `./src/models/*.js` and outputs generated artifacts/migrations into `./drizzle`.

- `drizzle/`
  - Contains generated SQL migrations and metadata; applied via `npm run db:migrate`.

### Logging

- `src/config/logger.js`
  - Configures a Winston logger with:
    - JSON-structured logs, timestamps, and stack traces.
    - Default metadata: `{ service: 'production-api' }`.
    - File transports:
      - `logs/error.lg` for errors.
      - `logs/combined.log` for all logs.
  - In non-production (`NODE_ENV !== 'production'`), adds a colorized console transport for local development.
- `src/app.js`
  - Uses `morgan` with a custom `stream` to forward HTTP access logs into the shared logger.

### Utilities

- `src/utils/jwt.js`
  - Wraps `jsonwebtoken` to provide a small `jwttoken` helper with `sign` and `verify` methods.
  - Uses `JWT_SECRET` and a fixed `expiresIn` of `1d`.
- `src/utils/cookies.js`
  - Centralizes cookie behavior via a `cookies` helper with:
    - `getOptions()` – Returns the base cookie options (e.g., `httpOnly`, `secure` depending on `NODE_ENV`, `sameSite`, `maxAge`).
    - `set`, `clear`, `get` helpers for working with Express `req`/`res` cookies.

### Module resolution and imports

This project uses Node.js `imports` maps (see `package.json`) to provide path aliases under the `#` namespace:

- `#config/*` → `./src/config/*`
- `#models/*` → `./src/models/*`
- `#routes/*` → `./src/routes/*`
- `#utils/*` → `./src/utils/*`
- `#middleware/*` → `./src/middleware/*`
- `#controllers/*` → `./src/controllers/*`
- `#services/*` → `./src/services/*`
- `#validations/*` → `./src/validations/*`

When adding new modules, prefer using these aliases instead of long relative paths.

## Testing

- There is currently no `test` script defined in `package.json` and no test runner configured.
- `eslint.config.js` is pre-configured to recognize globals for a Jest-style test environment in `tests/**/*.js`, so if/when tests are added under `tests/`, they will automatically pick up appropriate linting globals.
