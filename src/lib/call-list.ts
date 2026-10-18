/**
 * Reads the songs (and the answer key, if it has one) off a show's call list PDF.
 *
 * Call lists come in two layouts. Some print when each song starts in the show video
 * (two columns, blocks of 15, headed by the block's start time):
 *
 *   Call List - Bar Bingo Rapid 01 (W4ZF)
 *   0:28                                  6:15
 *   [B] 1  0:28  Ed Sheeran - Photograph  [B] 16  6:15  Prince - Little Red Corvette
 *
 * Others list the songs in blocks by video, without times, and add an answer key:
 * the song each card first gets each prize on.
 *
 *   Call List - Beats Bingo BAR FAVS 75 (AQYR)
 *   Video 1                               Video 2
 *   B 1 Ksi - Voices (Ft Oliver Tree)     B 16 Shawn Mendes - Why Why Why
 *   …
 *   Answer Key - Beats Bingo BAR FAVS 75 (AQYR) Cards 001-060
 *   Card  1 Line  2 Lines  3 Lines  Cross  Blackout   Card  1 Line …
 *   001   31      49       60       72     72         031   49     …
 *
 * Each song has its bingo letter, its number in the call order and "Artist - Title".
 * This works from the text and positions that pdf.js gives us, so it runs the same in
 * the browser and on the server.
 */

export const BINGO = "BINGO";

export type CallSong = {
  /** Position in the call order, from 1. */
  n: number;
  /** B, I, N, G or O: the card column it belongs to. */
  letter: string;
  /** When it starts in the show video (and the MP3), in seconds; null if the call list doesn't say. */
  time: number | null;
  /** "Artist - Title", as printed. */
  title: string;
  /** The part of the show it's in, as printed ("Video 2"), when the call list is split up that way. */
  part?: string;
};

/**
 * The answer key printed with some call lists: for each card, the song it first has
 * each prize on.
 */
export type AnswerKey = {
  /** The prizes, as printed: "1 Line", "2 Lines", "3 Lines", "Cross", "Blackout". */
  prizes: string[];
  /** Each card's number as printed ("001"), and for each prize the song number (null if never). */
  cards: { id: string; at: (number | null)[] }[];
};

export type CallList = {
  /** The code printed after the show name, e.g. "W4ZF". Cards from the same game carry it too. */
  code: string | null;
  /** The heading, e.g. "Call List - Bar Bingo Rapid 01 (W4ZF)". */
  heading: string | null;
  songs: CallSong[];
  /** The answer key, if the call list has one (null if it hasn't; missing if it was read before we looked). */
  answers?: AnswerKey | null;
};

/** Where a song sits on the PDF page: [left, bottom, right, top] in PDF units. */
export type PlacedSong = CallSong & { page: number; box: [number, number, number, number] };

/** The parts of a pdf.js text item this needs. */
export type PdfTextItem = { str: string; transform: number[]; width: number; height?: number };

type Token = { text: string; x0: number; x1: number; y: number; size: number };

const NUMBER = /^\d{1,3}$/;
const TIME = /^\d{1,2}:[0-5]\d(?::[0-5]\d)?$/;
const LETTER = /^[BINGO]$/;
/** Block headings that split a show into parts: "Video 2", "Part 3". */
const SECTION = /^(video|part|round|set)$/i;

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

