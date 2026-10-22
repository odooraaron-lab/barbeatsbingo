import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getDownloadableFile } from "@/lib/library";
import { presignDownload, storageConfigured } from "@/lib/storage";
import { directDownloadUrl } from "@/lib/format";
import { checkLink } from "@/lib/links";
import { mediaTypeFor, relayAudioRange } from "@/lib/media-relay";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Gives the show page's player the file (sound or video) after checking access. Only for
// accounts allowed to play shows on the site. Playing isn't counted as a download.
//
// Usually this just points the browser at the file's own address. iPhones are fussier
// than computers: they only play links that answer byte-range requests and say they're
// audio or video. Zoho links often say "a file to download" instead, so for those the
// sound is relayed through here, labelled properly. A big video is only relayed when its
// link does byte ranges (otherwise every jump would mean reading it from the start).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse("Log in to play this file.", { status: 401 });
  if (!user.canPlay)
    return new NextResponse("Playing shows on the site isn't switched on for your account.", { status: 403 });

  const file = UUID.test(id) ? await getDownloadableFile(user, id) : null;
  if (!file || (file.kind !== "video" && file.kind !== "audio" && file.kind !== "preview")) {
    return new NextResponse("This file isn't available on your account.", { status: 404 });
  }

  let target: string | null = null;
  if (file.source === "storage" && file.storageKey && storageConfigured()) {
    // Long enough to listen to a whole show and still seek near the end.
    target = await presignDownload(file.storageKey, file.fileName || file.title, true, 6 * 60 * 60);
  } else if (file.source === "link" && file.externalUrl) {
    target = directDownloadUrl(file.externalUrl);

    let { streamDirect: direct, byteRanges: ranges } = file;
    if (direct === null || ranges === null) {
      // Saved before links were checked for this: check once and remember.
      const check = await checkLink(target);
      if (check.reachable) {
        direct = check.streamDirect;
        ranges = check.byteRanges;
        await db
          .update(files)
          .set({
            streamDirect: direct,
            byteRanges: ranges,
            durationSeconds: file.durationSeconds ?? check.durationSeconds,
            sizeBytes: file.sizeBytes ?? check.size,
          })
          .where(eq(files.id, file.id));
      }
    }
    // MP3s for the player are small enough to relay even from links without byte ranges.
    if (direct === false && (ranges || file.kind === "preview")) {
      const relayed = await relayAudioRange(request, target, mediaTypeFor(file.fileName, file.kind), file.sizeBytes);
      if (relayed) return relayed;
    }
  }
  if (!target) return new NextResponse("This file can't be played right now.", { status: 503 });

  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
