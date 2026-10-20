import { ArrowUpRight } from "lucide-react";
import { homePagePosts, kindOf } from "@/lib/social-posts";

/** A plain camera glyph, the shape people recognise as Instagram. */
function InstagramGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const WORD = { reel: "reel", post: "post", video: "video" } as const;

/**
 * Small links, at the bottom of the home page, to Instagram posts by venues running
 * Bar Beats Bingo. Managed in Admin → Website. Hidden when there are none.
 */
export async function SeenOnInstagram() {
  const posts = await homePagePosts();
  if (!posts.length) return null;
  return (
    <section className="wrap mt-16" aria-labelledby="instagram-heading">
      <h2 id="instagram-heading" className="flex items-center gap-2 font-sans text-base font-bold text-mist">
        <InstagramGlyph size={18} /> Seen on Instagram
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => {
          const kind = WORD[kindOf(p.url)];
          const who = p.handle ? `@${p.handle}` : `A Bar Beats Bingo ${kind}`;
          return (
            <li key={p.id}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-coal/70 p-3 pr-4 transition-colors hover:border-white/25 hover:bg-coal"
              >
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#7b3fe4_0%,#d6297b_55%,#f6a234_100%)] text-white opacity-85 transition-opacity group-hover:opacity-100"
                >
                  <InstagramGlyph size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{who}</span>
                  <span className="block truncate text-sm text-mist">
                    {p.caption || `Watch the ${kind} on Instagram`}
                  </span>
                </span>
                <ArrowUpRight
                  size={18}
                  aria-hidden
                  className="shrink-0 text-fog transition-colors group-hover:text-white"
                />
                <span className="sr-only"> (opens Instagram)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
