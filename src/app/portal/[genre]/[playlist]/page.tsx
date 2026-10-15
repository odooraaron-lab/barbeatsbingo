import { notFound } from "next/navigation";
import { Download, Play } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPlaylist } from "@/lib/library";
import { formatBytes, kindLabel } from "@/lib/format";
import { findTrackList } from "@/lib/show-files";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { FileIcon } from "@/components/portal/file-icon";
import { TrackListViewer } from "@/components/portal/track-list-viewer";
import { AudioPlayer } from "@/components/portal/audio-player";

function extensionOf(name: string) {
  const ext = name.split(".").pop();
  return ext && ext !== name && ext.length <= 5 ? ext.toUpperCase() : "";
}

export default async function ShowPage({ params }: { params: Promise<{ genre: string; playlist: string }> }) {
  const { genre, playlist: showSlug } = await params;
  const user = await requireUser();
  const data = await getPlaylist(user, genre, showSlug);
  if (!data) notFound();
  const { category, playlist: show, files } = data;
  const trackList = findTrackList(files);
  const showFile = files.find((f) => f.kind === "video" || f.kind === "audio") ?? null;
  const player = showFile && <AudioPlayer src={`/api/files/${showFile.id}/stream`} title={showFile.title} />;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Library", href: "/portal" },
          { label: category.name, href: `/portal/${category.slug}` },
          { label: show.name },
        ]}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(2.1rem,5vw,3rem)]">{show.name}</h1>
        {!show.isPublished && <span className="tag">Hidden from customers</span>}
      </div>
      {show.description && <p className="mt-2 max-w-2xl text-lg text-mist">{show.description}</p>}

      {files.length === 0 ? (
        <p className="panel mt-10 p-8 text-mist">The files for this show are on their way. Check back soon.</p>
      ) : (
        <section aria-labelledby="downloads-heading" className="mt-10">
          <h2 id="downloads-heading" className="font-sans text-lg font-bold text-sun">
            Downloads
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((f) => {
              const href = `/api/files/${f.id}/download`;
              const playable = f.source === "storage" && (f.kind === "video" || f.kind === "audio");
              const meta = [extensionOf(f.fileName), f.sizeBytes ? formatBytes(f.sizeBytes) : ""].filter(Boolean);
              return (
                <li key={f.id} className="panel flex flex-col p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <FileIcon kind={f.kind} />
                    <span className="text-sm font-semibold text-mist">{kindLabel(f.kind)}</span>
                  </div>
                  <p className="mt-3 break-words text-[1.05rem] font-bold leading-snug sm:mt-4 sm:text-lg">{f.title}</p>
                  {meta.length > 0 && <p className="mt-1 text-sm text-mist">{meta.join(" · ")}</p>}
                  <div className="mt-auto flex gap-2 pt-4 sm:pt-5">
                    <a href={href} className="btn btn-red flex-1">
                      <Download size={18} aria-hidden /> Download
                      <span className="sr-only"> {f.title}</span>
                    </a>
                    {playable && (
                      <a
                        href={`${href}?inline=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost px-3"
                        aria-label={`Preview ${f.title}`}
                      >
                        <Play size={18} aria-hidden />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {trackList ? (
        <div className="mt-14 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="tracklist-heading" className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="tracklist-heading" className="text-[clamp(1.8rem,4vw,2.4rem)]">
                Track list
              </h2>
              <a href={`/api/files/${trackList.id}/download`} className="btn btn-ghost btn-sm">
                <Download size={16} aria-hidden /> Download PDF
              </a>
            </div>
            <div className="mt-5">
              <TrackListViewer
                src={`/api/files/${trackList.id}/pdf`}
                downloadHref={`/api/files/${trackList.id}/download`}
                title={trackList.title}
              />
            </div>
          </section>
          {player && <aside className="order-first lg:sticky lg:top-6 lg:order-none lg:mt-[4.25rem]">{player}</aside>}
        </div>
      ) : (
        player && <div className="mt-10 max-w-md">{player}</div>
      )}
    </>
  );
}
