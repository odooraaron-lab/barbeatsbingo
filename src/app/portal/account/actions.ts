"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { logActivity } from "@/lib/activity";

export type PasswordState = { error?: string; ok?: string };

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!(await verifyPassword(current, row?.hash ?? null))) return { error: "Your current password isn't right." };

  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: "The two new passwords don't match." };

  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id));
  await logActivity(user.id, "password_changed");
  return { ok: "Password changed. Use your new password next time you log in." };
}
