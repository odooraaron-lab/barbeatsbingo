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
