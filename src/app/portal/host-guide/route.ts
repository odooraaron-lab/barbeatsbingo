import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { HOST_GUIDE, disposition, siteFile } from "@/lib/site-files";

// The host guide, for logged-in customers only. An admin uploads it on the Library page;
// it's kept in the database, never in the (public) code.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/portal");
    return NextResponse.redirect(login);
  }
  const file = await siteFile(HOST_GUIDE);
  if (!file) return new NextResponse("The host guide isn't available yet. Please check back soon.", { status: 404 });
  const view = request.nextUrl.searchParams.get("view") === "1";
  await logActivity(user.id, "guide_downloaded", { detail: file.fileName, onceEveryMinutes: 5 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.data.length),
      "Content-Disposition": disposition(view ? "inline" : "attachment", file.fileName),
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
