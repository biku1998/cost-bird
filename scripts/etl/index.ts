/**
 * CUR 2.0 → Postgres ETL entry point.
 *
 * Placeholder for CP0. The real pipeline (DuckDB reads Parquet from S3,
 * normalizes + enriches, idempotently loads `billing_line_item`, and records an
 * `ingestion_run`) is built in CP2 — see dev-plans/02-etl.md.
 *
 *   pnpm etl
 */
import { curParquetGlob } from "./config";

async function main() {
  console.log(
    `ETL not implemented yet (CP2). Configured source glob:\n  ${curParquetGlob}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
