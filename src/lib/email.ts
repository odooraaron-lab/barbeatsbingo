import "server-only";
import { headers } from "next/headers";

// Email is optional. Set RESEND_API_KEY to turn on password-reset emails, customer
// invites and contact-form notifications. EMAIL_FROM and CONTACT_EMAIL have defaults.

const DEFAULT_FROM = "Bar Beats Bingo <hello@barbeatsbingo.com>";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Who emails come from. The address's domain must be verified in Resend. */
export function emailFrom() {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

/** Where contact-form enquiries are emailed: CONTACT_EMAIL, or the admin's address. */
export function contactEmail() {
  return process.env.CONTACT_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim() || "";
}

type Email = { to: string; subject: string; text: string; html?: string; replyTo?: string };

export type SendResult = { ok: true } | { ok: false; problem: string; detail?: string };

/** Sends an email through Resend, and says in plain words what went wrong if it didn't. */
export async function sendEmailWithResult(email: Email): Promise<SendResult> {
  if (!emailConfigured()) {
    return { ok: false, problem: "RESEND_API_KEY isn't set in Vercel (or the site hasn't been redeployed since)." };
  }
  try {
    const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html ?? textToHtml(email.text),
        reply_to: email.replyTo,
      }),
    });
    if (res.ok) return { ok: true };
    const body = await res.text();
    console.error("[email] send failed", res.status, body);
    let message = body;
    try {
      message = (JSON.parse(body) as { message?: string }).message ?? body;
    } catch {}
    return { ok: false, problem: explainResendError(res.status, message), detail: `Resend said (${res.status}): ${message}` };
  } catch (err) {
    console.error("[email] send failed", err);
    return { ok: false, problem: "The site couldn't reach Resend. Try again in a minute." };
  }
}

export async function sendEmail(email: Email): Promise<boolean> {
  return (await sendEmailWithResult(email)).ok;
}

function explainResendError(status: number, message: string) {
  const m = message.toLowerCase();
  const domain = emailFrom().match(/@([^>\s]+)/)?.[1] ?? "your domain";
  if (status === 401 || m.includes("api key is invalid") || m.includes("missing api key")) {
    return "Resend didn't accept the API key. Copy it again from Resend (API Keys) into RESEND_API_KEY in Vercel, then redeploy.";
  }
  if (m.includes("only send testing emails")) {
    return `Resend will only send to your own Resend login address until a domain is verified. In Resend, go to Domains, add ${domain} and add the DNS records it shows.`;
  }
  if (m.includes("not verified") || m.includes("verify a domain") || m.includes("domain")) {
    return `${domain} isn't verified in Resend yet. In Resend, go to Domains, add ${domain}, add the DNS records it shows where your domain's DNS is managed, and wait until it says Verified.`;
  }
  if (status === 422 && m.includes("from")) {
    return "EMAIL_FROM isn't a valid sender. Use a name and an address on your verified domain, like: Bar Beats Bingo <hello@barbeatsbingo.com>";
  }
  if (status === 429) return "Resend is limiting how fast emails are sent. Try again in a minute.";
  if (status === 403) return "Resend refused to send. The API key may be limited to a different domain: create a new key with sending access.";
  return "Resend couldn't send the email.";
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
  // Vercel's own record of the main domain, not the request's Host header (which a crafted
  // request could set, to point password links at another site).
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}
