"use client";

import { useId, useMemo, useRef, useState } from "react";
import { BadgeCheck, Minus, Plus, Search, Star, X } from "lucide-react";
import { BINGO, songAt, type CallSong } from "@/lib/call-list";
import {
  PATTERNS,
  cardProgress,
  findCard,
  oneAway,
  winners,
  type BingoCard,
  type CardSet,
} from "@/lib/bingo";
import { useShowSession } from "./show-session";

/** "Ed Sheeran - Photograph" → { song: "Photograph", artist: "Ed Sheeran" } */
function splitTitle(title: string) {
  const at = title.indexOf(" - ");
  return at > 0 ? { artist: title.slice(0, at), song: title.slice(at + 3) } : { artist: "", song: title };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function CardView({
  card,
  set,
  played,
  songsByN,
  lastN,
}: {
  card: BingoCard;
  set: CardSet;
  played: number;
  songsByN: Map<number, CallSong>;
  lastN: number;
}) {
  const progress = cardProgress(card, set, played);
  const inWin = new Set(progress.done.flatMap((l) => l.cells));
  return (
    <div>
      <ul className="grid gap-1.5" aria-label="Where this card stands">
        {PATTERNS.map((p) => {
          const at = progress.firstAt[p.key];
          const has = at <= played;
          return (
            <li key={p.key} className={`flex items-baseline gap-2 ${has ? "text-ok" : "text-mist"}`}>
              {has ? <BadgeCheck size={17} aria-hidden className="shrink-0 translate-y-0.5" /> : <span className="w-[17px]" />}
              <span className={has ? "font-bold" : ""}>{p.label}</span>
              <span className="text-sm">
                {has
                  ? `yes, since song ${at}`
                  : Number.isFinite(progress.needs[p.key])
                    ? `needs ${plural(progress.needs[p.key], "more song", "more songs")}`
                    : "not on this card"}
              </span>
            </li>
          );
        })}
      </ul>

      <div
        className="mt-5 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${set.cols}, minmax(0, 1fr))` }}
        role="table"
        aria-label={`Card ${card.id}`}
      >
        {set.cols === 5 &&
          BINGO.split("").map((l) => (
            <div key={l} role="columnheader" className="display pb-1 text-center text-xl text-red-bright">
              {l}
            </div>
          ))}
        {card.cells.map((n, i) => {
          const song = n ? songsByN.get(n) : null;
          const marked = progress.marked[i];
          const name = song ? splitTitle(song.title) : null;
          return (
            <div
              key={i}
              role="cell"
              className={`relative flex min-h-16 flex-col justify-center rounded-md border p-1.5 text-center text-[0.7rem] leading-tight sm:min-h-20 sm:text-xs ${
                inWin.has(i) ? "border-sun ring-2 ring-sun" : "border-line"
              } ${marked ? "bg-red/80 text-white" : "bg-ink text-mist"}`}
            >
              {n === null ? (
                <span className="flex flex-col items-center gap-0.5 font-bold text-white">
                  <Star size={16} aria-hidden /> Free
                </span>
              ) : name ? (
                <>
                  <span className="font-semibold text-white">{name.song}</span>
                  {name.artist && <span className={marked ? "text-white/80" : "text-fog"}>{name.artist}</span>}
                  {n === lastN && <span className="sr-only"> (just played)</span>}
                </>
              ) : (
                <span>Song {n}</span>
              )}
              <span className="sr-only">{marked ? ", played" : ", not played yet"}</span>
              {n === lastN && <span aria-hidden className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-sun" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Helps the host check a bingo call: how far the show is, the songs played so far
 * (grouped by letter), and, when the show's cards have been read, whether a card
 * really has a winning pattern.
 */
export function ClaimChecker({ isAdmin = false }: { isAdmin?: boolean }) {
  const session = useShowSession();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [override, setOverride] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<string | null>(null);
  const inputId = useId();

  const songs = useMemo(() => session?.callList?.songs ?? [], [session?.callList]);
  const cards = session?.cards ?? null;
  const songsByN = useMemo(() => new Map(songs.map((s) => [s.n, s])), [songs]);

  const following = songAt(songs, session?.time ?? 0);
  const followCount = following >= 0 ? songs[following].n : 0;
  const played = Math.max(0, Math.min(override ?? followCount, songs.length));
  const last = songsByN.get(played) ?? null;

  const byLetter = useMemo(() => {
    const groups = new Map<string, CallSong[]>(BINGO.split("").map((l) => [l, []]));
    for (const s of songs) if (s.n <= played) groups.get(s.letter)?.push(s);
    for (const list of groups.values()) list.sort((a, b) => a.title.localeCompare(b.title));
    return groups;
  }, [songs, played]);

  const live = useMemo(
    () =>
      cards
        ? PATTERNS.map((p) => ({
            pattern: p,
            winners: winners(cards, p.key, played),
            close: oneAway(cards, p.key, played),
          }))
        : [],
    [cards, played],
  );

  if (!session || songs.length === 0) return null;
  const card = cards && checked ? findCard(cards, checked) : null;
  // The next pattern nobody has yet, and the ones already won.
  const firstLive = live.find((l) => l.winners.length === 0) ?? null;
  const won = live.filter((l) => l.winners.length > 0);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();
  const step = (by: number) => setOverride(Math.max(0, Math.min(songs.length, played + by)));

  return (
    <section className="panel mt-4 p-5 sm:p-6" aria-labelledby="checker-heading">
      <h2 id="checker-heading" className="flex items-center gap-2 font-sans text-lg font-bold">
        <BadgeCheck size={20} aria-hidden className="text-sun" /> Check a bingo
      </h2>
      <p className="mt-1 text-sm text-mist">
        {played === 0 ? "No songs played yet." : `${played} of ${songs.length} songs played.`}
      </p>
      {cards && won.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Cards that have won so far">
          {won.map((l) => (
            <li key={l.pattern.key} className="rounded-full bg-ok/15 px-2.5 py-0.5 text-sm font-semibold text-ok">
              {l.pattern.short}: {plural(l.winners.length, "card", "cards")}
            </li>
          ))}
        </ul>
      )}
      {cards && firstLive && firstLive.close.length > 0 && (
        <p className="mt-2 text-sm text-sun">
          {plural(firstLive.close.length, "card is", "cards are")} one song from {firstLive.pattern.short.toLowerCase()}.
        </p>
      )}
      <button type="button" onClick={open} className="btn btn-sun mt-4 w-full">
        <Search size={17} aria-hidden /> {cards ? "Check a card" : "See songs played"}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="checker-title"
        className="m-0 h-dvh max-h-dvh w-full max-w-none bg-coal p-0 text-white backdrop:bg-black/75 sm:m-auto sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-line"
        onClose={() => setChecked(null)}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-coal px-5 py-4">
          <h2 id="checker-title" className="font-sans text-xl font-bold">
            Check a bingo
          </h2>
          <button type="button" onClick={close} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Close">
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="grid gap-7 px-5 py-5">
          <section aria-labelledby="played-label">
            <div className="flex flex-wrap items-center gap-3">
              <span id="played-label" className="font-semibold">
                Songs played
              </span>
              <div className="flex items-center gap-1">
                <button type="button" className="btn btn-ghost btn-sm px-2" onClick={() => step(-1)} aria-label="One song fewer">
                  <Minus size={16} aria-hidden />
                </button>
                <output className="display min-w-12 text-center text-3xl tabular-nums" aria-live="polite">
                  {played}
                </output>
                <button type="button" className="btn btn-ghost btn-sm px-2" onClick={() => step(1)} aria-label="One song more">
                  <Plus size={16} aria-hidden />
                </button>
              </div>
              {override !== null && session.hasPlayer && (
                <button type="button" className="text-sm text-sun underline underline-offset-4" onClick={() => setOverride(null)}>
                  Follow the player again
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-mist">
              {last ? (
                <>
                  Up to song {last.n}: <span className="text-white">{last.title}</span>.{" "}
                </>
              ) : (
                "Nothing played yet. "
              )}
              {override === null && session.hasPlayer
                ? "Following the player. If your game is on the venue screen, set the last song played with − and +."
                : "Set this to the last song played in your game."}
            </p>
          </section>

          {cards ? (
            <>
              <section aria-labelledby="card-heading">
                <h3 id="card-heading" className="font-sans text-lg font-bold">
                  Check a card
                </h3>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setChecked(typed);
                  }}
                >
                  <label htmlFor={inputId} className="sr-only">
                    Card number
                  </label>
                  <input
                    id={inputId}
                    className="field max-w-48"
                    inputMode="numeric"
                    placeholder="Card number"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                  />
                  <button type="submit" className="btn btn-red">
                    Check
                  </button>
                </form>
                <p className="mt-2 text-sm text-fog">Lines are rows across. Winning rows are outlined in yellow.</p>
                {checked !== null && !card && (
                  <p className="alert alert-error mt-4" role="alert">
                    There&apos;s no card {checked.trim() || "with that number"} in this game. Check the number on the scorecard.
                  </p>
                )}
                {card && (
                  <div className="mt-5" aria-live="polite">
                    <h4 className="mb-3 font-sans font-bold">Card {card.id}</h4>
                    <CardView card={card} set={cards} played={played} songsByN={songsByN} lastN={played} />
                  </div>
                )}
              </section>

              <section aria-labelledby="winners-heading">
                <h3 id="winners-heading" className="font-sans text-lg font-bold">
                  Who could be calling
                </h3>
                <ul className="mt-3 grid gap-3">
                  {live.map(({ pattern, winners: won, close: nearly }) => (
                    <li key={pattern.key} className="rounded-xl border border-line bg-ink/60 p-3">
                      <p className="font-semibold">{pattern.label}</p>
                      <p className="mt-1 text-sm text-mist">
                        {won.length ? (
                          <span className="text-ok">
                            Won by{" "}
                            {won
                              .slice(0, 10)
                              .map((w) => `card ${w.card.id} (song ${w.at})`)
                              .join(", ")}
                            {won.length > 10 && ` and ${won.length - 10} more`}
                          </span>
                        ) : (
                          "No card has it yet."
                        )}
                        {nearly.length > 0 && (
                          <span className="text-sun">
                            {" "}
                            One song away: {nearly.slice(0, 12).map((c) => c.id).join(", ")}
                            {nearly.length > 12 && ` and ${nearly.length - 12} more`}.
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            isAdmin && (
              <p className="alert alert-info text-sm">
                Card checking switches on once this show&apos;s scorecards can be read. Until then, check a card against
                the songs below.
              </p>
            )
          )}

          <section aria-labelledby="letters-heading">
            <h3 id="letters-heading" className="font-sans text-lg font-bold">
              Songs played, by letter
            </h3>
            <p className="mt-1 text-sm text-mist">
              Each column of a card only has songs from its letter. Find the card&apos;s song under its letter.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {[...byLetter.entries()].map(([letter, list]) => (
                <div key={letter} className="rounded-xl border border-line bg-ink/60 p-3">
                  <p className="display text-2xl text-red-bright">
                    {letter} <span className="font-sans text-sm text-mist">{list.length}</span>
                  </p>
                  <ul className="mt-2 grid gap-1.5 text-sm">
                    {list.map((s) => (
                      <li key={s.n} className={s.n === played ? "font-bold text-sun" : ""}>
                        {s.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </dialog>
    </section>
  );
}
