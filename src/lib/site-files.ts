import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { siteFiles } from "@/db/schema";

export const HOST_GUIDE = "host-guide";
export const SITE_FILE_MAX_BYTES = 4 * 1024 * 1024; // Vercel takes uploads up to about 4.5 MB

/** A stored file's name, size and date, without loading the file itself. */
export async function siteFileInfo(key: string) {
  const [row] = await db
    .select({ fileName: siteFiles.fileName, sizeBytes: siteFiles.sizeBytes, updatedAt: siteFiles.updatedAt })
    .from(siteFiles)
    .where(eq(siteFiles.key, key))
    .limit(1);
  return row ?? null;
}

export async function siteFile(key: string) {
  const [row] = await db.select().from(siteFiles).where(eq(siteFiles.key, key)).limit(1);
  return row ?? null;
}

export async function saveSiteFile(key: string, file: { fileName: string; contentType: string; data: Buffer }) {
  const values = { ...file, sizeBytes: file.data.length, updatedAt: sql`now()` };
  await db
    .insert(siteFiles)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: siteFiles.key, set: values });
}

/** Content-Disposition with the file's own name (and a plain-ASCII fallback for old browsers). */
export function disposition(kind: "inline" | "attachment", fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
