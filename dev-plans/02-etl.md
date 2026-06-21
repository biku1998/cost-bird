# CP2 — ETL (CUR 2.0 → Postgres)

## Context

Real CUR 2.0 data has landed in S3 (`s3://cloud-bird-billing-export/cur/`): **286k+
rows**, one billing period (`2026-06`), single account (`mentorskool`), USD, **$6,217**
total unblended. We're skipping the synthetic seed (CP1) — we have real data, and more
months will arrive naturally.

This checkpoint builds the pipeline that normalizes those 117 CUR columns into our
`billing_line_item` table so the NL→SQL agent (CP3) has clean, query-friendly data.

Profiling the real data surfaced concrete things that would make a non-technical user's
questions return **wrong or empty** answers. Those findings (below) drive a small set of
additive schema changes plus the ETL's derivation logic. The single-table design stays.

### Key data facts that shape this ETL
- **Net bill = SUM(`unblended_cost`) over ALL charge types.** `Usage` alone is only
  $3,925 of $6,217; the rest is `SavingsPlanRecurringFee` ($1,346) + `Tax` ($948).
  `SavingsPlanCoveredUsage` (+$1,382) is cancelled exactly by `SavingsPlanNegation`
  (−$1,382). Filtering to `Usage` undercounts by ~37%.
- **Service codes aren't human words** (`AWSELB`), but friendly names live in the
  `product` MAP (`product['product_name']` → "Elastic Load Balancing").
- **Region is ~30% null**; **resource tags exist on only 0.7% of rows**, `cost_category`
  is empty → environment/team/per-customer enrichment is effectively absent here.
- Daily granularity, Savings Plans in use (no Reserved Instances).

---

## Outcome / Definition of done

`pnpm etl` reads the CUR Parquet from S3, normalizes + enriches it, and idempotently
loads `billing_line_item` (with an `ingestion_run` recorded). Row count and total cost
in Postgres match the source. Re-running is safe (replace-by-billing-period). The
read-only role can query the result.

---

## 1. Schema changes (one additive migration)

Add to `prisma/schema.prisma` (`BillingLineItem`):

| Field | Type | Purpose |
|---|---|---|
| `chargeCategory` | `String` `@map("charge_category")` | Coarse bucket over `charge_type`: `usage \| savings_plan \| tax \| credit \| refund \| fee \| other`. Lets users ask "how much was tax?" and gives the agent a clean grouping. |
| `billingMonth` | `String` `@map("billing_month")` | `'2026-06'` — trivial month filtering ("June bill", "this month") without date math. |

Plus indexes on `chargeCategory`, `billingMonth`, `region`.

Notes:
- Keep `chargeCategory` / `serviceGroup` as **plain `String`** (not enums) — AWS adds new
  line-item types/services over time; the canonical vocabularies live in code with an
  `other` fallback, so new values never break ingestion.
- `serviceName`, `serviceGroup`, `region`, `environment`, `team` columns already exist —
  this checkpoint finally **populates** them (see §3). No type changes needed.

Run `pnpm db:migrate --name add_charge_category_and_billing_month`.

---

## 2. Column mapping (CUR 2.0 → `billing_line_item`)

