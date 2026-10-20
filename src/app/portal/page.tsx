import Link from "next/link";
import { BookOpen, ChevronRight, Download, Lock, Play, Search } from "lucide-react";
import { requireUser, accessHasExpired } from "@/lib/auth";
import { listGenres, type GenreSummary } from "@/lib/library";
import { InstallApp } from "@/components/portal/install-app";
import { genreGlow } from "@/lib/genre-colours";
import { categoryCovers, type Cover } from "@/lib/album-art";
import { CoverImage } from "@/components/portal/cover-image";
import { HOST_GUIDE, siteFileInfo } from "@/lib/site-files";

const showCount = (n: number) => (n === 1 ? "1 show" : `${n} shows`);

/** A strip of small album covers from the songs in a category (up to 20, ten to a row). */
function CoverStrip({ covers }: { covers: Cover[] }) {
  if (!covers.length) return null;
  return (
    <span aria-hidden className="relative grid grid-cols-10 gap-1 pt-4">
      {covers.map((c) => (
        <CoverImage key={c.url} src={c.url} label={c.label} />
      ))}
    </span>
  );
}

function OpenCategory({ c, covers }: { c: GenreSummary; covers: Cover[] }) {
  return (
    <Link
      href={`/portal/${c.slug}`}
      style={genreGlow(c.slug)}
      className="genre-card group relative flex h-full flex-col overflow-hidden rounded-2xl p-5"
    >
      {/* The glow (each category in its own colour) is what marks it as ready to play. */}
      <span aria-hidden className="genre-card-wash pointer-events-none absolute inset-0" />
      {/* Takes the spare height (when a card beside it is taller), keeping the name centred. */}
      <span className="relative flex flex-1 items-center gap-4">
      <span aria-hidden className="genre-card-disc relative grid h-12 w-12 shrink-0 place-items-center rounded-full">
        <Play size={20} className="translate-x-px" fill="currentColor" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="display text-[1.55rem] leading-tight">{c.name}</span>
          {!c.isPublished && <span className="tag">Hidden</span>}
        </span>
        {c.description && <span className="mt-1 line-clamp-2 text-sm text-mist">{c.description}</span>}
        <span className="genre-card-count mt-2 block text-sm font-semibold">
          {showCount(c.available)} ready to play
          {c.total > c.available && <span className="font-normal text-mist"> · {c.total - c.available} more locked</span>}
        </span>
      </span>
      <ChevronRight size={22} aria-hidden className="relative shrink-0 text-mist transition-colors group-hover:text-white" />
      </span>
      <CoverStrip covers={covers} />
    </Link>
  );
}

function OtherCategory({ c, expired }: { c: GenreSummary; expired: boolean }) {
  const body = (
    <>
      <span
        aria-hidden
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-ink text-fog"
      >
        <Lock size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="display text-[1.55rem] leading-tight text-mist">{c.name}</span>
          {!c.isPublished && <span className="tag">Hidden</span>}
        </span>
        <span className="mt-2 block text-sm text-fog">
          {c.state === "soon" ? "Coming soon" : `${showCount(c.total)} · ${expired ? "renew to play" : "not on your plan"}`}
        </span>
      </span>
    </>
  );
  if (c.state === "soon") {
    return (
      <div className="flex h-full items-center gap-4 rounded-2xl border border-dashed border-line bg-ink/60 p-5">
        {body}
      </div>
    );
  }
  return (
    <Link
      href={`/portal/${c.slug}`}
      className="group flex h-full items-center gap-4 rounded-2xl border border-line bg-ink/80 p-5 transition-colors hover:border-white/25 hover:bg-coal"
    >
      {body}
      <span className="shrink-0 text-sm font-semibold text-fog transition-colors group-hover:text-white">
        {expired ? "Renew" : "Ask to add"}
      </span>
    </Link>
  );
}

/** The Quick Fire host guide (PDF), for every customer. */
function HostGuide() {
  return (
    <section aria-labelledby="guide-heading" className="panel mt-12 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
      <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sun/15 text-sun">
        <BookOpen size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="guide-heading" className="font-sans text-xl font-bold">
          Host guide
        </h2>
        <p className="mt-1 text-mist">
          Everything for a great night: setting up, running each game, host tips, prize ideas and crowd game
          prompts for the breaks.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {/* A file download (route handler), not a page, so a plain link. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/portal/host-guide" className="btn btn-red">
          <Download size={18} aria-hidden /> Download PDF
        </a>
        <a href="/portal/host-guide?view=1" target="_blank" rel="noreferrer" className="btn btn-ghost">
          Open
        </a>
      </div>
    </section>
  );
}

export default async function PortalHomePage() {
  const user = await requireUser();
  const all = await listGenres(user);
  const open = all.filter((c) => c.state === "open");
  const others = all.filter((c) => c.state !== "open");
  const anyLocked = others.some((c) => c.state === "locked");
  const firstName = user.name.trim().split(/\s+/)[0];
  const expired = accessHasExpired(user);
  const [covers, guide] = await Promise.all([categoryCovers(open.map((c) => c.id)), siteFileInfo(HOST_GUIDE)]);

  return (
    <>
      <h1 className="text-[clamp(2.2rem,5vw,3.2rem)]">{firstName ? `Welcome, ${firstName}` : "Your library"}</h1>
      {open.length > 0 && <p className="mt-2 text-lg text-mist">Choose a category to see its shows.</p>}

      <form action="/portal/search" role="search" className="mt-6 flex max-w-md gap-2">
        <label htmlFor="q" className="sr-only">
          Search shows and files
        </label>
        <input id="q" name="q" type="search" placeholder="Search shows and files" className="field" minLength={2} />
        <button type="submit" className="btn btn-ghost px-3" aria-label="Search">
          <Search size={18} aria-hidden />
        </button>
      </form>

      <InstallApp variant="banner" />

      {open.length === 0 && (
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
      )}

      {open.length > 0 && (
        <section aria-labelledby="categories-heading" className="mt-12">
          <h2 id="categories-heading" className="font-sans text-lg font-bold text-sun">
            Your categories
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((c) => (
              <li key={c.id} className="min-w-0">
                <OpenCategory c={c} covers={covers.get(c.id) ?? []} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {guide && <HostGuide />}

      {others.length > 0 && (
        <section aria-labelledby="more-heading" className="mt-12">
          <h2 id="more-heading" className="font-sans text-lg font-bold text-sun">
            {anyLocked ? "More categories" : "Coming soon"}
          </h2>
          {anyLocked && (
            <p className="mt-1 text-sm text-mist">
              {expired
                ? "Renew your access to play these again."
                : "These aren't on your plan yet. Open one to ask us to add it."}
            </p>
          )}
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <li key={c.id} className="min-w-0">
                <OtherCategory c={c} expired={expired} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
