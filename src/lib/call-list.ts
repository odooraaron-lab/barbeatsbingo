/**
 * Reads the songs off a show's call list PDF.
 *
 * The call lists look like this (two columns, blocks of 15):
 *
 *   Call List - Bar Bingo Rapid 01 (W4ZF)
 *   0:28                                  6:15
 *   [B] 1  0:28  Ed Sheeran - Photograph  [B] 16  6:15  Prince - Little Red Corvette
 *   [I] 2  0:51  Kris Kross - Jump        [I] 17  6:38  Sir Mix a Lot - Baby Got Back
 *
 * Each song has its bingo letter, its number in the call order, the time it starts in
 * the show video, and "Artist - Title". This works from the text and positions that
 * pdf.js gives us, so it runs the same in the browser and on the server.
 */

export const BINGO = "BINGO";

export type CallSong = {
  /** Position in the call order, from 1. */
  n: number;
  /** B, I, N, G or O: the card column it belongs to. */
  letter: string;
  /** When it starts in the show video (and the MP3), in seconds. */
  time: number;
  /** "Artist - Title", as printed. */
  title: string;
};

export type CallList = {
  /** The code printed after the show name, e.g. "W4ZF". Cards from the same game carry it too. */
  code: string | null;
  /** The heading, e.g. "Call List - Bar Bingo Rapid 01 (W4ZF)". */
  heading: string | null;
  songs: CallSong[];
};

/** Where a song sits on the PDF page: [left, bottom, right, top] in PDF units. */
export type PlacedSong = CallSong & { page: number; box: [number, number, number, number] };

/** The parts of a pdf.js text item this needs. */
export type PdfTextItem = { str: string; transform: number[]; width: number; height?: number };

type Token = { text: string; x0: number; x1: number; y: number; size: number };

const NUMBER = /^\d{1,3}$/;
const TIME = /^\d{1,2}:[0-5]\d(?::[0-5]\d)?$/;
const LETTER = /^[BINGO]$/;

export function parseClock(text: string): number {
  return text.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

/** 28 -> "0:28", 3725 -> "1:02:05" */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Splits a text item into words, estimating where each word sits. */
function tokensOf(item: PdfTextItem): Token[] {
  const str = item.str;
  if (!str || !str.trim()) return [];
  const [a, b, c, d, e, f] = item.transform;
  // Only straight, left-to-right text is part of a call list.
  if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01 || a <= 0) return [];
  const size = Math.abs(d) || item.height || 10;
  const charWidth = item.width > 0 ? item.width / str.length : size * 0.5;
  const tokens: Token[] = [];
  for (const m of str.matchAll(/\S+/g)) {
    const x0 = e + (m.index ?? 0) * charWidth;
    tokens.push({ text: m[0], x0, x1: x0 + m[0].length * charWidth, y: f, size });
  }
  return tokens;
}

function median(values: number[]) {
  const sorted = [...values].sort((x, y) => x - y);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 10;
}

/** Groups words into lines, top of the page first, each line left to right. */
function linesOf(tokens: Token[]): Token[][] {
  if (!tokens.length) return [];
  const tolerance = Math.max(1.5, median(tokens.map((t) => t.size)) * 0.4);
  const sorted = [...tokens].sort((p, q) => q.y - p.y || p.x0 - q.x0);
  const lines: Token[][] = [];
  let lineY = Number.NaN;
  for (const t of sorted) {
    if (lines.length && Math.abs(t.y - lineY) <= tolerance) {
      lines[lines.length - 1].push(t);
    } else {
      lines.push([t]);
      lineY = t.y;
    }
  }
  return lines.map((line) => line.sort((p, q) => p.x0 - q.x0));
}

function joinWords(tokens: Token[]) {
  let out = "";
  let prev: Token | null = null;
  for (const t of tokens) {
    if (prev && t.x0 - prev.x1 > prev.size * 0.12) out += " ";
    out += t.text;
    prev = t;
  }
  return out.trim();
}

/**
 * The song's letter box, if it's printed as text just before the song's number at `at`.
 * `from` is the first token that could still belong to it (not the previous song's time).
 */
function letterBoxBefore(line: Token[], at: number, from: number): Token | null {
  const before = line[at - 1];
  if (!before || at - 1 < from || !LETTER.test(before.text)) return null;
  const number = line[at];
  if (number.x0 - before.x1 > number.size * 3) return null;
  // Songs go B, I, N, G, O in turn, so the letter must match the number. A word of the
  // title that happens to be a single letter almost never does, and it would sit right
  // after the previous word rather than after a gap.
  if (before.text === BINGO[(Number(number.text) - 1) % 5]) return before;
  const prev = line[at - 2];
  return !prev || before.x0 - prev.x1 > number.size * 1.2 ? before : null;
}

