import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { requireUser, accessHasExpired } from "@/lib/auth";
import { listGenres } from "@/lib/library";

export default async function PortalHomePage() {
  const user = await requireUser();
  // Only categories that actually have shows; empty ones just add noise.
  const categories = (await listGenres(user)).filter((c) => c.playlistCount > 0);
  const firstName = user.name.trim().split(/\s+/)[0];
  const expired = accessHasExpired(user);

  return (
    <>
      <h1 className="text-[clamp(2.2rem,5vw,3.2rem)]">{firstName ? `Welcome, ${firstName}` : "Your library"}</h1>
      <p className="mt-2 text-lg text-mist">Choose a category to see its shows.</p>

      <form action="/portal/search" role="search" className="mt-6 flex max-w-md gap-2">
        <label htmlFor="q" className="sr-only">
          Search shows and files
        </label>
        <input id="q" name="q" type="search" placeholder="Search shows and files" className="field" minLength={2} />
        <button type="submit" className="btn btn-ghost px-3" aria-label="Search">
          <Search size={18} aria-hidden />
        </button>
      </form>

      {categories.length === 0 ? (
        <div className="panel mt-10 max-w-2xl p-8">
          <h2 className="text-2xl">{expired ? "Your access has ended" : "No shows yet"}</h2>
          <p className="mt-2 text-mist">
            {expired
              ? "Contact us to renew and your library will be back straight away."
              : "There aren't any shows on your account yet. If you were expecting some, let us know."}
          </p>
          <Link href="/contact-us" className="btn btn-red mt-6">
            Contact us
          </Link>
        </div>
      ) : (
        <section aria-labelledby="categories-heading" className="mt-12">
          <h2 id="categories-heading" className="font-sans text-lg font-bold text-sun">
            Categories
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id} className="min-w-0">
                <Link
                  href={`/portal/${c.slug}`}
                  className="group panel flex h-full items-center gap-4 border-l-4 !border-l-red p-5 transition-colors hover:border-white/30 hover:bg-coal-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="display text-[1.55rem] leading-tight">{c.name}</span>
                      {!c.isPublished && <span className="tag">Hidden</span>}
                    </span>
                    {c.description && <span className="mt-1 line-clamp-2 text-sm text-mist">{c.description}</span>}
                    <span className="mt-3 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-sm font-semibold">
                      {c.playlistCount === 1 ? "1 show" : `${c.playlistCount} shows`}
                    </span>
                  </span>
                  <ChevronRight size={22} aria-hidden className="shrink-0 text-fog transition-colors group-hover:text-white" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
