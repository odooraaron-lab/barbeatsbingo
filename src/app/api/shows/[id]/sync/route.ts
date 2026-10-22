import { NextResponse, after, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { showSyncs } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { getPlayableShow } from "@/lib/library";
import type { SyncState } from "@/lib/show-sync";
import { logActivity } from "@/lib/activity";

/**
 * Where a customer's game of a show is up to, shared by their devices. Each device
 * reads it every couple of seconds and writes it when something changes there (play,
 * pause, a jump, the songs played set by hand) or, while it plays the sound, every few
 * seconds. Times come from this server's clock, so devices' own clocks don't matter.
 */

const change = z.object({
  time: z.number().finite().min(0).max(24 * 3600),
  playing: z.boolean(),
  sound: z.string().min(1).max(64).nullable(),
  video: z.boolean().optional(),
  played: z.number().int().min(0).max(999).nullable(),
  by: z.string().min(1).max(64),
});

const noStore = { "cache-control": "no-store" };

async function show(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const playable = await getPlayableShow(user, id);
  return playable ? { user, id, name: playable.name } : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const found = await show(params);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const [row] = await db
    .select({ state: showSyncs.state })
    .from(showSyncs)
    .where(and(eq(showSyncs.userId, found.user.id), eq(showSyncs.playlistId, found.id)))
    .limit(1);
  return NextResponse.json({ state: row?.state ?? null, now: Date.now() }, { headers: noStore });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const found = await show(params);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const parsed = change.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400, headers: noStore });
  const now = Date.now();
  const state: SyncState = { ...parsed.data, at: now };
  await db
    .insert(showSyncs)
    .values({ userId: found.user.id, playlistId: found.id, state, updatedAt: new Date(now) })
    .onConflictDoUpdate({ target: [showSyncs.userId, showSyncs.playlistId], set: { state, updatedAt: new Date(now) } });
  // Once per sitting (the player reports every few seconds while it plays).
  if (state.playing) {
    after(() => logActivity(found.user.id, "show_played", { playlistId: found.id, detail: found.name, onceEveryMinutes: 180 }));
  }
  return NextResponse.json({ state, now }, { headers: noStore });
}
