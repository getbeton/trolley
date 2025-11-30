# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server
npm run dev

# Build and validation
npm run build
npm run lint

# Database operations
npx prisma validate
npx prisma db push          # dev only - destructive
npx prisma migrate dev --name <description>
npx prisma generate         # auto-runs during build

# Health checks
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/trpc/health?input=%7B%7D"
```

## Architecture Overview

This is a **CRM migration tool** built as a Next.js 16 application with tRPC and Prisma. The core workflow allows users to:

1. **Configure credentials** for source (Twenty.com) and destination (Attio) CRMs
2. **Select entities and fields** to migrate between systems  
3. **Queue and execute migrations** with rate-limited batch processing
4. **Monitor progress** through webhook notifications and detailed logs

### Key Architecture Patterns

**tRPC API Layer**: All backend logic is exposed through type-safe tRPC routers:
- `src/server/api/routers/` - Domain-specific routers (credentials, entities, selections, migrations)
- `src/server/api/root.ts` - Main router composition
- `src/server/api/trpc.ts` - Context creation with demo user auth

**Database Schema**: Prisma-managed PostgreSQL with these core entities:
- **User** - Demo user for the migration UI
- **Credential** - API tokens and webhook URLs per CRM system
- **EntitySelection/FieldSelection** - User's chosen data mapping
- **Migration/MigrationRun** - High-level config and execution tracking
- **MigrationLog** - Detailed progress logging per run
- **WebhookNotification** - Async notification delivery

**Migration Engine**: `src/server/services/migration-engine.ts` handles:
- Queue-based execution with `queueMigrationRun()`
- Rate-limited batch processing in `executeRun()`
- Webhook delivery for completion notifications
- Comprehensive logging and progress tracking

**Service Layer**: External CRM integrations in `src/server/services/`:
- `twenty.ts` / `attio.ts` - CRM-specific API clients  
- `http.ts` - Shared HTTP utilities with rate limiting
- `credentials.ts` - Async credential validation

### Frontend Patterns

- **Full shadcn/ui component library** (New York theme, blue accent)
- **React Hook Form** with Zod validation throughout forms
- **TanStack Query** via tRPC for all server state
- **@/* path alias** for clean imports from `src/`

### Environment Setup

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- Optional: `NOTIFICATION_WEBHOOK_URL`, `LOG_LEVEL`
- CRM credentials are managed in the UI, not environment variables

### Testing and Deployment

- Always run `npm run build` before merging to ensure deploy parity
- Database migrations are tracked in `prisma/migrations/`
- The `/api/migrations/run` endpoint executes queued migrations with webhook delivery