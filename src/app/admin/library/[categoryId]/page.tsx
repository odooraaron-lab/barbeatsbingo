import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, files, playlists } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { createPlaylist, deleteCategory, updateCategory } from "../actions";

export const metadata: Metadata = { title: "Genre" };

export default async function CategoryAdminPage({ params }: { params: Promise<{ categoryId: string }> }) {
  await requireAdmin();
  const { categoryId } = await params;
  if (!z.uuid().safeParse(categoryId).success) notFound();

  const [category] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!category) notFound();

  const rows = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      isPublished: playlists.isPublished,
      sortOrder: playlists.sortOrder,
      files: sql<number>`count(${files.id})::int`,
      bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::float8`,
    })
    .from(playlists)
    .leftJoin(files, eq(files.playlistId, playlists.id))
    .where(eq(playlists.categoryId, categoryId))
    .groupBy(playlists.id)
    .orderBy(asc(playlists.sortOrder), asc(playlists.name));

  return (
    <>
      <Breadcrumbs items={[{ label: "Library", href: "/admin/library" }, { label: category.name }]} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(2.2rem,5vw,3rem)]">{category.name}</h1>
        {!category.isPublished && <span className="tag">Hidden from customers</span>}
        <Link href={`/portal/${category.slug}`} className="btn btn-quiet btn-sm ml-auto">
          View as customer
        </Link>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid gap-6">
          <section className="panel overflow-x-auto">
            <h2 className="px-6 pt-6 font-sans text-lg font-bold">Playlists</h2>
            {rows.length === 0 ? (
              <p className="px-6 pb-6 pt-2 text-mist">No playlists yet. Add one to start uploading files.</p>
            ) : (
              <table className="table mt-2">
                <thead>
                  <tr>
                    <th>Playlist</th>
                    <th>Files</th>
                    <th>Order</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td>
                        <Link href={`/admin/library/playlist/${p.id}`} className="font-semibold hover:underline">
                          {p.name}
                        </Link>
                        {!p.isPublished && <span className="tag ml-2">Hidden</span>}
                      </td>
                      <td className="text-mist">
                        {p.files}
                        {p.bytes > 0 && <span className="text-fog"> · {formatBytes(p.bytes)}</span>}
                      </td>
                      <td className="text-fog">{p.sortOrder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel p-6">
            <h2 className="font-sans text-lg font-bold">Genre settings</h2>
            <div className="mt-4">
              <ActionForm action={updateCategory.bind(null, category.id)} submitLabel="Save genre">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cat-name" className="label">
                      Name
                    </label>
                    <input id="cat-name" name="name" required className="field" defaultValue={category.name} />
                  </div>
                  <div>
                    <label htmlFor="cat-slug" className="label">
                      Web address
                    </label>
                    <input id="cat-slug" name="slug" className="field" defaultValue={category.slug} />
                    <p className="hint">/portal/{category.slug}</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="cat-description" className="label">
                    Description
                  </label>
                  <input id="cat-description" name="description" className="field" defaultValue={category.description} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cat-sort" className="label">
                      Order
                    </label>
                    <input id="cat-sort" name="sortOrder" type="number" className="field" defaultValue={category.sortOrder} />
                    <p className="hint">Lower numbers show first.</p>
                  </div>
                  <label className="check self-center">
                    <input type="checkbox" name="isPublished" defaultChecked={category.isPublished} />
                    <span>Visible to customers</span>
                  </label>
                </div>
              </ActionForm>
            </div>
          </section>
        </div>

        <div className="grid gap-6">
          <section className="panel p-6">
            <h2 className="font-sans text-lg font-bold">Add a playlist</h2>
            <div className="mt-4">
              <ActionForm action={createPlaylist.bind(null, category.id)} submitLabel="Add playlist" pendingLabel="Adding…">
                <div>
                  <label htmlFor="pl-name" className="label">
                    Name
                  </label>
                  <input id="pl-name" name="name" required className="field" placeholder="e.g. Week 42 Mix" />
                </div>
                <div>
                  <label htmlFor="pl-description" className="label">
                    Short description (optional)
                  </label>
                  <input id="pl-description" name="description" className="field" />
                </div>
                <label className="check">
                  <input type="checkbox" name="isPublished" />
                  <span>
                    <span className="block">Visible to customers straight away</span>
                    <span className="block text-sm text-mist">Leave unticked to upload the files first.</span>
                  </span>
                </label>
              </ActionForm>
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] border border-red/40 p-6">
            <h2 className="font-sans text-lg font-bold">Delete genre</h2>
            <p className="mt-1 text-sm text-mist">Only possible once it has no playlists.</p>
            <div className="mt-4">
              <ActionForm
                action={deleteCategory.bind(null, category.id)}
                submitLabel="Delete genre"
                pendingLabel="Deleting…"
                submitClassName="btn btn-danger btn-sm"
                confirm={`Delete the ${category.name} genre?`}
              >
                {null}
              </ActionForm>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
