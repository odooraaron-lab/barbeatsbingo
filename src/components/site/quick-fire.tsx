import { Check } from "lucide-react";
import {
  CHECK_STEPS,
  CROWD_PROMPTS,
  EXAMPLE_CALLS,
  EXAMPLE_KEY,
  GLANCE,
  NIGHT_AT_A_GLANCE,
  PATTERNS,
  WHAT_YOU_NEED,
  type Pattern,
} from "@/lib/quick-fire";

/** "4 games per pack · 7 to 27 minutes each · One fast way to win" */
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

/** The five ways a game can be won, drawn on a 5 by 5 card, with the time to the first winner. */
export function WinningPatterns({ className = "" }: { className?: string }) {
  return (
    <ul className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 ${className}`}>
      {PATTERNS.map((p) => (
        <li key={p.name} className="flex flex-col items-center text-center">
          <PatternCard pattern={p} />
          <span className="mt-3 font-sans text-lg font-bold">{p.name}</span>
          <span className="text-sm text-mist">{p.hint}</span>
          <span className="mt-1 text-sm font-semibold text-sun">{p.time}</span>
        </li>
      ))}
    </ul>
  );
}

/** How to check a Bingo call against the answer key: four steps and the guide's worked example. */
export function CheckingAWinner() {
  const cols = ["1 Line", "2 Lines", "3 Lines", "X", "Blackout"];
  return (
    <div className="grid gap-6">
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHECK_STEPS.map((step, i) => (
          <li key={step.title} className="panel p-5">
            <span className="display grid h-10 w-8 place-items-center rounded-full bg-sun text-lg text-[#1b1b1b]" aria-hidden>
              {i + 1}
            </span>
            <h3 className="mt-3 font-sans text-lg font-bold">
              <span className="sr-only">Step {i + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-1 text-white/85">{step.body}</p>
          </li>
        ))}
      </ol>

      <figure className="panel p-5 sm:p-7">
        <figcaption className="font-sans text-lg font-bold">Worked example, playing 1 line</figcaption>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-mist">Call list. Song 16 has just played.</p>
            <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label="Call list example">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Time</th>
                    <th>Song</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_CALLS.map((c) => (
                    <tr key={c.n} className={c.current ? "bg-sun/15" : ""}>
                      <td className={c.current ? "font-bold text-sun" : ""}>{c.n}</td>
                      <td className="text-mist">{c.time}</td>
                      <td>
                        {c.song} <span className="text-mist">· {c.artist}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-mist">Answer key. Cards 040 and 041 both call Bingo.</p>
            <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label="Answer key example">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Card</th>
                    {cols.map((c) => (
                      <th key={c} className="whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_KEY.map((k) => (
                    <tr key={k.card} className={k.calling ? "bg-white/[0.04]" : ""}>
                      <td className="font-semibold">{k.card}</td>
                      {k.at.map((n, i) => (
                        <td
                          key={i}
                          className={i === 0 && k.calling ? (n <= 16 ? "font-bold text-ok" : "font-bold text-red-bright") : "text-mist"}
                        >
                          {n}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <p className="rounded-xl border border-ok/40 bg-ok/10 p-4 text-white/90">
            <strong className="text-ok">Card 040, winner.</strong> The answer key says 15. That&apos;s lower than 16, so the
            card completed its line on song 15, Green Green Grass. Award the prize.
          </p>
          <p className="rounded-xl border border-red/40 bg-red/10 p-4 text-white/90">
            <strong className="text-red-bright">Card 041, not yet.</strong> The answer key says 37. That&apos;s higher than
            16, so this card needs another 21 songs. Have a laugh with them and resume.
          </p>
        </div>
      </figure>
    </div>
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
