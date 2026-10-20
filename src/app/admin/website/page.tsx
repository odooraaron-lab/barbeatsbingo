import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { ActionForm } from "@/components/admin/action-form";
import { HOME_POST_LIMIT, allPosts, kindOf } from "@/lib/social-posts";
import { addSocialPost, deleteSocialPost, updateSocialPost } from "./actions";

export const metadata: Metadata = { title: "Website" };

export default async function WebsitePage() {
  await requireAdmin();
  const posts = await allPosts();
  const shown = posts.filter((p) => p.isPublished).length;

  return (
    <>
      <h1 className="text-[clamp(2.2rem,5vw,3rem)]">Website</h1>
      <p className="mt-2 max-w-2xl text-mist">Things on the public website you can change here.</p>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="panel p-6 sm:p-8" aria-labelledby="posts-heading">
          <h2 id="posts-heading" className="font-sans text-xl font-bold">
            Instagram posts on the home page
          </h2>
          <p className="mt-1 text-sm text-mist">
            Links to posts by venues running Bar Beats Bingo, in a small &ldquo;Seen on Instagram&rdquo; row at the
            bottom of the home page. The first {HOME_POST_LIMIT} visible ones show (lowest order number first). With
            none, the row doesn&apos;t appear.
          </p>

          {posts.length === 0 ? (
            <p className="mt-6 text-mist">No posts yet. Add one on the right.</p>
          ) : (
            <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
              {posts.map((p) => (
                <li key={p.id} className="px-4 py-3">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {p.handle ? `@${p.handle}` : `A ${kindOf(p.url)} with no account name`}
                          {!p.isPublished && <span className="tag ml-2">Hidden</span>}
                        </span>
                        <span className="block truncate text-sm text-mist">
                          {p.caption || "No caption"} · added {formatDate(p.createdAt)} · order {p.sortOrder}
                        </span>
                      </span>
                      <span className="text-sm text-fog group-open:hidden">Edit</span>
                      <span className="hidden text-sm text-fog group-open:inline">Close</span>
                    </summary>
                    <div className="mt-3 grid gap-3 rounded-xl border border-line bg-ink/60 p-4">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm break-all text-sun hover:underline"
                      >
                        {p.url} <ExternalLink size={14} aria-hidden className="shrink-0" />
                      </a>
                      <ActionForm
                        action={updateSocialPost.bind(null, p.id)}
                        submitLabel="Save"
                        submitClassName="btn btn-red btn-sm"
                        className="grid gap-3"
                      >
                        <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
                          <div>
                            <label htmlFor={`h-${p.id}`} className="label">
                              Instagram account
                            </label>
                            <input
                              id={`h-${p.id}`}
                              name="handle"
                              className="field"
                              defaultValue={p.handle}
                              placeholder="@venue"
                            />
                          </div>
                          <div>
                            <label htmlFor={`o-${p.id}`} className="label">
                              Order
                            </label>
                            <input
                              id={`o-${p.id}`}
                              name="sortOrder"
                              type="number"
                              className="field"
                              defaultValue={p.sortOrder}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`c-${p.id}`} className="label">
                            Caption
                          </label>
                          <input
                            id={`c-${p.id}`}
                            name="caption"
                            className="field"
                            maxLength={120}
                            defaultValue={p.caption}
                          />
                        </div>
                        <label className="check">
                          <input type="checkbox" name="isPublished" defaultChecked={p.isPublished} />
                          <span className="font-semibold">Show on the home page</span>
                        </label>
                      </ActionForm>
                      <ActionForm
                        action={deleteSocialPost.bind(null, p.id)}
                        submitLabel="Remove"
                        pendingLabel="Removing…"
                        submitClassName="btn btn-quiet btn-sm text-red-bright"
                        className="contents"
                        confirm="Remove this post from the list?"
                      >
                        {null}
                      </ActionForm>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
          {posts.length > 0 && (
            <p className="mt-3 text-sm text-fog">
              {shown === 0
                ? "None are visible, so the row is hidden."
                : `${Math.min(shown, HOME_POST_LIMIT)} showing on the home page.`}
            </p>
          )}
        </section>

        <section className="panel p-6 sm:p-8" aria-labelledby="add-heading">
          <h2 id="add-heading" className="font-sans text-xl font-bold">
            Add a post
          </h2>
          <div className="mt-4">
            <ActionForm action={addSocialPost} submitLabel="Add post" pendingLabel="Adding…" resetOnSuccess>
              <div>
                <label htmlFor="url" className="label">
                  Link to the post or reel
                </label>
                <input
                  id="url"
                  name="url"
                  required
                  className="field"
                  placeholder="https://www.instagram.com/reel/…"
                  inputMode="url"
                />
                <p className="hint">In Instagram, tap the post&apos;s share button and choose Copy link.</p>
              </div>
              <div>
                <label htmlFor="handle" className="label">
                  Instagram account (optional)
                </label>
                <input id="handle" name="handle" className="field" placeholder="@venue" />
                <p className="hint">Who posted it, e.g. the venue. Shown on the link.</p>
              </div>
              <div>
                <label htmlFor="caption" className="label">
                  Caption (optional)
                </label>
                <input
                  id="caption"
                  name="caption"
                  className="field"
                  maxLength={120}
                  placeholder="Friday night bingo at The Local"
                />
              </div>
            </ActionForm>
          </div>
        </section>
      </div>
    </>
  );
}
