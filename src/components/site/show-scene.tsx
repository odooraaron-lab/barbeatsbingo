"use client";

import Image from "next/image";
import { memo, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { CROWD, MIC, NEON_SIGN, TONEARM, discoSpots, mirrorBall, palmTree, personPath, skyline, sunGlitter } from "./show-art";

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

/** The shot on the TV: each song's video gets one, in its own colour. */
type Look = "mic" | "vinyl" | "disco" | "palms" | "city";
type Call = {
  /** The square this song is on, or null if it isn't on your card. */
  cell: number | null;
  title: string;
  artist: string;
  /** The video's main colour, which also lights the room. */
  hue: number;
  look: Look;
  /** Mirror the shot (palms and city), so a look seen twice isn't the same picture. */
  flip?: boolean;
};

// The songs the show plays, in order. Letters go B, I, N, G, O in turn (as on the
// call list), and a song on the card sits in its letter's column. Song 9 makes the line.
const CALLS: Call[] = [
  { cell: 10, title: "Good As Hell", artist: "Lizzo", hue: 330, look: "disco" },
  { cell: 1, title: "Heat Waves", artist: "Glass Animals", hue: 22, look: "palms" },
  { cell: null, title: "Shut Up and Dance", artist: "Walk the Moon", hue: 192, look: "city" },
  { cell: 18, title: "Easy On Me", artist: "Adele", hue: 222, look: "mic" },
  { cell: 14, title: "Kiss My (Uh Oh)", artist: "Anne-Marie & Little Mix", hue: 300, look: "vinyl" },
  { cell: 20, title: "Watermelon Sugar", artist: "Harry Styles", hue: 350, look: "palms", flip: true },
  { cell: 11, title: "Señorita", artist: "Shawn Mendes & Camila Cabello", hue: 32, look: "mic" },
  { cell: null, title: "Mr. Brightside", artist: "The Killers", hue: 262, look: "city", flip: true },
  { cell: 13, title: "X", artist: "Jonas Brothers & Karol G", hue: 168, look: "disco" },
];

// The TV's drawings. Working them out takes a moment, so it's done while the title
// screen shows (or the first time a shot needs one), not while the page loads.
function once<T>(make: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= make());
}
const palms = once(() => [
  { at: [45, 30] as const, tree: palmTree([33, 97], [45, 30], 64, 7) },
  { at: [19, 50] as const, tree: palmTree([12, 99], [19, 50], 46, 21) },
]);
/** The sun sits 66% across (34% when the shot is mirrored); the sea starts 71% down. */
const glitter = once(() => sunGlitter(160 * 0.66, 90 * 0.71, 11));
const city = once(() => skyline(5));
const BALL = { cx: 80, cy: 47, r: 17 };
const ball = once(() => mirrorBall(BALL.cx, BALL.cy, BALL.r, 3));
const spots = once(() => [discoSpots(17, 46), discoSpots(29, 70)]);
const drawTv = () => [palms, glitter, city, ball, spots].forEach((draw) => draw());
/** The microphone stands right of centre, clear of the caption. */
const MIC_AT = { dx: 31, dy: 10 };

type State = {
  round: number;
  /** Index into CALLS of the video on the TV; -1 shows the game's title screen. */
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

/** A microphone on its stand, alone in a spotlight, dust drifting through the beam. */
function MicShot() {
  const id = useId();
  return (
    <>
      <span className="show-mic-beam" />
      <span className="show-mic-pool" />
      <svg viewBox="0 0 160 90" className="show-shot" aria-hidden>
        <defs>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0b0b0e" />
            <stop offset="0.42" className="show-mic-shine" />
            <stop offset="0.6" stopColor="#3a3a42" />
            <stop offset="1" stopColor="#09090b" />
          </linearGradient>
          <pattern id={`${id}-mesh`} width="0.95" height="0.95" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="0.95" height="0.95" fill="#0f0f13" />
            <rect width="0.5" height="0.5" fill="#45454f" />
          </pattern>
          {/* Lit from straight above: bright on top, falling away underneath */}
          <radialGradient id={`${id}-light`} cx="0.5" cy="0.04" r="0.95">
            <stop offset="0" className="show-mic-shine" stopOpacity="0.92" />
            <stop offset="0.42" className="show-mic-shine" stopOpacity="0.16" />
            <stop offset="1" stopColor="#000" stopOpacity="0.72" />
          </radialGradient>
        </defs>
        <g transform={`translate(${MIC_AT.dx} ${MIC_AT.dy})`}>
          <path d={MIC.stand} fill={`url(#${id}-metal)`} />
          <path d={MIC.body} fill={`url(#${id}-metal)`} />
          <path d={MIC.grille} fill={`url(#${id}-mesh)`} />
          <path d={MIC.grille} fill={`url(#${id}-light)`} />
        </g>
      </svg>
      <span className="show-dust">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <i key={i} />
        ))}
      </span>
    </>
  );
}

