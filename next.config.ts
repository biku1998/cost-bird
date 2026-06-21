import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/server-only packages out of the client + serverless bundle.
  // (DuckDB is never imported by the app — it only runs in scripts/etl on CI.)
  serverExternalPackages: ["pg", "@prisma/client"],
};

export default nextConfig;
