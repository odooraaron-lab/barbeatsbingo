"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, enquiries, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { contactEmail, sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/activity";

export type RequestState = { status: "idle" | "sent" | "error"; message?: string };

/**
 * A customer asks for a category that isn't on their plan (or to renew).
 * It lands in Admin → Enquiries, and by email when email is set up.
 */
export async function requestCategory(categoryId: string, _prev: RequestState): Promise<RequestState> {
  const user = await requireUser();
  if (!z.uuid().safeParse(categoryId).success) return { status: "error", message: "Unknown category." };
  const [category] = await db
    .select({ name: categories.name })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.isPublished, true)))
    .limit(1);
  if (!category) return { status: "error", message: "Unknown category." };

  const message = `Please add the ${category.name} category to my account.`;
  // One request is enough: don't pile up duplicates if the button is pressed again.
  const [recent] = await db
    .select({ id: enquiries.id })
    .from(enquiries)
    .where(
      and(
        eq(enquiries.email, user.email),
        eq(enquiries.message, message),
        gt(enquiries.createdAt, sql`now() - interval '1 day'`),
      ),
    )
    .limit(1);
  if (recent) return { status: "sent" };

  const name = [user.name, user.venue && `(${user.venue})`].filter(Boolean).join(" ");
  try {
    await db.insert(enquiries).values({ name, email: user.email, message });
    await logActivity(user.id, "category_requested", { detail: category.name });
  } catch (err) {
    console.error("[portal] could not save category request", err);
    return { status: "error", message: "That didn't go through. Please try again in a minute." };
  }
  const to = contactEmail();
  if (to) {
    await sendEmail({
      to,
      replyTo: user.email,
      subject: `${user.venue || user.name || user.email} would like ${category.name}`,
      text: [`${name || user.email} (${user.email}) asked from the customer portal:`, "", message].join("\n"),
    });
  }
  return { status: "sent" };
}

/**
 * Remembers whether this customer wants the player and bingo checker on show pages, or
 * just the downloads. It's kept on their account, so it's the same on all their devices.
 */
export async function setPlayMode(on: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (typeof on !== "boolean" || (on && !user.canPlay)) return { ok: false };
  await db.update(users).set({ playMode: on }).where(eq(users.id, user.id));
  await logActivity(user.id, "play_mode_changed", { detail: on ? "on" : "off" });
  return { ok: true };
}
