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

- [ ] **CP1 — Data model (Postgres + Prisma)** → `01-data-model.md`
  Normalized `billing_line_item` + `ingestion_run` schema (NL→SQL friendly),
  migrations applied, read-only role provisioned, synthetic seed for demos.

- [ ] **CP2 — ETL (CUR 2.0 → Postgres)** → `02-etl.md`
  DuckDB reads Parquet from S3, normalizes + enriches (service group, environment,
  team), loads Postgres idempotently, records an ingestion run. Validate column
  mapping against the real export once data lands.

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

- **CP0 done** on branch `chore/single-nextjs-foundation`: single Next.js project at
  root, Prisma 7 (pg driver adapter + prisma.config.ts), local Docker Postgres,
  initial migration, read-only role. Build + typecheck green. **PR open → `main`**
  (origin `biku1998/cost-bird`), in review.
- `.env` has AWS creds + CUR S3 bucket/prefix + region (`us-east-1`); Anthropic +
  Slack keys still blank (needed at CP3 / CP5).

> Next: land the CP0 PR, then write `01-data-model.md` and start CP1 (the schema is
> already drafted; CP1 formalizes + seeds it).
