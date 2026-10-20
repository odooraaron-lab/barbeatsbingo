import Link from "next/link";
import {
  BookOpen,
  Download,
  Eye,
  KeyRound,
  LogIn,
  MessageSquarePlus,
  Play,
  Search,
  ShieldAlert,
  ToggleRight,
  type LucideIcon,
} from "lucide-react";
import type { ActivityKind } from "@/db/schema";
import { formatDate, formatDateTime, formatDay, formatTime } from "@/lib/format";
import {
  ACTIVITY_FILTERS,
  type ActivityEvent,
  type ActivityFilter,
  type ActivitySummary,
  type DownloadedShow,
} from "@/lib/customer-activity";

const showLink = (id: string | null, name: string) =>
  id ? (
    <Link href={`/admin/library/playlist/${id}`} className="font-semibold text-white hover:underline">
      {name}
    </Link>
  ) : (
    <span className="font-semibold text-white">{name}</span>
  );

const ICONS: Record<ActivityKind, { icon: LucideIcon; tone: string }> = {
  downloaded: { icon: Download, tone: "text-ok" },
  guide_downloaded: { icon: BookOpen, tone: "text-ok" },
  login: { icon: LogIn, tone: "text-mist" },
  login_failed: { icon: ShieldAlert, tone: "text-red-bright" },
  show_viewed: { icon: Eye, tone: "text-mist" },
  show_played: { icon: Play, tone: "text-sun" },
  searched: { icon: Search, tone: "text-mist" },
  category_requested: { icon: MessageSquarePlus, tone: "text-tang" },
  password_changed: { icon: KeyRound, tone: "text-mist" },
  password_reset: { icon: KeyRound, tone: "text-mist" },
  play_mode_changed: { icon: ToggleRight, tone: "text-mist" },
};

function describe(e: ActivityEvent) {
  const show = e.showName ?? (e.kind === "downloaded" ? null : e.detail);
  switch (e.kind) {
    case "downloaded":
      return (
        <>
          Downloaded <span className="text-white">{e.detail}</span>
          {e.showName ? <> from {showLink(e.showId, e.showName)}</> : <span className="text-fog"> (show since deleted)</span>}
        </>
      );
    case "guide_downloaded":
      return (
        <>
          Downloaded the <span className="text-white">host guide</span>
        </>
      );
    case "login":
      return "Logged in";
    case "login_failed":
      return <span className="text-red-bright">Tried to log in with the wrong password</span>;
    case "show_viewed":
      return <>Opened {showLink(e.showId, show || "a show")}</>;
    case "show_played":
      return <>Played {showLink(e.showId, show || "a show")} on the site</>;
    case "searched": {
      const [words, nothing] = e.detail.split(" · ");
      return (
        <>
          Searched for <span className="text-white">“{words}”</span>
          {nothing && <span className="text-tang"> · nothing found</span>}
        </>
      );
    }
    case "category_requested":
      return (
        <>
          Asked for the <span className="text-white">{e.detail}</span> category
        </>
      );
    case "password_changed":
      return e.detail === "Set by an admin" ? "Password set by an admin" : "Changed their password";
    case "password_reset":
      return "Chose a new password from an emailed link";
    case "play_mode_changed":
      return `Switched the show player and bingo checker ${e.detail === "on" ? "on" : "off"}`;
  }
}