/** True when the call list says when each song starts, so it can follow the player. */
export function hasTimes(songs: CallSong[]): boolean {
  return songs.length > 0 && songs.every((s) => s.time !== null);
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

/** Words that sit close together, as one phrase each ("1 Line", "Blackout"). */
function phrasesOf(line: Token[]): Token[][] {
  const phrases: Token[][] = [];
  for (const t of line) {
    const last = phrases[phrases.length - 1];
    const prev = last?.[last.length - 1];
    if (prev && t.x0 - prev.x1 < Math.max(prev.size, t.size) * 0.6) last.push(t);
    else phrases.push([t]);
  }
  return phrases;
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

/**
 * A song in a line: where its number is, whether its start time follows the number
 * ("B 1 0:28 Ksi - Voices"), and where its letter box is, if printed as text.
 */
type Anchor = { at: number; timed: boolean; letter: number | null };

function anchorsOf(line: Token[]): Anchor[] {
  const found: (Anchor & { lettered: boolean })[] = [];
  for (let i = 0; i + 1 < line.length; i++) {
    if (!NUMBER.test(line[i].text)) continue;
    const n = Number(line[i].text);
    // Songs go B, I, N, G, O in turn, so a song's letter box matches its number.
    const lettered = n > 0 && i > 0 && line[i - 1].text === BINGO[(n - 1) % 5];
    const timed = TIME.test(line[i + 1].text);
    if (lettered || timed) found.push({ at: i, timed, letter: lettered ? i - 1 : null, lettered });
  }
  // Where the letters are printed, every song has one, so a number inside a title
  // ("9 To 5", then a start time) isn't taken for a song.
  if (found.some((a) => a.lettered)) {
    return found.filter((a) => a.lettered).map((a) => ({ at: a.at, timed: a.timed, letter: a.letter }));
  }
  // Letters drawn as shapes: each song's number is followed by its start time.
  const anchors: Anchor[] = [];
  for (const a of found) {
    if (!a.timed) continue;
    const prev = anchors[anchors.length - 1];
    const letter = letterBoxBefore(line, a.at, prev ? prev.at + 2 : 0);
    anchors.push({ at: a.at, timed: true, letter: letter ? a.at - 1 : null });
  }
  return anchors;
}

type Entry = {
  n: number;
  letter: string | null;
  time: number | null;
  /** A time printed after the title: the song's start if the call list has times, else part of the title ("4:44"). */
  trailing: Token | null;
  start: number; // x where the entry begins (its letter box or number, or a time printed first)
  end: number; // x where it ends, if something (its time) sits after the title
  titleStart: number;
  words: Token[];
  y: number;
  size: number;
  page: number;
};

type Section = { label: string; x0: number; y: number; page: number };

/**
 * Reads a call list from the text items of each page (as pdf.js `getTextContent` gives them).
 * Returns null if it doesn't look like a call list.
 */
export function parseCallList(pages: PdfTextItem[][]): { list: CallList; placed: PlacedSong[] } | null {
  const entries: Entry[] = [];
  const sections: Section[] = [];
  let heading: string | null = null;

  pages.forEach((items, pageIndex) => {
    const lines = linesOf(items.flatMap(tokensOf));
    let lastLine: { entries: Entry[]; y: number; size: number } | null = null;

    for (const line of lines) {
      const anchors = anchorsOf(line);

      if (!anchors.length) {
        const text = joinWords(line);
        if (line.every((t) => TIME.test(t.text))) continue; // block headings like "0:28"
        // Block headings like "Video 1        Video 2"
        if (line.length % 2 === 0 && line.every((t, i) => (i % 2 ? NUMBER.test(t.text) : SECTION.test(t.text)))) {
          for (let i = 0; i < line.length; i += 2) {
            sections.push({ label: `${line[i].text} ${line[i + 1].text}`, x0: line[i].x0, y: line[i].y, page: pageIndex + 1 });
          }
          lastLine = null;
          continue;
        }
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

      // "0:28 B 1 Ksi - Voices": each song's start time is printed before its letter.
      const timeFirst = !anchors[0].timed && anchors[0].letter === 1 && TIME.test(line[0].text);
      const leadingTime = (a: Anchor | undefined) =>
        timeFirst && a?.letter && TIME.test(line[a.letter - 1]?.text ?? "") ? line[a.letter - 1] : null;

      const lineEntries: Entry[] = anchors.map((a, k) => {
        const next = anchors[k + 1];
        let end = next ? (next.letter ?? next.at) : line.length;
        if (leadingTime(next)) end -= 1;
        const from = a.at + (a.timed ? 2 : 1);
        let words = line.slice(from, end);
        const numberToken = line[a.at];
        const letterToken = a.letter !== null ? line[a.letter] : null;
        const lead = leadingTime(a);
        const last = words[words.length - 1];
        const trailing = !a.timed && !lead && words.length > 1 && TIME.test(last.text) ? last : null;
        if (trailing) words = words.slice(0, -1);
        const time = a.timed ? parseClock(line[a.at + 1].text) : lead ? parseClock(lead.text) : null;
        return {
          n: Number(numberToken.text),
          letter: letterToken?.text ?? null,
          time,
          trailing,
          start: (lead ?? letterToken ?? numberToken).x0,
          end: trailing?.x1 ?? 0,
          titleStart: words[0]?.x0 ?? line[from - 1].x1,
          words,
          y: numberToken.y,
          size: Math.max(numberToken.size, ...words.map((w) => w.size)),
          page: pageIndex + 1,
        };
      });
      entries.push(...lineEntries);
      lastLine = { entries: lineEntries, y: line[0].y, size: median(line.map((t) => t.size)) };
    }
  });

  // A call list either has times for all its songs or for none.
  const withTimes = entries.filter((e) => e.time !== null || e.trailing).length > entries.length / 2;
  for (const e of entries) {
    if (!e.trailing) continue;
    if (withTimes) e.time = parseClock(e.trailing.text);
    else e.words.push(e.trailing); // part of the title after all
  }
  // Keep the first of any repeated number; sort by call order. In a call list with
  // times, a letter and number inside a title isn't a song.
  const seen = new Set<number>();
  const unique = entries
    .filter((e) => e.n > 0 && (!withTimes || e.time !== null) && !seen.has(e.n) && seen.add(e.n) && e.words.length > 0)
    .sort((p, q) => p.n - q.n);
  if (unique.length < 5) return null;
  // The player can only follow times that run in order through the show (not, say,
  // times that start again for each video).
  const timed = withTimes && unique.every((e, i) => i === 0 || (e.time ?? 0) >= (unique[i - 1].time ?? 0));

  // Each song belongs to the nearest block heading above it, in its column.
  const partOf = (e: Entry) => {
    let best: Section | null = null;
    for (const s of sections) {
      if (s.page !== e.page || s.y <= e.y || Math.abs(s.x0 - e.start) > e.size * 4) continue;
      if (!best || s.y < best.y) best = s;
    }
    return best?.label;
  };

  const placed: PlacedSong[] = unique.map((e) => {
    const right = Math.max(e.end, ...e.words.map((w) => w.x1));
    const lowest = Math.min(e.y, ...e.words.map((w) => w.y));
    const part = partOf(e);
    return {
      n: e.n,
      letter: e.letter ?? BINGO[(e.n - 1) % 5],
      time: timed ? e.time : null,
      title: joinWords([...e.words].sort((p, q) => q.y - p.y || p.x0 - q.x0)),
      ...(part ? { part } : {}),
      page: e.page,
      box: [e.start - e.size * 0.25, lowest - e.size * 0.35, right + e.size * 0.25, e.y + e.size * 0.95],
    };
  });

  const code = (heading as string | null)?.match(/\(([A-Z0-9]{3,8})\)\s*$/)?.[1] ?? null;
  return {
    list: {
      code,
      heading,
      songs: placed.map(({ n, letter, time, title, part }) => (part ? { n, letter, time, title, part } : { n, letter, time, title })),
      answers: parseAnswerKey(pages, placed.length),
    },
    placed,
  };
}

/**
 * Reads the answer key: a header row naming the prizes after "Card", then a row per card
 * (often two cards side by side). Each number belongs to the heading it sits under.
 */
export function parseAnswerKey(pages: PdfTextItem[][], songCount = 0): AnswerKey | null {
  const prizes: string[] = [];
  const cards: AnswerKey["cards"] = [];
  const seen = new Set<string>();

  for (const items of pages) {
    type Column = { x: number; prize: number | null }; // prize null: the card number column
    let columns: Column[] | null = null;
    for (const line of linesOf(items.flatMap(tokensOf))) {
      const phrases = phrasesOf(line);
      if (/^card$/i.test(phrases[0][0].text) && phrases[0].length === 1 && phrases.length >= 2) {
        // The heading row: "Card  1 Line  2 Lines  …  Card  1 Line …"
        columns = phrases.map((p) => {
          const name = joinWords(p);
          const x = (p[0].x0 + p[p.length - 1].x1) / 2;
          if (/^card$/i.test(name)) return { x, prize: null };
          let index = prizes.findIndex((known) => known.toLowerCase() === name.toLowerCase());
          if (index < 0) index = prizes.push(name) - 1;
          return { x, prize: index };
        });
        continue;
      }
      if (!columns || !line.every((t) => NUMBER.test(t.text) || /^[-–—]$/.test(t.text))) continue;
      let card: AnswerKey["cards"][number] | null = null;
      for (const t of line) {
        const x = (t.x0 + t.x1) / 2;
        const column = columns.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
        if (column.prize === null) {
          card = seen.has(t.text) ? null : { id: t.text, at: [] };
          if (card) {
            seen.add(t.text);
            cards.push(card);
          }
        } else if (card && NUMBER.test(t.text)) {
          const song = Number(t.text);
          if (song > 0 && (!songCount || song <= songCount)) card.at[column.prize] = song;
        }
      }
    }
  }

  if (!prizes.length || cards.length < 2) return null;
  return {
    prizes,
    cards: cards
      .map((c) => ({ id: c.id, at: prizes.map((_, i) => c.at[i] ?? null) }))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
  };
}

/** The song playing at `time` seconds into the file: the index into `songs`, or -1 before the first (or without times). */
export function songAt(songs: CallSong[], time: number): number {
  let found = -1;
  for (let i = 0; i < songs.length; i++) {
    const start = songs[i].time;
    if (start !== null && start <= time + 0.25) {
      if (found < 0 || start >= (songs[found].time ?? 0)) found = i;
    }
  }
  return found;
}