| Our column | CUR 2.0 source | Notes |
|---|---|---|
| `line_item_id` | `identity_line_item_id` | Not unique across partitions — see idempotency §4. |
| `billing_period` | `bill_billing_period_start_date::date` | First of month. |
| `billing_month` | `BILLING_PERIOD` partition | e.g. `'2026-06'`. |
| `usage_start` / `usage_end` | `line_item_usage_start_date` / `_end_date` | |
| `usage_date` | `line_item_usage_start_date::date` | Daily grouping. |
| `payer_account_id` | `bill_payer_account_id` | |
| `usage_account_id` | `line_item_usage_account_id` | |
| `service_code` | `line_item_product_code` (fallback `product_servicecode`) | |
| `service_name` | `element_at(product, 'product_name')[1]` | Friendly name for NL matching. |
| `service_group` | lookup(`service_code`) → §3 | |
| `product_family` | `product_product_family` | |
| `region` | `coalesce(product_region_code, 'global')` | 30% null → `global`. |
| `availability_zone` | `line_item_availability_zone` | |
| `resource_id` | `line_item_resource_id` | |
| `charge_type` | `line_item_line_item_type` | Keep raw value. |
| `charge_category` | map(`line_item_line_item_type`) → §3 | |
| `usage_type` | `line_item_usage_type` | |
| `operation` | `line_item_operation` | |
| `description` | `line_item_line_item_description` | |
| `usage_amount` | `line_item_usage_amount` | |
| `unblended_cost` | `line_item_unblended_cost` | Primary spend figure (credits/refunds already negative). |
| `pricing_unit` | `coalesce(pricing_unit, product_pricing_unit)` | |
| `currency` | `line_item_currency_code` | USD only here. |
| `environment` | resource_tags env key, else `'untagged'` | ~99% `untagged` on this account. |
| `team` | resource_tags team key, else `'untagged'` | ~99% `untagged`. |
| `tags` | `resource_tags` (MAP) → JSONB | Only when non-empty. |
| `ingestion_run_id` | (this run's id) | FK → `ingestion_run`. |

---

## 3. Derivation logic (`scripts/etl/mappings.ts`)

Canonical lookups in TS, serialized into the load SQL (as `CASE`/`MAP` literals):

- **`serviceGroup`** — `service_code → group` over the 25 observed codes, e.g.
  `compute` (EC2, Lightsail, ECS, Lambda), `storage` (S3, ECR), `database` (RDS,
  DynamoDB), `network` (VPC, ELB, Route53, CloudFront, DataTransfer), `ml` (SageMaker),
  `analytics` (Glue), `security` (KMS, SecretsManager), `management` (CloudWatch,
  CloudFormation, CostExplorer, Events), `savings_plan` (ComputeSavingsPlans), else
  `other` (Amplify, SNS, SQS). Easy to extend.
- **`chargeCategory`** — `line_item_type → category`: `Usage`/`DiscountedUsage` →
  `usage`; any `SavingsPlan*` → `savings_plan`; `Tax` → `tax`; `Credit` → `credit`;
  `Refund` → `refund`; `Fee` → `fee`; else `other`.
- **tag keys** — heuristic match for environment (`environment`, `env`, `user_environment`)
  and team (`team`, `owner`, `user_team`); default `untagged`.

**Cost semantics (also feeds the CP3 schema card):** net bill = `SUM(unblended_cost)`
over all rows. "Usage spend" = `charge_category='usage'`; "tax" = `'tax'`; real Savings
Plan cost = `SavingsPlanRecurringFee` (covered+negation net to zero). Keep ALL rows.

---

## 4. Load strategy — DuckDB in-engine, replace-by-period

Do the whole transform in DuckDB and write straight to Postgres (no marshalling 286k
rows through Node):

1. **Bookkeeping (Prisma, Node):** create an `ingestion_run` (`status=running`,
   `source`=the S3 glob); capture its `id`.
2. **DuckDB:** `INSTALL/LOAD postgres`; `ATTACH '<DIRECT_URL>' AS pg (TYPE postgres)`.
3. **Idempotent replace:** `DELETE FROM pg.public.billing_line_item WHERE billing_month
   IN (<periods in file>)` — clean re-runs as the month's data updates daily. This
   sidesteps the "LineItemId not unique across partitions" issue (the reason we skipped a
   unique constraint in CP0).
4. **Insert:** `INSERT INTO pg.public.billing_line_item (...) SELECT <normalized
   columns>, '<run id>' FROM read_parquet(<glob>)`.
5. **Finalize (Prisma):** set `status=success`, `rowsLoaded`, `billingPeriods`,
   `completedAt`. On any error → `status=failed` + `error`.

Use `DIRECT_URL` for the ATTACH (non-pooled; bulk writes).

---

## 5. Files

- `prisma/schema.prisma` — add `chargeCategory`, `billingMonth` + indexes (+ migration).
- `scripts/etl/mappings.ts` — `serviceGroup`, `chargeCategory`, tag-key lookups.
- `scripts/etl/transform.ts` — builds the normalization `SELECT` (column mapping + maps).
- `scripts/etl/load.ts` — ATTACH + delete/insert; reuses `createCurConnection`.
- `scripts/etl/index.ts` — orchestrates run bookkeeping (reuse `prisma` from
  `lib/db/client.ts`) + invokes load. Replaces the current stub.
- (later) `.github/workflows/etl.yml` — daily cron `pnpm etl` with AWS + DB secrets.
  Can land at the end of CP2 or alongside CP5 cron work.

Reuse: `scripts/etl/config.ts` (`curParquetGlob`, validated env), `scripts/etl/duckdb.ts`
(`createCurConnection`, credential_chain), `lib/db/client.ts` (`prisma`).

---

## 6. Verification

- `pnpm etl` runs clean; prints rows loaded + periods.
- **Parity:** Postgres `count(*)` ≈ source 286k; `SUM(unblended_cost)` ≈ **$6,217.20**.
- **Sanity queries:** total by `charge_category` (usage/savings_plan/tax/credit match the
  profiling numbers); spend by `service_group`; top services; spend by `region` (no null
  bucket); daily trend within June.
- **Idempotency:** run twice → counts unchanged (not doubled).
- **Read-only role:** `psql "$DATABASE_URL_READONLY"` can `SELECT` the table.
- `pnpm typecheck` passes.

---

## 7. Decisions to confirm before building

- `chargeCategory` / `serviceGroup` as **plain String + code-maintained map** (not enum).
  _Recommended_ — extensible, `other` fallback.
- ETL writes **`global`/`untagged`** instead of nulls for region/env/team. _Recommended_
  — clean GROUP BYs for the agent.
- **Replace-by-billing-period** idempotency (vs append + dedup). _Recommended_.
- Keep `environment`/`team` columns despite 99% `untagged` (future months/accounts may
  have tags; activating AWS cost-allocation tags is a separate product task).

> On completion: check **CP2** in `index.md`, then proceed to `03-agent.md` (NL→SQL
> agent), where the **schema card** carries the cost-summation rule + tag sparsity so the
> agent answers correctly.
