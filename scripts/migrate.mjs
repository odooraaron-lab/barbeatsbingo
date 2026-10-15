// Runs before every build (see "build" in package.json):
//   1. applies any new database migrations in ./drizzle
//   2. adds the starter genres if the library is empty
//   3. creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if that user doesn't exist yet
//
// Safe to run repeatedly. Skips everything when DATABASE_URL isn't set.

import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const scrypt = promisify(scryptCb);

// Keep in sync with src/lib/password.ts
async function hashPassword(password) {
  const N = 16384, r = 8, p = 1;
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${Buffer.from(key).toString("base64url")}`;
}

const STARTER_GENRES = [
  ["country", "Country", "Boot-stomping country hits and line-dance favourites."],
  ["bar-favs", "Bar Favs", "The songs every bar crowd knows the words to."],
  ["rock", "Rock", "Big riffs and stadium anthems."],
  ["pop", "Pop", "Chart-toppers old and new."],
  ["reggae", "Reggae", "Laid-back island grooves."],
  ["70s-80s-90s", "70s / 80s / 90s", "Disco, glam rock, synth-pop and grunge: three decades of crowd-pleasers."],
  ["pub-classics", "Pub Classics", "Sing-along anthems that get the whole room belting out the chorus."],
  ["modern", "Modern", "Today's biggest hits across pop, hip-hop and indie."],
  ["mixtapes", "Mixtapes", "Genre-hopping shows that mix decades into one game."],
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("[migrate] DATABASE_URL is not set, skipping migrations.");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });

try {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("[migrate] database is up to date");

  const { rows: [{ count }] } = await pool.query("select count(*)::int as count from categories");
  if (count === 0) {
    for (const [i, [slug, name, description]] of STARTER_GENRES.entries()) {
      await pool.query(
        "insert into categories (slug, name, description, sort_order) values ($1, $2, $3, $4) on conflict (slug) do nothing",
        [slug, name, description, (i + 1) * 10],
      );
    }
    console.log(`[migrate] added ${STARTER_GENRES.length} starter genres`);
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 10) {
      console.warn("[migrate] ADMIN_PASSWORD must be at least 10 characters, admin not created.");
    } else {
      const existing = await pool.query("select id from users where email = $1", [adminEmail]);
      if (existing.rowCount === 0) {
        await pool.query(
          "insert into users (email, name, role, access_all, password_hash) values ($1, $2, 'admin', true, $3)",
          [adminEmail, "Admin", await hashPassword(adminPassword)],
        );
        console.log(`[migrate] created admin user ${adminEmail}`);
      }
    }
  }
} catch (err) {
  console.error("[migrate] failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
