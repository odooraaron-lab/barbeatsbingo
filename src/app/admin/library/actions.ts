"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { and, count, eq, isNotNull, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, files, playlists } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { directDownloadUrl, linkProblem, slugify } from "@/lib/format";
import { checkLink } from "@/lib/links";
import { SHOW_SLOTS, type SlotKey } from "@/lib/show-files";
import { applyShowLinks, uniqueCategorySlug, uniquePlaylistSlug } from "@/lib/library-admin";
import { deleteObject, storageConfigured } from "@/lib/storage";
import { fail, ok, type ActionResult } from "@/lib/action-result";

const uuid = z.uuid();
const text = (fd: FormData, key: string, maxLen = 200) =>
  String(fd.get(key) ?? "")
    .trim()
    .slice(0, maxLen);
const sortValue = (fd: FormData) => {
  const n = Number.parseInt(String(fd.get("sortOrder") ?? ""), 10);
  return Number.isFinite(n) ? Math.max(-100000, Math.min(100000, n)) : 0;
};

// ── Genres ─────────────────────────────────────────────────────────────────

export async function createCategory(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = text(fd, "name", 80);
  if (!name) return fail("Give the category a name.");
  const [{ top }] = await db.select({ top: max(categories.sortOrder) }).from(categories);
  await db.insert(categories).values({
    name,
    slug: await uniqueCategorySlug(slugify(name)),
    description: text(fd, "description", 500),
    sortOrder: (top ?? 0) + 10,
  });
  refresh();
  return ok(`Added ${name}.`);
}

export async function updateCategory(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown category.");
  const name = text(fd, "name", 80);
  if (!name) return fail("Give the category a name.");
  const slug = await uniqueCategorySlug(slugify(text(fd, "slug", 80) || name), id);
  await db
    .update(categories)
    .set({
      name,
      slug,
      description: text(fd, "description", 500),
      sortOrder: sortValue(fd),
      isPublished: fd.get("isPublished") === "on",
    })
    .where(eq(categories.id, id));
  refresh();
  return ok("Category saved.");
}

export async function deleteCategory(id: string, _prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown category.");
  const [{ n }] = await db.select({ n: count() }).from(playlists).where(eq(playlists.categoryId, id));
  if (n > 0) return fail("Move or delete the shows in this category first.");
  await db.delete(categories).where(eq(categories.id, id));
  redirect("/admin/library");
}

// ── Playlists ──────────────────────────────────────────────────────────────

export async function createPlaylist(categoryId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(categoryId).success) return fail("Unknown category.");
  const name = text(fd, "name", 120);
  if (!name) return fail("Give the show a name.");
  const [{ top }] = await db
    .select({ top: max(playlists.sortOrder) })
    .from(playlists)
    .where(eq(playlists.categoryId, categoryId));
  const [created] = await db
    .insert(playlists)
    .values({
      categoryId,
      name,
      slug: await uniquePlaylistSlug(categoryId, slugify(name)),
      description: text(fd, "description", 500),
      sortOrder: (top ?? 0) + 10,
      isPublished: fd.get("isPublished") === "on",
    })
    .returning({ id: playlists.id });
  redirect(`/admin/library/playlist/${created.id}`);
}

export async function updatePlaylist(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown show.");
  const name = text(fd, "name", 120);
  if (!name) return fail("Give the show a name.");
  const categoryId = text(fd, "categoryId", 40);
  if (!uuid.safeParse(categoryId).success) return fail("Choose a category.");
  const slug = await uniquePlaylistSlug(categoryId, slugify(text(fd, "slug", 80) || name), id);
  await db
    .update(playlists)
    .set({
      name,
      slug,
      categoryId,
      description: text(fd, "description", 500),
      sortOrder: sortValue(fd),
      isPublished: fd.get("isPublished") === "on",
    })
    .where(eq(playlists.id, id));
  refresh();
  return ok("Show saved.");
}

