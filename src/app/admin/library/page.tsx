import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FileSpreadsheet } from "lucide-react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, files, playlists } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatBytes, formatDateTime } from "@/lib/format";
import { HOST_GUIDE, siteFileInfo } from "@/lib/site-files";
import { ActionForm } from "@/components/admin/action-form";
import { createCategory } from "./actions";

export const metadata: Metadata = { title: "Library" };

const GUIDE_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  saved: {
    ok: true,
    text: "Host guide saved. Customers can download it from their library now.",
  },
  missing: { ok: false, text: "Choose a PDF file to upload." },
  "too-big": {
    ok: false,
    text: "That file is over 4 MB. Save a smaller PDF (e.g. with lower-resolution images) and try again.",
  },
  "not-pdf": {
    ok: false,
    text: "That isn't a PDF. Save the guide as a PDF and upload that.",
  },
};

/** The host guide customers download from the portal: what's there now, and a box to upload or replace it. */
async function HostGuidePanel({ message }: { message?: string }) {
  const guide = await siteFileInfo(HOST_GUIDE);
  const note = message ? GUIDE_MESSAGES[message] : undefined;
  return (
    <section id="host-guide" className="panel scroll-mt-6 p-6" aria-labelledby="guide-heading">
      <h2 id="guide-heading" className="flex items-center gap-2 font-sans text-lg font-bold">
        <BookOpen size={19} aria-hidden className="text-sun" /> Host guide for customers
      </h2>
      {note && (
        <p className={`alert mt-4 ${note.ok ? "alert-ok" : "alert-error"}`} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
      {guide ? (
        <p className="mt-3 text-sm text-mist">
          <span className="text-white">{guide.fileName}</span> · {formatBytes(guide.sizeBytes)} · updated{" "}
          {formatDateTime(guide.updatedAt)} · {/* A file, not a page. */}
          <a href="/portal/host-guide?view=1" target="_blank" rel="noreferrer" className="text-sun hover:underline">
            Open
          </a>
        </p>
      ) : (
        <p className="mt-3 text-sm text-mist">
          Not uploaded yet. Customers see a download for it on their library screen once it&apos;s here.
        </p>
      )}
      <form method="post" action="/api/admin/host-guide" encType="multipart/form-data" className="mt-4 grid gap-3">
        <label htmlFor="guide-file" className="label !mb-0">
          {guide ? "Replace it with a new version" : "Upload the guide"} (PDF, up to 4 MB)
        </label>
        <input id="guide-file" name="file" type="file" accept="application/pdf,.pdf" required className="field" />
        <div>
          <button type="submit" className="btn btn-ghost btn-sm">
            {guide ? "Replace guide" : "Upload guide"}
          </button>
        </div>
      </form>
      <p className="hint mt-3">
        Only logged-in customers can download it. It&apos;s kept in the database, not in the website&apos;s code.
      </p>
    </section>
  );
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ guide?: string }> }) {
  await requireAdmin();
  const { guide } = await searchParams;

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      isPublished: categories.isPublished,
      sortOrder: categories.sortOrder,
      playlists: sql<number>`count(distinct ${playlists.id})::int`,
      files: sql<number>`count(${files.id})::int`,
      bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::float8`,
    })
    .from(categories)
    .leftJoin(playlists, eq(playlists.categoryId, categories.id))
    .leftJoin(files, eq(files.playlistId, playlists.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(2.2rem,5vw,3rem)]">Library</h1>
          <p className="mt-2 max-w-2xl text-mist">
            Categories hold shows, and each show holds the files customers download. Open a category to add shows.
          </p>
        </div>
        <Link href="/admin/library/import" className="btn btn-ghost">
          <FileSpreadsheet size={18} aria-hidden /> Import shows from a spreadsheet
        </Link>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel overflow-x-auto">
          {rows.length === 0 ? (
            <p className="p-8 text-mist">No categories yet. Add your first one.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Shows</th>
                  <th>Files</th>
                  <th>Order</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td>
                      <Link href={`/admin/library/${c.id}`} className="font-semibold hover:underline">
                        {c.name}
                      </Link>
                      {!c.isPublished && <span className="tag ml-2">Hidden</span>}
                    </td>
                    <td className="text-mist">{c.playlists}</td>
                    <td className="text-mist">
                      {c.files}
                      {c.bytes > 0 && <span className="text-fog"> · {formatBytes(c.bytes)}</span>}
                    </td>
                    <td className="text-fog">{c.sortOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid gap-6">
          <section className="panel p-6">
            <h2 className="font-sans text-lg font-bold">Add a category</h2>
            <div className="mt-4">
              <ActionForm action={createCategory} submitLabel="Add category" pendingLabel="Adding…" resetOnSuccess>
                <div>
                  <label htmlFor="name" className="label">
                    Name
                  </label>
                  <input id="name" name="name" required className="field" placeholder="e.g. Christmas" />
                </div>
                <div>
                  <label htmlFor="description" className="label">
                    Short description (optional)
                  </label>
                  <input id="description" name="description" className="field" />
                </div>
              </ActionForm>
            </div>
          </section>
          <HostGuidePanel message={guide} />
        </div>
      </div>
    </>
  );
}
