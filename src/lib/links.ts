import "server-only";

const USER_AGENT = "Mozilla/5.0 (compatible; BarBeatsBingoPortal/1.0)";

export type LinkCheck = {
  reachable: boolean;
  isHtml: boolean;
  isPdf: boolean;
  fileName: string | null;
  size: number | null;
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

/**
 * Fetches the first couple of KB of a link to see what customers will get:
 * a real file (and its name and size) or a web page.
 */
export async function checkLink(url: string): Promise<LinkCheck> {
  const empty: LinkCheck = { reachable: false, isHtml: false, isPdf: false, fileName: null, size: null };
  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-4095", "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return empty;

    let head = Buffer.alloc(0);
    if (res.body) {
      const reader = res.body.getReader();
      while (head.length < 4096) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        head = Buffer.concat([head, Buffer.from(value)]);
      }
      await reader.cancel().catch(() => {});
    }

    const type = res.headers.get("content-type") ?? "";
    const range = res.headers.get("content-range")?.match(/\/(\d+)$/);
    const length = res.status === 200 ? Number(res.headers.get("content-length")) : NaN;
    return {
      reachable: true,
      isHtml: type.includes("text/html") || looksLikeHtml(head),
      isPdf: type.includes("pdf") || looksLikePdf(head),
      fileName: fileNameFrom(res.headers.get("content-disposition")),
      size: range ? Number(range[1]) : Number.isFinite(length) && length > 0 ? length : null,
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
