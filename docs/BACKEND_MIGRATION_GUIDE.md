# Supabase → NestJS + Prisma + PostgreSQL

This folder tracks migrating **off Supabase** to a **NestJS API**, **Prisma ORM**, and a **self-hosted PostgreSQL** that holds **the full existing schema and every existing row** (plus Storage file copy where applicable). The React/Vite frontend stays; only integration code changes to call `VITE_API_URL`.

## Target architecture

| Layer | Choice |
|-------|--------|
| API | **NestJS** (HTTP, optional WebSockets, scheduled jobs) |
| Data access | **Prisma Client** in Nest services |
| Database | **PostgreSQL** (same engine as Supabase; easiest path for schema + data) |
| Schema evolution | **Prisma Migrate** after baseline (see tasks MIG-013–MIG-015) |
| Files | S3-compatible bucket; optional copy from Supabase Storage (MIG-012) |

## End-to-end plan (order of operations)

1. **Planning (MIG-001–005)** — ADR, secrets, inventory of Supabase usage, RPCs/RLS.
2. **Infrastructure & database (MIG-006–012)** — Provision Postgres; apply **full schema**; **bulk-copy all rows**; validate counts; migrate **auth identities**; copy **Storage** objects.
3. **Prisma (MIG-013–016)** — `db pull`, hand-tune `schema.prisma`, **baseline** migrations for future changes, optional seed for dev.
4. **NestJS shell (MIG-020–023)** — App bootstrap, **PrismaService**, modules, CORS/throttle.
5. **Auth & domain APIs (MIG-030+)** — Replace Supabase Auth and RPCs with Nest + Prisma.
6. **Integrations & realtime** — Edge Function logic in Nest; WebSockets for channels.
7. **Frontend** — Swap `supabase-js` for HTTP client to Nest.
8. **QA & cutover (MIG-090+)** — Contract tests, E2E, production runbook, decommission Supabase.

## Full database migration (schema + all records)

- **Schema:** Replay `supabase/migrations` on an empty target DB, or `pg_dump --schema-only` from Supabase and restore (MIG-007).
- **Data:** `pg_dump --data-only` / vendor backup / `COPY` with correct FK order; then **`setval`** on sequences (MIG-008).
- **Validation:** Automated per-table row counts (and optional checksums) source vs target (MIG-009).
- **Auth:** `auth.users` is not used by Prisma by default — plan explicit **user export/mapping** into your app user table (MIG-011).
- **Prisma:** After the DB is populated, **`prisma db pull`** introspects the live schema (MIG-013); tune models (MIG-014); lock **migrate baseline** for onward changes (MIG-015).

## Files in this folder

| File | Purpose |
|------|---------|
| `backend-migration-tasks.csv` | Task register (Excel-friendly CSV, UTF-8 BOM). |
| `backend-migration-tasks.xlsx` | Same tasks, sheet **Tasks** (regenerated when the file is not locked). |
| `backend-migration-tasks.generated.xlsx` | Fallback output if `backend-migration-tasks.xlsx` is open in Excel — close the workbook and re-run the script to refresh the main file. |
| `generate_migration_workbook.py` | **Source of truth** for tasks — edit `ROWS` then regenerate. |
| `DATABASE_AND_API_REFERENCE.md` | **Tables, RPCs, Edge Functions, and proposed REST/WebSocket API** for Nest migration. |
| `SELF_HOSTING_FROM_LOVABLE.md` | **Leaving Lovable + Supabase Cloud**: self-host map (EC2), Strategy A vs B. |
| `DOCKER_PLAN_A_SELFHOST.md` | **Plan A all-Docker**: official Supabase compose + this repo’s `docker/` web image, env, Edge Functions notes. |

## Column definitions

| Column | Meaning |
|--------|---------|
| **Task_ID** | Stable id (MIG-###). |
| **Phase** | Planning / Database / **Prisma** / Backend / Auth / Domain_API / Integrations / Realtime / Storage / Frontend / QA / Cutover. |
| **Area** | NestJS, Prisma, Data, Auth, etc. |
| **Task_Title** | Short name. |
| **Description** | Scope; Nest/Prisma specifics where relevant. |
| **Acceptance_Criteria** | Definition of done. |
| **Estimated_Hours** | Rough engineering effort (one mid–senior FTE); see note below. |
| **Priority** | P0–P3. |
| **Dependencies** | Other Task_IDs. |
| **Owner** / **Status** | For your team. |

## Estimates (`Estimated_Hours`)

- Baseline is **AI-assisted work** (e.g. Cursor or similar): analysis of each step, codegen, refactors, and drafting tests with **you** reviewing, integrating, and running in real environments.
- Figures are **not** padded for a fully manual rewrite; they assume iterative AI help on Nest/Prisma/TypeScript and the existing repo context.
- **Still higher where tools do less**: production data loads (MIG-008), identity migration (MIG-011), cutover (MIG-092), and security-sensitive paths (auth/MFA) — human judgment and dry runs remain.
- If work is **mostly without AI**, scale estimates up roughly **1.3×–1.8×**.
- **Parallel work** shortens calendar time; summed hours are a rough capacity hint.
- Source of truth: `ESTIMATED_HOURS` in `generate_migration_workbook.py` (regenerate CSV/XLSX after edits).
- Running `python docs/generate_migration_workbook.py` prints **total hours** and approximate **8-hour dev-days** for the full register.

## Regenerate CSV and Excel

```bash
pip install openpyxl
python docs/generate_migration_workbook.py
```

If Excel has `backend-migration-tasks.xlsx` open, the script writes `backend-migration-tasks.generated.xlsx` instead. Close Excel and run again to update the primary workbook.

## Scope notes

- **RLS** → Nest **guards** + Prisma queries scoped by `user_id` / `store_id`.
- **Edge Functions** → Nest **controllers + services** (same business rules).
- **Realtime** → Nest **WebSocket** gateway (or polling interim).
- **MySQL** is out of scope unless you add a separate ADR (Prisma supports it but this plan assumes PostgreSQL).
