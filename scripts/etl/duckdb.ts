import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import { env } from "./config";

/**
 * Create a DuckDB connection pre-configured to read from the CUR S3 bucket.
 * Uses the httpfs extension with an explicit S3 credential chain.
 */
export async function createCurConnection(): Promise<DuckDBConnection> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  await connection.run("INSTALL httpfs;");
  await connection.run("LOAD httpfs;");

  // Resolve credentials via the standard AWS chain (env vars / shared config /
  // instance role) instead of embedding keys in the SQL string. The ETL's env
  // (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) is picked up here automatically.
  await connection.run(`
    CREATE OR REPLACE SECRET cur_s3 (
      TYPE s3,
      PROVIDER credential_chain,
      REGION '${env.AWS_REGION}'
    );
  `);

  return connection;
}
