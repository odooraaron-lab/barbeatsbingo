import "server-only";
import { headers } from "next/headers";

// Email is optional. Set RESEND_API_KEY and EMAIL_FROM to turn on password-reset
// emails, customer invites and contact-form notifications.

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

type Email = { to: string; subject: string; text: string; html?: string; replyTo?: string };

export async function sendEmail(email: Email): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html ?? textToHtml(email.text),
        reply_to: email.replyTo,
      }),
    });
    if (!res.ok) console.error("[email] send failed", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function textToHtml(text: string) {
  const linked = escapeHtml(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1c2121">${linked.replace(/\n/g, "<br>")}</div>`;
}

/** Absolute base URL for links in emails. */
export async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
