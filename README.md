# Beton Trolley

A Next.js application for managing CRM migrations between Twenty and Attio with real-time progress tracking and webhook notifications.

## Tech Stack

Next.js 16 + TypeScript application with:
- Tailwind CSS 3, the full shadcn/ui component registry (New York style, blue accent)
- Supabase for database (PostgreSQL)
- tRPC for type-safe APIs
- TanStack Query for data fetching

## Getting Started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and configure Supabase credentials
3. Run the development server: `npm run dev`
4. Build for production: `npm run build`

The Tailwind tokens (`--primary`, `--accent`, etc.) are configured to a
blue hue so all shadcn components inherit the theme automatically.
All generated UI lives under `src/components/ui`, with shared helpers in `src/lib`.

### API Endpoints

- `src/server/api` – tRPC routers for credentials, entity metadata, and selection persistence
- `/api/trpc` – HTTP endpoint that fronts the tRPC router (supports GET + POST)
- `/api/health` – lightweight JSON health probe for monitoring

## Database Schema

The application persists state with Supabase (PostgreSQL). The schema
is managed via Supabase migrations and types are auto-generated in
`src/lib/supabase/types.ts`. The primary tables are:

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

### Working with Supabase

1. Copy `.env.example` to `.env.local` and set Supabase environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` – Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Public anon key for client-side
   - `SUPABASE_SERVICE_ROLE_KEY` – Service role key for server-side admin operations

2. Run the SQL migration in Supabase:
   - Via Supabase dashboard: SQL Editor → paste `supabase-migration.sql`
   - Via Supabase CLI: `supabase db push`

3. Generate TypeScript types when schema changes:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
   ```

After modifying the schema, update this README and regenerate types so the
application stays in sync with the database.

## Migration Engine & Notifications

- `src/server/services/migration-engine.ts` implements a rate-limited migration worker
- Runs are enqueued via tRPC (`migrations.queueRun`) and executed through `/api/migrations/run`
- The `MIGRATION_RATE_LIMIT_MS` environment variable controls batch processing speed
- Progress, logs, and webhook notifications are stored in `MigrationRun`, `MigrationLog`,
  and `WebhookNotification` tables for real-time UI updates
- Configure a webhook endpoint with the `NOTIFICATION_WEBHOOK` credential to receive
  notifications on migration completion

## Testing Webhooks

See `test-webhook.js` and `test-webhook-receiver.js` for webhook testing utilities.
Documentation available in `migration-docs/` (gitignored).
