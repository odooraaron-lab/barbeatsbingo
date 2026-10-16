/**
 * Reads a spreadsheet saved as CSV, or rows copied from Excel / Google Sheets
 * (which paste as tab-separated text), into the rows of a show import.
 */

import type { SlotKey } from "./show-files";

export type ImportRow = {
  /** Row number in the sheet, for messages. */
  line: number;
  category: string;
  show: string;
  links: Partial<Record<SlotKey, string>>;
  description: string;
  /** True or false when the sheet says; null when it's left blank. */
  visible: boolean | null;
};

type Field = "category" | "showName" | "description" | "visible" | `link:${SlotKey}`;

/** The columns, in the template's order, and the headings we recognise for each. */
export const IMPORT_COLUMNS: { field: Field; heading: string; aliases: string[] }[] = [
  { field: "category", heading: "Category", aliases: ["category", "genre", "categoryfolder"] },
  { field: "showName", heading: "Show", aliases: ["show", "showname", "name", "playlist", "showfolder"] },
  {
    field: "link:show",
    heading: "Show file link",
    aliases: ["showfile", "showfilelink", "showlink", "video", "videolink", "playnow", "file"],
  },
  {
    field: "link:scorecards",
    heading: "Scorecards link",
    aliases: ["scorecards", "scorecardslink", "scorecard", "scorecardlink", "cards"],
  },
  {
    field: "link:tracklist",
    heading: "Track list link",
    aliases: ["tracklist", "tracklistlink", "calllist", "calllistlink", "callist", "callistlink"],
  },
  {
    field: "link:preview",
    heading: "MP3 link",
    aliases: ["mp3", "mp3link", "mp3fortheplayer", "preview", "previewlink", "audiopreview"],
  },
  { field: "description", heading: "Description", aliases: ["description", "notes"] },
  { field: "visible", heading: "Visible", aliases: ["visible", "published", "showtocustomers", "live"] },
];

export const TEMPLATE_CSV = IMPORT_COLUMNS.map((c) => c.heading).join(",") + "\r\n";

const normalise = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Picks the separator: tabs (pasted from a spreadsheet), semicolons (some Excel settings) or commas. */
function separatorOf(text: string) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  if (count("\t") > 0) return "\t";
  return count(";") > count(",") ? ";" : ",";
}

/** Splits CSV/TSV text into cells, handling quoted cells (which can contain separators and line breaks). */
export function parseCells(text: string): string[][] {
  const sep = separatorOf(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
}

function parseVisible(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (["yes", "y", "true", "1", "visible", "show", "live", "on"].includes(v)) return true;
  if (["no", "n", "false", "0", "hidden", "hide", "off"].includes(v)) return false;
  return null;
}

export type ParsedSheet = { rows: ImportRow[]; hasHeader: boolean; unknownHeadings: string[] };

/** Turns sheet text into import rows. Uses the heading row if there is one, else the template's column order. */
export function parseImportSheet(text: string): ParsedSheet {
  const cells = parseCells(text);
  if (!cells.length) return { rows: [], hasHeader: false, unknownHeadings: [] };

  const lookup = new Map<string, Field>();
  for (const c of IMPORT_COLUMNS) for (const a of c.aliases) lookup.set(a, c.field);

  const first = cells[0].map(normalise);
  const recognised = first.filter((h) => lookup.has(h)).length;
  const hasHeader = recognised >= 2;
  const fields: (Field | null)[] = hasHeader
    ? first.map((h) => lookup.get(h) ?? null)
    : IMPORT_COLUMNS.map((c) => c.field);
  const unknownHeadings = hasHeader ? cells[0].filter((_, i) => !fields[i] && cells[0][i]) : [];

  const rows: ImportRow[] = [];
  cells.slice(hasHeader ? 1 : 0).forEach((r, i) => {
    const row: ImportRow = { line: i + (hasHeader ? 2 : 1), category: "", show: "", links: {}, description: "", visible: null };
    r.forEach((value, col) => {
      const field = fields[col];
      if (!field || !value) return;
      if (field === "category") row.category = value.slice(0, 80);
      else if (field === "showName") row.show = value.slice(0, 120);
      else if (field === "description") row.description = value.slice(0, 500);
      else if (field === "visible") row.visible = parseVisible(value);
      else row.links[field.slice(5) as SlotKey] = value.slice(0, 2000);
    });
    rows.push(row);
  });
  return { rows, hasHeader, unknownHeadings };
}
