"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

/**
 * The home page's opening scene: a Bar Beats Bingo show playing in a venue.
 * The TV plays the music videos, the crowd bobs along, and your scorecard gets
 * stamped each time one of its songs plays, until the middle row makes a line.
 */

const LETTERS = ["B", "I", "N", "G", "O"];

// The scorecard, row by row ("Title · Artist"); null is the free space.
const CELLS: (string | null)[] = [
  "Love Not War · Jason Derulo",
  "Heat Waves · Glass Animals",
  "Shake It Off · Taylor Swift",
  "Cover Me In Sunshine · P!nk",
  "Dance Monkey · Tones And I",
  "Dancing Feet · Kygo",
  "Despacito · Luis Fonsi",
  "Better When I'm Dancin' · Meghan Trainor",
  "Kiss My (Uh Oh) · Anne-Marie",
  "Final Song · MØ",
  "Good As Hell · Lizzo",
  "Señorita · Shawn Mendes",
  null,
  "X · Jonas Brothers",
  "BED · Joel Corry",
  "SNAP · Rosa Linn",
  "What A Man Gotta Do · Jonas Brothers",
  "Cold Heart · Elton John, Dua Lipa",
  "Easy On Me · Adele",
  "Ghost · Ella Henderson",
  "Watermelon Sugar · Harry Styles",
  "Just You And I · Tom Walker",
  "I Ain't Worried · OneRepublic",
  "Weekend · Mufasa & Hypeman",
  "Levitating · Dua Lipa",
];

// The songs the show plays, in order. Letters go B, I, N, G, O in turn, and a song
// on the card always sits in its letter's column. The 11th song finishes the middle row.
type Call = { cell: number | null; title: string; artist: string; hue: number };
const CALLS: Call[] = [
  { cell: 0, title: "Love Not War", artist: "Jason Derulo", hue: 350 },
  { cell: 11, title: "Señorita", artist: "Shawn Mendes", hue: 28 },
  { cell: 17, title: "Cold Heart", artist: "Elton John, Dua Lipa", hue: 200 },
  { cell: 13, title: "X", artist: "Jonas Brothers", hue: 285 },
  { cell: null, title: "Shut Up and Dance", artist: "Walk the Moon", hue: 165 },
  { cell: null, title: "Mr. Brightside", artist: "The Killers", hue: 12 },
  { cell: 6, title: "Despacito", artist: "Luis Fonsi", hue: 45 },
  { cell: null, title: "Valerie", artist: "Amy Winehouse", hue: 190 },
  { cell: 23, title: "Weekend", artist: "Mufasa & Hypeman", hue: 320 },
  { cell: 14, title: "BED", artist: "Joel Corry", hue: 255 },
  { cell: 10, title: "Good As Hell", artist: "Lizzo", hue: 340 },
];
const WIN_ROW = 2;

type State = {
  /** Index into CALLS of the song on the TV; -1 shows the round's title card. */
  call: number;
  stamped: number[];
  /** The dauber hovers over `cell` (or rests beside the card when null). */
  dauber: { cell: number | null; press: boolean };
  win: boolean;
  clearing: boolean;
};

const START: State = { call: -1, stamped: [], dauber: { cell: null, press: false }, win: false, clearing: false };
const FINISHED: State = {
  call: CALLS.length - 1,
  stamped: CALLS.flatMap((c) => (c.cell === null ? [] : [c.cell])),
  dauber: { cell: null, press: false },
  win: true,
  clearing: false,
};

