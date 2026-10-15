"use server";

import { z } from "zod";
import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { sendEmail } from "@/lib/email";

export type ContactState = { status: "idle" | "sent" | "error"; message?: string; fields?: Record<string, string> };

const schema = z.object({
  name: z.string().trim().max(120),
  email: z.email("Enter a valid email address so we can reply.").max(200),
  phone: z.string().trim().max(40),
  message: z.string().trim().max(5000),
});

export async function sendEnquiry(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  // Bots fill in every field, including this hidden one.
  if (String(formData.get("website") ?? "") !== "") return { status: "sent" };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form and try again.", fields: raw };
  }
  const data = parsed.data;

  let saved = false;
  try {
    await db.insert(enquiries).values(data);
    saved = true;
  } catch (err) {
    console.error("[contact] could not save enquiry", err);
  }

  const to = process.env.CONTACT_EMAIL;
  const emailed = to
    ? await sendEmail({
        to,
        replyTo: data.email,
        subject: `New enquiry from ${data.name || data.email}`,
        text: [
          "New enquiry from the Bar Beats Bingo website.",
          "",
          `Name: ${data.name || "-"}`,
          `Email: ${data.email}`,
          `Phone: ${data.phone || "-"}`,
          "",
          data.message || "(no message)",
        ].join("\n"),
      })
    : false;

  // As long as it reached us one way or the other, the visitor is done.
  if (!saved && !emailed) {
    return {
      status: "error",
      message: "Your message couldn't be sent just now. Please try again in a minute.",
      fields: raw,
    };
  }

  return { status: "sent" };
}
