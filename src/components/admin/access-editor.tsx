"use client";

import { useState } from "react";

type Genre = { id: string; name: string; isPublished: boolean; playlists: { id: string; name: string; isPublished: boolean }[] };

export function AccessEditor({
  genres,
  initialAll,
  initialCategories,
  initialPlaylists,
}: {
  genres: Genre[];
  initialAll: boolean;
  initialCategories: string[];
  initialPlaylists: string[];
}) {
  const [all, setAll] = useState(initialAll);
  const [cats, setCats] = useState(() => new Set(initialCategories));
  const [pls, setPls] = useState(() => new Set(initialPlaylists));

  const toggle = (set: Set<string>, id: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };

  return (
    <div className="grid gap-4">
      <label className="check rounded-xl border border-line bg-ink/60 p-4">
        <input type="checkbox" name="accessAll" checked={all} onChange={(e) => setAll(e.target.checked)} />
        <span>
          <span className="block font-semibold">Everything in the library</span>
          <span className="block text-sm text-mist">Includes categories and shows you add later.</span>
        </span>
      </label>

      {!all && (
        <>
          <p className="text-sm text-mist">
            Or choose categories (includes every show in them, now and later) or individual shows.
          </p>
          {genres.length === 0 && <p className="text-mist">Add some categories to the library first.</p>}
          <ul className="grid gap-2">
            {genres.map((g) => {
              const whole = cats.has(g.id);
              const picked = g.playlists.filter((p) => pls.has(p.id)).length;
              return (
                <li key={g.id} className="rounded-xl border border-line bg-ink/60">
                  <details open={!whole && picked > 0}>
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                      <input
                        type="checkbox"
                        name="category"
                        value={g.id}
                        checked={whole}
                        onChange={(e) => setCats((s) => toggle(s, g.id, e.target.checked))}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Whole category: ${g.name}`}
                        className="h-5 w-5 accent-[var(--color-red)]"
                      />
                      <span className="font-semibold">{g.name}</span>
                      {!g.isPublished && <span className="tag">Hidden</span>}
                      <span className="ml-auto text-sm text-mist">
                        {whole ? "Whole category" : picked ? `${picked} of ${g.playlists.length} shows` : `${g.playlists.length} shows`}
                      </span>
                    </summary>
                    {g.playlists.length > 0 && (
                      <ul className="grid gap-1 border-t border-line px-3 py-3 sm:grid-cols-2">
                        {g.playlists.map((p) => (
                          <li key={p.id}>
                            <label className={`check rounded-lg px-2 py-1.5 ${whole ? "opacity-50" : ""}`}>
                              <input
                                type="checkbox"
                                name={whole ? undefined : "playlist"}
                                value={p.id}
                                checked={whole || pls.has(p.id)}
                                disabled={whole}
                                onChange={(e) => setPls((s) => toggle(s, p.id, e.target.checked))}
                              />
                              <span>
                                {p.name}
                                {!p.isPublished && <span className="tag ml-2">Hidden</span>}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
