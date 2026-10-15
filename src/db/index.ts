import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

// One pool per function instance. On Vercel, attachDatabasePool keeps the
// instance alive just long enough to close idle connections cleanly.
const globalForDb = globalThis as unknown as { bbbPool?: Pool };

function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
