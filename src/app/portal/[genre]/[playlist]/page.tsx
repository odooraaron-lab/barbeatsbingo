import { notFound } from "next/navigation";
import { Download, Play } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPlaylist } from "@/lib/library";
import { formatBytes, formatDate, kindLabel } from "@/lib/format";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { FileIcon } from "@/components/portal/file-icon";

export default async function PlaylistPage({ params }: { params: Promise<{ genre: string; playlist: string }> }) {
  const { genre, playlist: playlistSlug } = await params;
  const user = await requireUser();
  const data = await getPlaylist(user, genre, playlistSlug);
  if (!data) notFound();
  const { category, playlist, files } = data;

  // Keep groups in the order their first file appears.
  const groups = new Map<string, typeof files>();
  for (const f of files) {
    const key = f.groupLabel || "";
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Library", href: "/portal" },
          { label: category.name, href: `/portal/${category.slug}` },
          { label: playlist.name },
        ]}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(2.1rem,5vw,3rem)]">{playlist.name}</h1>
        {!playlist.isPublished && <span className="tag">Hidden from customers</span>}
      </div>
      {playlist.description && <p className="mt-2 max-w-2xl text-lg text-mist">{playlist.description}</p>}

      {files.length === 0 ? (
        <p className="panel mt-10 p-8 text-mist">The files for this playlist are on their way. Check back soon.</p>
      ) : (
        <div className="mt-10 space-y-10">
          {[...groups.entries()].map(([label, items]) => (
            <section key={label || "files"} aria-label={label || "Files"}>
              {label && <h2 className="mb-3 font-sans text-lg font-bold text-sun">{label}</h2>}
              <ul className="panel divide-y divide-line">
                {items.map((f) => {
                  const href = `/api/files/${f.id}/download`;
                  const playable = f.source === "storage" && (f.kind === "video" || f.kind === "audio");
                  return (
                    <li key={f.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
                      <FileIcon kind={f.kind} />
                      <div className="min-w-[11rem] flex-1">
                        <p className="font-semibold break-words">{f.title}</p>
                        <p className="text-sm text-mist">
                          {kindLabel(f.kind)}
                          {f.sizeBytes ? ` · ${formatBytes(f.sizeBytes)}` : ""}
                          {` · added ${formatDate(f.createdAt)}`}
                        </p>
                      </div>
                      <div className="flex w-full gap-2 pl-15 sm:w-auto sm:pl-0">
                        {playable && (
                          <a href={`${href}?inline=1`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                            <Play size={16} aria-hidden /> Preview
                            <span className="sr-only"> {f.title}</span>
                          </a>
                        )}
                        <a href={href} className="btn btn-red btn-sm">
                          <Download size={16} aria-hidden /> Download
                          <span className="sr-only"> {f.title}</span>
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
