import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getGenre } from "@/lib/library";
import { formatBytes, formatDate } from "@/lib/format";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";

export default async function GenrePage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  const user = await requireUser();
  const data = await getGenre(user, genre);
  if (!data) notFound();
  const { category, playlists } = data;

  return (
    <>
      <Breadcrumbs items={[{ label: "Library", href: "/portal" }, { label: category.name }]} />
      <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.2rem)]">{category.name}</h1>
      {category.description && <p className="mt-2 max-w-2xl text-lg text-mist">{category.description}</p>}

      {playlists.length === 0 ? (
        <p className="panel mt-10 p-8 text-mist">No shows in this category yet. Check back soon.</p>
      ) : (
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
                  </span>
                  {p.description && <span className="mt-1 block truncate text-mist">{p.description}</span>}
                  <span className="mt-1 block text-sm text-mist sm:hidden">
                    {p.fileCount === 1 ? "1 file" : `${p.fileCount} files`}
                  </span>
                </span>
                <span className="hidden shrink-0 text-right text-sm text-mist sm:block">
                  {p.fileCount === 1 ? "1 file" : `${p.fileCount} files`}
                  {p.totalBytes > 0 && ` · ${formatBytes(p.totalBytes)}`}
                  {p.updatedAt && (
                    <span className="block text-xs text-fog">Updated {formatDate(p.updatedAt)}</span>
                  )}
                </span>
                <ChevronRight size={22} aria-hidden className="shrink-0 text-fog transition-colors group-hover:text-white" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
