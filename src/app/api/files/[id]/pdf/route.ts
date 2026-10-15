import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getDownloadableFile } from "@/lib/library";
import { presignDownload, storageConfigured } from "@/lib/storage";
import { directDownloadUrl } from "@/lib/format";
import { fetchPdf } from "@/lib/links";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Serves a show's track list PDF from our own address so it can be drawn on the
// page (browsers won't let a page read PDFs straight from Zoho).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse("Log in to view this file.", { status: 401 });

  const file = UUID.test(id) ? await getDownloadableFile(user, id) : null;
  if (!file) return new NextResponse("This file isn't available on your account.", { status: 404 });

  let url: string | null = null;
  if (file.source === "storage" && file.storageKey && storageConfigured()) {
    url = await presignDownload(file.storageKey, file.fileName || file.title, true);
  } else if (file.source === "link" && file.externalUrl) {
    url = directDownloadUrl(file.externalUrl);
  }
  if (!url) return new NextResponse("This file can't be shown right now.", { status: 503 });

  try {
    const body = await fetchPdf(url);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch (err) {
    console.error("[pdf]", file.id, err instanceof Error ? err.message : err);
    return new NextResponse("The track list couldn't be loaded from its link.", { status: 502 });
  }
}
