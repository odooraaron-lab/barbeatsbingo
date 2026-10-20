import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accessGrants, categories, playlists, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { formatDate, formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { UserFields } from "@/components/admin/user-fields";
import { AccessEditor } from "@/components/admin/access-editor";
import { PasswordInput } from "@/components/admin/password-input";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { ActivitySummaryRow, ActivityTimeline, DownloadedShows } from "@/components/admin/customer-activity";
import {
  ACTIVITY_FILTERS,
  customerDownloadedShows,
  customerSummary,
  customerTimeline,
  type ActivityFilter,
} from "@/lib/customer-activity";
import { deleteUser, saveAccess, sendPasswordLink, setUserPassword, updateUser } from "../actions";

export const metadata: Metadata = { title: "Customer" };

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; log?: string; n?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { created, log, n } = await searchParams;
  const filter: ActivityFilter = log && log in ACTIVITY_FILTERS ? (log as ActivityFilter) : "all";
  const limit = Math.min(Math.max(Number(n) || 60, 60), 2000);
  if (!z.uuid().safeParse(id).success) notFound();

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) notFound();

  const [grants, cats, pls, summary, shows, timeline] = await Promise.all([
    db.select().from(accessGrants).where(eq(accessGrants.userId, id)),
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(playlists).orderBy(asc(playlists.sortOrder), asc(playlists.name)),
    customerSummary(id),
    customerDownloadedShows(id),
    customerTimeline(id, filter, limit),
  ]);

  const genres = cats.map((c) => ({
    id: c.id,
    name: c.name,
    isPublished: c.isPublished,
    playlists: pls
      .filter((p) => p.categoryId === c.id)
      .map((p) => ({ id: p.id, name: p.name, isPublished: p.isPublished })),
  }));

  const isSelf = admin.id === user.id;
  const title = user.venue || user.name || user.email;

  return (
    <>
      <Breadcrumbs items={[{ label: "Customers", href: "/admin/users" }, { label: title }]} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(2.1rem,5vw,3rem)]">{title}</h1>
        {!user.isActive && <span className="tag">Switched off</span>}
        {!user.canPlay && user.role !== "admin" && <span className="tag">Downloads only</span>}
        {user.role === "admin" && <span className="tag bg-sun/15 text-sun">Admin</span>}
      </div>
      <p className="mt-1 text-mist">
        Added {formatDate(user.createdAt)} · {user.lastLoginAt ? `last logged in ${formatDateTime(user.lastLoginAt)}` : "hasn't logged in yet"}
        {!user.passwordHash && " · hasn't set a password yet"}
      </p>

      {created && (
        <p className="alert alert-ok mt-6 max-w-3xl" role="status">
          Customer created. Now choose what they can download.
        </p>
      )}

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
        <section className="panel p-6 sm:p-8" aria-labelledby="access-heading">
          <h2 id="access-heading" className="font-sans text-xl font-bold">
            What they can download
          </h2>
          <div className="mt-5">
            <ActionForm action={saveAccess.bind(null, user.id)} submitLabel="Save access">
              <AccessEditor
                genres={genres}
                initialAll={user.accessAll}
                initialCategories={grants.flatMap((g) => (g.categoryId ? [g.categoryId] : []))}
                initialPlaylists={grants.flatMap((g) => (g.playlistId ? [g.playlistId] : []))}
              />
            </ActionForm>
          </div>
        </section>

        <section className="panel p-6 sm:p-8" aria-labelledby="details-heading">
          <h2 id="details-heading" className="font-sans text-xl font-bold">
            Details
          </h2>
          <div className="mt-5">
            <ActionForm action={updateUser.bind(null, user.id)} submitLabel="Save details">
              <UserFields values={user} />
              <label className="check">
                <input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={isSelf} />
                <span>
                  <span className="block font-semibold">Account switched on</span>
                  <span className="block text-sm text-mist">Switch off to stop them logging in without deleting them.</span>
                </span>
              </label>
              {isSelf && <input type="hidden" name="isActive" value="on" />}
              {user.role !== "admin" && (
                <label className="check">
                  <input type="checkbox" name="canPlay" defaultChecked={user.canPlay} />
                  <span>
                    <span className="block font-semibold">Can play shows on the site</span>
                    <span className="block text-sm text-mist">
                      The player, live call list and bingo checker on show pages. Switch off to give them just the
                      downloads.
                    </span>
                  </span>
                </label>
              )}
            </ActionForm>
          </div>
        </section>

        <section className="panel p-6 sm:p-8" aria-labelledby="password-heading">
          <h2 id="password-heading" className="font-sans text-xl font-bold">
            Password
          </h2>
          <div className="mt-5 grid gap-8">
            <ActionForm
              action={sendPasswordLink.bind(null, user.id)}
              submitLabel={user.passwordHash ? "Send a password reset link" : "Send their invite again"}
              pendingLabel="Sending…"
              submitClassName="btn btn-ghost"
            >
              <p className="text-mist">
                {emailConfigured()
                  ? "Emails them a link to choose their own password."
                  : "Emails are off, so you'll get a link to copy and send them yourself."}
              </p>
            </ActionForm>
            <ActionForm
              action={setUserPassword.bind(null, user.id)}
              submitLabel="Set password"
              submitClassName="btn btn-ghost"
              resetOnSuccess
            >
              <div>
                <label htmlFor="password" className="label">
                  Or set a new password yourself
                </label>
                <PasswordInput />
                <p className="hint">This logs them out of any devices they&apos;re using.</p>
              </div>
            </ActionForm>
          </div>
        </section>


      </div>

      <section className="panel mt-6 p-6 sm:p-8" aria-labelledby="activity-heading" id="activity">
        <h2 id="activity-heading" className="font-sans text-xl font-bold">
          Activity
        </h2>
        <div className="mt-4">
          <ActivitySummaryRow summary={summary} lastLogin={user.lastLoginAt} />
        </div>

        <h3 className="mt-8 font-sans text-lg font-bold">Shows they&apos;ve downloaded</h3>
        <DownloadedShows shows={shows} />

        <h3 className="mt-8 font-sans text-lg font-bold">Everything they&apos;ve done</h3>
        <ActivityTimeline events={timeline.events} more={timeline.more} filter={filter} limit={limit} />
      </section>

      {!isSelf && (
        <section className="mt-10 max-w-3xl rounded-[var(--radius-card)] border border-red/40 p-6 sm:p-8">
          <h2 className="font-sans text-xl font-bold">Delete customer</h2>
          <p className="mt-2 text-mist">
            Removes their account and download history for good. To pause their access instead, switch their account off.
          </p>
          <div className="mt-5">
            <ActionForm
              action={deleteUser.bind(null, user.id)}
              submitLabel="Delete customer"
              pendingLabel="Deleting…"
              submitClassName="btn btn-danger"
              confirm={`Delete ${title}? This can't be undone.`}
            >
              {null}
            </ActionForm>
          </div>
        </section>
      )}
    </>
  );
}
