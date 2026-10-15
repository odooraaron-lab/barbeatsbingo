"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accessGrants, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { hashPassword, passwordProblem } from "@/lib/password";
import { destroyAllSessionsFor } from "@/lib/session";
import { emailConfigured, sendEmail } from "@/lib/email";
import { createPasswordLink } from "@/lib/password-links";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { toDateInput } from "@/lib/format";

const uuid = z.uuid();

const detailsSchema = z.object({
  name: z.string().trim().max(120),
  email: z.email("Enter a valid email address.").trim().toLowerCase().max(200),
  venue: z.string().trim().max(160),
  phone: z.string().trim().max(40),
  notes: z.string().trim().max(4000),
  role: z.enum(["member", "admin"]),
});

function readDetails(fd: FormData) {
  return detailsSchema.safeParse({
    name: fd.get("name") ?? "",
    email: String(fd.get("email") ?? "").trim(),
    venue: fd.get("venue") ?? "",
    phone: fd.get("phone") ?? "",
    notes: fd.get("notes") ?? "",
    role: fd.get("role") ?? "member",
  });
}

/** "2026-12-31" -> the end of that day in New Zealand. */
function endOfNzDay(value: FormDataEntryValue | null): Date | null | "invalid" {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "invalid";
  for (const offset of ["+13:00", "+12:00"]) {
    const d = new Date(`${s}T23:59:59${offset}`);
    if (!Number.isNaN(d.getTime()) && toDateInput(d) === s) return d;
  }
  return "invalid";
}

function welcomeEmail(name: string, link: string) {
  return [
    `Hi ${name || "there"},`,
    "",
    "Your Bar Beats Bingo customer account is ready. Choose a password using the link below, then you can log in any time to download your games, scorecards and host sheets.",
    "",
    link,
    "",
    "The link works once and expires in 7 days.",
    "",
    "See you on the dance floor!",
    "The Bar Beats Bingo team",
  ].join("\n");
}

export async function createUser(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = readDetails(fd);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const data = parsed.data;

  const expires = endOfNzDay(fd.get("accessExpiresAt"));
  if (expires === "invalid") return fail("Enter the access end date as a full date.");

  const password = String(fd.get("password") ?? "");
  const invite = fd.get("invite") === "on";
  if (!password && !invite) return fail("Set a password for them, or tick the box to email them an invite.");
  if (password) {
    const problem = passwordProblem(password);
    if (problem) return fail(problem);
  }
  if (invite && !emailConfigured()) {
    return fail("Emails aren't switched on yet, so set a password for them instead.");
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (existing) return fail("A customer with that email already exists.");

  const [created] = await db
    .insert(users)
    .values({
      ...data,
      isActive: true,
      accessAll: fd.get("accessAll") === "on",
      accessExpiresAt: expires,
      passwordHash: password ? await hashPassword(password) : null,
    })
    .returning({ id: users.id });

  if (invite) {
    const link = await createPasswordLink(created.id, "invite");
    await sendEmail({ to: data.email, subject: "Your Bar Beats Bingo account", text: welcomeEmail(data.name, link) });
  }

  redirect(`/admin/users/${created.id}?created=1`);
}

export async function updateUser(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown customer.");
  const parsed = readDetails(fd);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const data = parsed.data;

  const expires = endOfNzDay(fd.get("accessExpiresAt"));
  if (expires === "invalid") return fail("Enter the access end date as a full date.");

  const isActive = fd.get("isActive") === "on";
  if (id === admin.id && (!isActive || data.role !== "admin")) {
    return fail("You can't switch off or demote your own account.");
  }

  const [clash] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, data.email), ne(users.id, id)))
    .limit(1);
  if (clash) return fail("Another customer already uses that email.");

  await db.update(users).set({ ...data, isActive, accessExpiresAt: expires }).where(eq(users.id, id));
  if (!isActive) await destroyAllSessionsFor(id);

  refresh();
  return ok("Details saved.");
}

export async function saveAccess(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown customer.");

  const accessAll = fd.get("accessAll") === "on";
  const categoryIds = [...new Set(fd.getAll("category").map(String))].filter((v) => uuid.safeParse(v).success);
  const playlistIds = [...new Set(fd.getAll("playlist").map(String))].filter((v) => uuid.safeParse(v).success);

  try {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ accessAll }).where(eq(users.id, id));
      await tx.delete(accessGrants).where(eq(accessGrants.userId, id));
      const rows = [
        ...categoryIds.map((categoryId) => ({ userId: id, categoryId })),
        ...playlistIds.map((playlistId) => ({ userId: id, playlistId })),
      ];
      if (rows.length) await tx.insert(accessGrants).values(rows);
    });
  } catch (err) {
    console.error("[admin] save access failed", err);
    return fail("Access couldn't be saved. Reload the page and try again.");
  }

  refresh();
  return ok("Access saved.");
}

export async function setUserPassword(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown customer.");
  const password = String(fd.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);

  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, id));
  if (id !== admin.id) await destroyAllSessionsFor(id);
  return ok("Password set. Let them know their new password.");
}

export async function sendPasswordLink(id: string, _prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown customer.");
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return fail("Unknown customer.");
  if (!user.isActive) return fail("Switch their account on first.");

  const invite = !user.passwordHash;
  const link = await createPasswordLink(user.id, invite ? "invite" : "reset");

  if (emailConfigured()) {
    const sent = await sendEmail({
      to: user.email,
      subject: invite ? "Your Bar Beats Bingo account" : "Choose a new Bar Beats Bingo password",
      text: invite
        ? welcomeEmail(user.name, link)
        : [
            `Hi ${user.name || "there"},`,
            "",
            "Use this link to choose a new password for your Bar Beats Bingo account. It works once and expires in 1 hour:",
            link,
          ].join("\n"),
    });
    if (sent) return ok(`Email sent to ${user.email}.`);
  }

  return ok(
    `Copy this link and send it to them yourself. It works once and expires in ${invite ? "7 days" : "1 hour"}: ${link}`,
  );
}

export async function deleteUser(id: string, _prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown customer.");
  if (id === admin.id) return fail("You can't delete your own account.");
  await db.delete(users).where(eq(users.id, id));
  redirect("/admin/users");
}
