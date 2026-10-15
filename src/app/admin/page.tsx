import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, downloads, enquiries, files, playlists, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { storageConfigured } from "@/lib/storage";
import { emailConfigured } from "@/lib/email";
import { formatBytes, formatDateTime } from "@/lib/format";

export default async function AdminHomePage() {
  await requireAdmin();

  const [[customers], [genres], [lists], [fileStats], [openEnquiries], recentDownloads, latestEnquiries] =
    await Promise.all([
      db.select({ n: count() }).from(users).where(eq(users.role, "member")),
      db.select({ n: count() }).from(categories),
      db.select({ n: count() }).from(playlists),
      db
        .select({ n: count(), bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::float8` })
        .from(files),
      db.select({ n: count() }).from(enquiries).where(eq(enquiries.isHandled, false)),
      db
        .select({
          at: downloads.createdAt,
          userId: users.id,
          who: sql<string>`coalesce(nullif(${users.venue}, ''), nullif(${users.name}, ''), ${users.email})`,
          title: files.title,
          playlist: playlists.name,
        })
        .from(downloads)
        .innerJoin(users, eq(users.id, downloads.userId))
        .innerJoin(files, eq(files.id, downloads.fileId))
        .innerJoin(playlists, eq(playlists.id, files.playlistId))
        .orderBy(desc(downloads.createdAt))
        .limit(10),
      db.select().from(enquiries).orderBy(desc(enquiries.createdAt)).limit(4),
    ]);

  const stats = [
    { label: "Customers", value: customers.n, href: "/admin/users" },
    { label: "Genres", value: genres.n, href: "/admin/library" },
    { label: "Playlists", value: lists.n, href: "/admin/library" },
    { label: "Files", value: fileStats.n, sub: formatBytes(fileStats.bytes) || undefined, href: "/admin/library" },
    { label: "New enquiries", value: openEnquiries.n, href: "/admin/enquiries" },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[clamp(2.2rem,5vw,3rem)]">Overview</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users/new" className="btn btn-red">
            Add a customer
          </Link>
          <Link href="/admin/library" className="btn btn-ghost">
            Manage library
          </Link>
        </div>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="panel block h-full p-5 hover:border-white/30">
              <span className="display block text-4xl">{s.value}</span>
              <span className="mt-1 block text-sm text-mist">
                {s.label}
                {s.sub && ` · ${s.sub}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {(!storageConfigured() || !emailConfigured()) && (
        <section className="mt-8 grid gap-3">
          {!storageConfigured() && (
            <p className="alert alert-info">
              <strong>File uploads are off.</strong> Add your Cloudflare R2 (or S3) details in Vercel to upload files
              here. Until then you can add files as Dropbox or Google Drive links. See the README for the steps.
            </p>
          )}
          {!emailConfigured() && (
            <p className="alert alert-info">
              <strong>Emails are off.</strong> Customers can&apos;t reset their own passwords and you won&apos;t get
              emailed about enquiries. Add a Resend API key in Vercel to switch this on.
            </p>
          )}
        </section>
      )}

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-6">
          <h2 className="font-sans text-lg font-bold">Recent downloads</h2>
          {recentDownloads.length === 0 ? (
            <p className="mt-3 text-mist">No customer downloads yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>File</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDownloads.map((d, i) => (
                    <tr key={i}>
                      <td>
                        <Link href={`/admin/users/${d.userId}`} className="hover:underline">
                          {d.who}
                        </Link>
                      </td>
                      <td>
                        {d.title}
                        <span className="block text-xs text-fog">{d.playlist}</span>
                      </td>
                      <td className="whitespace-nowrap text-mist">{formatDateTime(d.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-lg font-bold">Latest enquiries</h2>
            <Link href="/admin/enquiries" className="text-sm text-sun hover:underline">
              See all
            </Link>
          </div>
          {latestEnquiries.length === 0 ? (
            <p className="mt-3 text-mist">No enquiries yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {latestEnquiries.map((e) => (
                <li key={e.id} className="py-3">
                  <p className="font-semibold">
                    {e.name || e.email}
                    {!e.isHandled && <span className="tag ml-2 bg-red/20 text-red-bright">New</span>}
                  </p>
                  <p className="line-clamp-2 text-sm text-mist">{e.message || "(no message)"}</p>
                  <p className="mt-1 text-xs text-fog">{formatDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
