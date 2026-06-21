/**
 * One-off introspection: print the CUR 2.0 parquet schema + a sample row.
 * Run with: pnpm etl:describe
 */
import { curParquetGlob } from "./config";
import { createCurConnection } from "./duckdb";

async function main() {
  const con = await createCurConnection();
  try {
    console.log(`Reading: ${curParquetGlob}\n`);

    const src = `read_parquet('${curParquetGlob}', union_by_name = true, hive_partitioning = true)`;

    const schema = await con.runAndReadAll(`DESCRIBE SELECT * FROM ${src};`);
    const cols = schema.getRowObjectsJson();
    console.log(`=== ${cols.length} columns ===`);
    for (const c of cols) {
      console.log(`${String(c.column_name).padEnd(48)} ${c.column_type}`);
    }

    const count = await con.runAndReadAll(`SELECT count(*) AS n FROM ${src};`);
    console.log(`\n=== row count ===\n${count.getRowObjectsJson()[0]?.n}`);

    const sample = await con.runAndReadAll(`SELECT * FROM ${src} LIMIT 1;`);
    console.log(`\n=== sample row ===`);
    console.log(JSON.stringify(sample.getRowObjectsJson()[0], null, 2));
  } finally {
    con.closeSync();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