type Entry = {
  n: number;
  letter: string | null;
  time: number;
  start: number; // x where the entry begins (its letter box or number)
  titleStart: number;
  words: Token[];
  y: number;
  size: number;
  page: number;
};

/**
 * Reads a call list from the text items of each page (as pdf.js `getTextContent` gives them).
 * Returns null if it doesn't look like a call list.
 */
export function parseCallList(pages: PdfTextItem[][]): { list: CallList; placed: PlacedSong[] } | null {
  const entries: Entry[] = [];
  let heading: string | null = null;

  pages.forEach((items, pageIndex) => {
    const lines = linesOf(items.flatMap(tokensOf));
    let lastLine: { entries: Entry[]; y: number; size: number } | null = null;

    for (const line of lines) {
      const anchors: number[] = [];
      for (let i = 0; i + 1 < line.length; i++) {
        if (NUMBER.test(line[i].text) && TIME.test(line[i + 1].text)) anchors.push(i);
      }

      if (!anchors.length) {
        const text = joinWords(line);
        if (line.every((t) => TIME.test(t.text))) continue; // block headings like "0:28"
        if (!heading && pageIndex === 0 && !entries.length && /[a-z]/i.test(text)) {
          heading = text;
          continue;
        }
        // A long title that wrapped onto the next line: add it to the song above it.
        if (lastLine && lastLine.y - line[0].y <= lastLine.size * 2.4) {
          for (const t of line) {
            const owner = [...lastLine.entries].reverse().find((e) => t.x0 >= e.titleStart - 1);
            owner?.words.push(t);
          }
        }
        continue;
      }

      const lineEntries: Entry[] = [];
      anchors.forEach((at, k) => {
        const numberToken = line[at];
        // The letter box just before the number belongs to this song.
        const ownLetter = letterBoxBefore(line, at, k > 0 ? anchors[k - 1] + 2 : 0);
        const next = anchors[k + 1];
        let end = next ?? line.length;
        if (next !== undefined && letterBoxBefore(line, next, at + 2)) end = next - 1;
        const words = line.slice(at + 2, end);
        const n = Number(numberToken.text);
        lineEntries.push({
          n,
          letter: ownLetter?.text ?? null,
          time: parseClock(line[at + 1].text),
          start: (ownLetter ?? numberToken).x0,
          titleStart: words[0]?.x0 ?? line[at + 1].x1,
          words,
          y: numberToken.y,
          size: Math.max(numberToken.size, ...words.map((w) => w.size)),
          page: pageIndex + 1,
        });
      });
      entries.push(...lineEntries);
      lastLine = { entries: lineEntries, y: line[0].y, size: median(line.map((t) => t.size)) };
    }
  });

  // Keep the first of any repeated number; sort by call order.
  const seen = new Set<number>();
  const unique = entries
    .filter((e) => e.n > 0 && !seen.has(e.n) && seen.add(e.n) && e.words.length > 0)
    .sort((p, q) => p.n - q.n);
  if (unique.length < 5) return null;

  const placed: PlacedSong[] = unique.map((e) => {
    const right = Math.max(...e.words.map((w) => w.x1));
    const lowest = Math.min(e.y, ...e.words.map((w) => w.y));
    return {
      n: e.n,
      letter: e.letter ?? BINGO[(e.n - 1) % 5],
      time: e.time,
      title: joinWords([...e.words].sort((p, q) => q.y - p.y || p.x0 - q.x0)),
      page: e.page,
      box: [e.start - e.size * 0.25, lowest - e.size * 0.35, right + e.size * 0.25, e.y + e.size * 0.95],
    };
  });

  const code = (heading as string | null)?.match(/\(([A-Z0-9]{3,8})\)\s*$/)?.[1] ?? null;
  return {
    list: { code, heading, songs: placed.map(({ n, letter, time, title }) => ({ n, letter, time, title })) },
    placed,
  };
}

/** The song playing at `time` seconds into the file: the index into `songs`, or -1 before the first. */
export function songAt(songs: CallSong[], time: number): number {
  let found = -1;
  for (let i = 0; i < songs.length; i++) {
    if (songs[i].time <= time + 0.25) {
      if (found < 0 || songs[i].time >= songs[found].time) found = i;
    }
  }
  return found;
}
