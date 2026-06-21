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

  // Scoped S3 secret (DuckDB Secrets Manager) — keeps creds out of SQL logs.
  await connection.run(`
    CREATE OR REPLACE SECRET cur_s3 (
      TYPE s3,
      PROVIDER config,
      KEY_ID '${env.AWS_ACCESS_KEY_ID}',
      SECRET '${env.AWS_SECRET_ACCESS_KEY}',
      REGION '${env.AWS_REGION}'
    );
  `);

  return connection;
}
