# Attio Tools

This folder hosts the existing Python utilities that talk to the Attio API while
we prepare a new Next.js + COSS application in the repo root.

## Contents

- `attio_cli.py` / `attio_server.py` – lightweight helpers for exploring Attio
  objects and wiring FastMCP tools.
- `find_duplicates.py` – crawls the Attio People/Company objects and produces a
  local `duplicates_report.txt`.
- `merge_duplicates.py` – merges duplicate companies by name by deleting the
  newer records, consolidating their domains, and patching the oldest record.
- `inspect_company.py` – quick helper to print raw JSON for a specific company
  record (adjust the `record_id` before running).
- `crm_migration/` – the original Twenty → Attio migration CLI, including its
  virtual environment, requirements, and logging utilities.

## Setup

```bash
cd attio-tools
python3 -m venv crm_migration/venv  # already committed, but you can recreate
source crm_migration/venv/bin/activate
pip install -r crm_migration/requirements.txt
cp crm_migration/.env.example crm_migration/.env  # fill ATTIO_API_TOKEN, etc.
```

All scripts load their `.env` from `crm_migration/.env`, so once that file has a
valid `ATTIO_API_TOKEN` they can be invoked from anywhere in the repo.

## Common Commands

```bash
# Detect duplicate people/companies
python find_duplicates.py

# Merge cloned companies and keep aggregated domains
python merge_duplicates.py

# List Attio objects
python attio_cli.py list-objects
```

Generated artifacts stay inside this folder and are ignored via the top-level
`.gitignore`, so the root of the repository remains clean for the upcoming
Next.js scaffold.