export function ActivitySummaryRow({ summary, lastLogin }: { summary: ActivitySummary; lastLogin: Date | null }) {
  const items = [
    { label: "Last active", value: summary.lastActive ? formatDateTime(summary.lastActive) : "Not yet" },
    { label: "Logins, last 30 days", value: String(summary.logins30) },
    { label: "Shows downloaded", value: String(summary.showsDownloaded) },
    { label: "Shows played on the site", value: String(summary.showsPlayed) },
  ];
  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl border border-line bg-ink/60 px-4 py-3">
            <dt className="text-sm text-mist">{i.label}</dt>
            <dd className="mt-0.5 text-lg font-bold">{i.value}</dd>
          </div>
        ))}
      </dl>
      {summary.lockedOutSince && (
        <p className="alert alert-info mt-3">
          Their last login attempt ({formatDateTime(summary.lockedOutSince)}) used the wrong password, and they
          haven&apos;t got in since{lastLogin ? ` (last successful login ${formatDateTime(lastLogin)})` : ""}. They may
          need a password reset.
        </p>
      )}
      {summary.notFound > 0 && (
        <p className="mt-3 text-sm text-mist">
          They&apos;ve searched for something we don&apos;t have {summary.notFound === 1 ? "once" : `${summary.notFound} times`}{" "}
          (marked <span className="text-tang">nothing found</span> below): ideas for new shows.
        </p>
      )}
    </div>
  );
}

export function DownloadedShows({ shows }: { shows: DownloadedShow[] }) {
  if (!shows.length) return <p className="mt-3 text-mist">Nothing downloaded yet.</p>;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Show</th>
            <th>What</th>
            <th>First downloaded</th>
            <th>Last downloaded</th>
          </tr>
        </thead>
        <tbody>
          {shows.map((s) => (
            <tr key={s.showId ?? "deleted"}>
              <td>
                {showLink(s.showId, s.show)}
                {s.category && <span className="block text-xs text-fog">{s.category}</span>}
              </td>
              <td className="text-mist">
                {s.showFile ? "The show" : "Extras only"}
                {s.files > 1 && ` + ${s.files - (s.showFile ? 1 : 0)} more file${s.files - (s.showFile ? 1 : 0) === 1 ? "" : "s"}`}
                {s.times > s.files && <span className="block text-xs text-fog">{s.times} downloads in all</span>}
              </td>
              <td className="whitespace-nowrap text-mist">{formatDate(s.first)}</td>
              <td className="whitespace-nowrap text-mist">{formatDateTime(s.last)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActivityTimeline({
  events,
  more,
  filter,
  limit,
}: {
  events: ActivityEvent[];
  more: boolean;
  filter: ActivityFilter;
  limit: number;
}) {
  // Group by day, newest first.
  const days: { day: string; events: ActivityEvent[] }[] = [];
  for (const e of events) {
    const day = formatDay(e.at);
    if (days.at(-1)?.day !== day) days.push({ day, events: [] });
    days.at(-1)!.events.push(e);
  }
  return (
    <>
      <nav aria-label="Show in the timeline" className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(ACTIVITY_FILTERS) as ActivityFilter[]).map((f) => (
          <Link
            key={f}
            href={f === "all" ? "?#activity" : `?log=${f}#activity`}
            scroll={false}
            aria-current={f === filter ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              f === filter ? "border-sun bg-sun/15 text-sun" : "border-line text-mist hover:border-white/30 hover:text-white"
            }`}
          >
            {ACTIVITY_FILTERS[f].label}
          </Link>
        ))}
      </nav>
      {events.length === 0 ? (
        <p className="mt-5 text-mist">Nothing here yet.</p>
      ) : (
        <ol className="mt-5 grid gap-6">
          {days.map((d) => (
            <li key={d.day}>
              <h3 className="text-sm font-bold text-sun">{d.day}</h3>
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                {d.events.map((e) => {
                  const { icon: Icon, tone } = ICONS[e.kind];
                  return (
                    <li key={e.id} className="flex items-start gap-3 px-4 py-2.5">
                      <span className="w-16 shrink-0 pt-0.5 text-right text-sm whitespace-nowrap text-fog">
                        {formatTime(e.at)}
                      </span>
                      <Icon size={16} aria-hidden className={`mt-1 shrink-0 ${tone}`} />
                      <span className="min-w-0 text-mist break-words">{describe(e)}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {more && (
        <Link
          href={`?${filter === "all" ? "" : `log=${filter}&`}n=${Math.min(limit * 4, 2000)}#activity`}
          scroll={false}
          className="btn btn-ghost btn-sm mt-5"
        >
          Show older activity
        </Link>
      )}
    </>
  );
}
