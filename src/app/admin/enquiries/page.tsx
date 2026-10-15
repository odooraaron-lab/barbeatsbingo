import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { deleteEnquiry, setEnquiryHandled } from "./actions";

export const metadata: Metadata = { title: "Enquiries" };

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
