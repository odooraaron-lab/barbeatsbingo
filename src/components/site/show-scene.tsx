"use client";

import Image from "next/image";
import { memo, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { CROWD, NEON_SIGN, PERFORMERS, personPath, type Pose } from "./show-art";

/**
 * The home page's opening scene: a Bar Beats Bingo night in a bar. Music videos
 * play on the TV, the room watches, and the songs on your scorecard get marked
 * off as they play, until the middle row makes a line and the show stops for a
 * card check.
 */

const LETTERS = ["B", "I", "N", "G", "O"];

// The scorecard, row by row, as printed on a real card; null is the free space.
const CELLS: (string | null)[] = [
  "Love Not War - Jason Derulo, Nuka",
  "Heat Waves - Glass Animals",
  "Shake It Off - Taylor Swift",
  "Cover Me In Sunshine - P!nk, Willow Sage Hart",
  "Dance Monkey - Tones And I",
  "Dancing Feet - Kygo",
  "Final Song - MØ",
  "Despacito - Luis Fonsi, Daddy Yankee",
  "Better When I'm Dancin' - Meghan Trainor",
  "No - Little Mix",
  "Good As Hell - Lizzo",
  "Señorita - Shawn Mendes, Camila Cabello",
  null,
  "X - Jonas Brothers, Karol G",
  "Kiss My (Uh Oh) - Anne-Marie, Little Mix",
  "SNAP - Rosa Linn",
  "What A Man Gotta Do - Jonas Brothers",
  "Cold Heart - Elton John, Dua Lipa",
  "Easy On Me - Adele",
  "BED - Joel Corry, RAYE, David Guetta",
  "Watermelon Sugar - Harry Styles",
  "Just You And I - Tom Walker",
  "I Ain't Worried - OneRepublic",
  "Weekend - Mufasa & Hypeman",
  "Ghost - Ella Henderson",
];
const WIN_ROW = 2;

type Look = "stage" | "sunset" | "city" | "club";
type Call = {
  /** The square this song is on, or null if it isn't on your card. */
  cell: number | null;
  title: string;
  artist: string;
  /** The video's main colour, which also lights the room. */
  hue: number;
  pose: Pose;
  look: Look;
  /** Where the performer stands, in % across the screen. */
  at: number;
  flip?: boolean;
};

// The songs the show plays, in order. Letters go B, I, N, G, O in turn (as on the
// call list), and a song on the card sits in its letter's column. Song 9 makes the line.
const CALLS: Call[] = [
  { cell: 10, title: "Good As Hell", artist: "Lizzo", hue: 330, pose: "reach", look: "stage", at: 50 },
  { cell: 1, title: "Heat Waves", artist: "Glass Animals", hue: 22, pose: "guitar", look: "sunset", at: 42 },
  { cell: null, title: "Shut Up and Dance", artist: "Walk the Moon", hue: 192, pose: "mic", look: "club", at: 58, flip: true },
  { cell: 18, title: "Easy On Me", artist: "Adele", hue: 222, pose: "mic", look: "city", at: 44 },
  { cell: 14, title: "Kiss My (Uh Oh)", artist: "Anne-Marie & Little Mix", hue: 300, pose: "reach", look: "club", at: 46, flip: true },
  { cell: 20, title: "Watermelon Sugar", artist: "Harry Styles", hue: 350, pose: "guitar", look: "stage", at: 56, flip: true },
  { cell: 11, title: "Señorita", artist: "Shawn Mendes & Camila Cabello", hue: 32, pose: "mic", look: "sunset", at: 52 },
  { cell: null, title: "Mr. Brightside", artist: "The Killers", hue: 262, pose: "guitar", look: "stage", at: 46 },
  { cell: 13, title: "X", artist: "Jonas Brothers & Karol G", hue: 168, pose: "dj", look: "club", at: 50 },
];

type State = {
  round: number;
  /** Index into CALLS of the video on the TV; -1 shows the round's title screen. */
  call: number;
  marked: number[];
  bingo: boolean;
  clearing: boolean;
};

const fresh = (round: number): State => ({ round, call: -1, marked: [], bingo: false, clearing: false });
const FINISHED: State = {
  round: 1,
  call: CALLS.length - 1,
  marked: CALLS.flatMap((c) => (c.cell === null ? [] : [c.cell])),
  bingo: true,
  clearing: false,
};

// The same image size for the title screen and the corner logo, so it downloads once.
const LOGO_SIZES = "(min-width: 1024px) 260px, 45vw";

const HUE_TITLE = 352;
const HUE_BINGO = 44;

// The card is drawn in its own units: 100 wide.
const C = { padX: 3.5, top: 9.8, outer: 1.1, line: 0.75, bottom: 3.6 };
const CELL = (100 - C.padX * 2 - C.outer * 2 - C.line * 4) / 5;
const CARD_H = C.top + C.outer * 2 + CELL * 5 + C.line * 4 + C.bottom;
const cellBox = (i: number) => {
  const x = C.padX + C.outer + (i % 5) * (CELL + C.line);
  const y = C.top + C.outer + Math.floor(i / 5) * (CELL + C.line);
  return { x, y, cx: x + CELL / 2, cy: y + CELL / 2 };
};

// Each highlighter stroke is a little different: height off the middle, angle, reach.
const STROKE_JITTER = [0.6, -0.9, 0.3, -0.4, 1, -0.7, 0.2, 0.8, -1.1, 0.4, -0.3, 0.9, 0, -0.8, 0.5];
function highlighterPath(i: number) {
  const { x, cy } = cellBox(i);
  const j = STROKE_JITTER[i % STROKE_JITTER.length];
  const y0 = cy + j * 0.9;
  const y1 = cy - j * 0.5 + 0.2;
  const x0 = x - 0.9 + Math.abs(j) * 0.4;
  const x1 = x + CELL + 0.8 - Math.abs(j) * 0.3;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}Q${((x0 + x1) / 2).toFixed(2)} ${(y0 + j * 0.5).toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** A quick hand-drawn loop round a row, overlapping where it started. */
function loopPath(row: number) {
  const top = cellBox(row * 5).y - 2.1;
  const bottom = top + CELL + 4.2;
  const mid = (top + bottom) / 2;
  const pts: [number, number][] = [
    [9, top + 0.6],
    [50, top - 0.9],
    [93.5, top + 0.2],
    [98.4, mid + 0.4],
    [92, bottom + 0.6],
    [50, bottom + 1],
    [6.4, bottom - 0.2],
    [1.6, mid - 0.6],
    [8.4, top - 0.1],
    [24, top - 1.4],
  ];
  // Catmull-Rom through the points, as cubic Béziers.
  let d = `M${pts[0][0]} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0]} ${p2[1].toFixed(2)}`;
  }
  return d;
}

const PERSON_PATHS = CROWD.map((p) => personPath(p.spec));

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const mq = window.matchMedia(motionQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const NeonSign = memo(function NeonSign() {
  const id = useId();
  const { width, height, barBeats, bingo } = NEON_SIGN;
  return (
    <svg viewBox={`-24 -24 ${width + 48} ${height + 48}`} className="show-sign" aria-hidden>
      <defs>
        <filter id={`${id}-glow`} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="far" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="near" />
          <feMerge>
            <feMergeNode in="far" />
            <feMergeNode in="near" />
          </feMerge>
        </filter>
        <filter id={`${id}-core`} x="-2%" y="-5%" width="104%" height="110%">
          <feMorphology operator="erode" radius="1.7" />
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>
      {/* "bar beats" in white and "bingo" in red, like the logo */}
      {[
        { d: barBeats, tone: "white" },
        { d: bingo, tone: "red" },
      ].map(({ d, tone }) => (
        <g key={tone} className={`show-sign-${tone}`}>
          <path d={d} className="show-sign-glow" filter={`url(#${id}-glow)`} />
          <path d={d} className="show-sign-tube" />
          <path d={d} className="show-sign-core" filter={`url(#${id}-core)`} />
        </g>
      ))}
    </svg>
  );
});

function Video({ call }: { call: Call }) {
  return (
    <div className={`show-video is-${call.look}`} style={{ "--at": `${call.at}%` } as CSSProperties}>
      <span className="show-video-sky" />
      {call.look === "sunset" && <span className="show-sun" />}
      {(call.look === "city" || call.look === "club") && (
        <span className="show-bokeh">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <i key={i} />
          ))}
        </span>
      )}
      {(call.look === "stage" || call.look === "club") && (
        <span className="show-beams">
          {[0, 1, 2, 3].map((i) => (
            <i key={i} />
          ))}
        </span>
      )}
      <span className="show-performer" style={{ left: `calc(${call.at}% - 27%)`, ...(call.flip ? { scale: "-1 1" } : null) }}>
        <svg viewBox="0 0 100 100" aria-hidden>
          {PERFORMERS[call.pose].map((d, i) => (
            <path key={i} d={d} />
          ))}
        </svg>
      </span>
      <span className="show-floor" />
    </div>
  );
}

