import "server-only";
import { headers } from "next/headers";
import { and, count, eq, gt, like, not } from "drizzle-orm";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";

// Limits on the public forms (login, password reset, contact), so nobody can hammer them.
// Attempts are kept in auth_attempts: logins under the email address, other forms under
// "<form>:<key>" (an email can't contain a colon), with the sender's IP address.

/** The visitor's IP address. On Vercel the first x-forwarded-for entry is set by Vercel itself. */
export async function clientIp() {
  const h = await headers();
  return ((h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "").slice(0, 64);
}

const since = (minutes: number) => new Date(Date.now() - minutes * 60_000);

/** Notes a use of a form (not a login). */
export async function noteAttempt(form: string, key: string, ip: string) {
  await db.insert(authAttempts).values({ email: `${form}:${key}`.slice(0, 320), ip, success: false });
}

/** How often this form was used for `key` in the last `minutes`. */
export async function attemptsFor(form: string, key: string, minutes: number) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(authAttempts)
    .where(and(eq(authAttempts.email, `${form}:${key}`.slice(0, 320)), gt(authAttempts.createdAt, since(minutes))));
  return n;
}

/** How often this form was used from `ip` in the last `minutes`. */
export async function attemptsFromIp(form: string, ip: string, minutes: number) {
  if (!ip) return 0;
  const [{ n }] = await db
    .select({ n: count() })
    .from(authAttempts)
    .where(and(eq(authAttempts.ip, ip), like(authAttempts.email, `${form}:%`), gt(authAttempts.createdAt, since(minutes))));
  return n;
}

/** Failed logins from `ip` in the last `minutes`, across all email addresses. */
export async function failedLoginsFromIp(ip: string, minutes: number) {
  if (!ip) return 0;
  const [{ n }] = await db
    .select({ n: count() })
    .from(authAttempts)
    .where(
      and(
        eq(authAttempts.ip, ip),
        eq(authAttempts.success, false),
        not(like(authAttempts.email, "%:%")),
        gt(authAttempts.createdAt, since(minutes)),
      ),
    );
  return n;
}
