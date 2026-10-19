import type { CSSProperties } from "react";

// Each category's glow on the library screen. `glow` tints the edge, the corner light and
// the play button; `text` is a lighter shade of it that reads well on the dark card.
const HUES = {
  red: { glow: "212 47 60", text: "255 128 136" },
  orange: { glow: "244 154 42", text: "248 186 110" },
  gold: { glow: "245 195 59", text: "248 214 118" },
  lime: { glow: "150 214 70", text: "186 230 124" },
  green: { glow: "60 207 142", text: "112 224 174" },
  teal: { glow: "34 190 200", text: "104 214 222" },
  blue: { glow: "72 132 240", text: "138 176 248" },
  violet: { glow: "150 100 235", text: "188 156 246" },
  pink: { glow: "232 80 160", text: "242 140 194" },
} as const;

type Hue = keyof typeof HUES;

// The starter categories get colours that suit them; any others get one picked from the name.
const BY_SLUG: Record<string, Hue> = {
  country: "orange",
  "bar-favs": "gold",
  rock: "red",
  pop: "pink",
  reggae: "green",
  "70s-80s-90s": "violet",
  "pub-classics": "teal",
  modern: "blue",
  mixtapes: "lime",
};

const ORDER = Object.keys(HUES) as Hue[];

function hueFor(slug: string): Hue {
  if (BY_SLUG[slug]) return BY_SLUG[slug];
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ORDER[h % ORDER.length];
}

/** CSS variables for a category's glow (used by the .genre-card styles). */
export function genreGlow(slug: string): CSSProperties {
  const { glow, text } = HUES[hueFor(slug)];
  return { "--glow": glow, "--glow-text": text } as CSSProperties;
}
