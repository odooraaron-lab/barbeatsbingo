import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "bbb_session";
const SESSION_DAYS = 30;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

// Vercel always serves over HTTPS; locally we run on plain http.
const secureCookies = process.env.VERCEL === "1" || process.env.SECURE_COOKIES === "1";

export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 300);

  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt, userAgent });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsFor(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  venue: string;
  role: "admin" | "member";
  accessAll: boolean;
  accessExpiresAt: Date | null;
  /** Worked out by the database, so pages never read the clock while rendering. */
  accessExpired: boolean;
  /** May play shows on the site (the player, call list and bingo checker). Admins always can. */
  canPlay: boolean;
  /** Has the player and checker switched on, on show pages. */
  playMode: boolean;
};

/** The signed-in user for this request, or null. Memoised per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      venue: users.venue,
      role: users.role,
      isActive: users.isActive,
      accessAll: users.accessAll,
      accessExpiresAt: users.accessExpiresAt,
      accessExpired: sql<boolean>`coalesce(${users.accessExpiresAt} < now(), false)`,
      canPlay: sql<boolean>`(${users.canPlay} or ${users.role} = 'admin')`,
      playMode: users.playMode,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);

  if (!row || !row.isActive) return null;
  const { isActive: _active, ...user } = row;
  return user;
});
