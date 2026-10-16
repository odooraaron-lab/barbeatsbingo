import "server-only";
import { and, asc, desc, eq, ilike, inArray, max, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { accessGrants, categories, files, playlists } from "@/db/schema";
import { accessHasExpired } from "./auth";
import type { SessionUser } from "./session";

type Scope = { all: true } | { all: false; categoryIds: Set<string>; playlistIds: Set<string> };

async function getScope(user: SessionUser): Promise<Scope> {
  if (user.role === "admin" || user.accessAll) return { all: true };
  const grants = await db
    .select({ categoryId: accessGrants.categoryId, playlistId: accessGrants.playlistId })
    .from(accessGrants)
    .where(eq(accessGrants.userId, user.id));
  return {
    all: false,
    categoryIds: new Set(grants.flatMap((g) => (g.categoryId ? [g.categoryId] : []))),
    playlistIds: new Set(grants.flatMap((g) => (g.playlistId ? [g.playlistId] : []))),
  };
}

function canSeePlaylist(scope: Scope, p: { id: string; categoryId: string }) {
  return scope.all || scope.categoryIds.has(p.categoryId) || scope.playlistIds.has(p.id);
}

const isAdmin = (u: SessionUser) => u.role === "admin";

/** Admins also see hidden (unpublished) items so they can check them before release. */
function publishedOnly<T extends { isPublished: typeof categories.isPublished | typeof playlists.isPublished }>(
  user: SessionUser,
  table: T,
): SQL | undefined {
  return isAdmin(user) ? undefined : eq(table.isPublished, true);
}

/**
 * How a category looks to this customer:
 * - open: has shows they can play (lit up)
 * - locked: has shows, but none on their plan (greyed, with a lock)
 * - soon: no shows yet
 */
export type CategoryState = "open" | "locked" | "soon";

export type GenreSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublished: boolean;
  /** Shows this customer can open. */
  available: number;
  /** All shows in the category. */
  total: number;
  state: CategoryState;
};

const NO_ACCESS: Scope = { all: false, categoryIds: new Set(), playlistIds: new Set() };

/** Every category, with what this customer can open in each. Expired accounts see everything locked. */
export async function listGenres(user: SessionUser): Promise<GenreSummary[]> {
  const scope = accessHasExpired(user) ? NO_ACCESS : await getScope(user);

  const [cats, pls] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(publishedOnly(user, categories))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({ id: playlists.id, categoryId: playlists.categoryId })
      .from(playlists)
      .where(publishedOnly(user, playlists)),
  ]);

  return cats.map((c) => {
    const inCategory = pls.filter((p) => p.categoryId === c.id);
    const available = inCategory.filter((p) => canSeePlaylist(scope, p)).length;
    const total = inCategory.length;
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      isPublished: c.isPublished,
      available,
      total,
      state: available > 0 ? "open" : total > 0 ? "locked" : "soon",
    };
  });
}

export type PlaylistSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublished: boolean;
  fileCount: number;
  totalBytes: number;
  updatedAt: Date | null;
};

/**
 * A category and the shows this customer can open in it. Returns the category even when
 * none of its shows are on their plan, so the page can offer to add it.
 */
export async function getGenre(user: SessionUser, slug: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.slug, slug), publishedOnly(user, categories)))
    .limit(1);
  if (!category) return null;

  const expired = accessHasExpired(user);
  const scope = expired ? NO_ACCESS : await getScope(user);
  const rows = await db
    .select({
      id: playlists.id,
      categoryId: playlists.categoryId,
      slug: playlists.slug,
      name: playlists.name,
      description: playlists.description,
      isPublished: playlists.isPublished,
      fileCount: sql<number>`count(${files.id}) filter (where ${files.kind} <> 'preview')::int`,
      totalBytes: sql<number>`coalesce(sum(${files.sizeBytes}) filter (where ${files.kind} <> 'preview'), 0)::float8`,
      updatedAt: max(files.createdAt),
    })
    .from(playlists)
    .leftJoin(files, eq(files.playlistId, playlists.id))
    .where(and(eq(playlists.categoryId, category.id), publishedOnly(user, playlists)))
    .groupBy(playlists.id)
    .orderBy(asc(playlists.sortOrder), asc(playlists.name));

  const visible: PlaylistSummary[] = rows
    .filter((p) => canSeePlaylist(scope, p))
    .map(({ categoryId: _c, ...p }) => p);
  const lockedNames = rows.filter((p) => !canSeePlaylist(scope, p)).map((p) => p.name);

  return { category, playlists: visible, lockedNames, expired };
}

