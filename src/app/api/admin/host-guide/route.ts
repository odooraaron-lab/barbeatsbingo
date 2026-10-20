import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { HOST_GUIDE, SITE_FILE_MAX_BYTES, saveSiteFile } from "@/lib/site-files";

// Upload (or replace) the host guide PDF from the admin Library page. A plain form post,
// answered with a redirect back to the page and a message.
export async function POST(request: NextRequest) {
  const back = (result: string) =>
    NextResponse.redirect(new URL(`/admin/library?guide=${result}#host-guide`, request.url), 303);

  const user = await getSessionUser();
  if (!user || user.role !== "admin") return new NextResponse("Not allowed.", { status: 403 });
  // Only from this site's own pages.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) return new NextResponse("Not allowed.", { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return back("missing");
  if (file.size > SITE_FILE_MAX_BYTES) return back("too-big");
  const data = Buffer.from(await file.arrayBuffer());
  if (data.subarray(0, 5).toString("latin1") !== "%PDF-") return back("not-pdf");

  const fileName = (file.name || "Host guide.pdf").replace(/[/\\]/g, "-").slice(0, 150);
  await saveSiteFile(HOST_GUIDE, { fileName, contentType: "application/pdf", data });
  return back("saved");
}
