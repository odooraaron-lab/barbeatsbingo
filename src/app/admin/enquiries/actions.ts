"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { contactEmail, emailFrom, sendEmailWithResult } from "@/lib/email";

export async function setEnquiryHandled(id: string, handled: boolean, _prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail("Unknown enquiry.");
  await db.update(enquiries).set({ isHandled: handled }).where(eq(enquiries.id, id));
  refresh();
  return ok(handled ? "Marked as done." : "Marked as new.");
}

export async function deleteEnquiry(id: string, _prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail("Unknown enquiry.");
  await db.delete(enquiries).where(eq(enquiries.id, id));
  refresh();
  return ok("Deleted.");
}

/** Sends a test email to the enquiries address, and says exactly what's wrong if it can't. */
export async function sendTestEmail(_prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const to = contactEmail();
  if (!to) return fail("There's no address to send enquiries to. Add CONTACT_EMAIL in Vercel, then redeploy.");
  const result = await sendEmailWithResult({
    to,
    subject: "Test email from the Bar Beats Bingo website",
    text: [
      "This is a test from the Enquiries page on the website.",
      "",
      "Enquiries from the contact form will arrive at this address.",
      `They're sent from ${emailFrom()}.`,
    ].join("\n"),
  });
  if (result.ok) return ok(`Sent to ${to}. If it isn't in your inbox in a minute or two, check your spam folder.`);
  return fail([result.problem, result.detail].filter(Boolean).join("\n\n"));
}
