"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { authAttempts, passwordTokens, sessions, users } from "@/db/schema";
import { createSession, destroyAllSessionsFor, destroySession } from "@/lib/session";
import { getDummyHash, hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { safeNextPath } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { createPasswordLink, findValidToken } from "@/lib/password-links";

export type FormState = { error?: string; ok?: string; email?: string };

const MAX_FAILURES = 8;
const LOCKOUT_MINUTES = 15;

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim().slice(0, 64) ?? "";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = formData.get("next");

  if (!email || !password) return { error: "Enter your email and password.", email };

  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);
  const [{ failures }] = await db
    .select({ failures: count() })
    .from(authAttempts)
    .where(and(eq(authAttempts.email, email), eq(authAttempts.success, false), gt(authAttempts.createdAt, since)));
  if (failures >= MAX_FAILURES) {
    return {
      error: `Too many unsuccessful attempts. Wait ${LOCKOUT_MINUTES} minutes, or reset your password.`,
      email,
    };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let ok: boolean;
  if (user) {
    ok = await verifyPassword(password, user.passwordHash);
  } else {
    // Same amount of work whether or not the email exists.
    await verifyPassword(password, await getDummyHash());
    ok = false;
  }

  await db.insert(authAttempts).values({ email, ip: await clientIp(), success: ok });

  if (!user || !ok) {
    return { error: "That email and password don't match. Check them and try again.", email };
  }
  if (!user.isActive) {
    return { error: "This account is switched off. Contact us to turn it back on.", email };
  }

  await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  // Light housekeeping.
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await db.delete(authAttempts).where(lt(authAttempts.createdAt, monthAgo));
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  redirect(safeNextPath(next, user.role === "admin" ? "/admin" : "/portal"));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Enter the email address you log in with.", email };

  if (!emailConfigured()) {
    return {
      error: "Password reset emails aren't switched on yet. Contact us and we'll reset your password for you.",
      email,
    };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user?.isActive) {
    const link = await createPasswordLink(user.id, "reset");
    await sendEmail({
      to: user.email,
      subject: "Reset your Bar Beats Bingo password",
      text: [
        `Hi ${user.name || "there"},`,
        "",
        "Use this link to choose a new password. It works once and expires in 1 hour:",
        link,
        "",
        "If you didn't ask for this, you can ignore this email.",
      ].join("\n"),
    });
  }

  // Same answer whether or not the account exists.
  return { ok: "If that email has an account, a reset link is on its way. Check your inbox and spam folder." };
}

export async function setPasswordFromToken(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const row = await findValidToken(token);
  if (!row) return { error: "This link has expired or has already been used. Ask for a new one." };

  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: "The two passwords don't match." };

  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, row.userId));
  await db.update(passwordTokens).set({ usedAt: new Date() }).where(eq(passwordTokens.userId, row.userId));
  await destroyAllSessionsFor(row.userId);
  await createSession(row.userId);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, row.userId));

  redirect("/portal");
}
