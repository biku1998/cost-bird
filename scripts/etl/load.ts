import { curParquetGlob, directDbUrl } from "./config";
import { createCurConnection } from "./duckdb";
import { billingMonthsSql, buildInsertSelect } from "./transform";

/** Convert a postgres:// URL into a libpq keyword/value DSN for DuckDB's ATTACH. */
function toLibpqDsn(url: string): string {
  const u = new URL(url);
  const parts: Record<string, string> = {
    host: u.hostname,
    port: u.port || "5432",
    dbname: u.pathname.replace(/^\//, ""),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  };
  return Object.entries(parts)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
}

const SRC = `read_parquet('${curParquetGlob}', union_by_name = true, hive_partitioning = true)`;

/**
 * Normalize the CUR Parquet and load it into Postgres `billing_line_item`, entirely
 * inside DuckDB (no row marshalling through Node). Idempotent: replaces every billing
 * month present in the source before inserting.
 */
export async function loadCur(
  runId: string,
): Promise<{ rowsLoaded: number; billingMonths: string[] }> {
  const con = await createCurConnection();
  try {
    await con.run("SET TimeZone = 'UTC';");
    await con.run("INSTALL postgres; LOAD postgres;");
    await con.run(`ATTACH '${toLibpqDsn(directDbUrl)}' AS pg (TYPE postgres);`);

    const monthsRes = await con.runAndReadAll(billingMonthsSql(SRC));
    const billingMonths = monthsRes
      .getRowObjectsJson()
      .map((r) => String(r.m))
      .filter((m) => m && m !== "null");

    if (billingMonths.length > 0) {
      const inList = billingMonths.map((m) => `'${m}'`).join(", ");
      await con.run(
        `DELETE FROM pg.public.billing_line_item WHERE billing_month IN (${inList});`,
      );
    }

    await con.run(buildInsertSelect(SRC, runId));

    const cntRes = await con.runAndReadAll(
      `SELECT count(*) AS n FROM pg.public.billing_line_item WHERE ingestion_run_id = '${runId}';`,
    );
    const rowsLoaded = Number(cntRes.getRowObjectsJson()[0]?.n ?? 0);

    return { rowsLoaded, billingMonths };
  } finally {
    con.closeSync();
  }
}
