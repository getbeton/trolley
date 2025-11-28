## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 3 with the full shadcn/ui registry (New York theme, blue accent)
- Prisma ORM targeting PostgreSQL (`app/prisma/schema.prisma`)
- tRPC + TanStack Query (hooks TBD in upcoming tasks)

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local or managed)
- `npm` (project uses npm scripts exclusively)

## Environment Variables

1. Copy `.env.example` to `.env`.
2. Update at least:
   - `DATABASE_URL` – Postgres connection string.
   - `TWENTY_BASE_URL`, `TWENTY_API_TOKEN`, `TOOL_TOKEN`, `ATTIO_API_TOKEN`.
   - Optional: `NOTIFICATION_WEBHOOK_URL`, `LOG_LEVEL`.
3. Restart `npm run dev` after changing env vars.

## Common Commands

```bash
# install deps
npm install

# start dev server
npm run dev

# lint + type-check
npm run lint

# production build
npm run build
```

## Prisma & Database

```bash
# validate schema
npx prisma validate

# push schema to a dev database (DESCTRUCTIVE on existing data)
npx prisma db push

# create a named migration against your DB
npx prisma migrate dev --name <description>

# generate the client (runs automatically during next build)
npx prisma generate
```

If you do not have a live Postgres instance handy, you can still create SQL
migrations with:

```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/$(date +%Y%m%d)_init/migration.sql
```

## API Surface

- `src/server/api` contains the tRPC routers (credentials, entities, selections)
  plus the shared `createContext`.
- Requests are served through `/api/trpc` (supports POST + GET). Example:

  ```bash
  curl "http://localhost:3000/api/trpc/health?input=%7B%7D"
  ```

- A convenience `/api/health` route returns JSON so we can curl the deployment:

  ```bash
  curl http://localhost:3000/api/health
  ```
- `/api/migrations/run` executes queued migrations with rate-limit aware batches
  and records webhook delivery attempts for auditability.

## Project Structure Highlights

- `src/app` – App Router entrypoints, layouts, and future wizard routes.
- `src/components/ui` – shadcn/ui primitives generated via `npx shadcn add`.
- `src/lib/utils.ts` – Tailwind-aware `cn` helper.
- `src/lib/trpc/client.ts` – React Query bindings for the new tRPC backend.
- `prisma/` – Prisma schema + tracked SQL migrations.

Keep `task_logs/` at the repo root updated per task (see root README). All new
features must run `npm run build` before merging to ensure deploy parity.
