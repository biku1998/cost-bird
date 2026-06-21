import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma config does not auto-load .env — load the repo-root file so that
// env("DATABASE_URL") / env("DIRECT_URL") resolve in schema.prisma.
loadEnv({ path: resolve(import.meta.dirname, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Migrations connect directly (Supabase: port 5432, not the pooler).
  // For local Docker, DIRECT_URL === DATABASE_URL.
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
