import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getDownloadableFile } from "@/lib/library";
import { presignDownload, storageConfigured } from "@/lib/storage";
import { directDownloadUrl } from "@/lib/format";
import { checkLink } from "@/lib/links";
import { audioTypeFor, relayAudioRange } from "@/lib/media-relay";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Gives the audio player the file after checking access. Playing isn't counted as a download.
//
// Usually this just points the browser at the file's own address. For MP3 links that
// iPhones can't stream directly (no byte ranges, or not labelled as audio), the
// audio is relayed through here instead.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse("Log in to play this file.", { status: 401 });

  const file = UUID.test(id) ? await getDownloadableFile(user, id) : null;
  if (!file || !["video", "audio", "preview"].includes(file.kind)) {
    return new NextResponse("This file isn't available on your account.", { status: 404 });
  }

  let target: string | null = null;
  if (file.source === "storage" && file.storageKey && storageConfigured()) {
    // Long enough to listen to a whole show and still seek near the end.
    target = await presignDownload(file.storageKey, file.fileName || file.title, true, 6 * 60 * 60);
  } else if (file.source === "link" && file.externalUrl) {
    target = directDownloadUrl(file.externalUrl);

    if (file.kind === "preview") {
      let direct = file.streamDirect;
      if (direct === null) {
        // Saved before links were checked for this: check once and remember.
        const check = await checkLink(target);
        if (check.reachable) {
          direct = check.streamDirect;
          await db
            .update(files)
            .set({
              streamDirect: direct,
              durationSeconds: file.durationSeconds ?? check.durationSeconds,
              sizeBytes: file.sizeBytes ?? check.size,
            })
            .where(eq(files.id, file.id));
        }
      }
      if (direct === false) {
        const relayed = await relayAudioRange(request, target, audioTypeFor(file.fileName), file.sizeBytes);
        if (relayed) return relayed;
      }
    }
  }
  if (!target) return new NextResponse("This file can't be played right now.", { status: 503 });

  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
