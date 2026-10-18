/**
 * The card checker: works out which bingo cards have a winning pattern after a
 * given number of songs, and when each card first got it.
 *
 * Songs are called in the order of the call list, so "after k songs" means songs
 * 1..k have played. A card stores, for each square, the call-list number of its
 * song (null for a free square), row by row.
 *
 * A "line" is a row across the card (Bar Beats Bingo rules): 1, 2 or 3 lines, the
 * cross (both diagonals, a bonus pattern) and blackout (every square). The answer
 * keys printed with call lists use the same rules, so either can say who has won.
 */

import type { AnswerKey } from "./call-list";

export type BingoCard = {
  /** The number printed on the card, e.g. "12". */
  id: string;
  /** rows × cols squares, row by row: the song's call-list number, or null for a free square. */
  cells: (number | null)[];
};

export type CardSet = {
  /** The game code printed on the cards (matches the call list's), if any. */
  code: string | null;
  rows: number;
  cols: number;
  cards: BingoCard[];
};

export type PatternKey = "line" | "twoLines" | "threeLines" | "cross" | "blackout";

export const PATTERNS: { key: PatternKey; label: string; short: string }[] = [
  { key: "line", label: "1 line", short: "1 line" },
  { key: "twoLines", label: "2 lines", short: "2 lines" },
  { key: "threeLines", label: "3 lines", short: "3 lines" },
  { key: "cross", label: "The cross (X)", short: "Cross" },
  { key: "blackout", label: "Blackout (full card)", short: "Blackout" },
];

type Line = { kind: "row" | "diagonal"; index: number; cells: number[] };

export type CardProgress = {
  /** For each square: true if its song has played (or it's a free square). */
  marked: boolean[];
  /** Rows that are complete, in the order they finished. */
  done: { index: number; at: number; cells: number[] }[];
  /** After how many songs each pattern was first complete (Infinity if not yet). */
  firstAt: Record<PatternKey, number>;
  /** How many more of its songs the card needs for each pattern, at this point. */
  needs: Record<PatternKey, number>;
};

const NEVER = Number.POSITIVE_INFINITY;

function rowsOf(rows: number, cols: number): Line[] {
  return Array.from({ length: rows }, (_, r) => ({
    kind: "row" as const,
    index: r,
    cells: Array.from({ length: cols }, (_, c) => r * cols + c),
  }));
}

function diagonals(size: number): Line[] {
  return [
    { kind: "diagonal", index: 0, cells: Array.from({ length: size }, (_, i) => i * size + i) },
    { kind: "diagonal", index: 1, cells: Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)) },
  ];
}

/** When a square is marked: free squares from the start, others once their song has played. */
const markedAt = (cell: number | null) => (cell === null ? 0 : cell > 0 ? cell : NEVER);

/** The k-th smallest value (1-based), or Infinity if there aren't that many. */
function nth(values: number[], k: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length >= k ? sorted[k - 1] : NEVER;
}

/** Sum of the k smallest values (how many songs a card still needs for k lines). */
function sumSmallest(values: number[], k: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length >= k ? sorted.slice(0, k).reduce((a, b) => a + b, 0) : NEVER;
}

/** Where a card stands after `played` songs. */
export function cardProgress(card: BingoCard, set: Pick<CardSet, "rows" | "cols">, played: number): CardProgress {
  const when = card.cells.map(markedAt);
  const marked = when.map((t) => t <= played);
  const rows = rowsOf(set.rows, set.cols);
  const rowDone = rows.map((l) => Math.max(...l.cells.map((i) => when[i])));
  const rowMissing = rows.map((l) => l.cells.filter((i) => !marked[i]).length);

  const crossCells =
    set.rows === set.cols ? [...new Set(diagonals(set.rows).flatMap((d) => d.cells))] : [];
  const crossDone = crossCells.length ? Math.max(...crossCells.map((i) => when[i])) : NEVER;
  const blackoutDone = Math.max(...when);

  const done = rows
    .map((l, i) => ({ index: l.index, at: rowDone[i], cells: l.cells }))
    .filter((l) => l.at <= played)
    .sort((a, b) => a.at - b.at);

  return {
    marked,
    done,
    firstAt: {
      line: nth(rowDone, 1),
      twoLines: nth(rowDone, 2),
      threeLines: nth(rowDone, 3),
      cross: crossDone,
      blackout: blackoutDone,
    },
    needs: {
      // Rows never share squares, so what's missing from the closest rows adds up exactly.
      line: sumSmallest(rowMissing, 1),
      twoLines: sumSmallest(rowMissing, 2),
      threeLines: sumSmallest(rowMissing, 3),
      cross: crossCells.filter((i) => !marked[i]).length,
      blackout: marked.filter((m) => !m).length,
    },
  };
}

