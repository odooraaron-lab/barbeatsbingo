import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { contactEmail, emailConfigured, emailFrom } from "@/lib/email";
import { deleteEnquiry, sendTestEmail, setEnquiryHandled } from "./actions";

export const metadata: Metadata = { title: "Enquiries" };

/** Where enquiry emails go, and a button to check it works. */
function EmailSettings() {
  const on = emailConfigured();
  const to = contactEmail();
  return (
    <section aria-labelledby="email-heading" className="panel mt-6 max-w-3xl p-6">
      <h2 id="email-heading" className="font-sans text-lg font-bold">
        Email notifications
      </h2>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-mist">Resend API key</dt>
        <dd>{on ? "Set" : <span className="text-red-bright">Not set: add RESEND_API_KEY in Vercel, then redeploy</span>}</dd>
        <dt className="text-mist">Sent from</dt>
        <dd className="break-all">
          {emailFrom()}
          {!process.env.EMAIL_FROM?.trim() && <span className="text-fog"> (the default; change it with EMAIL_FROM)</span>}
        </dd>
        <dt className="text-mist">Enquiries go to</dt>
        <dd className="break-all">
          {to ? (
            <>
              {to}
              {!process.env.CONTACT_EMAIL?.trim() && <span className="text-fog"> (the admin email; change it with CONTACT_EMAIL)</span>}
            </>
          ) : (
            <span className="text-red-bright">Nowhere yet: add CONTACT_EMAIL in Vercel, then redeploy</span>
          )}
        </dd>
      </dl>
      {on && to && (
        <div className="mt-4">
          <ActionForm
            action={sendTestEmail}
            submitLabel="Send a test email"
            pendingLabel="Sending…"
            submitClassName="btn btn-ghost btn-sm"
            className="grid gap-3"
          >
            {null}
          </ActionForm>
        </div>
      )}
    </section>
  );
}

export default async function EnquiriesPage() {
  await requireAdmin();
  const rows = await db
    .select()
    .from(enquiries)
    .orderBy(asc(enquiries.isHandled), desc(enquiries.createdAt))
    .limit(200);

  return (
    <>
      <h1 className="text-[clamp(2.2rem,5vw,3rem)]">Enquiries</h1>
      <p className="mt-2 text-mist">Messages from the contact form on the website. New ones are at the top.</p>

      <EmailSettings />

      {rows.length === 0 ? (
        <p className="panel mt-8 p-8 text-mist">No enquiries yet.</p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {rows.map((e) => (
            <li key={e.id} className={`panel p-6 ${e.isHandled ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">
                    {e.name || "No name given"}
                    {!e.isHandled && <span className="tag ml-2 bg-red/20 text-red-bright">New</span>}
                  </p>
                  <p className="text-sm text-mist">
                    <a href={`mailto:${e.email}`} className="text-sun underline-offset-4 hover:underline">
                      {e.email}
                    </a>
                    {e.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${e.phone}`} className="hover:underline">
                          {e.phone}
                        </a>
                      </>
                    )}
                    {` · ${formatDateTime(e.createdAt)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ActionForm
                    action={setEnquiryHandled.bind(null, e.id, !e.isHandled)}
                    submitLabel={e.isHandled ? "Mark as new" : "Mark as done"}
                    pendingLabel="Saving…"
                    submitClassName="btn btn-ghost btn-sm"
                    className="contents"
                  >
                    {null}
                  </ActionForm>
                  <ActionForm
                    action={deleteEnquiry.bind(null, e.id)}
                    submitLabel="Delete"
                    pendingLabel="Deleting…"
                    submitClassName="btn btn-quiet btn-sm"
                    className="contents"
                    confirm="Delete this enquiry?"
                  >
                    {null}
                  </ActionForm>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-white/90">{e.message || "(no message)"}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
