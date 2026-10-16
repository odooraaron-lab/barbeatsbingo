import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { passwordTokens, users } from "@/db/schema";
import { hashToken, newToken } from "./session";
import { appUrl } from "./email";

/** Creates a single-use link for setting a password. Used for resets and new-customer invites. */
export async function createPasswordLink(userId: string, purpose: "reset" | "invite") {
  const token = newToken();
  const hours = purpose === "invite" ? 24 * 7 : 1;
  await db.insert(passwordTokens).values({
    id: hashToken(token),
    userId,
    purpose,
    expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
  });
  return `${await appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function findValidToken(token: string) {
  if (!token) return null;
  const [row] = await db
    .select({ id: passwordTokens.id, userId: passwordTokens.userId, purpose: passwordTokens.purpose, email: users.email })
    .from(passwordTokens)
    .innerJoin(users, eq(users.id, passwordTokens.userId))
    .where(
      and(
        eq(passwordTokens.id, hashToken(token)),
        isNull(passwordTokens.usedAt),
        gt(passwordTokens.expiresAt, sql`now()`),
        eq(users.isActive, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

