import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { DATABASE_URL } from "./env";

export { PrismaClient } from "../generated/prisma/client";
export type { BillingLineItem, IngestionRun } from "../generated/prisma/client";
export { DATABASE_URL, DATABASE_URL_READONLY } from "./env";

// Prisma 7 connects through a driver adapter. `pg` talks to the runtime/pooled
// connection (Supabase PgBouncer in prod, local Docker in dev).
const adapter = new PrismaPg({ connectionString: DATABASE_URL });

/** Full-access Prisma client (ETL writes + bookkeeping, app reads). */
export const prisma = new PrismaClient({ adapter });
