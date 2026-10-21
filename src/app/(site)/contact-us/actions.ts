"use server";

import { z } from "zod";
import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { contactEmail, sendEmail } from "@/lib/email";
import { attemptsFromIp, clientIp, noteAttempt } from "@/lib/rate-limit";

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

  // At most 5 messages an hour from one place.
  const ip = await clientIp();
  if ((await attemptsFromIp("contact", ip, 60).catch(() => 0)) >= 5) {
    return {
      status: "error",
      message: "You've sent a few messages already. We'll be in touch soon, or try again in an hour.",
      fields: raw,
    };
  }
  await noteAttempt("contact", ip || "unknown", ip).catch(() => {});

  let saved = false;
  try {
    await db.insert(enquiries).values(data);
    saved = true;
  } catch (err) {
    console.error("[contact] could not save enquiry", err);
  }

  const to = contactEmail();
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
