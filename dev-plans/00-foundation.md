# CP0 — Foundation & Tooling

**Goal:** Reshape the existing pnpm monorepo into a **single Next.js project** at the
repo root, ready to deploy free to Vercel, with local Docker Postgres for dev and all
env wiring (Supabase pooled/direct, AWS, Anthropic, Slack) in place.

**Outcome:** `pnpm install` + `pnpm dev` boots the Next.js app; `pnpm db:up` starts
local Postgres; Prisma schema + read-only role script preserved; ETL/agent code parked
in their new homes. No real product logic yet — that's CP1+.

> Sequencing note: this checkpoint is mostly a structural reshape. Almost nothing is
> committed yet (0 tracked files) and only ~315 lines of real code exist, so the reorg
> is low-risk. Do the reorg first, then verify, then commit a clean baseline.

---

## Starting state (verified 2026-06-21)

```text
apps/web/package.json            ← empty shell (no Next app), good deps
packages/agent/package.json      ← empty shell (no source)
packages/db/                     ← KEEP: schema.prisma (117L), setup-readonly.ts (71L),
                                   env.ts, index.ts, prisma.config.ts
packages/etl/src/                ← KEEP: duckdb.ts, config.ts, describe.ts
package.json                     ← workspace scripts
pnpm-workspace.yaml, pnpm-lock.yaml, node_modules
docker-compose.yml, tsconfig.base.json, .nvmrc
.env, .env.example
```

Nothing is committed (`git ls-files` = 0). Deps already chosen: Next 16, React 19,
Prisma 7, Mastra 1.42, DuckDB node-api 1.5, AI SDK 6, Tailwind 4, Zod 4 — **carry
these versions over**, don't re-pick.

---

## Target structure

```text
cost-bird/
  app/
    layout.tsx, page.tsx, globals.css       chat UI (placeholder for now)
    api/chat/route.ts                        agent endpoint (stub in CP0, real in CP3)
  lib/
    db/         client.ts, env.ts, setup-readonly.ts   (from packages/db/src)
    agent/      (empty placeholder; CP3)
    alerts/     (empty placeholder; CP5)
  prisma/
    schema.prisma                            (from packages/db/prisma)
  scripts/
    etl/        duckdb.ts, config.ts, describe.ts, index.ts   (from packages/etl/src)
  .github/workflows/   (empty placeholder; ETL + Slack crons added in CP2/CP5)
  dev-plans/
  next.config.ts, tsconfig.json, postcss.config.mjs, tailwind/globals
  package.json         single, merged
  docker-compose.yml   local Postgres (keep)
  .env, .env.example, .nvmrc, .gitignore
```

---

## Steps (checklist)

### 1. Capture current code before moving
- [ ] Read & note contents of `packages/db/prisma/schema.prisma`,
      `packages/db/src/{setup-readonly,env,index}.ts`, `packages/db/prisma.config.ts`,
      `packages/etl/src/{duckdb,config,describe}.ts` so nothing is lost in the move.

### 2. Scaffold Next.js at root
- [ ] Create the Next.js app at root: TypeScript, App Router, Tailwind v4,
      `src`-less (`app/` at root), import alias `@/*`. Reuse the dep versions from
      `apps/web/package.json` (Next 16, React 19, AI SDK 6, `@ai-sdk/react`).
