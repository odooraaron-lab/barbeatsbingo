import "server-only";

/**
 * Relays a byte range of an audio file from its link to the browser.
 *
 * iPhones only play audio that is served in byte ranges ("206 Partial Content")
 * with an audio type. When a share link doesn't do that, the player's audio goes
 * through here instead: we ask the link for the range, or cut it out ourselves if
 * the link only sends whole files, and label it as audio.
 *
 * Each answer is at most CHUNK bytes, which keeps it under Vercel's response size
 * limit; browsers ask for the next piece as they play.
 */

const CHUNK = 4 * 1024 * 1024;
const USER_AGENT = "Mozilla/5.0 (compatible; BarBeatsBingoPortal/1.0)";

const AUDIO_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

export function audioTypeFor(fileName: string) {
  return AUDIO_TYPES[fileName.split(".").pop()?.toLowerCase() ?? ""] ?? "audio/mpeg";
}

/** Parses a single "bytes=start-end" range. Suffix and multi-part ranges aren't used by media players. */
function parseRange(header: string | null) {
  const m = header?.match(/^bytes=(\d+)-(\d*)\s*$/);
  if (!m) return null;
  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : null;
  if (!Number.isSafeInteger(start) || (end !== null && (!Number.isSafeInteger(end) || end < start))) return null;
  return { start, end };
}

/** Passes on `length` bytes of `body` after skipping the first `skip`, then stops reading. */
function slice(body: ReadableStream<Uint8Array>, skip: number, length: number): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let toSkip = skip;
  let left = length;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        if (left <= 0) {
          controller.close();
          await reader.cancel().catch(() => {});
          return;
        }
        const { done, value } = await reader.read();
        if (done || !value) {
          controller.close();
          return;
        }
        let chunk = value;
        if (toSkip > 0) {
          if (chunk.length <= toSkip) {
            toSkip -= chunk.length;
            continue;
          }
          chunk = chunk.subarray(toSkip);
          toSkip = 0;
        }
        if (chunk.length > left) chunk = chunk.subarray(0, left);
        left -= chunk.length;
        controller.enqueue(chunk);
        return;
      }
    },
    cancel() {
      return reader.cancel();
    },
  });
}

function headers(contentType: string, extra: Record<string, string>) {
  return new Headers({
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  });
}

/**
 * Answers a browser's range request for `url`. Returns null when the request has
 * no usable range (e.g. the file was opened directly); send those to the link itself.
 */
export async function relayAudioRange(
  request: Request,
  url: string,
  contentType: string,
  knownSize: number | null,
): Promise<Response | null> {
  const range = parseRange(request.headers.get("range"));
  if (!range) return null;

  const start = range.start;
  const wantedEnd = range.end ?? Number.MAX_SAFE_INTEGER;
  const end = Math.min(wantedEnd, start + CHUNK - 1);

  const upstream = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}`, "User-Agent": USER_AGENT, "Accept-Encoding": "identity" },
    redirect: "follow",
    signal: request.signal,
    cache: "no-store",
  });

  if (upstream.status === 416) {
    await upstream.body?.cancel().catch(() => {});
    const total = upstream.headers.get("content-range")?.match(/\/(\d+)$/)?.[1] ?? knownSize;
    return new Response(null, {
      status: 416,
      headers: headers(contentType, total ? { "Content-Range": `bytes */${total}` } : {}),
    });
  }
  if (!upstream.ok || !upstream.body) {
    await upstream.body?.cancel().catch(() => {});
    return new Response("The audio couldn't be loaded from the file link.", { status: 502 });
  }

  let total: number | null;
  let skip: number;
  let upstreamLast = Number.MAX_SAFE_INTEGER;
  if (upstream.status === 206) {
    // The link did the range for us.
    const m = upstream.headers.get("content-range")?.match(/bytes (\d+)-(\d+)\/(\d+|\*)/);
    if (!m) {
      await upstream.body.cancel().catch(() => {});
      return new Response("The file link sent an unexpected answer.", { status: 502 });
    }
    const first = Number(m[1]);
    if (first > start) {
      await upstream.body.cancel().catch(() => {});
      return new Response("The file link sent an unexpected answer.", { status: 502 });
    }
    total = m[3] === "*" ? knownSize : Number(m[3]);
    skip = start - first;
    upstreamLast = Number(m[2]);
  } else {
    // The link sent the whole file: skip to the start of the range ourselves.
    const length = Number(upstream.headers.get("content-length"));
    total = Number.isFinite(length) && length > 0 ? length : knownSize;
    skip = start;
  }
  if (!total) {
    await upstream.body.cancel().catch(() => {});
    return null;
  }
  if (start >= total) {
    await upstream.body.cancel().catch(() => {});
    return new Response(null, { status: 416, headers: headers(contentType, { "Content-Range": `bytes */${total}` }) });
  }

  const last = Math.min(end, total - 1, upstreamLast);
  const length = last - start + 1;
  return new Response(slice(upstream.body, skip, length), {
    status: 206,
    headers: headers(contentType, {
      "Content-Range": `bytes ${start}-${last}/${total}`,
      "Content-Length": String(length),
    }),
  });
}
