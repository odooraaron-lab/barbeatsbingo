import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { downloads } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getDownloadableFile } from "@/lib/library";
import { presignDownload, storageConfigured } from "@/lib/storage";
import { directDownloadUrl } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/portal");
    return NextResponse.redirect(login);
  }

  const file = UUID.test(id) ? await getDownloadableFile(user, id) : null;
  if (!file) {
    return new NextResponse("This file isn't available on your account.", { status: 404 });
  }

  const inline = request.nextUrl.searchParams.get("inline") === "1";
  let target: string | null = null;

  if (file.source === "storage" && file.storageKey && storageConfigured()) {
    target = await presignDownload(file.storageKey, file.fileName || file.title, inline);
  } else if (file.source === "link" && file.externalUrl) {
    target = inline ? file.externalUrl : directDownloadUrl(file.externalUrl);
  }

  if (!target) {
    return new NextResponse("This file can't be downloaded right now. Please contact us.", { status: 503 });
  }

  if (!inline) {
    await db.insert(downloads).values({ userId: user.id, fileId: file.id }).catch(() => {});
  }

  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
