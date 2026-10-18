"use client";

import { useId, useMemo, useRef, useState } from "react";
import { BadgeCheck, Minus, Plus, Search, Star, X } from "lucide-react";
import { BINGO, type CallSong } from "@/lib/call-list";
import {
  cardProgress,
  findCardId,
  judgeFromAnswers,
  judgeFromCards,
  nextPrizeWin,
  oneAway,
  prizeWinners,
  type BingoCard,
  type CardSet,
  type Judge,
} from "@/lib/bingo";
import { useShowSession } from "./show-session";

/** "Ed Sheeran - Photograph" → { song: "Photograph", artist: "Ed Sheeran" } */
function splitTitle(title: string) {
  const at = title.indexOf(" - ");
  return at > 0 ? { artist: title.slice(0, at), song: title.slice(at + 3) } : { artist: "", song: title };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "card 040", "cards 021 and 040", "cards 021, 040, 077 and 2 more" */
function cardsText(ids: string[], most = 3) {
  if (ids.length === 1) return `card ${ids[0]}`;
  const shown = ids.slice(0, most);
  const more = ids.length - shown.length;
  if (more > 0) return `cards ${shown.join(", ")} and ${more} more`;
  return `cards ${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

/** Where a card stands on each prize: won (and since when), or the song it comes up on. */
function CardStatus({ judge, id, played }: { judge: Judge; id: string; played: number }) {
  return (
    <ul className="grid gap-1.5" aria-label="Where this card stands">
      {judge.prizes.map((prize, p) => {
        const at = judge.winAt(id, p);
        const has = at <= played;
        return (
          <li key={p} className={`flex items-baseline gap-2 ${has ? "text-ok" : "text-mist"}`}>
            {has ? <BadgeCheck size={17} aria-hidden className="shrink-0 translate-y-0.5" /> : <span className="w-[17px] shrink-0" />}
            <span className={has ? "font-bold" : ""}>{prize.label}</span>
            <span className="text-sm">
              {has
                ? `yes, since song ${at}`
                : Number.isFinite(at)
                  ? `not yet: comes up on song ${at} (${plural(at - played, "song", "songs")} to go)`
                  : "not on this card"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The card itself, squares played filled in and complete rows outlined. */
function CardGrid({
  card,
  set,
  played,
  songsByN,
}: {
  card: BingoCard;
  set: CardSet;
  played: number;
  songsByN: Map<number, CallSong>;
}) {
  const progress = cardProgress(card, set, played);
  const inWin = new Set(progress.done.flatMap((l) => l.cells));
  return (
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
                {n === played && <span className="sr-only"> (just played)</span>}
              </>
            ) : (
              <span>Song {n}</span>
            )}
            <span className="sr-only">{marked ? ", played" : ", not played yet"}</span>
            {n === played && <span aria-hidden className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-sun" />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helps the host run the game and check a bingo call: how far the game is, when each
 * prize is won and by which cards (from the call list's answer key, or from the cards
 * once they've been read), whether a card really has a prize, and the songs played so
 * far by letter.
 */
export function ClaimChecker({ isAdmin = false }: { isAdmin?: boolean }) {
  const session = useShowSession();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<string | null>(null);
  const inputId = useId();

  const songs = useMemo(() => session?.callList?.songs ?? [], [session?.callList]);
  const answers = session?.callList?.answers ?? null;
  const cards = session?.cards ?? null;
  // The answer key is the game's own word on who wins when; the cards say the same.
  const judge = useMemo(() => (answers ? judgeFromAnswers(answers) : cards ? judgeFromCards(cards) : null), [answers, cards]);
  const songsByN = useMemo(() => new Map(songs.map((s) => [s.n, s])), [songs]);
  const played = session?.played ?? 0;
  const last = songsByN.get(played) ?? null;

  const byLetter = useMemo(() => {
    const groups = new Map<string, CallSong[]>(BINGO.split("").map((l) => [l, []]));
    for (const s of songs) if (s.n <= played) groups.get(s.letter)?.push(s);
    for (const list of groups.values()) list.sort((a, b) => a.title.localeCompare(b.title));
    return groups;
  }, [songs, played]);

  const prizes = useMemo(
    () =>
      judge
        ? judge.prizes.map((prize, p) => ({
            prize,
            first: nextPrizeWin(judge, p, 0),
            won: prizeWinners(judge, p, played),
            next: nextPrizeWin(judge, p, played),
            close: cards && prize.key ? oneAway(cards, prize.key, played).map((c) => c.id) : [],
          }))
        : [],
    [judge, cards, played],
  );

  if (!session || songs.length === 0) return null;
  const cardId = judge && checked ? findCardId(judge.ids, checked) : null;
  const card = cardId && cards ? (cards.cards.find((c) => c.id === cardId) ?? null) : null;
  const partOf = (n: number) => songsByN.get(n)?.part;

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();
  const step = (by: number) => session.setPlayed(Math.max(0, Math.min(songs.length, played + by)));

  const counter = (big: boolean) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm px-2.5"
        onClick={() => step(-1)}
        disabled={played === 0}
        aria-label="One song back"
      >
        <Minus size={16} aria-hidden />
      </button>
      <p className={`min-w-0 text-center ${big ? "flex-1" : ""}`}>
        <output className="display text-3xl tabular-nums" aria-live="polite">
          {played}
        </output>
        <span className="text-sm text-mist"> of {songs.length} played</span>
      </p>
      <button
        type="button"
        className={`btn btn-sm px-2.5 ${big ? "btn-sun" : "btn-ghost"}`}
        onClick={() => step(1)}
        disabled={played >= songs.length}
        aria-label="Next song"
      >
        <Plus size={16} aria-hidden />
      </button>
    </div>
  );

  const counterNote = session.following ? (
    "Following the player."
  ) : session.timed && session.hasPlayer ? (
    <button type="button" className="text-sun underline underline-offset-4" onClick={() => session.setPlayed(null)}>
      Follow the player again
    </button>
  ) : (
    "Press + as each song starts, or tap it on the call list."
  );

  return (
    <section className="panel mt-4 p-5 sm:p-6" aria-labelledby="checker-heading">
      <h2 id="checker-heading" className="flex items-center gap-2 font-sans text-lg font-bold">
        <BadgeCheck size={20} aria-hidden className="text-sun" /> Check a bingo
      </h2>

      <div className="mt-3">{counter(true)}</div>
      <p className="mt-1.5 text-center text-sm text-mist">
        {last ? (
          <>
            Song {last.n}
            {last.part ? ` (${last.part})` : ""}: <span className="text-white">{last.title}</span>
          </>
        ) : (
          "No songs played yet."
        )}
      </p>
      <p className="mt-1 text-center text-xs text-fog">{counterNote}</p>

      {judge && (
        <div className="mt-5">
          <h3 className="font-sans text-sm font-semibold text-mist">When prizes are won</h3>
          <ul className="mt-2 grid text-sm" aria-label="When each prize is won">
            {prizes.map(({ prize, first, won }, p) => (
              <li key={p} className="flex items-baseline justify-between gap-3 border-t border-line/70 py-1.5 first:border-0">
                <span className={`flex items-center gap-1.5 font-semibold ${won.length ? "text-ok" : ""}`}>
                  {won.length > 0 && <BadgeCheck size={15} aria-hidden className="shrink-0" />}
                  {prize.short}
                </span>
                <span className={`text-right ${won.length ? "text-ok" : "text-mist"}`}>
                  {first ? (
                    <>
                      {won.length ? "won on " : ""}song {first.at} · {cardsText(first.ids, 2)}
                    </>
                  ) : (
                    "nobody"
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={open} className="btn btn-sun mt-4 w-full">
        <Search size={17} aria-hidden /> {judge ? "Check a card" : "See songs played"}
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
              {counter(false)}
              {!session.following && session.timed && session.hasPlayer && (
                <button type="button" className="text-sm text-sun underline underline-offset-4" onClick={() => session.setPlayed(null)}>
                  Follow the player again
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-mist">
              {last ? (
                <>
                  Up to song {last.n}
                  {last.part ? ` (${last.part})` : ""}: <span className="text-white">{last.title}</span>.{" "}
                </>
              ) : (
                "Nothing played yet. "
              )}
              {session.following
                ? "Following the player. If your game is on the venue screen, set the last song played with − and +."
                : "Set this to the last song played in your game."}
            </p>
          </section>

          {judge ? (
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
                <p className="mt-2 text-sm text-fog">
                  Lines are rows across. The cross is both diagonals.
                  {judge.source === "answers" ? " Checked against the answer key on the call list." : ""}
                </p>
                {checked !== null && !cardId && (
                  <p className="alert alert-error mt-4" role="alert">
                    There&apos;s no card {checked.trim() || "with that number"} in this game. Check the number on the scorecard.
                  </p>
                )}
                {cardId && (
                  <div className="mt-5" aria-live="polite">
                    <h4 className="mb-3 font-sans font-bold">Card {cardId}</h4>
                    <CardStatus judge={judge} id={cardId} played={played} />
                    {card && cards && <CardGrid card={card} set={cards} played={played} songsByN={songsByN} />}
                  </div>
                )}
              </section>

              <section aria-labelledby="winners-heading">
                <h3 id="winners-heading" className="font-sans text-lg font-bold">
                  Who could be calling
                </h3>
                <ul className="mt-3 grid gap-3">
                  {prizes.map(({ prize, won, next, close: nearly }, p) => (
                    <li key={p} className="rounded-xl border border-line bg-ink/60 p-3">
                      <p className="font-semibold">{prize.label}</p>
                      <p className="mt-1 text-sm text-mist">
                        {won.length ? (
                          <span className="text-ok">
                            Won by{" "}
                            {won
                              .slice(0, 10)
                              .map((w) => `card ${w.id} (song ${w.at})`)
                              .join(", ")}
                            {won.length > 10 && ` and ${won.length - 10} more`}.
                          </span>
                        ) : (
                          "No card has it yet."
                        )}
                        {next && (
                          <span className="text-sun">
                            {" "}
                            Next: {cardsText(next.ids, 6)} on song {next.at}
                            {partOf(next.at) ? ` (${partOf(next.at)})` : ""}.
                          </span>
                        )}
                        {nearly.length > 0 && (
                          <span>
                            {" "}
                            One song away: {nearly.slice(0, 12).join(", ")}
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
                Card checking switches on when the call list has an answer key, or once this show&apos;s scorecards can be
                read. Until then, check a card against the songs below.
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
