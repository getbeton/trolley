# Beton Trolley

We are clearing the root of this repo so it can host a new COSS-friendly Next.js
application. All of the existing Attio migration + deduplication logic has been
consolidated under `attio-tools/`.

## Current Layout

- `attio-tools/` – Python utilities for Attio (CRM migration, duplicate
  detection, and automated merge scripts). This folder still contains its own
  virtual environment and `.env`-driven configuration.
- `app/` – Next.js 16 + TypeScript application that will host the new COSS stack
  UI. The project ships with Tailwind CSS 3, the full shadcn/ui component
  registry (New York style) tuned to a blue accent palette, Prisma, tRPC,
  TanStack Query, and Jest/Playwright scaffolding will be layered in next.

## Working With The Next.js App

1. `cd app`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Build for production before shipping any change: `npm run build`

The Tailwind tokens (`--primary`, `--accent`, etc.) are already configured to a
blue hue so all shadcn components inherit the requested theme automatically. If
you need to regenerate components, run `npx shadcn@latest add <component>` from
within `app/`. All generated UI lives under `src/components/ui`, with shared
helpers in `src/lib`.

### API surface

- `app/src/server/api` – tRPC routers for credentials, entity metadata, and
  selection persistence.
- `/api/trpc` – HTTP endpoint that fronts the tRPC router (supports GET + POST).
- `/api/health` – lightweight JSON health probe surfaced for curl-based smoke
  tests.

## Working With The Attio Toolkit

1. `cd attio-tools`
2. Activate the bundled virtualenv:
   `source crm_migration/venv/bin/activate`
3. Export/update `crm_migration/.env` with valid `ATTIO_API_TOKEN`.
4. Run whichever script you need, e.g.:
   - `python find_duplicates.py`
   - `python merge_duplicates.py`
   - `python attio_cli.py list-objects`

The scripts log aggressively so we can trace every remote change. Generated
artifacts such as `duplicates_report.txt` stay inside `attio-tools/` and are
gitignored.

## Database Schema

The Next.js app now persists state with PostgreSQL through Prisma. The schema
file lives at `app/prisma/schema.prisma` and the generated SQL migration is
checked in at `app/prisma/migrations/20251128_init/migration.sql`. The primary
tables are:

- `User` – authenticated operators within the UI; owns credentials, selections,
  and migrations.
- `Credential` – stores validated tokens/secrets for Twenty, Attio, the internal
  tool, and optional webhooks, along with validation metadata.
- `EntitySelection` / `FieldSelection` – capture which CRM entities/fields the
  user selected (per system) and store samples + metadata for the wizard.
- `Migration` – the top-level configuration for a migration, including status,
  ETA, and record estimates.
- `MigrationRun` / `MigrationLog` – execution attempts and append-only logs for
  monitoring progress and troubleshooting.
- `FieldMapping` – the finalized source→target field relationships used when
  constructing JSON payloads.
- `WebhookNotification` – queued webhook deliveries for notifying users about
  migration progress/completion.

### Working with Prisma locally

1. Copy `app/.env.example` to `app/.env` and set `DATABASE_URL` to a Postgres
   instance you control.
2. Apply the schema (either `npx prisma db push` for a disposable database or
   `npx prisma migrate dev --name init` for a managed environment).
3. Generate the client when the schema changes: `npx prisma generate`.
4. Keep SQL migrations under `app/prisma/migrations/` in chronological folders.
   When you lack a database (e.g., CI dry run), you can run  
   `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<timestamp>_init/migration.sql`
   to materialize the SQL without connecting to Postgres.

After modifying the schema, update this README so newcomers can reason about the
data model before touching production.

## Migration Engine & Notifications

- `app/src/server/services/migration-engine.ts` simulates a rate-limited
  migration worker. Runs are enqueued via `tRPC` (`migrations.queueRun`) and
  executed through the `/api/migrations/run` route which honours the
  `MIGRATION_RATE_LIMIT_MS` environment variable.
- Progress, logs, and webhook notifications are stored under the
  `MigrationRun`, `MigrationLog`, and `WebhookNotification` tables so the UI can
  stream realtime updates.
- Configure a webhook endpoint by validating the `NOTIFICATION_WEBHOOK` credential;
  successful runs automatically fan out a JSON payload and persist the delivery
  status for auditability.
