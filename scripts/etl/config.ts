import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

// Load the repo-root .env (scripts/etl -> ../../.env).
loadEnv({ path: resolve(import.meta.dirname, "../../.env") });

const EnvSchema = z.object({
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1).default("us-east-1"),
  CUR_S3_BUCKET: z.string().min(1),
  CUR_S3_PREFIX: z.string().default(""),
  DATABASE_URL: z.string().min(1),
  // Direct (non-pooled) connection used by DuckDB's postgres extension for the
  // bulk load. Falls back to DATABASE_URL (identical for local Docker).
  DIRECT_URL: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);

/** Non-pooled Postgres connection for the bulk ETL write. */
export const directDbUrl = env.DIRECT_URL ?? env.DATABASE_URL;

/** Recursive glob over every parquet file the CUR 2.0 export has written. */
const prefix = env.CUR_S3_PREFIX.replace(/^\/+|\/+$/g, "");
export const curParquetGlob = prefix
  ? `s3://${env.CUR_S3_BUCKET}/${prefix}/**/*.parquet`
  : `s3://${env.CUR_S3_BUCKET}/**/*.parquet`;
