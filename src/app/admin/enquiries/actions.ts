"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";

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