// The card is laid out in container units (1cqw = 1% of the card's width), so the
// dauber can be aimed at any square with plain arithmetic.
const PAD = 3;
const GAP = 0.7;
const HEAD = 7.5;
const CELL = (100 - PAD * 2 - GAP * 4) / 5;
const cellCentre = (i: number) => ({
  x: PAD + (i % 5) * (CELL + GAP) + CELL / 2,
  y: PAD + HEAD + GAP + Math.floor(i / 5) * (CELL + GAP) + CELL / 2,
});
const DAUBER_W = 11;
const DAUBER_H = (DAUBER_W * 90) / 40;
const DAUBER_REST = { x: -4, y: 78 };

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const mq = window.matchMedia(motionQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function NeonSign() {
  const id = useId();
  return (
    <svg viewBox="0 0 320 112" className="show-sign" aria-hidden>
      <defs>
        <filter id={`${id}-red`} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="near" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="far" />
          <feMerge>
            <feMergeNode in="far" />
            <feMergeNode in="near" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}-amber`} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="near" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="far" />
          <feMerge>
            <feMergeNode in="far" />
            <feMergeNode in="near" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* The tube outline round the sign */}
      <rect x="8" y="8" width="304" height="96" rx="24" fill="none" stroke="#ffb02e" strokeWidth="5" filter={`url(#${id}-amber)`} />
      <rect x="8" y="8" width="304" height="96" rx="24" fill="none" stroke="#fff1c9" strokeWidth="1.6" />
      <text
        x="160"
        y="78"
        textAnchor="middle"
        className="show-sign-letters"
        fontSize="62"
        letterSpacing="6"
        fill="none"
        stroke="#ff3a55"
        strokeWidth="5"
        filter={`url(#${id}-red)`}
      >
        BIN<tspan className="show-sign-buzz">G</tspan>O
      </text>
      <text
        x="160"
        y="78"
        textAnchor="middle"
        className="show-sign-letters"
        fontSize="62"
        letterSpacing="6"
        fill="none"
        stroke="#ffe0e5"
        strokeWidth="1.5"
      >
        BIN<tspan className="show-sign-buzz">G</tspan>O
      </text>
    </svg>
  );
}

function Tv({ state }: { state: State }) {
  const song = state.call >= 0 ? CALLS[state.call] : null;
  return (
    <div className="show-tv">
      <div className="show-screen">
        <span className="show-blob show-blob-a" />
        <span className="show-blob show-blob-b" />
        <span className="show-spot show-spot-l" />
        <span className="show-spot show-spot-r" />
        {/* A singer on stage, in silhouette */}
        <svg viewBox="0 0 160 90" className="show-singer" aria-hidden>
          <rect x="0" y="84" width="160" height="6" className="show-stage" />
          <circle cx="82" cy="31" r="4.8" />
          <path d="M75.5 39.5 C78 37.6 86 37.6 88.5 39.5 L90.5 61 L73.5 61 Z" />
          <path d="M74.5 60 L72.5 85 L78.6 85 L81.6 66.5 L84.4 85 L90.5 85 L89.5 60 Z" />
          <path d="M87.5 41.5 C92 37 94.5 30 95.5 21.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="95.7" cy="20.2" r="2.2" />
          <path d="M76.6 41.8 C71.5 45.5 72.5 40 77.6 35.6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <rect x="77.2" y="32.3" width="2.4" height="4.6" rx="1.2" transform="rotate(-35 78.4 34.6)" />
        </svg>
        <span className="show-eq" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} style={{ animationDelay: `${-i * 0.17}s`, animationDuration: `${0.55 + (i % 3) * 0.18}s` }} />
          ))}
        </span>

        {state.call < 0 && (
          <span className="show-title-card">
            <span className="show-title-big">Round 1</span>
            <span className="show-title-small">Markers at the ready</span>
          </span>
        )}
        {song && !state.win && (
          <>
            <span className="show-counter">Song {state.call + 1}</span>
            <span key={state.call} className="show-caption">
              <span className="show-caption-letter">{LETTERS[state.call % 5]}</span>
              <span className="show-caption-text">
                <span className="show-caption-title">{song.title}</span>
                <span className="show-caption-artist">{song.artist}</span>
              </span>
            </span>
          </>
        )}
        {state.win && (
          <span className="show-paused">
            <span className="show-paused-icon" aria-hidden>
              <span />
              <span />
            </span>
            <span className="show-paused-big">Bingo!</span>
            <span className="show-paused-small">Checking the card</span>
          </span>
        )}
        <span className="show-scanlines" />
      </div>
    </div>
  );
}

type PersonProps = {
  x: number;
  s?: number;
  hair?: "short" | "pony" | "bun" | "cap" | "curls" | "long";
  hold?: "drink" | "card";
  delay: number;
};

