import type { FileKind } from "@/db/schema";

export function formatBytes(bytes: number | null | undefined) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

const dateFormat = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});
const dateTimeFormat = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Pacific/Auckland",
});

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return dateFormat.format(typeof d === "string" ? new Date(d) : d);
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "";
  return dateTimeFormat.format(typeof d === "string" ? new Date(d) : d);
}

/** yyyy-mm-dd for <input type="date">, in NZ time. */
export function toDateInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(d);
}

export function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}

export const FILE_KINDS: { value: FileKind; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "scorecards", label: "Scorecards" },
  { value: "host_sheet", label: "Host sheet" },
  { value: "document", label: "Document" },
  { value: "archive", label: "Zip / archive" },
  { value: "other", label: "Other" },
];

export function kindLabel(kind: FileKind) {
  return FILE_KINDS.find((k) => k.value === kind)?.label ?? "File";
}

export function guessKind(fileName: string, contentType = ""): FileKind {
  const name = fileName.toLowerCase();
  const ext = name.split(".").pop() ?? "";
  if (contentType.startsWith("video/") || ["mp4", "mov", "m4v", "mkv", "avi", "wmv", "webm"].includes(ext))
    return "video";
  if (contentType.startsWith("audio/") || ["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(ext))
    return "audio";
  if (["zip", "rar", "7z"].includes(ext)) return "archive";
  if (/score\s*card|scorecard|cards?\b/.test(name)) return "scorecards";
  if (/host|answer|track\s*list|tracklist/.test(name)) return "host_sheet";
  if (["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "ppt", "pptx"].includes(ext)) return "document";
  return "other";
}

/** "Round 2 - Pub Classics.mp4" -> "Round 2 - Pub Classics" */
export function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[a-z0-9]{1,5}$/i, "").replace(/[_]+/g, " ").trim() || fileName;
}

/** Turn share links into direct-download links where we know how. */
export function directDownloadUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("dropbox.com")) {
      u.searchParams.delete("dl");
      u.searchParams.set("dl", "1");
      return u.toString();
    }
    if (u.hostname === "drive.google.com") {
      const match = u.pathname.match(/\/file\/d\/([^/]+)/);
      const id = match?.[1] ?? u.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    return url;
  } catch {
    return url;
  }
}
