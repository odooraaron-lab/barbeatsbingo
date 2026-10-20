import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { activity, type ActivityKind } from "@/db/schema";

type Extra = {
  playlistId?: string | null;
  fileId?: string | null;
  /** The show's name, the file's title, the words searched for… */
  detail?: string;
  /** Skip it if the same thing was logged within this many minutes (e.g. reopening a show). */
  onceEveryMinutes?: number;
};

/** Notes something a customer did, for their page in the admin. Never throws: logging mustn't break the site. */
export async function logActivity(userId: string, kind: ActivityKind, extra: Extra = {}) {
  try {
    const detail = (extra.detail ?? "").slice(0, 300);
    const values = { userId, kind, playlistId: extra.playlistId ?? null, fileId: extra.fileId ?? null, detail };
    if (!extra.onceEveryMinutes) {
      await db.insert(activity).values(values);
      return;
    }
    // One check-and-insert at a time for the same thing, so two requests at once
    // (a page can be drawn twice for one visit) can't both add it.
    const since = new Date(Date.now() - extra.onceEveryMinutes * 60_000);
    const same = extra.playlistId ? eq(activity.playlistId, extra.playlistId) : eq(activity.detail, detail);
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${userId}|${kind}|${extra.playlistId ?? detail}`}))`);
      const [recent] = await tx
        .select({ id: activity.id })
        .from(activity)
        .where(and(eq(activity.userId, userId), eq(activity.kind, kind), gt(activity.createdAt, since), same))
        .limit(1);
      if (!recent) await tx.insert(activity).values(values);
    });
  } catch (err) {
    console.error("[activity] couldn't log", kind, err);
  }
}
