# Cost-bird — Build Plan (Index)

A cloud cost co-pilot. **POC scope: AWS only.** Natural-language (NL→SQL) access to
normalized billing data, plus proactive Slack alerts. GCP/Azure are deferred until a
paying customer asks.

This index is the map. Each checkpoint below gets its own detailed plan file in this
folder (`01-foundation.md`, `02-data-model.md`, …). Check boxes here as checkpoints
complete; track sub-tasks inside each checkpoint's own file.

---

## Locked decisions

| Area | Decision |
| --- | --- |
| Scope | AWS only for the POC |
| Language / PM | TypeScript end-to-end, **pnpm**. **Single Next.js project** (no monorepo) |
| Database | **Postgres** via **Prisma**. **Supabase** free (prod) + local Docker (dev); migrate to ClickHouse later, schema unchanged |
| Billing source | AWS **CUR 2.0 / Data Exports** in **Parquet** → S3 |
| ETL | TypeScript + **DuckDB**, runs on **GitHub Actions cron** (NOT on Vercel) |
| Agent | **Mastra**, default model **Claude Sonnet 4.6**, **NL→SQL** approach |
| Agent DB access | Dedicated **read-only Postgres role**, never Prisma client |
| UI / hosting | **Next.js** chat interface, deployed free to **Vercel** |
| Alerts | **Slack** weekly summary via **GitHub Actions cron** (one alert for the POC) |

**Deployment goal: entirely free** — Vercel (Hobby) for the app, Supabase (free) for
Postgres, GitHub Actions (free) for ETL + weekly Slack cron.

**Supabase + Prisma connections:** `DATABASE_URL` = pooled string (PgBouncer, port
`6543`) for app/agent runtime; `DIRECT_URL` = direct string (port `5432`) for
migrations. Read-only role is a custom SQL role created in Supabase.

Detail: see `decisions.md` (to be split out if it grows).

---

## Architecture (target)

```text
AWS CUR 2.0 export → S3 (Parquet)
        ↓  GitHub Actions cron (DuckDB ETL)
   Supabase Postgres  ───────┐
   (normalized billing)      │ read-only role
        ↑ Prisma             ↓
   migrations/seed   Mastra NL→SQL agent (Sonnet 4.6)
        │                    ↓
        │            Next.js chat UI ── deployed to Vercel
        └─ Slack weekly summary ── GitHub Actions cron
```

Single Next.js project (deployed to Vercel). ETL + alert crons live in the same repo
but run on GitHub Actions, never in the Vercel serverless bundle:

```text
cost-bird/                  ← Next.js app at root (Vercel builds this)
  app/                      chat UI + /api agent route
  lib/agent/                Mastra NL→SQL agent + read-only SQL tool
  lib/alerts/               Slack weekly summary
  prisma/                   schema, migrations, read-only role, seed
  scripts/etl/              DuckDB CUR→Postgres  (GitHub Actions, NOT Vercel)
  .github/workflows/        cron: nightly ETL + weekly Slack
  dev-plans/                these planning docs
```

---

## Checkpoints

- [x] **CP0 — Foundation & tooling** → `00-foundation.md`
  Single Next.js project scaffold (TypeScript, Tailwind, App Router), pnpm + Node
  pinned, local Docker Postgres for dev, `.env` wired (Supabase pooled/direct URLs,
  AWS, Anthropic, Slack), Vercel-ready. _Done on branch `chore/single-nextjs-foundation`;
  verified install/generate/typecheck/build/migrate/read-only-role._

- [x] **CP1 — Data model (Postgres + Prisma)** → folded into CP0 + CP2
  Schema (`billing_line_item` + `ingestion_run`), migrations, and read-only role
  already shipped in CP0. **Synthetic seed skipped** — real CUR data is already in S3
  (286k rows). A data-profiling pass drove NL→SQL schema improvements now folded into
  CP2 (`charge_category`, `billing_month`, populated `service_name`/`service_group`,
  `global`/`untagged` defaults).

- [x] **CP2 — ETL (CUR 2.0 → Postgres)** → `02-etl.md`
  DuckDB reads Parquet from S3, normalizes + enriches, idempotently loads Postgres
  (replace-by-billing-period), records an ingestion run. Includes the small additive
  migration + the charge-type cost semantics (net bill = SUM of all charge types).
  _Done on branch `feat/etl`; loaded 286,389 rows for 2026-06, total $6,217.20
  (exact parity); idempotency + read-only access verified._

- [ ] **CP3 — NL→SQL agent (Mastra)** → `03-agent.md`
  Mastra agent on Sonnet 4.6 with a guarded SQL-execution tool over the read-only
  role, schema-aware system prompt, safe result formatting. Runnable via a REPL.

- [ ] **CP4 — Chat UI (Next.js)** → `04-web.md`
  Minimal streaming chat interface wired to the agent. No dashboards.

- [ ] **CP5 — Proactive alerts (Slack)** → `05-alerts.md`
  Weekly spend summary pushed to Slack via webhook; scheduled job.

- [ ] **CP6 — Onboarding & polish** → `06-onboarding.md`
  Connect-AWS flow, alert settings, end-to-end run docs. (Stretch for POC.)

---

## Current status (2026-06-21)

- **CP0 merged** to `main` (single Next.js project, Prisma 7 + pg adapter, local Docker
  Postgres, schema + migrations, read-only role).
- **CP1 closed** — schema/migrations/role were already in CP0; synthetic seed skipped
  because real CUR data is in S3. Profiled the real data (286k rows, $6,217, 25
  services, 1 account, tags ~0.7%) and captured NL→SQL schema improvements in `02-etl.md`.
- **CP2 done** on branch `feat/etl`: DuckDB ETL loads 286,389 rows for 2026-06
  ($6,217.20, exact parity); `charge_category`/`service_group`/`service_name` populated,
  `global`/`untagged` defaults applied, idempotency + read-only access verified.
- `.env` has AWS creds + CUR S3 bucket/prefix; Anthropic + Slack keys still blank
  (needed at CP3 / CP5).

> Next: commit/PR CP2, then CP3 — the Mastra NL→SQL agent over the read-only role, with
> a schema card carrying the cost-summation rule + tag sparsity.
