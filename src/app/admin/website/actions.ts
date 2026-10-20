"use server";

import { refresh, updateTag } from "next/cache";
import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { socialPosts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { SOCIAL_POSTS_TAG, parseInstagramLink } from "@/lib/social-posts";

const uuid = z.uuid();
const field = (fd: FormData, name: string, max: number) =>
  String(fd.get(name) ?? "")
    .trim()
    .slice(0, max);
const handleOf = (fd: FormData) => field(fd, "handle", 40).replace(/^@+/, "").replace(/\s+/g, "");

function changed() {
  updateTag(SOCIAL_POSTS_TAG); // the home page shows the change straight away
  refresh();
}

export async function addSocialPost(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const link = parseInstagramLink(field(fd, "url", 500));
  if (!link) {
    return fail(
      "That isn't a link to an Instagram post or reel. In Instagram, tap the post's share button, choose Copy link and paste it here.",
    );
  }
  const handle = handleOf(fd) || link.handle;
  if (handle && !/^[A-Za-z0-9._]{1,30}$/.test(handle))
    return fail("An Instagram account name uses only letters, numbers, dots and underscores.");
  const [existing] = await db
    .select({ id: socialPosts.id })
    .from(socialPosts)
    .where(eq(socialPosts.url, link.url))
    .limit(1);
  if (existing) return fail("That post is already on the list.");
  const [{ top }] = await db.select({ top: max(socialPosts.sortOrder) }).from(socialPosts);
  await db.insert(socialPosts).values({
    url: link.url,
    handle,
    caption: field(fd, "caption", 120),
    sortOrder: (top ?? 0) + 10,
  });
  changed();
  return ok("Added. It's on the home page now.");
}

export async function updateSocialPost(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown post.");
  const handle = handleOf(fd);
  if (handle && !/^[A-Za-z0-9._]{1,30}$/.test(handle))
    return fail("An Instagram account name uses only letters, numbers, dots and underscores.");
  const order = Number.parseInt(field(fd, "sortOrder", 6), 10);
  await db
    .update(socialPosts)
    .set({
      handle,
      caption: field(fd, "caption", 120),
      sortOrder: Number.isFinite(order) ? order : 0,
      isPublished: fd.get("isPublished") === "on",
    })
    .where(eq(socialPosts.id, id));
  changed();
  return ok("Saved.");
}

export async function deleteSocialPost(id: string, _prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown post.");
  await db.delete(socialPosts).where(eq(socialPosts.id, id));
  changed();
  return ok("Removed.");
}
