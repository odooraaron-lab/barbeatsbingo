import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { downloadedShows, getGenre } from "@/lib/library";
import { formatBytes, formatDate } from "@/lib/format";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { RequestCategory } from "@/components/portal/request-category";
import { DownloadedTag } from "@/components/portal/download-marks";

const TEASER = 12;

function LockedShows({ names }: { names: string[] }) {
  return (
    <ul className="mt-5 flex flex-wrap gap-2" aria-label="Shows in this category">
      {names.slice(0, TEASER).map((name, i) => (
        <li key={`${i}-${name}`} className="flex items-center gap-1.5 rounded-full border border-line bg-ink px-3 py-1 text-sm text-mist">
          <Lock size={13} aria-hidden className="text-fog" /> {name}
        </li>
      ))}
      {names.length > TEASER && (
        <li className="rounded-full px-3 py-1 text-sm text-fog">and {names.length - TEASER} more</li>
      )}
    </ul>
  );
}

export default async function GenrePage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  const user = await requireUser();
  const data = await getGenre(user, genre);
  if (!data) notFound();
  const { category, playlists, lockedNames, expired } = data;
  const done = await downloadedShows(
    user.id,
    playlists.map((p) => p.id),
  );
  const count = (n: number) => (n === 1 ? "1 show" : `${n} shows`);

  return (
    <>
      <Breadcrumbs items={[{ label: "Library", href: "/portal" }, { label: category.name }]} />
      <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.2rem)]">{category.name}</h1>
      {category.description && <p className="mt-2 max-w-2xl text-lg text-mist">{category.description}</p>}

      {playlists.length === 0 && lockedNames.length === 0 && (
        <p className="panel mt-10 p-8 text-mist">No shows in this category yet. Check back soon.</p>
      )}

      {playlists.length === 0 && lockedNames.length > 0 && (
        <section className="panel mt-10 max-w-3xl p-6 sm:p-8" aria-labelledby="locked-heading">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-ink text-mist"
            >
              <Lock size={20} />
            </span>
            <div>
              <h2 id="locked-heading" className="font-sans text-xl font-bold">
                {expired ? "Your access has ended" : `${category.name} isn't on your plan yet`}
              </h2>
              <p className="mt-1 text-mist">
                {expired
                  ? `Renew to play the ${count(lockedNames.length)} in ${category.name} again.`
                  : `There ${lockedNames.length === 1 ? "is 1 show" : `are ${lockedNames.length} shows`} in ${category.name}. Ask us and we'll add it to your account.`}
              </p>
            </div>
          </div>
          <LockedShows names={lockedNames} />
          <div className="mt-7">
            {expired ? (
              <Link href="/contact-us" className="btn btn-red">
                Contact us to renew
              </Link>
            ) : (
              <RequestCategory categoryId={category.id} label={`Ask to add ${category.name}`} />
            )}
          </div>
        </section>
      )}

      {playlists.length > 0 && (
        <ul className="mt-10 grid gap-3">
          {playlists.map((p) => (
            <li key={p.id}>
              <Link
                href={`/portal/${category.slug}/${p.slug}`}
                className="group panel flex items-center gap-4 px-5 py-4 transition-colors hover:border-white/30 hover:bg-coal-2 sm:px-6 sm:py-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-3">
                    <span className="truncate text-xl font-bold">{p.name}</span>
                    {!p.isPublished && <span className="tag">Hidden</span>}
                    {done.has(p.id) && <DownloadedTag at={done.get(p.id)!.toISOString()} className="max-sm:hidden" />}
                  </span>
                  {p.description && <span className="mt-1 block truncate text-mist">{p.description}</span>}
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-mist sm:hidden">
                    {p.fileCount === 1 ? "1 file" : `${p.fileCount} files`}
                    {done.has(p.id) && <DownloadedTag at={done.get(p.id)!.toISOString()} />}
                  </span>
                </span>
                <span className="hidden shrink-0 text-right text-sm text-mist sm:block">
                  {p.fileCount === 1 ? "1 file" : `${p.fileCount} files`}
                  {p.totalBytes > 0 && ` · ${formatBytes(p.totalBytes)}`}
                  {p.updatedAt && <span className="block text-xs text-fog">Updated {formatDate(p.updatedAt)}</span>}
                </span>
                <ChevronRight size={22} aria-hidden className="shrink-0 text-fog transition-colors group-hover:text-white" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {playlists.length > 0 && lockedNames.length > 0 && (
        <section className="mt-10 max-w-3xl rounded-2xl border border-line bg-ink/80 p-6" aria-labelledby="more-heading">
          <h2 id="more-heading" className="flex items-center gap-2 font-sans text-lg font-bold text-mist">
            <Lock size={17} aria-hidden /> {count(lockedNames.length)} more in {category.name}
          </h2>
          <p className="mt-1 text-sm text-fog">Not on your plan yet.</p>
          <LockedShows names={lockedNames} />
          <div className="mt-5">
            <RequestCategory categoryId={category.id} label="Ask to add them" />
          </div>
        </section>
      )}
    </>
  );
}
