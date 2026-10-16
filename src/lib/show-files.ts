import type { FileKind } from "@/db/schema";

/** The three files every show has. The track list is also drawn on the show page. */
export const SHOW_SLOTS = [
  {
    key: "show",
    label: "Show file",
    hint: "The game itself, e.g. the music video show.",
    kinds: ["video", "audio", "archive", "other"] as FileKind[],
  },
  {
    key: "scorecards",
    label: "Scorecards",
    hint: "The printable scorecards PDF.",
    kinds: ["scorecards"] as FileKind[],
  },
  {
    key: "tracklist",
    label: "Track list",
    hint: "The track list PDF. Customers also see it on the show page.",
    kinds: ["host_sheet"] as FileKind[],
  },
  {
    key: "preview",
    label: "Audio preview (optional)",
    hint: "A small MP3 of the show for the player on the show page. It starts much faster than the video. Not shown as a download.",
    kinds: ["preview"] as FileKind[],
  },
] as const;

export type SlotKey = (typeof SHOW_SLOTS)[number]["key"];

type FileLike = { id: string; kind: FileKind; source: "storage" | "link" };

/** Which existing link files fill each slot (first match wins). */
export function filesBySlot<T extends FileLike>(files: T[]) {
  const used = new Set<string>();
  const result = {} as Record<SlotKey, T | null>;
  for (const slot of SHOW_SLOTS) {
    const match = files.find(
      (f) => f.source === "link" && !used.has(f.id) && (slot.kinds as readonly FileKind[]).includes(f.kind),
    );
    if (match) used.add(match.id);
    result[slot.key] = match ?? null;
  }
  return result;
}

export function findTrackList<T extends { kind: FileKind }>(files: T[]) {
  return files.find((f) => f.kind === "host_sheet") ?? null;
}

/** What the show page's player should play: the MP3 preview if there is one, otherwise the show file. */
export function findPlayable<T extends { kind: FileKind }>(files: T[]) {
  return (
    files.find((f) => f.kind === "preview") ?? files.find((f) => f.kind === "video" || f.kind === "audio") ?? null
  );
}

/** Files customers can download (previews are only for the player). */
export function downloadableFiles<T extends { kind: FileKind }>(files: T[]) {
  return files.filter((f) => f.kind !== "preview");
}

/**
 * Every show video starts with a 30-second intro. The audio player on the show
 * page skips this much of it and counts the show from there. Downloads are untouched.
 */
export const INTRO_SKIP_SECONDS = 28;