export type Winner = { card: BingoCard; at: number };

/** Cards that have `pattern` after `played` songs, earliest first. */
export function winners(set: CardSet, pattern: PatternKey, played: number): Winner[] {
  return set.cards
    .map((card) => ({ card, at: cardProgress(card, set, played).firstAt[pattern] }))
    .filter((w) => w.at <= played)
    .sort((a, b) => a.at - b.at || compareIds(a.card.id, b.card.id));
}

/** Cards that are one song away from `pattern`. */
export function oneAway(set: CardSet, pattern: PatternKey, played: number): BingoCard[] {
  return set.cards
    .filter((card) => {
      const p = cardProgress(card, set, played);
      return p.firstAt[pattern] > played && p.needs[pattern] === 1;
    })
    .sort((a, b) => compareIds(a.id, b.id));
}

/** Card numbers sort as numbers where they are numbers. */
export function compareIds(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

const plainId = (id: string) => id.trim().replace(/^(card|#)\s*/i, "").replace(/^0+(?=\d)/, "").toLowerCase();

/** Finds a card number among `ids` from what the host typed ("12", "#12", "card 12", "012"). */
export function findCardId(ids: string[], typed: string): string | null {
  const want = plainId(typed);
  if (!want) return null;
  return ids.find((id) => plainId(id) === want) ?? null;
}

/** Finds a card by what the host typed ("12", "#12", "card 12", "012"). */
export function findCard(set: CardSet, typed: string): BingoCard | null {
  const id = findCardId(
    set.cards.map((c) => c.id),
    typed,
  );
  return set.cards.find((c) => c.id === id) ?? null;
}

/** A prize the game plays for, as the checker names it. */
export type Prize = { key: PatternKey | null; label: string; short: string };

const PRIZE_NAMES: [RegExp, PatternKey][] = [
  [/^(1|one)\s*line$/i, "line"],
  [/^(2|two)\s*lines$/i, "twoLines"],
  [/^(3|three)\s*lines$/i, "threeLines"],
  [/^(the\s*)?(cross|x)$/i, "cross"],
  [/^(blackout|full\s*house|full\s*card|coverall)$/i, "blackout"],
];

/** The prize an answer key's column is for ("1 Line", "Cross", "Full House"…). */
export function prizeNamed(name: string): Prize {
  const key = PRIZE_NAMES.find(([re]) => re.test(name.trim()))?.[1] ?? null;
  const known = PATTERNS.find((p) => p.key === key);
  return known ? { key: known.key, label: known.label, short: known.short } : { key: null, label: name, short: name };
}

/**
 * Who wins each prize, and on which song: from the answer key printed with the call
 * list, or worked out from the cards themselves.
 */
export type Judge = {
  source: "answers" | "cards";
  prizes: Prize[];
  /** Every card number in the game. */
  ids: string[];
  /** The song card `id` first has prize `p` (an index into `prizes`) on; Infinity if never. */
  winAt: (id: string, p: number) => number;
};

export function judgeFromAnswers(key: AnswerKey): Judge {
  const byId = new Map(key.cards.map((c) => [c.id, c.at]));
  return {
    source: "answers",
    prizes: key.prizes.map(prizeNamed),
    ids: key.cards.map((c) => c.id),
    winAt: (id, p) => byId.get(id)?.[p] ?? NEVER,
  };
}

export function judgeFromCards(set: CardSet): Judge {
  const firsts = new Map(set.cards.map((c) => [c.id, cardProgress(c, set, NEVER).firstAt]));
  return {
    source: "cards",
    prizes: PATTERNS.map(({ key, label, short }) => ({ key, label, short })),
    ids: set.cards.map((c) => c.id),
    winAt: (id, p) => firsts.get(id)?.[PATTERNS[p].key] ?? NEVER,
  };
}

/** Cards that have prize `p` after `played` songs, earliest first. */
export function prizeWinners(judge: Judge, p: number, played: number): { id: string; at: number }[] {
  return judge.ids
    .map((id) => ({ id, at: judge.winAt(id, p) }))
    .filter((w) => w.at <= played)
    .sort((a, b) => a.at - b.at || compareIds(a.id, b.id));
}

/** The next song after `played` that gives a card prize `p`, and which cards; null if none will. */
export function nextPrizeWin(judge: Judge, p: number, played: number): { at: number; ids: string[] } | null {
  let at = NEVER;
  for (const id of judge.ids) {
    const t = judge.winAt(id, p);
    if (t > played && t < at) at = t;
  }
  if (!Number.isFinite(at)) return null;
  return { at, ids: judge.ids.filter((id) => judge.winAt(id, p) === at).sort(compareIds) };
}
