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
});

export const env = EnvSchema.parse(process.env);

/** Recursive glob over every parquet file the CUR 2.0 export has written. */
export const curParquetGlob = `s3://${env.CUR_S3_BUCKET}/${env.CUR_S3_PREFIX.replace(
  /\/+$/,
  "",
)}/**/*.parquet`;
