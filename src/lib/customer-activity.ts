import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { ActivityKind } from "@/db/schema";

/** The timeline's filters, and which kinds of event each shows. */
export const ACTIVITY_FILTERS = {
  all: { label: "Everything", kinds: null },
  downloads: { label: "Downloads", kinds: ["downloaded"] },
  shows: { label: "Shows opened and played", kinds: ["show_viewed", "show_played"] },
  searches: { label: "Searches and requests", kinds: ["searched", "category_requested"] },
  account: {
    label: "Logins and account",
    kinds: ["login", "login_failed", "password_changed", "password_reset", "play_mode_changed"],
  },
} as const satisfies Record<string, { label: string; kinds: ActivityKind[] | null }>;

export type ActivityFilter = keyof typeof ACTIVITY_FILTERS;

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  at: Date;
  detail: string;
  /** The show, if it still exists (for a link and its current name). */
  showId: string | null;
  showName: string | null;
};

export async function customerTimeline(userId: string, filter: ActivityFilter, limit: number) {
  const kinds = ACTIVITY_FILTERS[filter].kinds;
  const { rows } = await db.execute<{
    id: string;
    kind: ActivityKind;
    at: Date;
    detail: string;
    show_id: string | null;
    show_name: string | null;
  }>(sql`
    select a.id, a.kind, a.created_at as at, a.detail, p.id as show_id, p.name as show_name
    from activity a
    left join playlists p on p.id = a.playlist_id
    where a.user_id = ${userId}
      ${kinds ? sql`and a.kind::text = any(${sql.param([...kinds])}::text[])` : sql``}
    order by a.created_at desc
    limit ${limit + 1}`);
  const events: ActivityEvent[] = rows.slice(0, limit).map((r) => ({
    id: r.id,
    kind: r.kind,
    at: new Date(r.at),
    detail: r.detail,
    showId: r.show_id,
    showName: r.show_name,
  }));
  return { events, more: rows.length > limit };
}

export type DownloadedShow = {
  showId: string | null;
  show: string;
  category: string | null;
  files: number;
  times: number;
  showFile: boolean;
  first: Date;
  last: Date;
};

/** Each show they've downloaded from: how many files, how often, first and last time. */
export async function customerDownloadedShows(userId: string): Promise<DownloadedShow[]> {
  const { rows } = await db.execute<{
    show_id: string | null;
    show: string | null;
    category: string | null;
    files: number;
    times: number;
    show_file: boolean | null;
    first: Date;
    last: Date;
  }>(sql`
    select a.playlist_id as show_id, p.name as show, c.name as category,
      count(distinct a.file_id)::int as files, count(*)::int as times,
      bool_or(f.kind in ('video', 'audio', 'archive', 'other')) as show_file,
      min(a.created_at) as first, max(a.created_at) as last
    from activity a
    left join playlists p on p.id = a.playlist_id
    left join categories c on c.id = p.category_id
    left join files f on f.id = a.file_id
    where a.user_id = ${userId} and a.kind = 'downloaded'
    group by a.playlist_id, p.name, c.name
    order by max(a.created_at) desc`);
  return rows.map((r) => ({
    showId: r.show_id,
    show: r.show ?? "A show that's since been deleted",
    category: r.category,
    files: r.files,
    times: r.times,
    showFile: !!r.show_file,
    first: new Date(r.first),
    last: new Date(r.last),
  }));
}

export type ActivitySummary = {
  lastActive: Date | null;
  logins30: number;
  failedLogins7: number;
  /** The last failed login, if they haven't logged in successfully since. */
  lockedOutSince: Date | null;
  showsDownloaded: number;
  showsPlayed: number;
  notFound: number;
};

export async function customerSummary(userId: string): Promise<ActivitySummary> {
  const { rows } = await db.execute<{
    last_active: Date | null;
    logins30: number;
    failed7: number;
    last_failed: Date | null;
    last_login: Date | null;
    shows_downloaded: number;
    shows_played: number;
    not_found: number;
  }>(sql`
    select max(created_at) filter (where kind <> 'login_failed') as last_active,
      count(*) filter (where kind = 'login' and created_at > now() - interval '30 days')::int as logins30,
      count(*) filter (where kind = 'login_failed' and created_at > now() - interval '7 days')::int as failed7,
      max(created_at) filter (where kind = 'login_failed') as last_failed,
      max(created_at) filter (where kind in ('login', 'password_reset')) as last_login,
      count(distinct playlist_id) filter (where kind = 'downloaded')::int as shows_downloaded,
      count(distinct playlist_id) filter (where kind = 'show_played')::int as shows_played,
      count(*) filter (where kind = 'searched' and detail like '% · nothing found')::int as not_found
    from activity where user_id = ${userId}`);
  const r = rows[0];
  return {
    lastActive: r?.last_active ? new Date(r.last_active) : null,
    logins30: r?.logins30 ?? 0,
    failedLogins7: r?.failed7 ?? 0,
    lockedOutSince:
      r?.last_failed && (!r.last_login || new Date(r.last_failed) > new Date(r.last_login)) ? new Date(r.last_failed) : null,
    showsDownloaded: r?.shows_downloaded ?? 0,
    showsPlayed: r?.shows_played ?? 0,
    notFound: r?.not_found ?? 0,
  };
}