/** One person in the crowd, seen from behind. Their bottom edge sits at y=150. */
function Person({ x, s = 1, hair = "short", hold, delay }: PersonProps) {
  const arm = (side: 1 | -1) => (
    <>
      <path
        d={`M${22 * side} 112 C${30 * side} 98 ${35 * side} 84 ${37 * side} 68`}
        className="show-limb"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={37 * side} cy="64" r="6.5" />
    </>
  );
  return (
    <g transform={`translate(${x} ${150 * (1 - s)}) scale(${s})`}>
      <g className="show-bob" style={{ animationDelay: `${delay}s` }}>
        {hold && (
          <g className="show-arms-rest">
            {arm(1)}
            {hold === "drink" ? (
              <g transform="translate(37 52)">
                <rect x="-6" y="-17" width="12" height="18" rx="2" fill="#e9b04c" opacity="0.92" />
                <rect x="-6" y="-19" width="12" height="4" rx="1.5" fill="#fbf2dc" />
              </g>
            ) : (
              <g transform="translate(38 46) rotate(-12)">
                <rect x="-11" y="-14" width="22" height="26" rx="1.5" fill="#f6f2e8" />
                <circle cx="-4" cy="-5" r="2.6" fill="#d42f3c" />
                <circle cx="5" cy="3" r="2.6" fill="#d42f3c" />
                <circle cx="-3" cy="6" r="2.6" fill="#d42f3c" />
              </g>
            )}
          </g>
        )}
        <g className="show-arms-up">
          {arm(1)}
          {arm(-1)}
        </g>
        {hair === "pony" && <ellipse cx="12" cy="88" rx="6" ry="12" />}
        {hair === "long" && <path d="M-17 76 C-19 94 -14 104 -8 108 L8 108 C14 104 19 94 17 76 Z" />}
        <path d="M-36 150 C-36 120 -24 106 0 103 C24 106 36 120 36 150 Z" />
        <rect x="-7" y="84" width="14" height="22" rx="5" />
        <ellipse cx="0" cy="74" rx="15" ry="18" />
        {hair === "bun" && <circle cx="0" cy="54" r="7.5" />}
        {hair === "cap" && <path d="M-16 70 C-16 50 16 50 16 70 Z" />}
        {hair === "curls" && (
          <g>
            <circle cx="-11" cy="62" r="7" />
            <circle cx="0" cy="57" r="8" />
            <circle cx="11" cy="62" r="7" />
          </g>
        )}
      </g>
    </g>
  );
}

function Crowd({ cheer }: { cheer: boolean }) {
  const id = useId();
  return (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMax meet" className={`show-crowd${cheer ? " is-cheering" : ""}`} aria-hidden>
      <defs>
        {/* Lit from above by the TV: the top of each shape takes the screen's colour */}
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="show-crowd-lit" />
          <stop offset="0.4" stopColor="#10171a" />
          <stop offset="1" stopColor="#050607" />
        </linearGradient>
        <linearGradient id={`${id}-back`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="show-crowd-lit-dim" />
          <stop offset="0.5" stopColor="#0c1214" />
          <stop offset="1" stopColor="#080b0c" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id}-back)`} stroke={`url(#${id}-back)`} transform="translate(0 -14)">
        <Person x={50} s={0.72} hair="short" delay={-0.27} />
        <Person x={108} s={0.7} hair="pony" hold="drink" delay={-0.12} />
        <Person x={168} s={0.74} hair="cap" delay={-0.38} />
        <Person x={228} s={0.7} hair="long" delay={-0.06} />
        <Person x={290} s={0.73} hair="short" hold="card" delay={-0.3} />
        <Person x={348} s={0.7} hair="curls" delay={-0.19} />
      </g>
      <g fill={`url(#${id}-front)`} stroke={`url(#${id}-front)`}>
        <Person x={20} s={1.08} hair="pony" delay={-0.1} />
        <Person x={80} s={0.96} hair="cap" hold="drink" delay={-0.32} />
        <Person x={138} s={1.12} hair="curls" delay={-0.05} />
        <Person x={198} s={1} hair="long" hold="card" delay={-0.41} />
        <Person x={258} s={1.1} hair="short" delay={-0.22} />
        <Person x={318} s={0.98} hair="bun" hold="drink" delay={-0.15} />
        <Person x={378} s={1.06} hair="short" delay={-0.36} />
      </g>
    </svg>
  );
}

function Dauber({ press, at }: { press: boolean; at: { x: number; y: number } }) {
  return (
    <span
      className={`show-dauber${press ? " is-pressing" : ""}`}
      style={{ left: `${at.x - DAUBER_W / 2}cqw`, top: `${at.y - DAUBER_H}cqw`, width: `${DAUBER_W}cqw` }}
    >
      <svg viewBox="0 0 40 90" aria-hidden>
        <rect x="9" y="1" width="22" height="13" rx="5" fill="#7d111c" />
        <rect x="4" y="11" width="32" height="58" rx="11" fill="#e0384b" />
        <rect x="9" y="17" width="6" height="44" rx="3" fill="#fff" opacity="0.32" />
        <rect x="12" y="67" width="16" height="9" rx="2" fill="#9b1625" />
        <ellipse cx="20" cy="81" rx="10" ry="7" fill="#c21f31" />
      </svg>
    </span>
  );
}

