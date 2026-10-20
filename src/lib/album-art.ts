import "server-only";
import { after } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/*
 * Album covers for the library screen. Each category shows up to 20 small covers from the
 * songs on its shows' call lists. Covers are looked up once per song (Deezer first, then
 * Apple's iTunes catalogue), kept in the song_art table, and only used when the artist and
 * song both match, so a wrong cover doesn't slip in. Lookups run after the page has been
 * sent, a few at a time, so the screen fills in over the first few visits.
 */

export const COVERS_PER_CATEGORY = 20;
const CANDIDATES_PER_CATEGORY = 40; // spares, for songs no cover is found for
const LOOKUPS_PER_VISIT = 12;
const DEEZER = () => process.env.ALBUM_ART_DEEZER_URL || "https://api.deezer.com";
const ITUNES = () => process.env.ALBUM_ART_ITUNES_URL || "https://itunes.apple.com";

export type Cover = { url: string; label: string };
type Song = { key: string; artist: string; title: string };

// ── Names ────────────────────────────────────────────────────────────────────

function simplify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the /, "")
    .trim();
}

/** "Bon Jovi feat. Jennifer Nettles" → "Bon Jovi" */
function mainArtist(artist: string) {
  return artist.split(/\s+(?:feat\.?|ft\.?|featuring|with|vs\.?|x)\s+/i)[0].trim();
}

/** Drops "(Official Video)", "[Remastered]", "- 2011 Remaster" and the like. */
function plainTitle(title: string) {
  return title
    .replace(/\s*[([{][^)\]}]*[)\]}]/g, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.*$/i, "")
    .trim();
}

/** "Prince - Little Red Corvette" → Prince / Little Red Corvette. Null if it isn't "Artist - Title". */
export function splitSong(line: string): Song | null {
  const m = line.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (!m) return null;
  const artist = mainArtist(m[1].trim());
  const title = plainTitle(m[2].trim());
  if (!artist || !title) return null;
  const key = `${simplify(artist)}|${simplify(title)}`;
  return key.length > 3 ? { key, artist, title } : null;
}

const STOP = new Set(["and", "the", "a"]);
const words = (s: string) => simplify(s).split(" ").filter((w) => w && !STOP.has(w));

/** True when one name's words are all in the other (handles "Hall & Oates" vs "Daryl Hall & John Oates"). */
function sameName(a: string, b: string) {
  const x = words(a);
  const y = words(b);
  if (!x.length || !y.length) return false;
  const inY = new Set(y);
  const inX = new Set(x);
  return x.every((w) => inY.has(w)) || y.every((w) => inX.has(w));
}

function matches(song: Song, artist: string | undefined, title: string | undefined) {
  return !!artist && !!title && sameName(song.artist, artist) && sameName(song.title, plainTitle(title));
}

// ── Catalogues ───────────────────────────────────────────────────────────────

class LookupFailed extends Error {}

async function getJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { Accept: "application/json" } });
  if (!res.ok) throw new LookupFailed(`${res.status}`);
  return (await res.json()) as unknown;
}

type DeezerTrack = { title?: string; artist?: { name?: string }; album?: { cover_small?: string } };

async function fromDeezer(song: Song): Promise<string | null> {
  const queries = [`artist:"${song.artist}" track:"${song.title}"`, `${song.artist} ${song.title}`];
  for (const q of queries) {
    const body = (await getJson(`${DEEZER()}/search?q=${encodeURIComponent(q)}&limit=10`)) as {
      data?: DeezerTrack[];
      error?: { message?: string };
    };
    // Deezer reports errors (like its rate limit) with a normal 200 response.
    if (body.error) throw new LookupFailed(body.error.message ?? "deezer error");
    const hit = body.data?.find((t) => t.album?.cover_small && matches(song, t.artist?.name, t.title));
    if (hit) return hit.album!.cover_small!;
  }
  return null;
}

type ItunesTrack = { artistName?: string; trackName?: string; artworkUrl100?: string };

async function fromItunes(song: Song): Promise<string | null> {
  const term = encodeURIComponent(`${song.artist} ${song.title}`);
  const body = (await getJson(`${ITUNES()}/search?term=${term}&media=music&entity=song&limit=10`)) as {
    results?: ItunesTrack[];
  };
  const hit = body.results?.find((t) => t.artworkUrl100 && matches(song, t.artistName, t.trackName));
  return hit ? hit.artworkUrl100!.replace(/\/\d+x\d+bb\./, "/60x60bb.") : null;
}

/** Finds a cover for a song. Null when neither catalogue has a confident match; throws when they can't be reached. */
async function lookUp(song: Song): Promise<{ url: string; source: string } | null> {
  let failed: unknown = null;
  for (const [source, find] of [
    ["deezer", fromDeezer],
    ["itunes", fromItunes],
  ] as const) {
    try {
      const url = await find(song);
      if (url) return { url, source };
    } catch (err) {
      failed = err;
    }
  }
  if (failed) throw failed;
  return null;
}

// ── Storage ──────────────────────────────────────────────────────────────────

