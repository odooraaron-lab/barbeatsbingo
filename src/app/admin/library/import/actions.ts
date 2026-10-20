"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { linkProblem } from "@/lib/format";
import { applyShowLinks, findCategory, findOrCreateShow } from "@/lib/library-admin";
import { SHOW_SLOTS } from "@/lib/show-files";

const link = z.string().trim().max(2000).optional();
const rowSchema = z.object({
  line: z.number().int().min(1).max(1_000_000),
  category: z.string().trim().max(80),
  show: z.string().trim().max(120),
  links: z.object({ show: link, scorecards: link, tracklist: link, preview: link }),
  description: z.string().trim().max(500),
  visible: z.boolean().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
});
const optionsSchema = z.object({ createCategories: z.boolean(), publishNew: z.boolean() });

export type ImportResult = {
  line: number;
  status: "created" | "updated" | "error";
  message?: string;
  warnings: string[];
  showId?: string;
  label?: string;
};

/**
 * Imports a few rows of the show sheet: finds or creates each category and show,
 * then saves and checks its links. The page sends the sheet a few rows at a time.
 */
export async function importShows(rowsInput: unknown, optionsInput: unknown): Promise<ImportResult[]> {
  await requireAdmin();
  const rows = z.array(rowSchema).max(10).parse(rowsInput);
  const options = optionsSchema.parse(optionsInput);

  const results: ImportResult[] = [];
  const work: { line: number; label: string; show: { id: string; name: string }; created: boolean; links: (typeof rows)[number]["links"] }[] = [];

  // Categories and shows one at a time, so two rows can't create the same one twice.
  for (const row of rows) {
    const label = `${row.category || "?"} › ${row.show || "?"}`;
    if (!row.category || !row.show) {
      results.push({ line: row.line, status: "error", label, message: "Needs a category and a show name.", warnings: [] });
      continue;
    }
    const problems = SHOW_SLOTS.flatMap((slot) => {
      const url = row.links[slot.key];
      const problem = url ? linkProblem(url) : null;
      return problem ? [`${slot.label}: ${problem}`] : [];
    });
    if (problems.length) {
      results.push({ line: row.line, status: "error", label, message: problems.join("\n"), warnings: [] });
      continue;
    }
    try {
      const found = await findCategory(row.category, options.createCategories);
      if (!found) {
        results.push({
          line: row.line,
          status: "error",
          label,
          message: `There's no category called "${row.category}". Check the spelling, or tick "Create categories that don't exist yet".`,
          warnings: [],
        });
        continue;
      }
      const { show, created } = await findOrCreateShow(found.category.id, row.show, {
        description: row.description || undefined,
        isPublished: row.visible,
        publishNew: options.publishNew,
        difficulty: row.difficulty ?? null,
      });
      work.push({ line: row.line, label: `${found.category.name} › ${show.name}`, show, created, links: row.links });
    } catch (err) {
      console.error("[import] row failed", row.line, err);
      results.push({ line: row.line, status: "error", label, message: "Something went wrong saving this row. Try again.", warnings: [] });
    }
  }

  // Then the links, a few shows at a time (checking links means fetching from Zoho).
  const queue = [...work];
  const busy = new Set<string>();
  async function next(): Promise<void> {
    const i = queue.findIndex((w) => !busy.has(w.show.id));
    if (i < 0) return;
    const [item] = queue.splice(i, 1);
    busy.add(item.show.id);
    try {
      const outcome = await applyShowLinks(item.show, { links: item.links, removeEmpty: false });
      results.push({
        line: item.line,
        status: outcome.error ? "error" : item.created ? "created" : "updated",
        label: item.label,
        message: outcome.error,
        warnings: outcome.warnings,
        showId: item.show.id,
      });
    } catch (err) {
      console.error("[import] links failed", item.line, err);
      results.push({ line: item.line, status: "error", label: item.label, message: "Something went wrong saving the links. Try again.", warnings: [], showId: item.show.id });
    } finally {
      busy.delete(item.show.id);
    }
    return next();
  }
  await Promise.all([next(), next(), next()]);

  return results.sort((a, b) => a.line - b.line);
}