function Tv({ state }: { state: State }) {
  const song = state.call >= 0 ? CALLS[state.call] : null;
  return (
    <div className="show-tv">
      <div className="show-screen">
        {song ? (
          <>
            <Video key={state.call} call={song} />
            <span className="show-scrim" />
            {!state.bingo && (
              <span key={`now-${state.call}`} className="show-now">
                <span className="show-now-letter">{LETTERS[state.call % 5]}</span>
                <span className="show-now-text">
                  <span className="show-now-meta">Song {state.call + 1}</span>
                  <span className="show-now-title">{song.title}</span>
                  <span className="show-now-artist">{song.artist}</span>
                </span>
              </span>
            )}
            <Image src="/brand/logo.png" alt="" width={720} height={376} sizes={LOGO_SIZES} className="show-bug" />
          </>
        ) : (
          <span key={`title-${state.round}`} className="show-title">
            <Image src="/brand/logo.png" alt="" width={720} height={376} sizes={LOGO_SIZES} className="show-title-logo" />
            <span className="show-title-round">Round {state.round}</span>
          </span>
        )}
        {state.bingo && (
          <span className="show-pause">
            <span className="show-pause-icon" aria-hidden>
              <span />
              <span />
            </span>
            <span className="show-pause-word">Bingo!</span>
            <span className="show-pause-note">Checking the card</span>
          </span>
        )}
        <span className="show-glass" />
      </div>
    </div>
  );
}

