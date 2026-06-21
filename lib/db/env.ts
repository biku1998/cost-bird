import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

// Load the repo-root .env for scripts run via tsx (Next.js loads it on its own).
loadEnv({ path: resolve(import.meta.dirname, "../../.env") });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const DATABASE_URL = required("DATABASE_URL");
export const DATABASE_URL_READONLY =
  process.env["DATABASE_URL_READONLY"] ?? DATABASE_URL;
