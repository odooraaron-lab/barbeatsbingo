import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, files, playlists } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { createCategory } from "./actions";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  await requireAdmin();

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
      <h1 className="text-[clamp(2.2rem,5vw,3rem)]">Library</h1>
      <p className="mt-2 max-w-2xl text-mist">
        Genres hold playlists, and playlists hold the files customers download. Open a genre to add playlists.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel overflow-x-auto">
          {rows.length === 0 ? (
            <p className="p-8 text-mist">No genres yet. Add your first one.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Genre</th>
                  <th>Playlists</th>
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

        <section className="panel p-6">
          <h2 className="font-sans text-lg font-bold">Add a genre</h2>
          <div className="mt-4">
            <ActionForm action={createCategory} submitLabel="Add genre" pendingLabel="Adding…" resetOnSuccess>
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
      </div>
    </>
  );
}