function Person({ i }: { i: number }) {
  const p = CROWD[i];
  // The TV lights each person from its direction: a rim of light on the edges facing it.
  // The screen is a wide light above the room, so the light comes mostly from above.
  const headY = p.y - 22 * p.size;
  const dx = (50 - p.x) * 0.35;
  const dy = 44 - headY;
  const len = Math.hypot(dx, dy);
  const reach = [0.12, 0.15, 0.3][p.row];
  const style = {
    left: `${p.x - 30 * p.size}cqw`,
    top: `${p.y - 40 * p.size}cqw`,
    width: `${60 * p.size}cqw`,
    "--rx": `${((dx / len) * reach).toFixed(3)}cqw`,
    "--ry": `${((dy / len) * reach).toFixed(3)}cqw`,
    "--sway": `${p.sway}deg`,
    animationDuration: `${p.period}s`,
    animationDelay: `${-((i * 1.37) % p.period).toFixed(2)}s`,
  } as CSSProperties;
  return (
    <span className={`show-person show-row-${p.row}`} style={style}>
      <svg viewBox="-30 -40 60 95">
        <path d={PERSON_PATHS[i]} />
      </svg>
    </span>
  );
}

const ROWS = [0, 1, 2].map((row) => CROWD.flatMap((p, i) => (p.row === row ? [i] : [])));

// The crowd and the pint never change, so they skip re-rendering as the show moves on.
const Crowd = memo(function Crowd() {
  const id = useId();
  return (
    <div className="show-crowd" style={{ "--shade": `url(#${id}-shade)` } as CSSProperties} aria-hidden>
      {/* Each silhouette picks up a little of the TV's light on top, darkening downwards. */}
      <svg width="0" height="0" className="show-crowd-defs">
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.05" className="show-shade-top" />
          <stop offset="0.45" className="show-shade-mid" />
          <stop offset="0.8" className="show-shade-low" />
        </linearGradient>
      </svg>
      {ROWS[0].map((i) => (
        <Person key={i} i={i} />
      ))}
      {/* haze in the air between the rows, lit by the TV */}
      <span className="show-haze show-haze-1" />
      {ROWS[1].map((i) => (
        <Person key={i} i={i} />
      ))}
      <span className="show-haze show-haze-2" />
      {ROWS[2].map((i) => (
        <Person key={i} i={i} />
      ))}
    </div>
  );
});