/** A record spinning under the lights, the player's arm resting on it. */
function VinylShot() {
  const id = useId();
  const arm = TONEARM;
  return (
    <>
      <span className="show-vinyl">
        <span className="show-vinyl-disc">
          {/* The label turns with the record (the grooves alone wouldn't show it turning) */}
          <svg viewBox="-50 -50 100 100" className="show-vinyl-label" aria-hidden>
            <defs>
              <path id={`${id}-arc`} d="M-34 0A34 34 0 0 1 34 0" />
            </defs>
            <circle r="50" className="show-label-paper" />
            <circle r="45.5" className="show-label-ring" />
            <text className="show-label-text">
              <textPath href={`#${id}-arc`} startOffset="50%" textAnchor="middle">
                BAR BEATS BINGO
              </textPath>
            </text>
            <text y="22" textAnchor="middle" className="show-label-small">
              SIDE A
            </text>
            <text y="31" textAnchor="middle" className="show-label-small">
              33⅓ RPM
            </text>
            <circle r="4.4" className="show-label-spindle" />
            <circle r="1.8" fill="#09090b" />
          </svg>
        </span>
        <span className="show-vinyl-sheen" />
      </span>
      <svg viewBox="0 0 160 90" className="show-shot show-tonearm" aria-hidden>
        <defs>
          <linearGradient id={`${id}-tube`} gradientUnits="userSpaceOnUse" {...arm.across}>
            <stop offset="0" stopColor="#5b5f6a" />
            <stop offset="0.38" stopColor="#eef0f4" />
            <stop offset="0.7" stopColor="#9da1ac" />
            <stop offset="1" stopColor="#3a3d46" />
          </linearGradient>
          <linearGradient id={`${id}-weight`} gradientUnits="userSpaceOnUse" {...arm.acrossWeight}>
            <stop offset="0" stopColor="#2a2c33" />
            <stop offset="0.35" stopColor="#8b8f9a" />
            <stop offset="0.65" stopColor="#4a4d56" />
            <stop offset="1" stopColor="#15161a" />
          </linearGradient>
          <linearGradient id={`${id}-post`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3b3e47" />
            <stop offset="0.4" stopColor="#c9ccd4" />
            <stop offset="1" stopColor="#2a2c33" />
          </linearGradient>
        </defs>
        <path d={arm.plate} className="show-tonearm-plate" />
        <path d={arm.post} fill={`url(#${id}-post)`} />
        <path d={arm.cap} className="show-tonearm-cap" />
        <path d={arm.weight} fill={`url(#${id}-weight)`} />
        <path d={arm.arm} fill={`url(#${id}-tube)`} />
        <path d={arm.cartridge} className="show-tonearm-cartridge" />
        <path d={arm.head} className="show-tonearm-head" />
        <path d={arm.lift} fill={`url(#${id}-tube)`} />
      </svg>
    </>
  );
}

/** A mirror ball in a spotlight, throwing spots of light round the room as it turns. */
function DiscoShot() {
  const id = useId();
  const { cx, cy, r } = BALL;
  const art = ball();
  return (
    <>
      <span className="show-disco-spots">
        {/* Each layer is the same scatter twice over, so it can slide round forever */}
        {spots().map((layerSpots, layer) => (
          <svg
            key={layer}
            viewBox="0 0 320 90"
            preserveAspectRatio="none"
            className={`show-disco-layer show-disco-layer-${layer}`}
            aria-hidden
          >
            <defs>
              <radialGradient id={`${id}-spot${layer}`}>
                <stop offset="0" stopColor="#fff" />
                <stop offset="0.32" stopColor="#fff" stopOpacity="0.95" />
                <stop offset="0.46" className="show-disco-tint" stopOpacity="0.4" />
                <stop offset="1" className="show-disco-tint" stopOpacity="0" />
              </radialGradient>
            </defs>
            {[0, 160].map((dx) =>
              layerSpots.map((s, i) => (
                <ellipse
                  key={`${dx}-${i}`}
                  cx={s.x + dx}
                  cy={s.y}
                  rx={s.rx * 2}
                  ry={s.ry * 2}
                  opacity={s.o}
                  fill={`url(#${id}-spot${layer})`}
                />
              )),
            )}
          </svg>
        ))}
      </span>
      <span className="show-disco-rays" />
      <span className="show-disco-pin" />
      <svg viewBox="0 0 160 90" className="show-shot" aria-hidden>
        <defs>
          <radialGradient id={`${id}-shade`} cx="0.36" cy="0.32" r="0.75">
            <stop offset="0.35" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        <path d={`M${cx} 0L${cx} ${cy - r}`} className="show-disco-cord" />
        <circle cx={cx} cy={cy} r={r + 0.2} className="show-disco-base" />
        {art.shades.map((d, i) => (
          <path key={i} d={d} className={`show-disco-shade-${i}`} />
        ))}
        {art.flash.map((d, i) => (
          <path key={`flash-${i}`} d={d} className={`show-disco-flash show-disco-flash-${i}`} />
        ))}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-shade)`} />
      </svg>
      {art.glints.map(([x, y], i) => (
        <span
          key={i}
          className="show-disco-glint"
          style={{ left: `${(x / 160) * 100}%`, top: `${(y / 90) * 100}%`, animationDelay: `${i * 0.8}s` }}
        />
      ))}
    </>
  );
}

/** Palms against a low sun, the light glittering on the sea, the fronds moving in the breeze. */
function PalmsShot({ flip }: { flip?: boolean }) {
  const mirror = flip ? { scale: "-1 1" } : undefined;
  const trees = palms();
  return (
    <>
      <span className="show-video-sky" />
      <span className="show-sun" />
      <span className="show-clouds" />
      <span className="show-sea" />
      <svg viewBox="0 0 160 90" className="show-shot show-glitter" style={mirror} aria-hidden>
        {glitter().map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
      <span className="show-palms" style={mirror}>
        <svg viewBox="0 0 160 90" className="show-shot" aria-hidden>
          {trees.map(({ tree }, i) => (
            <g key={i}>
              <path d={tree.trunk} />
              <path d={tree.knot} />
            </g>
          ))}
        </svg>
        {trees.map(({ at, tree }, i) => (
          <svg
            key={i}
            viewBox="0 0 160 90"
            className="show-shot show-palm-fronds"
            style={{
              transformOrigin: `${(at[0] / 160) * 100}% ${(at[1] / 90) * 100}%`,
              animationDelay: `${-i * 1.4}s`,
              animationDuration: i ? "3.8s" : undefined,
            }}
            aria-hidden
          >
            <path d={tree.fronds} />
          </svg>
        ))}
      </span>
    </>
  );
}

/** A city at night, the camera panning slowly: towers in the haze, lit windows, red lights on the masts. */
function CityShot({ flip }: { flip?: boolean }) {
  const town = city();
  return (
    <>
      <span className="show-video-sky" />
      <span className="show-city" style={flip ? { scale: "-1 1" } : undefined}>
        <svg viewBox="0 0 160 90" className="show-shot show-city-far" aria-hidden>
          <path d={town.far} className="show-city-far-blocks" />
          <path d={town.farLit} className="show-city-far-lit" />
        </svg>
        <span className="show-city-haze" />
        <svg viewBox="0 0 160 90" className="show-shot show-city-near" aria-hidden>
          <path d={town.near} className="show-city-blocks" />
          {town.lit.map((d, i) => (
            <path key={i} d={d} className={`show-city-lit-${i}`} />
          ))}
        </svg>
        <svg viewBox="0 0 160 90" className="show-shot show-city-near" aria-hidden>
          {town.masts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={0.55} className="show-city-beacon" style={{ animationDelay: `${-i * 0.55}s` }} />
          ))}
        </svg>
      </span>
    </>
  );
}

function Video({ call }: { call: Call }) {
  // The sun sits away from the palms.
  const at = call.look === "palms" ? (call.flip ? 34 : 66) : 50;
  return (
    <div className={`show-video is-${call.look}`} style={{ "--at": `${at}%` } as CSSProperties}>
      {call.look === "mic" && <MicShot />}
      {call.look === "vinyl" && <VinylShot />}
      {call.look === "disco" && <DiscoShot />}
      {call.look === "palms" && <PalmsShot flip={call.flip} />}
      {call.look === "city" && <CityShot flip={call.flip} />}
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
            <span className="show-title-round">Game {state.round}</span>
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

  // Work out the TV's drawings while the title screen shows.
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(drawTv, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(drawTv, 800);
    return () => window.clearTimeout(id);
  }, []);

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
        round = round >= 4 ? 1 : round + 1; // four quick fire games in a pack
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
