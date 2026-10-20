import { Check } from "lucide-react";
import { CROWD_PROMPTS, GLANCE, NIGHT_AT_A_GLANCE, PATTERNS, WHAT_YOU_NEED, type Pattern } from "@/lib/quick-fire";

/** "4 games per pack · 15 to 25 minutes each · One fast way to win" */
export function QuickFireGlance({ className = "" }: { className?: string }) {
  return (
    <dl className={`grid gap-3 sm:grid-cols-3 ${className}`}>
      {GLANCE.map((g) => (
        <div key={g.title} className="rounded-2xl border border-line bg-coal p-5">
          <dt className="font-sans text-lg font-bold text-sun">{g.title}</dt>
          <dd className="mt-1 text-white/85">{g.body}</dd>
        </div>
      ))}
    </dl>
  );
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  const size = 5;
  return (
    <svg viewBox="0 0 54 54" className="w-full max-w-[112px]" aria-hidden>
      {Array.from({ length: size * size }, (_, i) => {
        const r = Math.floor(i / size);
        const c = i % size;
        const on = pattern.cells(r, c);
        return (
          <rect
            key={i}
            x={c * 11}
            y={r * 11}
            width="9.6"
            height="9.6"
            rx="1.6"
            fill={on ? "var(--color-red)" : "rgb(255 255 255 / 0.1)"}
          />
        );
      })}
    </svg>
  );
}

/** The four ways a game can be won, drawn on a 5 by 5 card. */
export function WinningPatterns({ className = "" }: { className?: string }) {
  return (
    <ul className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 ${className}`}>
      {PATTERNS.map((p) => (
        <li key={p.name} className="flex flex-col items-center text-center">
          <PatternCard pattern={p} />
          <span className="mt-3 font-sans text-lg font-bold">{p.name}</span>
          <span className="text-sm text-mist">{p.hint}</span>
        </li>
      ))}
    </ul>
  );
}

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-white/90">
          <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border border-red/70 text-red-bright">
            <Check size={13} strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function WhatYouNeed() {
  return (
    <div className="[&_ul]:sm:grid-cols-2 [&_ul]:sm:gap-x-8">
      <Ticks items={WHAT_YOU_NEED} />
    </div>
  );
}

/** Before, during and after: the night on one card. */
export function NightAtAGlance() {
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {NIGHT_AT_A_GLANCE.map((col) => (
        <div key={col.title}>
          <h3 className="mb-3 font-sans text-lg font-bold text-sun">{col.title}</h3>
          <Ticks items={col.items} />
        </div>
      ))}
    </div>
  );
}

/** A few of the family-friendly crowd game prompts, with their examples. */
export function CrowdPrompts({ limit = CROWD_PROMPTS.length }: { limit?: number }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {CROWD_PROMPTS.slice(0, limit).map((p) => (
        <li key={p.prompt} className="rounded-2xl border border-line bg-coal p-5">
          <p className="font-sans text-lg font-bold leading-snug">{p.prompt}</p>
          <p className="mt-2 text-mist">
            {p.examples.map((e, i) => (
              <span key={e}>
                {i > 0 && ", "}
                <span className="text-white/90">&ldquo;{e}&rdquo;</span>
              </span>
            ))}
          </p>
        </li>
      ))}
    </ul>
  );
}
