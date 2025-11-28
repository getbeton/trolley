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

We currently integrate directly with Attio’s hosted API and do not maintain a
local database schema. Once the Next.js app introduces a database layer, we
will document the full schema here.
