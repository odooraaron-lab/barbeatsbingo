import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getDownloadableFile } from "@/lib/library";
import { presignDownload, storageConfigured } from "@/lib/storage";
import { directDownloadUrl } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Hands the audio player the file's real address after checking access.
// Playing isn't counted as a download.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  }
  if (!target) return new NextResponse("This file can't be played right now.", { status: 503 });

  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
