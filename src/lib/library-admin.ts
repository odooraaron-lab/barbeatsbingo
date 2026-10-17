import "server-only";
import { and, eq, max, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, files, playlists, type FileKind } from "@/db/schema";
import { directDownloadUrl, guessKind, linkProblem, slugify, titleFromFileName } from "./format";
import { checkLink, readCallList, type LinkCheck } from "./links";
import { SHOW_SLOTS, filesBySlot, type SlotKey } from "./show-files";
import type { FileMeta } from "./file-meta";

// These would clash with portal pages of the same name.
const RESERVED_GENRE_SLUGS = new Set(["search", "account"]);

export async function uniqueCategorySlug(base: string, exceptId?: string) {
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

export async function uniquePlaylistSlug(categoryId: string, base: string, exceptId?: string) {
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

/** Finds a category by name (any case) or web address, optionally creating it. */
export async function findCategory(name: string, create: boolean) {
  const slug = slugify(name);
  const [hit] = await db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) = lower(${name}) or ${categories.slug} = ${slug}`)
    .limit(1);
  if (hit || !create) return hit ? { category: hit, created: false } : null;
  const [{ top }] = await db.select({ top: max(categories.sortOrder) }).from(categories);
  const [category] = await db
    .insert(categories)
    .values({ name, slug: await uniqueCategorySlug(slug), sortOrder: (top ?? 0) + 10 })
    .returning();
  return { category, created: true };
}

/** Finds a show in a category by name (any case) or web address, or creates it. */
export async function findOrCreateShow(
  categoryId: string,
  name: string,
  values: {
    description?: string;
    /** Set visibility (true/false); null leaves an existing show as it is. */
    isPublished?: boolean | null;
    /** Visibility for a new show when isPublished is null. */
    publishNew?: boolean;
  },
) {
  const slug = slugify(name);
  const [hit] = await db
    .select()
    .from(playlists)
    .where(
      and(
        eq(playlists.categoryId, categoryId),
        sql`(lower(${playlists.name}) = lower(${name}) or ${playlists.slug} = ${slug})`,
      ),
    )
    .limit(1);
  if (hit) {
    const changes: Partial<typeof playlists.$inferInsert> = {};
    if (values.description) changes.description = values.description;
    if (values.isPublished != null) changes.isPublished = values.isPublished;
    if (Object.keys(changes).length) await db.update(playlists).set(changes).where(eq(playlists.id, hit.id));
    return { show: { ...hit, ...changes }, created: false };
  }
  const [{ top }] = await db
    .select({ top: max(playlists.sortOrder) })
    .from(playlists)
    .where(eq(playlists.categoryId, categoryId));
  const [show] = await db
    .insert(playlists)
    .values({
      categoryId,
      name,
      slug: await uniquePlaylistSlug(categoryId, slug),
      description: values.description ?? "",
      sortOrder: (top ?? 0) + 10,
      isPublished: values.isPublished ?? values.publishNew ?? false,
    })
    .returning();
  return { show, created: true };
}

export type ShowLinkInput = {
  /** The link for each slot. Missing or blank means no link. */
  links: Partial<Record<SlotKey, string>>;
  /** Which saved file each slot's box was showing (from the form). Otherwise matched by type. */
  currentIds?: Partial<Record<SlotKey, string>>;
  /** For the show file: video, audio, zip or other. Otherwise worked out from the file. */
  showKind?: string;
  /** True on the show's own form, where emptying a box removes that file. Imports leave blanks alone. */
  removeEmpty: boolean;
};

export type ShowLinkResult = { error?: string; warnings: string[] };

/**
 * Saves a show's Zoho (or other) links: the show file, scorecards, track list and the
 * MP3 for the player. New or changed links are checked so we can pick up the real file
 * name, the MP3's length, and the songs on the call list, and warn about mistakes.
 */
export async function applyShowLinks(show: { id: string; name: string }, input: ShowLinkInput): Promise<ShowLinkResult> {
  const existing = await db.select().from(files).where(eq(files.playlistId, show.id));
  const bySlot = filesBySlot(existing);

  const plans = SHOW_SLOTS.map((slot, index) => {
    const url = (input.links[slot.key] ?? "").trim();
    const currentId = input.currentIds?.[slot.key];
    const current =
      currentId !== undefined ? (existing.find((f) => f.id === currentId) ?? null) : (bySlot[slot.key] ?? null);
    return { slot, url, current, sortOrder: (index + 1) * 10 };
  });

  const problems = plans.flatMap((p) => {
    const problem = p.url ? linkProblem(p.url) : null;
    return problem ? [`${p.slot.label}: ${problem}`] : [];
  });
  if (problems.length) return { error: problems.join("\n"), warnings: [] };
  if (input.removeEmpty && plans.every((p) => !p.url && !p.current)) {
    return { error: "Paste at least one link.", warnings: [] };
  }

  const needsCheck = (p: (typeof plans)[number]) =>
    !p.current ||
    p.current.externalUrl !== p.url ||
    !p.current.fileName ||
    (p.slot.key === "preview" && (p.current.streamDirect === null || p.current.durationSeconds === null)) ||
    ((p.slot.key === "show" || p.slot.key === "preview") && p.current.byteRanges === null) ||
    (p.slot.key === "tracklist" && !p.current.meta?.callList);

  // Check new or changed links so we can grab the real file name and spot mistakes.
  const checks: (LinkCheck | null)[] = await Promise.all(
    plans.map((p) => (p.url && needsCheck(p) ? checkLink(directDownloadUrl(p.url)) : Promise.resolve(null))),
  );

  const warnings: string[] = [];
  for (const [i, p] of plans.entries()) {
    const check = checks[i];
    if (!p.url) {
      if (input.removeEmpty && p.current) await db.delete(files).where(eq(files.id, p.current.id));
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

    let kind: FileKind = p.slot.kinds[0];
    if (p.slot.key === "show") {
      const allowed = p.slot.kinds as readonly string[];
      const guessed = guessKind(fileName || p.url, check?.contentType ?? "");
      kind = (
        input.showKind && allowed.includes(input.showKind)
          ? input.showKind
          : sameLink && p.current && allowed.includes(p.current.kind)
            ? p.current.kind
            : allowed.includes(guessed)
              ? guessed
              : "video"
      ) as FileKind;
    }

    let meta: FileMeta | null = sameLink ? (p.current?.meta ?? null) : null;
    if (p.slot.key === "tracklist" && check?.isPdf) {
      const callList = await readCallList(directDownloadUrl(p.url));
      meta = callList ? { ...meta, callList } : null;
      if (!callList) {
        warnings.push(
          `${p.slot.label}: we couldn't read the songs and times from this PDF, so it won't follow the player.`,
        );
      }
    }

    const values = {
      title:
        (sameLink && p.current?.title) || (fileName ? titleFromFileName(fileName) : `${show.name} – ${p.slot.label}`),
      kind,
      source: "link" as const,
      externalUrl: p.url,
      storageKey: null,
      fileName,
      sizeBytes: check?.size ?? (sameLink ? (p.current?.sizeBytes ?? null) : null),
      durationSeconds: check?.reachable ? check.durationSeconds : sameLink ? (p.current?.durationSeconds ?? null) : null,
      streamDirect: check?.reachable ? check.streamDirect : sameLink ? (p.current?.streamDirect ?? null) : null,
      byteRanges: check?.reachable ? check.byteRanges : sameLink ? (p.current?.byteRanges ?? null) : null,
      meta,
      sortOrder: p.sortOrder,
    };
    if (p.current) await db.update(files).set(values).where(eq(files.id, p.current.id));
    else await db.insert(files).values({ ...values, playlistId: show.id, groupLabel: "" });
  }

  return { warnings };
}
