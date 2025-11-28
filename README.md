# Beton Trolley

We are clearing the root of this repo so it can host a new COSS-friendly Next.js
application. All of the existing Attio migration + deduplication logic has been
consolidated under `attio-tools/`.

## Current Layout

- `attio-tools/` – Python utilities for Attio (CRM migration, duplicate
  detection, and automated merge scripts). This folder still contains its own
  virtual environment and `.env`-driven configuration.
- *(future)* `app/` – will contain the new Next.js front-end once we scaffold
  the COSS stack.

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
