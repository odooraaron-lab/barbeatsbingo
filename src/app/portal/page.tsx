import Link from "next/link";
import { Search } from "lucide-react";
import { requireUser, accessHasExpired } from "@/lib/auth";
import { listGenres } from "@/lib/library";

const TILE_TONES = [
  "bg-red text-white",
  "bg-sun text-[#1b1b1b]",
  "bg-coal-2 text-white border border-line",
  "bg-tang text-[#1b1b1b]",
];

export default async function PortalHomePage() {
  const user = await requireUser();
  const genres = await listGenres(user);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[clamp(2.2rem,5vw,3.2rem)]">{firstName ? `Kia ora, ${firstName}` : "Your library"}</h1>
          <p className="mt-2 text-lg text-mist">Pick a genre to find your playlists and download the game files.</p>
        </div>
        <form action="/portal/search" role="search" className="flex w-full max-w-sm gap-2">
          <label htmlFor="q" className="sr-only">
            Search playlists and files
          </label>
          <input id="q" name="q" type="search" placeholder="Search playlists and files" className="field" minLength={2} />
          <button type="submit" className="btn btn-ghost px-3" aria-label="Search">
            <Search size={18} aria-hidden />
          </button>
        </form>
      </div>

      {genres.length === 0 ? (
        <div className="panel mt-10 p-8">
          <h2 className="text-2xl">
            {accessHasExpired(user) ? "Your access has ended" : "Nothing here yet"}
          </h2>
          <p className="mt-2 max-w-xl text-mist">
            {accessHasExpired(user)
              ? "Contact us to renew and your library will be back straight away."
              : "We haven't added any playlists to your account yet. If you were expecting some, let us know."}
          </p>
          <Link href="/contact-us" className="btn btn-red mt-6">
            Contact us
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {genres.map((g, i) => (
            <li key={g.id}>
              <Link
                href={`/portal/${g.slug}`}
                className={`group flex h-full min-h-44 flex-col rounded-[var(--radius-card)] p-6 transition-transform hover:-translate-y-0.5 ${TILE_TONES[i % TILE_TONES.length]}`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="display text-[1.9rem] leading-none">{g.name}</span>
                  {!g.isPublished && <span className="tag bg-black/30 text-white">Hidden</span>}
                </span>
                {g.description && <span className="mt-3 line-clamp-2 text-[0.97rem] opacity-85">{g.description}</span>}
                <span className="mt-auto pt-6 text-sm font-bold">
                  {g.playlistCount === 1 ? "1 playlist" : `${g.playlistCount} playlists`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
