import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, playlists } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { ImportTool } from "./import-tool";

export const metadata: Metadata = { title: "Import shows" };

export default async function ImportPage() {
  await requireAdmin();
  const rows = await db
    .select({ category: categories.name, show: playlists.name })
    .from(categories)
    .leftJoin(playlists, eq(playlists.categoryId, categories.id))
    .orderBy(asc(categories.sortOrder));

  // Category name → its show names, so the preview can say what's new and what's an update.
  const existing: Record<string, string[]> = {};
  for (const r of rows) {
    existing[r.category] ??= [];
    if (r.show) existing[r.category].push(r.show);
  }

  return (
    <>
      <Breadcrumbs items={[{ label: "Library", href: "/admin/library" }, { label: "Import shows" }]} />
      <h1 className="mt-4 text-[clamp(2.2rem,5vw,3rem)]">Import shows from a spreadsheet</h1>
      <p className="mt-2 max-w-3xl text-mist">
        Add lots of shows at once: one row per show, with its category and its four Zoho links. Shows that already
        exist get their links updated; blank cells leave what&apos;s there alone.
      </p>
      <div className="mt-8">
        <ImportTool existing={existing} />
      </div>
    </>
  );
}
