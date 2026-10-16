/**
 * The card checker: works out which bingo cards have a winning pattern after a
 * given number of songs, and when each card first got it.
 *
 * Songs are called in the order of the call list, so "after k songs" means songs
 * 1..k have played. A card stores, for each square, the call-list number of its
 * song (null for a free square), row by row.
 *
 * A "line" is a row across the card (Bar Beats Bingo rules): 1, 2 or 3 lines, the
 * cross (both diagonals, a bonus pattern) and blackout (every square).
 */

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

/** Finds a card by what the host typed ("12", "#12", "card 12", "012"). */
export function findCard(set: CardSet, typed: string): BingoCard | null {
  const want = typed.trim().replace(/^(card|#)\s*/i, "").replace(/^0+(?=\d)/, "").toLowerCase();
  if (!want) return null;
  return set.cards.find((c) => c.id.replace(/^0+(?=\d)/, "").toLowerCase() === want) ?? null;
}
