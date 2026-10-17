import "server-only";
import { id3Size, mp3Duration } from "./mp3";
import { parseCallList, type CallList } from "./call-list";
import { pdfTextPages } from "./pdf-text";

const USER_AGENT = "Mozilla/5.0 (compatible; BarBeatsBingoPortal/1.0)";

export type LinkCheck = {
  reachable: boolean;
  isHtml: boolean;
  isPdf: boolean;
  fileName: string | null;
  size: number | null;
  /** The type the link says it is, e.g. "audio/mpeg". */
  contentType: string;
  /** Phones can stream it straight from the link: it supports byte ranges and has an audio/video type. */
  streamDirect: boolean;
  /** The link answers byte-range requests (needed to relay a big file a piece at a time). */
  byteRanges: boolean;
  /** Playing time, for MP3s. */
  durationSeconds: number | null;
};

function fileNameFrom(disposition: string | null) {
  if (!disposition) return null;
  const star = disposition.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through */
    }
  }
  const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
}

function looksLikePdf(head: Buffer) {
  return head.subarray(0, 1024).includes("%PDF-");
}

function looksLikeHtml(head: Buffer) {
  return /<!doctype html|<html[\s>]/i.test(head.subarray(0, 2048).toString("latin1"));
}

function looksLikeMp3(head: Buffer, type: string, fileName: string | null) {
  return (
    /audio\/(mpeg|mp3)/.test(type) ||
    /\.mp3$/i.test(fileName ?? "") ||
    head.subarray(0, 3).toString("latin1") === "ID3" ||
    (head[0] === 0xff && (head[1] & 0xe6) === 0xe2)
  );
}

/** Reads `length` bytes of a link starting at `offset`. */
async function readRange(url: string, offset: number, length: number) {
  const res = await fetch(url, {
    headers: { Range: `bytes=${offset}-${offset + length - 1}`, "User-Agent": USER_AGENT, "Accept-Encoding": "identity" },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  let head = Buffer.alloc(0);
  if (res.ok && res.body) {
    const reader = res.body.getReader();
    while (head.length < length) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      head = Buffer.concat([head, Buffer.from(value)]);
    }
    await reader.cancel().catch(() => {});
  }
  return { res, head: head.subarray(0, length) };
}

async function readMp3Duration(url: string, head: Buffer, size: number | null, rangeOk: boolean) {
  if (!size) return null;
  const tag = id3Size(head);
  let audio = head.subarray(Math.min(tag, head.length));
  // A large tag (e.g. cover art) pushes the first frame past what we read.
  if (audio.length < 512 && rangeOk && tag < size) {
    audio = (await readRange(url, tag, 4096)).head;
  }
  const seconds = mp3Duration(audio, size - tag);
  return seconds && Number.isFinite(seconds) ? Math.round(seconds * 100) / 100 : null;
}

/**
 * Fetches the first few KB of a link to see what customers will get:
 * a real file (its name, size and, for MP3s, length) or a web page.
 */
export async function checkLink(url: string): Promise<LinkCheck> {
  const empty: LinkCheck = {
    reachable: false,
    isHtml: false,
    isPdf: false,
    fileName: null,
    size: null,
    contentType: "",
    streamDirect: false,
    byteRanges: false,
    durationSeconds: null,
  };
  try {
    const { res, head } = await readRange(url, 0, 4096);
    if (!res.ok) return empty;

    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    const range = res.headers.get("content-range")?.match(/\/(\d+)$/);
    const length = res.status === 200 ? Number(res.headers.get("content-length")) : NaN;
    const size = range ? Number(range[1]) : Number.isFinite(length) && length > 0 ? length : null;
    const rangeOk = res.status === 206 && !!range;
    const fileName = fileNameFrom(res.headers.get("content-disposition"));
    const isHtml = type.includes("text/html") || looksLikeHtml(head);
    return {
      reachable: true,
      isHtml,
      isPdf: type.includes("pdf") || looksLikePdf(head),
      fileName,
      size,
      contentType: type.split(";")[0].trim(),
      streamDirect: rangeOk && /^(audio|video)\//.test(type),
      byteRanges: rangeOk,
      durationSeconds:
        !isHtml && looksLikeMp3(head, type, fileName) ? await readMp3Duration(url, head, size, rangeOk) : null,
    };
  } catch {
    return empty;
  }
}

const MAX_PDF_BYTES = 30 * 1024 * 1024;

/** Downloads a PDF for display on a page. Throws if the link doesn't return a PDF. */
export async function fetchPdf(url: string): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok || !res.body) throw new Error(`The link returned ${res.status}`);

  const reader = res.body.getReader();
  let head = Buffer.alloc(0);
  while (head.length < 1024) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    head = Buffer.concat([head, Buffer.from(value)]);
  }
  if (!looksLikePdf(head)) {
    await reader.cancel().catch(() => {});
    throw new Error("The link didn't return a PDF");
  }

  let sent = head.length;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(head));
    },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done || !value) return controller.close();
      sent += value.length;
      if (sent > MAX_PDF_BYTES) {
        await reader.cancel().catch(() => {});
        return controller.error(new Error("PDF is too large to display"));
      }
      controller.enqueue(value);
    },
    cancel() {
      return reader.cancel();
    },
  });
}

/** Downloads a PDF from a link into memory (up to 30 MB). */
export async function fetchPdfBytes(url: string): Promise<Uint8Array> {
  const reader = (await fetchPdf(url)).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Reads the songs off a call list PDF link. Null if it can't be read or isn't a call list. */
export async function readCallList(url: string): Promise<CallList | null> {
  try {
    const pages = await pdfTextPages(await fetchPdfBytes(url), 20);
    return parseCallList(pages)?.list ?? null;
  } catch (err) {
    console.error("[links] could not read call list", err);
    return null;
  }
}
