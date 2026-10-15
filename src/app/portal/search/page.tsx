import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { searchLibrary } from "@/lib/library";
import { formatBytes, kindLabel } from "@/lib/format";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { FileIcon } from "@/components/portal/file-icon";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const user = await requireUser();
  const results = await searchLibrary(user, q);
  const total = results.playlists.length + results.files.length;

  return (
    <>
      <Breadcrumbs items={[{ label: "Library", href: "/portal" }, { label: "Search" }]} />
      <form action="/portal/search" role="search" className="mt-5 flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">
          Search shows and files
        </label>
        <input id="q" name="q" type="search" defaultValue={q} className="field" placeholder="Search shows and files" />
        <button type="submit" className="btn btn-red">
          Search
        </button>
      </form>

      {q.trim().length < 2 ? (
        <p className="mt-8 text-mist">Type at least two letters to search.</p>
      ) : total === 0 ? (
        <p className="mt-8 text-mist">Nothing matches “{q}”. Try a shorter word or a different spelling.</p>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          {results.playlists.length > 0 && (
            <section>
              <h2 className="font-sans text-lg font-bold text-sun">Shows</h2>
              <ul className="panel mt-3 divide-y divide-line">
                {results.playlists.map((p) => (
                  <li key={`${p.categorySlug}/${p.slug}`}>
                    <Link href={`/portal/${p.categorySlug}/${p.slug}`} className="block px-5 py-4 hover:bg-white/[0.03]">
                      <span className="block font-semibold">{p.name}</span>
                      <span className="text-sm text-mist">{p.categoryName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {results.files.length > 0 && (
            <section>
              <h2 className="font-sans text-lg font-bold text-sun">Files</h2>
              <ul className="panel mt-3 divide-y divide-line">
                {results.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-4 px-5 py-4">
                    <FileIcon kind={f.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold break-words">{f.title}</p>
                      <p className="text-sm text-mist">
                        <Link href={`/portal/${f.categorySlug}/${f.playlistSlug}`} className="underline underline-offset-4 hover:text-white">
                          {f.playlistName}
                        </Link>
                        {` · ${kindLabel(f.kind)}`}
                        {f.sizeBytes ? ` · ${formatBytes(f.sizeBytes)}` : ""}
                      </p>
                    </div>
                    <a href={`/api/files/${f.id}/download`} className="btn btn-red btn-sm px-3" aria-label={`Download ${f.title}`}>
                      <Download size={16} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
