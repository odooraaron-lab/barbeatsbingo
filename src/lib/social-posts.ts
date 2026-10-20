import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { socialPosts } from "@/db/schema";

export const SOCIAL_POSTS_TAG = "social-posts";
/** How many show on the home page. */
export const HOME_POST_LIMIT = 6;

export type InstagramLink = { url: string; handle: string; kind: "reel" | "post" | "video" };

const KINDS: Record<string, InstagramLink["kind"]> = { reel: "reel", reels: "reel", p: "post", tv: "video" };

/**
 * Reads an Instagram post or reel link as shared from the app ("Share → Copy link"), e.g.
 * https://www.instagram.com/reel/C8xYz12AbCd/?igsh=… or https://www.instagram.com/somebar/p/C8xYz12AbCd/,
 * and tidies it to https://www.instagram.com/reel/C8xYz12AbCd/. Null if it isn't one.
 */
export function parseInstagramLink(input: string): InstagramLink | null {
  let u: URL;
  try {
    u = new URL(input.trim().startsWith("http") ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (host !== "instagram.com" && host !== "instagr.am") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  // /reel/CODE, or /username/reel/CODE
  const at = parts.findIndex((p) => p.toLowerCase() in KINDS);
  if (at < 0 || at > 1 || !parts[at + 1] || !/^[A-Za-z0-9_-]{5,40}$/.test(parts[at + 1])) return null;
  const kind = KINDS[parts[at].toLowerCase()];
  const code = parts[at + 1];
  const path = kind === "reel" ? "reel" : kind === "video" ? "tv" : "p";
  const handle = at === 1 && /^[A-Za-z0-9._]{1,30}$/.test(parts[0]) ? parts[0] : "";
  return { url: `https://www.instagram.com/${path}/${code}/`, handle, kind };
}

export function kindOf(url: string): InstagramLink["kind"] {
  return parseInstagramLink(url)?.kind ?? "post";
}

/** The posts shown on the home page. Cached; adding or changing a post refreshes it. */
export async function homePagePosts() {
  "use cache";
  cacheTag(SOCIAL_POSTS_TAG);
  cacheLife("hours");
  try {
    return await db
      .select({ id: socialPosts.id, url: socialPosts.url, handle: socialPosts.handle, caption: socialPosts.caption })
      .from(socialPosts)
      .where(eq(socialPosts.isPublished, true))
      .orderBy(asc(socialPosts.sortOrder), desc(socialPosts.createdAt))
      .limit(HOME_POST_LIMIT);
  } catch (err) {
    // A section at the bottom of the page: never let it break the home page.
    console.error("[social-posts] couldn't load", err);
    return [];
  }
}

export async function allPosts() {
  return db.select().from(socialPosts).orderBy(asc(socialPosts.sortOrder), desc(socialPosts.createdAt));
}
