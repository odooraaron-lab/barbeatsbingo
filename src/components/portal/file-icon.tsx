import { ClipboardList, File, FileArchive, FileText, Film, Grid3x3, Music } from "lucide-react";
import type { FileKind } from "@/db/schema";

const ICONS = {
  video: Film,
  audio: Music,
  scorecards: Grid3x3,
  host_sheet: ClipboardList,
  document: FileText,
  archive: FileArchive,
  other: File,
} as const;

const TONES: Record<FileKind, string> = {
  video: "bg-red/20 text-red-bright",
  audio: "bg-tang/20 text-tang",
  scorecards: "bg-sun/20 text-sun",
  host_sheet: "bg-sun/20 text-sun",
  document: "bg-white/10 text-mist",
  archive: "bg-white/10 text-mist",
  other: "bg-white/10 text-mist",
};

export function FileIcon({ kind, size = 22 }: { kind: FileKind; size?: number }) {
  const Icon = ICONS[kind] ?? File;
  return (
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONES[kind]}`} aria-hidden>
      <Icon size={size} />
    </span>
  );
}