/** Your drink on the table beside the card, out of focus. */
const Pint = memo(function Pint() {
  const id = useId();
  return (
    <svg viewBox="0 0 40 100" className="show-pint" aria-hidden>
      <defs>
        <linearGradient id={`${id}-beer`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7c24c" />
          <stop offset="0.5" stopColor="#cf7c1c" />
          <stop offset="1" stopColor="#6b3309" />
        </linearGradient>
        <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#120600" stopOpacity="0.55" />
          <stop offset="0.28" stopColor="#120600" stopOpacity="0" />
          <stop offset="0.72" stopColor="#120600" stopOpacity="0" />
          <stop offset="1" stopColor="#120600" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path d="M3.4 11L36.6 11L33.3 100L6.7 100Z" fill={`url(#${id}-beer)`} />
      <path d="M3.4 11L36.6 11L33.3 100L6.7 100Z" fill={`url(#${id}-depth)`} />
      <path d="M2.8 3.2Q20 1.4 37.2 3.2L36.7 11.6Q20 13.2 3.3 11.6Z" fill="#f1e2c6" />
      <path d="M2 0.8L38 0.8L34 100L6 100Z" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="0.8" />
      <path d="M36.8 2.4L33.5 98" className="show-pint-rim" />
      <rect x="8.2" y="15" width="2.2" height="72" rx="1.1" fill="#fff" opacity="0.26" />
    </svg>
  );
});

function Scorecard({ state }: { state: State }) {
  const lastMark = state.marked[state.marked.length - 1];
  return (
    <div className="show-card" style={{ aspectRatio: `100 / ${CARD_H.toFixed(2)}` }}>
      <div className="show-card-tabs">
        {LETTERS.map((l) => (
          <span key={l} className="show-card-tab">
            {l}
          </span>
        ))}
      </div>
      <div className="show-card-grid">
        {CELLS.map((cell, i) =>
          cell === null ? (
            <span key={i} className="show-card-cell show-card-free">
              <svg viewBox="0 0 10 10" aria-hidden>
                <path d="M2 1.6L8.2 8.6M8 1.4L1.8 8.4" />
              </svg>
              <span>
                Free
                <br />
                space
              </span>
            </span>
          ) : (
            <span key={i} className="show-card-cell">
              {cell}
            </span>
          ),
        )}
      </div>
      <svg viewBox={`0 0 100 ${CARD_H.toFixed(2)}`} className={`show-card-ink${state.clearing ? " is-clearing" : ""}`} aria-hidden>
        {state.marked.map((cell) => (
          <path
            key={cell}
            d={highlighterPath(cell)}
            pathLength={1}
            className={`show-highlight${cell === lastMark && !state.bingo ? " is-new" : ""}`}
          />
        ))}
        {state.bingo && <path d={loopPath(WIN_ROW)} pathLength={1} className="show-loop" />}
      </svg>
    </div>
  );
}

export function ShowScene({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onScreenRef = useRef(true);
  const [state, setState] = useState<State>(() => fresh(1));
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
      let round = 1;
      while (!cancelled) {
        setState(fresh(round));
        await wait(2600);
        for (let k = 0; k < CALLS.length && !cancelled; k++) {
          const { cell } = CALLS[k];
          setState((s) => ({ ...s, call: k }));
          if (cell === null) {
            await wait(2100);
            continue;
          }
          // The song plays for a moment before you spot it's on your card.
          await wait(1150);
          setState((s) => ({ ...s, marked: [...s.marked, cell] }));
          await wait(1450);
        }
        if (cancelled) return;
        await wait(250);
        setState((s) => ({ ...s, bingo: true }));
        await wait(5400);
        setState((s) => ({ ...s, clearing: true }));
        await wait(900);
        round = round >= 9 ? 1 : round + 1;
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reduced]);

  const shown = reduced ? FINISHED : state;
  const hue = shown.bingo ? HUE_BINGO : shown.call >= 0 ? CALLS[shown.call].hue : HUE_TITLE;

  return (
    <div
      ref={rootRef}
      className={`show-scene${shown.bingo ? " is-bingo" : ""}${onScreen ? "" : " is-paused"} ${className}`}
      style={{ "--hue": hue } as CSSProperties}
      role="img"
      aria-label="A Bar Beats Bingo night in a bar: music videos play on the TV, the room watches, and a player marks off the songs on their scorecard as they play, until they get a line and the show stops to check the card."
    >
      <span className="show-wall" />
      <NeonSign />
      <Tv state={shown} />
      <Crowd />
      {/* At each cut the room dips with the screen, then the new video lights it */}
      <span key={`cut-${shown.round}-${shown.call}`} className="show-cut" />
      <Pint />
      <div className="show-card-wrap">
        <Scorecard state={shown} />
      </div>
      <span className="show-grade" />
    </div>
  );
}