/** Looks up covers for songs that don't have one stored yet, one at a time. */
export async function fillCovers(songs: Song[]) {
  for (const song of songs) {
    // Claim the song first, so two visits at once don't both look it up. A claim left by a
    // lookup that never finished is taken over after ten minutes.
    const claimed = await db.execute(sql`
      insert into song_art (key, artist, title, source)
      values (${song.key}, ${song.artist}, ${song.title}, 'pending')
      on conflict (key) do update set looked_up_at = now()
        where song_art.source = 'pending' and song_art.looked_up_at < now() - interval '10 minutes'
      returning key`);
    if (!claimed.rows.length) continue;
    try {
      const found = await lookUp(song);
      await db.execute(sql`
        update song_art set image_url = ${found?.url ?? null}, source = ${found?.source ?? null}, looked_up_at = now()
        where key = ${song.key}`);
    } catch (err) {
      // Couldn't reach the catalogues (or hit a rate limit): forget the claim and try another time.
      await db.execute(sql`delete from song_art where key = ${song.key} and source = 'pending'`);
      console.warn("[album-art] lookup failed, will retry later:", song.key, String(err));
      return;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}

type Row = { category_id: string; show_id: string; title: string | null };

/** Songs from the call lists of these categories' visible shows, in show order. */
async function songsByCategory(categoryIds: string[]) {
  if (!categoryIds.length) return new Map<string, Map<string, string[]>>();
  const { rows } = await db.execute<Row>(sql`
    select p.category_id, p.id as show_id, s.value->>'title' as title
    from files f
    join playlists p on p.id = f.playlist_id
    cross join lateral jsonb_array_elements(coalesce(f.meta->'callList'->'songs', '[]'::jsonb)) with ordinality as s(value, n)
    where f.kind = 'host_sheet' and p.is_published = true and p.category_id = any(${sql.param(categoryIds)}::uuid[])
    order by p.category_id, p.sort_order, p.name, s.n`);
  const out = new Map<string, Map<string, string[]>>();
  for (const r of rows) {
    if (!r.title) continue;
    const shows = out.get(r.category_id) ?? new Map<string, string[]>();
    out.set(r.category_id, shows);
    const list = shows.get(r.show_id) ?? [];
    shows.set(r.show_id, list);
    list.push(r.title);
  }
  return out;
}

/** A spread of songs: one from each show in turn, no artist twice. */
function pickSongs(shows: string[][], limit: number) {
  const picked: Song[] = [];
  const artists = new Set<string>();
  const longest = Math.max(0, ...shows.map((s) => s.length));
  for (let i = 0; i < longest && picked.length < limit; i++) {
    for (const show of shows) {
      const song = show[i] ? splitSong(show[i]) : null;
      if (!song) continue;
      const artist = song.key.split("|")[0];
      if (artists.has(artist)) continue;
      artists.add(artist);
      picked.push(song);
      if (picked.length >= limit) break;
    }
  }
  return picked;
}

async function storedArt(keys: string[]) {
  if (!keys.length) return new Map<string, { url: string | null; done: boolean }>();
  const { rows } = await db.execute<{ key: string; image_url: string | null; source: string | null }>(
    sql`select key, image_url, source from song_art where key = any(${sql.param(keys)}::text[])`,
  );
  return new Map(rows.map((r) => [r.key, { url: r.image_url, done: r.source !== "pending" }]));
}

/**
 * Up to 20 covers for each category. Songs not looked up yet are looked up after the
 * page is sent, so they appear on a later visit.
 */
export async function categoryCovers(categoryIds: string[]): Promise<Map<string, Cover[]>> {
  const result = new Map<string, Cover[]>();
  try {
    const byCategory = await songsByCategory(categoryIds);
    const candidates = new Map<string, Song[]>();
    for (const [id, shows] of byCategory) candidates.set(id, pickSongs([...shows.values()], CANDIDATES_PER_CATEGORY));
    const art = await storedArt([...new Set([...candidates.values()].flat().map((s) => s.key))]);

    // Songs still to look up, per category: only as many as could still be needed.
    const missing: Song[][] = [];
    for (const [id, songs] of candidates) {
      const covers: Cover[] = [];
      const todo: Song[] = [];
      for (const song of songs) {
        if (covers.length + todo.length >= COVERS_PER_CATEGORY) break;
        const stored = art.get(song.key);
        if (stored?.url) covers.push({ url: stored.url, label: `${song.artist} - ${song.title}` });
        else if (!stored) todo.push(song);
      }
      result.set(id, covers);
      missing.push(todo);
    }
    // Take turns between categories, so they all fill in together.
    const todo: Song[] = [];
    for (let i = 0; todo.length < LOOKUPS_PER_VISIT && missing.some((m) => m[i]); i++) {
      for (const m of missing) if (m[i] && todo.length < LOOKUPS_PER_VISIT) todo.push(m[i]);
    }
    if (todo.length) after(() => fillCovers(todo).catch((err) => console.error("[album-art]", err)));
  } catch (err) {
    // Covers are decoration: never let them break the library screen.
    console.error("[album-art] couldn't load covers", err);
  }
  return result;
}

/** Looks up covers for a show's songs (after its call list is saved), so they're ready sooner. */
export function warmShowCovers(playlistId: string) {
  after(async () => {
    try {
      const { rows } = await db.execute<{ title: string | null }>(sql`
        select s.value->>'title' as title
        from files f
        cross join lateral jsonb_array_elements(coalesce(f.meta->'callList'->'songs', '[]'::jsonb)) with ordinality as s(value, n)
        where f.playlist_id = ${playlistId} and f.kind = 'host_sheet'
        order by s.n`);
      const songs = pickSongs([rows.flatMap((r) => (r.title ? [r.title] : []))], COVERS_PER_CATEGORY);
      const art = await storedArt(songs.map((s) => s.key));
      await fillCovers(songs.filter((s) => !art.has(s.key)));
    } catch (err) {
      console.error("[album-art] couldn't warm covers for show", playlistId, err);
    }
  });
}