export async function deletePlaylist(id: string, _prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown show.");
  const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  if (!playlist) return fail("Unknown show.");

  const stored = await db
    .select({ key: files.storageKey })
    .from(files)
    .where(and(eq(files.playlistId, id), isNotNull(files.storageKey)));
  if (stored.length && storageConfigured()) {
    try {
      await Promise.all(stored.map((f) => deleteObject(f.key!)));
    } catch (err) {
      console.error("[admin] could not delete stored files", err);
      return fail("The files couldn't be removed from storage, so nothing was deleted. Try again in a minute.");
    }
  }
  await db.delete(playlists).where(eq(playlists.id, id));
  redirect(`/admin/library/${playlist.categoryId}`);
}

// ── Files ──────────────────────────────────────────────────────────────────

const KINDS = ["video", "audio", "scorecards", "host_sheet", "document", "archive", "other", "preview"] as const;
const kindOf = (fd: FormData) => {
  const k = String(fd.get("kind") ?? "");
  return (KINDS as readonly string[]).includes(k) ? (k as (typeof KINDS)[number]) : "other";
};

/**
 * Saves the three Zoho (or other) links every show has: the show file, the
 * scorecards and the track list. Empty boxes remove that file.
 */
export async function saveShowFiles(playlistId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(playlistId).success) return fail("Unknown show.");
  const [show] = await db.select().from(playlists).where(eq(playlists.id, playlistId)).limit(1);
  if (!show) return fail("Unknown show.");

  const links: Partial<Record<SlotKey, string>> = {};
  const currentIds: Partial<Record<SlotKey, string>> = {};
  for (const slot of SHOW_SLOTS) {
    links[slot.key] = text(fd, `${slot.key}Url`, 2000);
    currentIds[slot.key] = text(fd, `${slot.key}Id`, 40);
  }
  const result = await applyShowLinks(show, {
    links,
    currentIds,
    showKind: String(fd.get("showKind") ?? ""),
    removeEmpty: true,
  });
  if (result.error) return fail(result.error);

  refresh();
  return ok("Show files saved.", result.warnings.length ? result.warnings.join("\n") : undefined);
}

export async function addLinkFile(playlistId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(playlistId).success) return fail("Unknown show.");
  const title = text(fd, "title", 200);
  const url = text(fd, "url", 2000);
  if (!title) return fail("Give the file a title.");
  const problem = linkProblem(url);
  if (problem) return fail(problem);
  const parsed = new URL(url);

  const [{ top }] = await db
    .select({ top: max(files.sortOrder) })
    .from(files)
    .where(eq(files.playlistId, playlistId));
  await db.insert(files).values({
    playlistId,
    title,
    groupLabel: text(fd, "groupLabel", 80),
    kind: kindOf(fd),
    source: "link",
    externalUrl: parsed.toString(),
    sortOrder: (top ?? 0) + 10,
  });
  refresh();
  return ok(`Added ${title}.`);
}

export async function updateFile(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown file.");
  const title = text(fd, "title", 200);
  if (!title) return fail("Give the file a title.");
  const values: Partial<typeof files.$inferInsert> = {
    title,
    groupLabel: text(fd, "groupLabel", 80),
    kind: kindOf(fd),
    sortOrder: sortValue(fd),
  };
  const url = text(fd, "url", 2000);
  if (fd.has("url")) {
    const problem = linkProblem(url);
    if (problem) return fail(problem);
    values.externalUrl = new URL(url).toString();
    const [current] = await db.select({ url: files.externalUrl }).from(files).where(eq(files.id, id)).limit(1);
    if (current && current.url !== values.externalUrl) {
      // A different file: re-read its length and how it can be played.
      const check = await checkLink(directDownloadUrl(values.externalUrl));
      values.durationSeconds = check.reachable ? check.durationSeconds : null;
      values.streamDirect = check.reachable ? check.streamDirect : null;
      if (check.size) values.sizeBytes = check.size;
    }
  }
  await db.update(files).set(values).where(eq(files.id, id));
  refresh();
  return ok("Saved.");
}

export async function deleteFile(id: string, _prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown file.");
  const [file] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!file) return ok("Already deleted.");
  if (file.storageKey && storageConfigured()) {
    try {
      await deleteObject(file.storageKey);
    } catch (err) {
      console.error("[admin] could not delete stored file", err);
      return fail("The file couldn't be removed from storage. Try again in a minute.");
    }
  }
  await db.delete(files).where(eq(files.id, id));
  refresh();
  return ok(`Deleted ${file.title}.`);
}