- [ ] `next.config.ts` — mark native/server-only deps external where needed
      (`pg`; DuckDB never imported by the app so it won't hit the bundle).
- [ ] Minimal `app/page.tsx` placeholder + `app/api/chat/route.ts` stub returning
      a hardcoded reply (proves the route wiring; real agent in CP3).

### 3. Move preserved code into new homes
- [ ] `prisma/schema.prisma` ← from `packages/db/prisma/schema.prisma`
      (relocate `prisma.config.ts` to root or `prisma/`, update paths).
- [ ] `lib/db/` ← `env.ts`, `index.ts` (rename to `client.ts`), `setup-readonly.ts`.
      Fix imports; ensure Prisma client output path is sane for a single app.
- [ ] `scripts/etl/` ← `duckdb.ts`, `config.ts`, `describe.ts` (add `index.ts` entry
      stub). These run via `tsx`/`pnpm`, never imported by Next.
- [ ] Create empty `lib/agent/` and `lib/alerts/` placeholders.

### 4. Merge into a single package.json
- [ ] Collapse the 4 `package.json` files into one root manifest. Dependencies vs
      devDependencies sorted; runtime deps the **app** needs (Next, React, AI SDK,
      Mastra, `@ai-sdk/anthropic`, `pg`, `zod`, Prisma client) as `dependencies`;
      ETL/tooling (`@duckdb/node-api`, `tsx`, `prisma`, `dotenv`, types, Tailwind,
      typescript) as `devDependencies`.
- [ ] Scripts (single-project form):
      `dev` (next dev), `build` (prisma generate && next build), `start`,
      `db:up`/`db:down` (docker compose), `db:migrate`, `db:generate`, `db:studio`,
      `db:setup-readonly`, `etl`, `etl:describe`, `alert:weekly`, `typecheck`, `lint`.
- [ ] Keep `engines.node >=22`, `packageManager` pin, and `pnpm.onlyBuiltDependencies`
      (duckdb, prisma, esbuild, sharp).

### 5. Delete monorepo artifacts
- [ ] Remove `pnpm-workspace.yaml`, `apps/`, `packages/`, `tsconfig.base.json`
      (fold needed compiler opts into root `tsconfig.json`).
- [ ] Delete stale `node_modules` + `pnpm-lock.yaml`, then a fresh `pnpm install`.

### 6. Env & config wiring
- [ ] `.env` / `.env.example` keys finalized:
      `DATABASE_URL` (Supabase pooled :6543 or local Docker),
      `DIRECT_URL` (Supabase direct :5432 or local Docker),
      `DATABASE_URL_READONLY` (agent's read-only role),
      `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`,
      `CUR_S3_BUCKET`, `CUR_S3_PREFIX`,
      `ANTHROPIC_API_KEY`, `SLACK_WEBHOOK_URL`.
- [ ] `prisma/schema.prisma` datasource uses `url = env("DATABASE_URL")` +
      `directUrl = env("DIRECT_URL")`.
- [ ] Confirm `.gitignore` covers `.env`, `node_modules`, `.next`, Prisma generated
      client, DuckDB temp files.
- [ ] `.nvmrc` pinned to Node 22.

### 7. Verify
- [ ] `pnpm install` clean.
- [ ] `pnpm db:up` starts local Postgres; `pnpm db:migrate` applies (empty/initial) OK.
- [ ] `pnpm db:generate` produces the Prisma client.
- [ ] `pnpm dev` serves the placeholder page; `/api/chat` stub responds.
- [ ] `pnpm typecheck` passes.
- [ ] ETL `describe` script at least loads its config without crashing (no CUR data in
      S3 yet, so a full run isn't expected to succeed — note this).

### 8. Commit clean baseline
- [ ] First commit: the reorganized single-Next.js skeleton. (On `main` — confirm
      with user before pushing anywhere.)

---

## Decisions / open questions for this checkpoint

- **Local dev DB vs Supabase from day one:** plan uses **local Docker** for CP0–CP2
  dev, switching `DATABASE_URL` to Supabase for the deployed app. Confirm we're not
  pointing dev at Supabase yet.
- **Prisma client output location:** default `node_modules/@prisma/client` vs a
  committed `generated/` dir. Lean **default** (regenerated on install/build) and
  gitignore it.
- **Tailwind:** v4 (PostCSS plugin) per existing deps. shadcn/ui deferred to CP4 when
  we build the real chat UI.

---

## Definition of done

A single Next.js project at the repo root that installs, type-checks, runs `pnpm dev`,
talks to a local Postgres via Prisma, preserves the schema + read-only role script +
ETL helpers in their new locations, and has every monorepo artifact removed — committed
as a clean baseline. No product logic yet.

> On completion: check **CP0** in `index.md` and proceed to `01-data-model.md`.