function Scorecard({ state }: { state: State }) {
  const target = state.dauber.cell === null ? DAUBER_REST : cellCentre(state.dauber.cell);
  const lastStamp = state.stamped[state.stamped.length - 1];
  return (
    <div className="show-card">
      <div className="show-card-grid">
        {LETTERS.map((l) => (
          <span key={l} className="show-card-letter">
            {l}
          </span>
        ))}
        {CELLS.map((cell, i) => {
          const stamped = state.stamped.includes(i);
          const inWin = state.win && Math.floor(i / 5) === WIN_ROW;
          return (
            <span key={i} className={`show-card-cell${inWin ? " is-winning" : ""}`}>
              {cell === null ? (
                <span className="show-card-free">
                  Free
                  <br />
                  space
                </span>
              ) : (
                <span className="show-card-song">{cell}</span>
              )}
              {stamped && (
                <span className={`show-daub${state.clearing ? " is-clearing" : ""}${i === lastStamp ? " is-new" : ""}`} />
              )}
            </span>
          );
        })}
      </div>
      {state.win && !state.clearing && (
        <>
          <span
            className="show-win-row"
            style={{
              top: `${PAD + HEAD + GAP + WIN_ROW * (CELL + GAP) - GAP}cqw`,
              height: `${CELL + GAP * 2}cqw`,
            }}
          />
          <span className="show-bingo-stamp">Bingo!</span>
        </>
      )}
      <Dauber press={state.dauber.press} at={target} />
    </div>
  );
}

export function ShowScene({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onScreenRef = useRef(true);
  const [state, setState] = useState<State>(START);
  const [onScreen, setOnScreen] = useState(true);
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => false);

  // Only animate while the scene is on screen (saves phone batteries).
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => {
      onScreenRef.current = entry.isIntersecting;
      setOnScreen(entry.isIntersecting);
    });
    if (rootRef.current) io.observe(rootRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    let timer = 0;

    // Waits `ms` of time the scene is actually visible, so it doesn't run off-screen.
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        let left = ms;
        let last = performance.now();
        const step = () => {
          if (cancelled) return;
          const now = performance.now();
          if (onScreenRef.current && !document.hidden) left -= now - last;
          last = now;
          if (left <= 0) resolve();
          else timer = window.setTimeout(step, Math.min(100, Math.max(16, left)));
        };
        timer = window.setTimeout(step, Math.min(100, ms));
      });

    (async () => {
      while (!cancelled) {
        await wait(1500);
        for (let k = 0; k < CALLS.length && !cancelled; k++) {
          const { cell } = CALLS[k];
          setState((s) => ({ ...s, call: k }));
          if (cell === null) {
            await wait(1800);
            continue;
          }
          await wait(700);
          setState((s) => ({ ...s, dauber: { cell, press: false } }));
          await wait(520);
          setState((s) => ({ ...s, dauber: { cell, press: true }, stamped: [...s.stamped, cell] }));
          await wait(260);
          setState((s) => ({ ...s, dauber: { cell, press: false } }));
          await wait(480);
          setState((s) => ({ ...s, dauber: { cell: null, press: false } }));
          await wait(440);
        }
        if (cancelled) return;
        setState((s) => ({ ...s, win: true }));
        await wait(4200);
        setState((s) => ({ ...s, clearing: true }));
        await wait(700);
        setState(START);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reduced]);

  const shown = reduced ? FINISHED : state;
  const hue = shown.call >= 0 ? CALLS[shown.call].hue : 350;

  return (
    <div
      ref={rootRef}
      className={`show-scene${shown.win && !shown.clearing ? " is-bingo" : ""}${onScreen ? "" : " is-paused"} ${className}`}
      style={{ "--hue": hue } as CSSProperties}
      role="img"
      aria-label="A Bar Beats Bingo show in a bar: music videos play on the TV, the crowd sings along, and a player stamps the songs on their scorecard until they get a line and call bingo."
    >
      <span className="show-wall" />
      {/* The TV's light on the wall behind the crowd (behind the TV itself, so it doesn't wash out the screen) */}
      <span className="show-spill" />
      <NeonSign />
      <Tv state={shown} />
      <Crowd cheer={shown.win && !shown.clearing} />
      <div className="show-card-wrap">
        <Scorecard state={shown} />
      </div>
    </div>
  );
}
