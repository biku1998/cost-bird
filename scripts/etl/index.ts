/**
 * CUR 2.0 → Postgres ETL entry point.
 *
 * DuckDB reads the CUR Parquet from S3, normalizes + enriches it, and idempotently
 * loads `billing_line_item` (replace-by-billing-period). Each run is bookended by an
 * `ingestion_run` row so the agent/alerts can reason about freshness.
 *
 *   pnpm etl
 */
import { prisma } from "../../lib/db/client";
import { curParquetGlob } from "./config";
import { loadCur } from "./load";

async function main() {
  const run = await prisma.ingestionRun.create({
    data: { source: curParquetGlob, status: "running" },
  });
  console.log(`ingestion_run ${run.id} started — reading ${curParquetGlob}`);

  try {
    const { rowsLoaded, billingMonths } = await loadCur(run.id);
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        rowsLoaded: BigInt(rowsLoaded),
        billingPeriods: billingMonths,
        completedAt: new Date(),
      },
    });
    console.log(
      `✅ loaded ${rowsLoaded} rows for ${billingMonths.join(", ") || "(no periods)"}`,
    );
  } catch (err) {
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    });
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
