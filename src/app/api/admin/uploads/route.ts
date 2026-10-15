import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { files, playlists } from "@/db/schema";
import { getAdminOrNull } from "@/lib/auth";
import {
  SINGLE_UPLOAD_LIMIT,
  abortMultipart,
  completeMultipart,
  objectSize,
  presignPut,
  startMultipart,
  storageConfigured,
} from "@/lib/storage";
import { guessKind, titleFromFileName } from "@/lib/format";

// Browser uploads go straight to storage using short-lived signed URLs.
// This route only hands out those URLs and records the finished file.

const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50 GB
const KINDS = ["video", "audio", "scorecards", "host_sheet", "document", "archive", "other"] as const;

const start = z.object({
  action: z.literal("start"),
  playlistId: z.uuid(),
  fileName: z.string().min(1).max(250),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  contentType: z.string().max(150).default(""),
});

const complete = z.object({
  action: z.literal("complete"),
  playlistId: z.uuid(),
  key: z.string().min(1).max(600),
  uploadId: z.string().max(1000).optional(),
  parts: z.array(z.object({ partNumber: z.number().int().min(1).max(10000), etag: z.string().min(1).max(200) })).optional(),
  fileName: z.string().min(1).max(250),
  size: z.number().int().positive(),
  contentType: z.string().max(150).default(""),
  title: z.string().max(200).optional(),
  groupLabel: z.string().max(80).default(""),
  kind: z.enum(KINDS).optional(),
});

const abort = z.object({
  action: z.literal("abort"),
  playlistId: z.uuid(),
  key: z.string().min(1).max(600),
  uploadId: z.string().min(1).max(1000),
});

const body = z.discriminatedUnion("action", [start, complete, abort]);

function safeName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(-120);
  return cleaned || "file";
}

async function prefixFor(playlistId: string) {
  const [row] = await db.select({ id: playlists.id }).from(playlists).where(eq(playlists.id, playlistId)).limit(1);
  // Keys use the playlist id, so renaming or moving a playlist never breaks them.
  return row ? `library/${playlistId}/` : null;
}

export async function POST(request: NextRequest) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "Log in as an admin to upload files." }, { status: 403 });
  if (!storageConfigured()) {
    return NextResponse.json({ error: "File storage isn't set up yet. See the README for the steps." }, { status: 400 });
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That upload request wasn't valid." }, { status: 400 });
  const data = parsed.data;

  const prefix = await prefixFor(data.playlistId);
  if (!prefix) return NextResponse.json({ error: "That show no longer exists." }, { status: 404 });

  try {
    if (data.action === "start") {
      const key = `${prefix}${randomUUID().slice(0, 8)}-${safeName(data.fileName)}`;
      const contentType = data.contentType || "application/octet-stream";
      if (data.size <= SINGLE_UPLOAD_LIMIT) {
        return NextResponse.json({ mode: "single", key, contentType, url: await presignPut(key, contentType) });
      }
      const multipart = await startMultipart(key, contentType, data.size);
      return NextResponse.json({ mode: "multipart", key, contentType, ...multipart });
    }

    if (!data.key.startsWith(prefix)) {
      return NextResponse.json({ error: "That file doesn't belong to this show." }, { status: 400 });
    }

    if (data.action === "abort") {
      await abortMultipart(data.key, data.uploadId);
      return NextResponse.json({ ok: true });
    }

    // complete
    if (data.uploadId) {
      if (!data.parts?.length) return NextResponse.json({ error: "No parts were uploaded." }, { status: 400 });
      await completeMultipart(data.key, data.uploadId, data.parts);
    }
    const stored = await objectSize(data.key);
    if (stored == null) {
      return NextResponse.json({ error: "The upload didn't reach storage. Try again." }, { status: 400 });
    }

    const [{ top }] = await db
      .select({ top: max(files.sortOrder) })
      .from(files)
      .where(eq(files.playlistId, data.playlistId));
    const [created] = await db
      .insert(files)
      .values({
        playlistId: data.playlistId,
        title: data.title?.trim() || titleFromFileName(data.fileName),
        groupLabel: data.groupLabel.trim(),
        kind: data.kind ?? guessKind(data.fileName, data.contentType),
        source: "storage",
        storageKey: data.key,
        fileName: data.fileName,
        sizeBytes: stored,
        contentType: data.contentType,
        sortOrder: (top ?? 0) + 10,
      })
      .returning({ id: files.id });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error("[uploads]", err);
    return NextResponse.json({ error: "Storage didn't accept the request. Check the storage settings and try again." }, { status: 502 });
  }
}
