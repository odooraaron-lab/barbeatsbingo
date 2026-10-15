import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";
import { findDatabaseUrl } from "../../scripts/database-url.mjs";

// One pool per function instance. On Vercel, attachDatabasePool keeps the
// instance alive just long enough to close idle connections cleanly.
const globalForDb = globalThis as unknown as { bbbPool?: Pool };

function createPool() {
  const found = findDatabaseUrl();
  if (!found) {
    console.error(
      "[db] No database connection string. In Vercel, connect the Neon database to this project " +
        "(Storage → your database → Connect Project) so DATABASE_URL is set, then redeploy.",
    );
  }
  const pool = new Pool({
    // Without a real address, fail with an obvious host name rather than trying localhost.
    connectionString: found?.url ?? "postgres://database-url-not-set.invalid/none",
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });
  attachDatabasePool(pool);
  return pool;
}

const pool = globalForDb.bbbPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.bbbPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
