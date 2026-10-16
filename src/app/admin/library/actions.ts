"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { and, count, eq, isNotNull, max, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, files, playlists } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { directDownloadUrl, linkProblem, slugify, titleFromFileName } from "@/lib/format";
import { checkLink, type LinkCheck } from "@/lib/links";
import { SHOW_SLOTS } from "@/lib/show-files";
import { deleteObject, storageConfigured } from "@/lib/storage";
import { fail, ok, type ActionResult } from "@/lib/action-result";

const uuid = z.uuid();
// These would clash with portal pages of the same name.
const RESERVED_GENRE_SLUGS = new Set(["search", "account"]);

const text = (fd: FormData, key: string, maxLen = 200) =>
  String(fd.get(key) ?? "")
    .trim()
    .slice(0, maxLen);
const sortValue = (fd: FormData) => {
  const n = Number.parseInt(String(fd.get("sortOrder") ?? ""), 10);
  return Number.isFinite(n) ? Math.max(-100000, Math.min(100000, n)) : 0;
};

async function uniqueCategorySlug(base: string, exceptId?: string) {
  let slug = base;
  for (let i = 2; ; i++) {
    if (!RESERVED_GENRE_SLUGS.has(slug)) {
      const [hit] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.slug, slug), exceptId ? ne(categories.id, exceptId) : undefined))
        .limit(1);
      if (!hit) return slug;
    }
    slug = `${base}-${i}`;
  }
}

async function uniquePlaylistSlug(categoryId: string, base: string, exceptId?: string) {
  let slug = base;
  for (let i = 2; ; i++) {
    const [hit] = await db
      .select({ id: playlists.id })
      .from(playlists)
      .where(
        and(
          eq(playlists.categoryId, categoryId),
          eq(playlists.slug, slug),
          exceptId ? ne(playlists.id, exceptId) : undefined,
        ),
      )
      .limit(1);
    if (!hit) return slug;
    slug = `${base}-${i}`;
  }
}

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

const KINDS = ["video", "audio", "scorecards", "host_sheet", "document", "archive", "other"] as const;
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
  const existing = await db.select().from(files).where(eq(files.playlistId, playlistId));

  const plans = SHOW_SLOTS.map((slot, index) => {
    const url = text(fd, `${slot.key}Url`, 2000);
    const currentId = text(fd, `${slot.key}Id`, 40);
    const current = existing.find((f) => f.id === currentId) ?? null;
    const chosen = String(fd.get(`${slot.key}Kind`) ?? "");
    const kind = (slot.kinds as readonly string[]).includes(chosen)
      ? (chosen as (typeof KINDS)[number])
      : slot.kinds[0];
    return { slot, url, current, kind, sortOrder: (index + 1) * 10 };
  });

  const problems = plans.flatMap((p) => {
    const problem = p.url ? linkProblem(p.url) : null;
    return problem ? [`${p.slot.label}: ${problem}`] : [];
  });
  if (problems.length) return fail(problems.join("\n"));
  if (plans.every((p) => !p.url && !p.current)) return fail("Paste at least one link.");

  // Check new or changed links so we can grab the real file name and spot mistakes.
  const checks: (LinkCheck | null)[] = await Promise.all(
    plans.map((p) =>
      p.url &&
      (!p.current ||
        p.current.externalUrl !== p.url ||
        !p.current.fileName ||
        (p.slot.key === "preview" && (p.current.streamDirect === null || p.current.durationSeconds === null)))
        ? checkLink(directDownloadUrl(p.url))
        : Promise.resolve(null),
    ),
  );

  const warnings: string[] = [];
  for (const [i, p] of plans.entries()) {
    const check = checks[i];
    if (!p.url) {
      if (p.current) await db.delete(files).where(eq(files.id, p.current.id));
      continue;
    }

    if (check && !check.reachable) {
      warnings.push(
        `${p.slot.label}: we couldn't open this link to check it. Make sure it's an external share link with downloads allowed.`,
      );
    } else if (check?.isHtml) {
      warnings.push(
        `${p.slot.label}: this link opens a Zoho page instead of the file. Share the file itself (not its folder) and allow downloads.`,
      );
    } else if (check && (p.slot.key === "scorecards" || p.slot.key === "tracklist") && !check.isPdf) {
      warnings.push(`${p.slot.label}: this link doesn't seem to be a PDF.`);
    } else if (check && p.slot.key === "preview" && !check.durationSeconds) {
      warnings.push(`${p.slot.label}: this link doesn't seem to be an MP3. Check it's the "- Preview.mp3" file.`);
    }

    const sameLink = p.current?.externalUrl === p.url;
    const fileName = check?.fileName ?? (sameLink ? p.current?.fileName : "") ?? "";
    const values = {
      title:
        (sameLink && p.current?.title) || (fileName ? titleFromFileName(fileName) : `${show.name} – ${p.slot.label}`),
      kind: p.kind,
      source: "link" as const,
      externalUrl: p.url,
      storageKey: null,
      fileName,
      sizeBytes: check?.size ?? (sameLink ? (p.current?.sizeBytes ?? null) : null),
      durationSeconds: check?.reachable ? check.durationSeconds : sameLink ? (p.current?.durationSeconds ?? null) : null,
      streamDirect: check?.reachable ? check.streamDirect : sameLink ? (p.current?.streamDirect ?? null) : null,
      sortOrder: p.sortOrder,
    };
    if (p.current) await db.update(files).set(values).where(eq(files.id, p.current.id));
    else await db.insert(files).values({ ...values, playlistId, groupLabel: "" });
  }

  refresh();
  return ok("Show files saved.", warnings.length ? warnings.join("\n") : undefined);
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