export async function getPlaylist(user: SessionUser, categorySlug: string, playlistSlug: string) {
  if (accessHasExpired(user)) return null;
  const [row] = await db
    .select({ category: categories, playlist: playlists })
    .from(playlists)
    .innerJoin(categories, eq(playlists.categoryId, categories.id))
    .where(
      and(
        eq(categories.slug, categorySlug),
        eq(playlists.slug, playlistSlug),
        publishedOnly(user, categories),
        publishedOnly(user, playlists),
      ),
    )
    .limit(1);
  if (!row) return null;

  const scope = await getScope(user);
  if (!canSeePlaylist(scope, row.playlist)) return null;

  const items = await db
    .select({
      id: files.id,
      title: files.title,
      groupLabel: files.groupLabel,
      kind: files.kind,
      source: files.source,
      fileName: files.fileName,
      sizeBytes: files.sizeBytes,
      durationSeconds: files.durationSeconds,
      meta: files.meta,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(eq(files.playlistId, row.playlist.id))
    .orderBy(asc(files.sortOrder), asc(files.title));

  return { ...row, files: items };
}

/** Returns the file if this user may download it right now. */
export async function getDownloadableFile(user: SessionUser, fileId: string) {
  if (accessHasExpired(user)) return null;
  const [row] = await db
    .select({ file: files, playlistId: playlists.id, categoryId: playlists.categoryId })
    .from(files)
    .innerJoin(playlists, eq(files.playlistId, playlists.id))
    .innerJoin(categories, eq(playlists.categoryId, categories.id))
    .where(and(eq(files.id, fileId), publishedOnly(user, categories), publishedOnly(user, playlists)))
    .limit(1);
  if (!row) return null;
  const scope = await getScope(user);
  if (!canSeePlaylist(scope, { id: row.playlistId, categoryId: row.categoryId })) return null;
  return row.file;
}

export async function searchLibrary(user: SessionUser, query: string) {
  const q = query.trim().slice(0, 100);
  if (q.length < 2 || accessHasExpired(user)) return { playlists: [], files: [] };
  const scope = await getScope(user);
  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

  const scopeFilter = (): SQL | undefined => {
    if (scope.all) return undefined;
    const cats = [...scope.categoryIds];
    const pls = [...scope.playlistIds];
    if (cats.length === 0 && pls.length === 0) return sql`false`;
    return or(
      cats.length ? inArray(playlists.categoryId, cats) : undefined,
      pls.length ? inArray(playlists.id, pls) : undefined,
    );
  };

  const base = and(publishedOnly(user, categories), publishedOnly(user, playlists), scopeFilter());

  const [playlistHits, fileHits] = await Promise.all([
    db
      .select({
        name: playlists.name,
        slug: playlists.slug,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(playlists)
      .innerJoin(categories, eq(playlists.categoryId, categories.id))
      .where(and(base, or(ilike(playlists.name, like), ilike(playlists.description, like))))
      .orderBy(asc(playlists.name))
      .limit(30),
    db
      .select({
        id: files.id,
        title: files.title,
        kind: files.kind,
        sizeBytes: files.sizeBytes,
        playlistName: playlists.name,
        playlistSlug: playlists.slug,
        categorySlug: categories.slug,
      })
      .from(files)
      .innerJoin(playlists, eq(files.playlistId, playlists.id))
      .innerJoin(categories, eq(playlists.categoryId, categories.id))
      .where(and(base, ne(files.kind, "preview"), or(ilike(files.title, like), ilike(files.fileName, like))))
      .orderBy(desc(files.createdAt))
      .limit(30),
  ]);

  return { playlists: playlistHits, files: fileHits };
}
