import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, files, playlists } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { storageConfigured } from "@/lib/storage";
import { FILE_KINDS, formatBytes, formatDate, formatDuration, kindLabel } from "@/lib/format";
import type { FileKind } from "@/db/schema";
import { ActionForm } from "@/components/admin/action-form";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { FileIcon } from "@/components/portal/file-icon";
import { addLinkFile, deleteFile, deletePlaylist, saveShowFiles, updateFile, updatePlaylist } from "../../actions";
import { INTRO_SKIP_SECONDS, SHOW_SLOTS, filesBySlot } from "@/lib/show-files";
import { Uploader } from "./uploader";

export const metadata: Metadata = { title: "Show" };

function KindSelect({ id, value }: { id: string; value?: FileKind }) {
  return (
    <select id={id} name="kind" className="field" defaultValue={value ?? "video"}>
      {FILE_KINDS.map((k) => (
        <option key={k.value} value={k.value}>
          {k.label}
        </option>
      ))}
    </select>
  );
}

export default async function PlaylistAdminPage({ params }: { params: Promise<{ playlistId: string }> }) {
  await requireAdmin();
  const { playlistId } = await params;
  if (!z.uuid().safeParse(playlistId).success) notFound();

  const [row] = await db
    .select({ playlist: playlists, category: categories })
    .from(playlists)
    .innerJoin(categories, eq(categories.id, playlists.categoryId))
    .where(eq(playlists.id, playlistId))
    .limit(1);
  if (!row) notFound();
  const { playlist, category } = row;

  const [items, allCategories] = await Promise.all([
    db.select().from(files).where(eq(files.playlistId, playlistId)).orderBy(asc(files.sortOrder), asc(files.title)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ]);
  const totalBytes = items.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0);
  const slots = filesBySlot(items);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Library", href: "/admin/library" },
          { label: category.name, href: `/admin/library/${category.id}` },
          { label: playlist.name },
        ]}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(2.1rem,5vw,3rem)]">{playlist.name}</h1>
        {playlist.isPublished ? (
          <span className="tag bg-ok/15 text-ok">Visible to customers</span>
        ) : (
          <span className="tag">Hidden from customers</span>
        )}
        <Link href={`/portal/${category.slug}/${playlist.slug}`} className="btn btn-quiet btn-sm ml-auto">
          View as customer
        </Link>
      </div>
      <p className="mt-1 text-mist">
        {items.length === 1 ? "1 file" : `${items.length} files`}
        {totalBytes > 0 && ` · ${formatBytes(totalBytes)}`}
      </p>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-6">
          <section className="panel p-6 sm:p-7" aria-labelledby="zoho-heading">
            <h2 id="zoho-heading" className="font-sans text-lg font-bold">
              Show files from Zoho
            </h2>
            <p className="mt-1 text-sm text-mist">
              In WorkDrive, share each file with an external link that allows downloads, then paste the links here.
              Customers download the first three separately, and the track list also shows on the show page. The
              MP3 is what the player on the show page plays.
            </p>
            <div className="mt-5">
              <ActionForm
                action={saveShowFiles.bind(null, playlist.id)}
                submitLabel="Save show files"
                pendingLabel="Checking links…"
              >
                {SHOW_SLOTS.map((slot) => {
                  const current = slots[slot.key];
                  return (
                    <div key={slot.key} className="grid gap-2">
                      <label htmlFor={`${slot.key}Url`} className="label !mb-0">
                        {slot.label}
                      </label>
                      {current && <input type="hidden" name={`${slot.key}Id`} value={current.id} />}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          id={`${slot.key}Url`}
                          name={`${slot.key}Url`}
                          type="url"
                          className="field"
                          placeholder="https://workdrive.zohopublic.com.au/external/…"
                          defaultValue={current?.externalUrl ?? ""}
                        />
                        {slot.key === "show" && (
                          <select
                            name="showKind"
                            aria-label="Type of show file"
                            className="field sm:!w-40"
                            defaultValue={current?.kind ?? "video"}
                          >
                            <option value="video">Video</option>
                            <option value="audio">Audio</option>
                            <option value="archive">Zip</option>
                            <option value="other">Other</option>
                          </select>
                        )}
                      </div>
                      <p className="hint !mt-0">
                        {current && slot.key === "preview" ? (
                          <>
                            Plays in the show page player:{" "}
                            <span className="text-white">{current.fileName || current.title}</span>
                            {current.durationSeconds != null &&
                              ` · ${formatDuration(Math.max(0, current.durationSeconds - INTRO_SKIP_SECONDS))} after the intro`}
                          </>
                        ) : current ? (
                          <>
                            Customers see: <span className="text-white">{current.title}</span>
                            {current.fileName && current.fileName !== current.title ? ` (${current.fileName})` : ""}
                            {slot.key === "tracklist" && current.meta?.callList && (
                              <>
                                {" "}
                                · {current.meta.callList.songs.length} songs read, so the call list follows the player
                              </>
                            )}
                          </>
                        ) : (
                          slot.hint
                        )}
                      </p>
                    </div>
                  );
                })}
              </ActionForm>
            </div>
          </section>

          <section className="panel" aria-labelledby="files-heading">
            <h2 id="files-heading" className="px-6 pt-6 font-sans text-lg font-bold">
              Files
            </h2>
            {items.length === 0 ? (
              <p className="px-6 pb-6 pt-2 text-mist">No files yet. Upload some or add a link.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {items.map((f) => (
                  <li key={f.id} className="px-4 py-3 sm:px-6">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-4 [&::-webkit-details-marker]:hidden">
                        <FileIcon kind={f.kind} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold break-words">{f.title}</span>
                          <span className="block text-sm text-mist">
                            {f.groupLabel && <span className="text-sun">{f.groupLabel} · </span>}
                            {kindLabel(f.kind)}
                            {f.sizeBytes ? ` · ${formatBytes(f.sizeBytes)}` : ""}
                            {f.source === "link" ? " · link" : ""}
                            {` · ${formatDate(f.createdAt)}`}
                          </span>
                        </span>
                        <span className="text-sm text-fog group-open:hidden">Edit</span>
                        <span className="hidden text-sm text-fog group-open:inline">Close</span>
                      </summary>
                      <div className="mt-4 grid gap-4 rounded-xl border border-line bg-ink/60 p-4">
                        <ActionForm
                          action={updateFile.bind(null, f.id)}
                          submitLabel="Save"
                          submitClassName="btn btn-red btn-sm"
                          className="grid gap-4"
                        >
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <label htmlFor={`t-${f.id}`} className="label">
                                Title
                              </label>
                              <input id={`t-${f.id}`} name="title" className="field" defaultValue={f.title} required />
                            </div>
                            <div>
                              <label htmlFor={`g-${f.id}`} className="label">
                                Group
                              </label>
                              <input
                                id={`g-${f.id}`}
                                name="groupLabel"
                                className="field"
                                defaultValue={f.groupLabel}
                                placeholder="e.g. Round 1"
                              />
                            </div>
                            <div>
                              <label htmlFor={`k-${f.id}`} className="label">
                                Type
                              </label>
                              <KindSelect id={`k-${f.id}`} value={f.kind} />
                            </div>
                            <div>
                              <label htmlFor={`s-${f.id}`} className="label">
                                Order
                              </label>
                              <input
                                id={`s-${f.id}`}
                                name="sortOrder"
                                type="number"
                                className="field"
                                defaultValue={f.sortOrder}
                              />
                            </div>
                            {f.source === "link" && (
                              <div className="sm:col-span-2">
                                <label htmlFor={`u-${f.id}`} className="label">
                                  Link
                                </label>
                                <input
                                  id={`u-${f.id}`}
                                  name="url"
                                  type="url"
                                  className="field"
                                  defaultValue={f.externalUrl ?? ""}
                                />
                              </div>
                            )}
                          </div>
                          {f.fileName && <p className="text-sm text-fog">Original file: {f.fileName}</p>}
                        </ActionForm>
                        <ActionForm
                          action={deleteFile.bind(null, f.id)}
                          submitLabel="Delete file"
                          pendingLabel="Deleting…"
                          submitClassName="btn btn-danger btn-sm"
                          className="grid gap-3 border-t border-line pt-4"
                          confirm={`Delete “${f.title}”? Customers won't be able to download it any more.`}
                        >
                          {null}
                        </ActionForm>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            <p className="px-6 py-4 text-sm text-fog">
              Files show in order of their Order number. Click a file to rename it or change its type.
            </p>
          </section>
        </div>

        <div className="grid gap-6">
          <section className="panel p-6" aria-labelledby="settings-heading">
            <h2 id="settings-heading" className="font-sans text-lg font-bold">
              Show settings
            </h2>
            <div className="mt-4">
              <ActionForm action={updatePlaylist.bind(null, playlist.id)} submitLabel="Save show">
                <div>
                  <label htmlFor="pl-name" className="label">
                    Name
                  </label>
                  <input id="pl-name" name="name" className="field" required defaultValue={playlist.name} />
                </div>
                <div>
                  <label htmlFor="pl-description" className="label">
                    Description
                  </label>
                  <input id="pl-description" name="description" className="field" defaultValue={playlist.description} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pl-category" className="label">
                      Category
                    </label>
                    <select id="pl-category" name="categoryId" className="field" defaultValue={category.id}>
                      {allCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pl-sort" className="label">
                      Order
                    </label>
                    <input
                      id="pl-sort"
                      name="sortOrder"
                      type="number"
                      className="field"
                      defaultValue={playlist.sortOrder}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="pl-slug" className="label">
                    Web address
                  </label>
                  <input id="pl-slug" name="slug" className="field" defaultValue={playlist.slug} />
                </div>
                <label className="check">
                  <input type="checkbox" name="isPublished" defaultChecked={playlist.isPublished} />
                  <span>Visible to customers</span>
                </label>
              </ActionForm>
            </div>
          </section>

          <details className="panel group p-6">
            <summary className="flex cursor-pointer list-none items-center justify-between font-sans text-lg font-bold [&::-webkit-details-marker]:hidden">
              More ways to add files
              <span className="text-sm font-normal text-fog group-open:hidden">Upload, or add any link</span>
            </summary>
            <div className="mt-5 grid gap-8">
              <section aria-labelledby="upload-heading">
                <h2 id="upload-heading" className="font-sans text-base font-bold">
                  Upload files
                </h2>
                <div className="mt-4">
                  <Uploader playlistId={playlist.id} enabled={storageConfigured()} />
                </div>
              </section>

              <section aria-labelledby="link-heading">
                <h2 id="link-heading" className="font-sans text-base font-bold">
                  Add a link instead
                </h2>
                <p className="mt-1 text-sm text-mist">
                  For files already in Dropbox, Google Drive or anywhere else online.
                </p>
                <div className="mt-4">
                  <ActionForm
                    action={addLinkFile.bind(null, playlist.id)}
                    submitLabel="Add link"
                    pendingLabel="Adding…"
                    resetOnSuccess
                  >
                    <div>
                      <label htmlFor="link-title" className="label">
                        Title
                      </label>
                      <input id="link-title" name="title" className="field" required placeholder="e.g. Round 1 video" />
                    </div>
                    <div>
                      <label htmlFor="link-url" className="label">
                        Link
                      </label>
                      <input
                        id="link-url"
                        name="url"
                        type="url"
                        className="field"
                        required
                        placeholder="https://www.dropbox.com/…"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="link-group" className="label">
                          Group (optional)
                        </label>
                        <input id="link-group" name="groupLabel" className="field" placeholder="e.g. Round 1" />
                      </div>
                      <div>
                        <label htmlFor="link-kind" className="label">
                          Type
                        </label>
                        <KindSelect id="link-kind" />
                      </div>
                    </div>
                  </ActionForm>
                </div>
              </section>
            </div>
          </details>

          <section className="rounded-[var(--radius-card)] border border-red/40 p-6">
            <h2 className="font-sans text-lg font-bold">Delete show</h2>
            <p className="mt-1 text-sm text-mist">
              Deletes the show and every file in it. Files in Zoho aren&apos;t touched.
            </p>
            <div className="mt-4">
              <ActionForm
                action={deletePlaylist.bind(null, playlist.id)}
                submitLabel="Delete show"
                pendingLabel="Deleting…"
                submitClassName="btn btn-danger btn-sm"
                confirm={`Delete ${playlist.name} and all ${items.length} files in it? This can't be undone.`}
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
