/**
 * Create / refresh the read-only Postgres role the NL→SQL agent uses.
 *
 * The agent executes model-generated SQL, so it MUST connect through a role that
 * physically cannot mutate data. This script (run as the admin role) provisions
 * that role from DATABASE_URL_READONLY and grants it SELECT-only access.
 *
 *   pnpm db:setup-readonly
 */
import { Client } from "pg";
import { DATABASE_URL, DATABASE_URL_READONLY } from "./env";

function parse(url: string) {
  const u = new URL(url);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

// Role and database names are interpolated into DDL (Postgres can't parameterize
// identifiers), so reject anything that isn't a plain Postgres identifier.
function assertIdentifier(name: string, label: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Unsafe Postgres identifier for ${label}: "${name}". ` +
        `Expected /^[a-zA-Z_][a-zA-Z0-9_]*$/.`,
    );
  }
}

async function main() {
  const ro = parse(DATABASE_URL_READONLY);
  const admin = parse(DATABASE_URL);

  if (ro.user === admin.user) {
    console.warn(
      `⚠️  DATABASE_URL_READONLY uses the same role as DATABASE_URL (${ro.user}). ` +
        `The agent will not be sandboxed. Configure a distinct read-only role.`,
    );
    return;
  }

  assertIdentifier(ro.user, "DATABASE_URL_READONLY role");
  assertIdentifier(admin.database, "DATABASE_URL database");

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  // Quote the literal safely for the password.
  const pw = ro.password.replace(/'/g, "''");

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${ro.user}') THEN
        CREATE ROLE ${ro.user} LOGIN PASSWORD '${pw}';
      ELSE
        ALTER ROLE ${ro.user} LOGIN PASSWORD '${pw}';
      END IF;
    END
    $$;
  `);

  // Hard guardrails: read-only, with a server-side statement timeout so a runaway
  // agent query can't pin the database.
  await client.query(`GRANT CONNECT ON DATABASE ${admin.database} TO ${ro.user};`);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${ro.user};`);
  await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${ro.user};`);
  await client.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${ro.user};`,
  );
  await client.query(`REVOKE CREATE ON SCHEMA public FROM ${ro.user};`);
  await client.query(`ALTER ROLE ${ro.user} SET statement_timeout = '15s';`);
  await client.query(`ALTER ROLE ${ro.user} SET default_transaction_read_only = on;`);

  await client.end();
  console.log(`✅ Read-only role "${ro.user}" is ready (SELECT-only, 15s timeout).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
