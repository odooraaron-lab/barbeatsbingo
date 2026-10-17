/**
 * Drawing data for the home page scene: the crowd's silhouettes, built from a few
 * measurements so each person looks different, and the "bingo" neon tube lettering.
 *
 * People are drawn from behind, in units where a head is 16 wide. The shoulder line
 * is at y = 0, the crown about 31 above it, and the body runs off the bottom at y = 52.
 */

export type Hair = "buzz" | "short" | "crop" | "long" | "bob" | "bun" | "curls" | "beanie";

export type PersonSpec = {
  hair: Hair;
  /** Half the shoulder width, at the shoulder points. */
  shoulders?: number;
  /** Half the neck width. */
  neck?: number;
  /** How far the shoulders drop below the base of the neck. */
  slope?: number;
  /** Head tilt in degrees (clockwise). */
  tilt?: number;
  /** Head shift sideways, as when someone turns to a friend. */
  turn?: number;
  /** Head size (1 = average). */
  head?: number;
  /** Turned a little: one shoulder looks wider than the other (-1 to 1). */
  twist?: number;
  /** One shoulder higher than the other. */
  lean?: number;
};

type Pt = [number, number];
type Seg = [Pt, Pt, Pt];

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const pt = ([x, y]: Pt) => `${f(x)} ${f(y)}`;

/** A path from a start point and cubic segments. */
function path(start: Pt, segs: Seg[]) {
  return `M${pt(start)}` + segs.map(([a, b, c]) => `C${pt(a)} ${pt(b)} ${pt(c)}`).join("");
}

/** Mirrors a right-hand outline (top to bottom) and returns the left side (bottom to top). */
function mirrorBack(start: Pt, segs: Seg[]): Seg[] {
  const m = ([x, y]: Pt): Pt => [-x, y];
  const pts: Pt[] = [start, ...segs.map((s) => s[2])];
  const out: Seg[] = [];
  for (let i = segs.length - 1; i >= 0; i--) {
    const [a, b] = segs[i];
    out.push([m(b), m(a), m(pts[i])]);
  }
  return out;
}

function transform(p: Pt, angle: number, dx: number, dy: number, s = 1): Pt {
  const r = (angle * Math.PI) / 180;
  const [x, y] = [p[0] * s, p[1] * s];
  return [x * Math.cos(r) - y * Math.sin(r) + dx, x * Math.sin(r) + y * Math.cos(r) + dy];
}

function moveSegs(start: Pt, segs: Seg[], angle: number, dx: number, dy: number, s = 1) {
  const t = (p: Pt) => transform(p, angle, dx, dy, s);
  return { start: t(start), segs: segs.map(([a, b, c]) => [t(a), t(b), t(c)] as Seg) };
}

/**
 * Body: neck, the slope of the shoulders and the upper arms. Hands are out in front
 * (a drink, a pen, the table), so below the elbows the outline steps in to the waist.
 * The two sides can differ, for someone turned a little or with a shoulder dropped.
 */
function bodySide(s: number, neck: number, slope: number): Seg[] {
  return [
    // the top of the neck tucks up inside the head
    [[neck * 0.4, -13], [neck * 0.8, -13], [neck, -13]],
    [[neck, -11.6], [neck + 0.1, -10.6], [neck + 0.3, -9.6]],
    // trapezius: one long slope from high on the neck out to the shoulder
    [[neck + 1.1, -6], [s - 10, -3 + slope * 0.45], [s - 4.6, -1.4 + slope * 0.8]],
    [[s - 2, -0.7 + slope * 0.95], [s - 0.6, -0.2 + slope], [s + 0.6, 0.4 + slope]],
    // the round of the shoulder
    [[s + 2.3, 1.6 + slope], [s + 3.1, 4.2 + slope], [s + 3.1, 7.6 + slope]],
    // upper arm, down to the elbow
    [[s + 3.1, 13], [s + 2.8, 19.5], [s + 2.5, 25]],
    [[s + 2.4, 27.2], [s + 1.8, 28.9], [s + 0.3, 29.6]],
    // forearms are in front, so the waist shows below the elbow
    [[s - 1.6, 30.6], [s - 3, 33.5], [s - 3.4, 38.5]],
    [[s - 3.6, 43], [s - 3.6, 48], [s - 3.6, 52]],
  ];
}

function body(right: number, left: number, neck: number, slopeRight: number, slopeLeft: number) {
  const r = bodySide(right, neck, slopeRight);
  const l = bodySide(left, neck, slopeLeft);
  const start: Pt = [0, -13];
  const end = r[r.length - 1][2];
  const lEnd = l[l.length - 1][2];
  const across: Seg[] = [[[end[0] * 0.5, end[1]], [-lEnd[0] * 0.5, lEnd[1]], [-lEnd[0], lEnd[1]]]];
  return path(start, [...r, ...across, ...mirrorBack(start, l)]) + "Z";
}

/** The head's outline (right side, from the crown down to the neck), by hair style. Nape at (0, 0). */
function headRight(hair: Hair): { start: Pt; segs: Seg[]; extra?: string } {
  const ear: Seg[] = [
    [[8.15, -10.9], [8.2, -10.5], [8.25, -10.2]],
    [[8.95, -10.8], [9.45, -9.6], [9.35, -8.2]],
    [[9.25, -6.8], [8.95, -5.2], [8.3, -4.6]],
  ];
  const nape: Seg[] = [
    [[7.6, -4], [6.9, -2.9], [6.4, -1.5]],
    [[6.1, -0.6], [5.9, 0.4], [5.8, 2]],
  ];
  switch (hair) {
    case "buzz":
      return {
        start: [0, -19.4],
        segs: [[[4.5, -19.4], [8.1, -16], [8.1, -11.5]], ...ear, ...nape],
      };
    case "short":
      return {
        start: [0, -20.7],
        segs: [
          [[2.6, -20.9], [4.6, -20.4], [6.2, -18.8]],
          [[7.8, -17.2], [8.8, -15], [8.7, -11.4]],
          ...ear,
          ...nape,
        ],
      };
    case "crop":
      // a bit of height and texture on top
      return {
        start: [-0.6, -21.4],
        segs: [
          [[1.4, -22.1], [2.6, -21.2], [3.8, -21.4]],
          [[5.6, -21.4], [6.6, -19.6], [7.6, -18.2]],
          [[8.7, -16.6], [8.9, -14.4], [8.8, -11.3]],
          ...ear,
          ...nape,
        ],
      };
    case "beanie":
      return {
        start: [0, -23.2],
        segs: [
          [[5.2, -23.2], [8.6, -19.6], [8.8, -14.6]],
          // the folded cuff
          [[8.9, -13.7], [9.2, -13.3], [9.1, -12.2]],
          [[9, -11.6], [8.4, -11.4], [8.25, -10.2]],
          ...ear.slice(1),
          ...nape,
        ],
      };
    case "bob":
      return {
        start: [0, -20.6],
        segs: [
          [[5.1, -20.6], [9, -16.9], [9.1, -11.8]],
          [[9.2, -8.2], [9.8, -4.6], [9.6, -1.6]],
          // the ends curl in under the jaw
          [[9.4, -0.4], [7.8, -0.1], [6.6, -0.4]],
          [[6.2, 0.4], [5.9, 1.2], [5.8, 2.4]],
        ],
      };
    case "long":
      return {
        start: [0, -20.8],
        segs: [
          [[5.2, -20.8], [9.1, -16.8], [9.2, -11.6]],
          // hugging the neck, then spreading over the shoulders and down the back
          [[9.25, -7.5], [9, -3.5], [9.6, -0.5]],
          [[10.2, 2.2], [11.4, 5.5], [11.8, 9.5]],
          [[12, 12.5], [11.2, 15.5], [10, 16.8]],
          [[9, 17.6], [8.6, 16.6], [7.8, 17.3]],
        ],
      };
    case "bun":
      return {
        start: [0, -19.9],
        segs: [[[4.6, -19.9], [8.2, -16.4], [8.3, -11.6]], ...ear, ...nape],
        extra: "bun",
      };
    case "curls": {
      // a soft, uneven halo of curls: points round a circle, pushed in and out
      const cx = 0;
      const cy = -10.4;
      const wobble = [0, 0.5, -0.2, 0.7, 0.1, 0.6, -0.1, 0.8, 0.2, 0.5, 0, 0.6, -0.3];
      const n = wobble.length - 1;
      const pts: Pt[] = [];
      for (let i = 0; i <= n; i++) {
        const a = -90 + (i / n) * 148;
        const r = 12 + wobble[i];
        pts.push([cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180) * 0.97]);
      }
      const segs: Seg[] = [];
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        // bulge each arc outwards a little so the curls read as round
        const mx = (x0 + x1) / 2 - cx;
        const my = (y0 + y1) / 2 - cy;
        const len = Math.hypot(mx, my);
        const push = 0.75;
        segs.push([
          [x0 + (mx / len) * push, y0 + (my / len) * push],
          [x1 + (mx / len) * push, y1 + (my / len) * push],
          [x1, y1],
        ]);
      }
      const last = pts[pts.length - 1];
      segs.push([[last[0] - 1.4, last[1] + 1.2], [6.4, 0.6], [5.8, 2.2]]);
      return { start: pts[0], segs };
    }
  }
}

/** One person, from behind: a single path. */
export function personPath(spec: PersonSpec): string {
  const shoulders = spec.shoulders ?? 19.5;
  const neck = spec.neck ?? 5.7;
  const slope = spec.slope ?? 0;
  const tilt = spec.tilt ?? 0;
  const turn = spec.turn ?? 0;
  const s = spec.head ?? 1.06;
  const head = headRight(spec.hair);
  // The head pivots on the top of the neck; its nape sits 11 above the shoulder line.
  const left = mirrorBack(head.start, head.segs);
  const end = head.segs[head.segs.length - 1][2];
  const all: Seg[] = [...head.segs, [[end[0] * 0.5, end[1] + 0.6], [-end[0] * 0.5, end[1] + 0.6], [-end[0], end[1]]], ...left];
  const moved = moveSegs(head.start, all, tilt, turn, -11, s);
  let d = path(moved.start, moved.segs) + "Z";
  if (head.extra === "bun") {
    const [bx, by] = transform([0.6, -21.6], tilt, turn, -11, s);
    const r = 4.3 * s;
    d += `M${f(bx)} ${f(by - r)}a${f(r)} ${f(r * 0.94)} 0 1 1 -0.01 0Z`;
  }
  const twist = spec.twist ?? 0;
  const lean = spec.lean ?? 0;
  return body(shoulders * (1 + 0.16 * twist), shoulders * (1 - 0.16 * twist), neck, slope + lean, slope - lean) + d;
}

// ── Performers on the TV ────────────────────────────────────────────────────
// Each is a set of shapes in a 100 × 100 frame, cut off at the bottom like a
// medium shot. They read as silhouettes against the stage lights.

const P = (c: Pt, r: number, a: number): Pt => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];

/** A tapered limb from p1 (radius r1) to p2 (radius r2) with round ends. */
function limb(p1: Pt, r1: number, p2: Pt, r2: number): string {
  const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const th = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
  const a = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / L)));
  const t1a = P(p1, r1, th + a);
  const t2a = P(p2, r2, th + a);
  const t2b = P(p2, r2, th - a);
  const t1b = P(p1, r1, th - a);
  const big2 = 2 * a > Math.PI ? 1 : 0;
  const big1 = 2 * Math.PI - 2 * a > Math.PI ? 1 : 0;
  return `M${pt(t1a)}L${pt(t2a)}A${f(r2)} ${f(r2)} 0 ${big2} 0 ${pt(t2b)}L${pt(t1b)}A${f(r1)} ${f(r1)} 0 ${big1} 0 ${pt(t1a)}Z`;
}

function ellipse(c: Pt, rx: number, ry: number, rot = 0): string {
  const r = (rot * Math.PI) / 180;
  const a: Pt = [c[0] + rx * Math.cos(r), c[1] + rx * Math.sin(r)];
  const b: Pt = [c[0] - rx * Math.cos(r), c[1] - rx * Math.sin(r)];
  return `M${pt(a)}A${f(rx)} ${f(ry)} ${f(rot)} 1 0 ${pt(b)}A${f(rx)} ${f(ry)} ${f(rot)} 1 0 ${pt(a)}Z`;
}

/** Places a point given in a part's own frame (rotated by `rot` degrees, moved to `at`). */
const place = (p: Pt, rot: number, at: Pt): Pt => transform(p, rot, at[0], at[1]);

/** A singer in profile at a mic stand, facing left. */
function micStandSinger(): string[] {
  const outline =
    // crown, back of the head, long hair down the back
    "M51.5 7.2C55.5 7 59 9 60.2 12.6C61 15 61 17.5 60.6 19.6C60.9 23.5 62.2 27.5 63.4 31.5" +
    "C64.4 35 64.8 39.5 64.2 43.5C63.8 46.2 62.8 48.6 61.6 50.2C61 51 60.4 50.6 60 51.4" +
    // the back, hips and the back of the thigh
    "C59.6 54.8 59.2 58 59.2 61.4C59.2 65 60.2 68.6 61.6 72.4C62.8 76 63.2 80 62.6 84.6" +
    "C62 90 61.4 95 61.2 100L43.4 100C43.4 95 43.4 90 43.8 85C44.2 80 44.8 75.6 44.6 71" +
    // belly, waist, bust, collarbone
    "C44.4 66.6 44.8 62.4 45.6 58.6C46 55.5 45.8 52.5 44.6 50C43.6 48 42 46.6 41.4 44.4" +
    "C40.8 42.4 41 39.6 42.2 37.4C43.4 35.2 45.2 33.2 46 31.4C46.6 30 46.6 28.8 46.5 27.6" +
    // throat, chin, open mouth, nose, brow, forehead
    "C46.4 26.4 46.1 25.6 45.4 25.3C44.2 24.9 42.9 24.8 42 24.1C41.3 23.6 41.1 22.8 41.4 22.5" +
    "C41.7 22.2 41.8 21.9 41.5 21.7C41 21.5 41.4 21 41.5 20.6C41 20.4 40.3 20.2 40.2 19.7" +
    "C40.3 19.1 41.1 18.4 41.6 17.5C42 16.7 42.4 16.2 42.7 15.7C43.2 15.1 43.4 14.1 43.5 13" +
    "C43.7 9.6 47.2 7.4 51.5 7.2Z";
  return [
    outline,
    // the forearm reaching to the stand, and the hand round it
    limb([48.4, 47.2], 2.6, [38.8, 43.2], 1.45),
    ellipse([36.9, 43.1], 2.15, 1.75, -12),
    // stand and microphone
    limb([31.4, 100], 0.55, [36.5, 29.6], 0.42),
    limb([36.3, 29.8], 0.7, [38.8, 25], 0.95),
    ellipse([39.25, 24.25], 1.25, 1.2),
  ];
}

/** A guitarist, facing out, head down over the guitar, legs apart. */
function guitarist(): string[] {
  const head =
    // textured hair, the face turned down to the guitar
    "M44.2 11.4C45.2 10.2 46.4 10.6 47.4 9.8C48.6 9 49.8 10 51 9.6C52.4 9.2 53.4 10.4 54.6 10.8" +
    "C56.4 11.6 57.2 13.4 57.4 15.4C57.8 17.4 57.8 19.2 57.5 20.8C58.5 20.6 59 22.2 58.6 23.6" +
    "C58.3 24.8 57.6 25.6 56.9 25.8C56.6 27.6 55.8 29 54.6 30L54.4 33L46.6 33L46.4 31.6" +
    "C45.2 31.6 43.4 30.6 42.6 29.4C41.9 28.5 41.8 27.4 41.4 26.6C41 25.8 40.4 25.2 40.2 24.4" +
    "C39.4 24 39 23.4 39.4 22.8C39.8 22 40.6 21.2 40.8 20C40.9 18.4 40.6 16.8 41.2 15.2" +
    "C41.8 13.6 42.8 12.2 44.2 11.4Z";
  const torso =
    // sloping shoulders, a little taper to the waist, legs apart below the guitar
    "M46.6 31C44.4 33.4 40.4 34.4 37 35.2C33.6 36 31.4 38.4 31.2 42.2C31.2 47.4 32.8 53 33.8 58.4" +
    "C34.6 63 35 67.4 35 71.4C35 78 35.4 85 34.6 92L33.6 100L45.4 100L46.8 88.6C47.6 86.4 52.6 86.4 53.4 88.6" +
    "L55 100L66.4 100L65.4 92C64.6 85 64.8 78 64.8 71.4C64.8 67.4 65.2 63 66 58.4C67 53 68.6 47.4 68.6 42.2" +
    "C68.4 38.4 66.2 36 62.8 35.2C59.4 34.4 55.6 33.4 54.4 31Z";
  // The guitar, in its own frame: body centre at 0, neck along +x.
  const rot = -17;
  const at: Pt = [37.5, 80.5];
  const g = (p: Pt) => place(p, rot, at);
  const neck = (x: number, w: number): [Pt, Pt] => [g([x, -w]), g([x, w])];
  const [n1a, n1b] = neck(13, 1.7);
  const [n2a, n2b] = neck(47, 1.35);
  const [h1a, h1b] = neck(47, 2);
  const [h2a, h2b] = neck(56, 2.6);
  const guitar = [
    ellipse(g([-6.8, 0]), 10.8, 12.2, rot),
    ellipse(g([7.8, 0]), 7.8, 9.4, rot),
    `M${pt(n1a)}L${pt(n2a)}L${pt(n2b)}L${pt(n1b)}Z`,
    `M${pt(h1a)}L${pt(h2a)}L${pt(h2b)}L${pt(h1b)}Z`,
  ];
  const fret = g([42, 0]);
  const strum = g([-2, 2]);
  return [
    head,
    torso,
    ...guitar,
    // strumming arm: elbow out over the guitar, forearm down across it
    limb([34.4, 39.6], 3.9, [26.6, 58.6], 2.7),
    limb([26.6, 58.6], 2.6, [strum[0] - 1.4, strum[1] - 1], 1.8),
    ellipse(strum, 2.5, 2.1, rot),
    // fretting arm: out to the neck
    limb([65.4, 39.6], 3.9, [72.2, 60.4], 2.7),
    limb([72.2, 60.4], 2.6, [fret[0] - 2, fret[1] + 0.8], 1.8),
    ellipse([fret[0], fret[1] - 0.2], 2.1, 2.7, rot),
  ];
}

/** A singer reaching out to the crowd, microphone in the other hand. */
function reachingSinger(): string[] {
  const head =
    // head back and turned right, singing; hair falls to the left shoulder
    "M48.2 16.6C52.6 16.2 55.8 18.6 56.4 22.2C56.6 23.4 56.4 24.2 56.9 25.2C57.4 26 58.4 27.2 58.4 27.9" +
    "C58.4 28.5 57.6 28.6 57.3 28.9C57.6 29.4 57.5 29.7 57.2 30C57.6 30.5 57.4 31 57.1 31.2" +
    "C57.4 32 57.2 32.9 56.4 33.3C55 34 53.4 34.4 52.4 35.4C52 37.2 52.4 39 53.8 40.4L44 41" +
    "C41.4 41.8 39.6 41 39 38.8C38.2 36 38.8 33 38.8 30C38.8 26.4 39.4 22.8 41.6 20C43.4 17.8 45.6 16.8 48.2 16.6Z";
  const torso =
    "M44.6 39.6C42.4 42.2 38.6 43.4 35.6 44.4C32.8 45.2 31.2 47.4 31 50.6C30.8 55.6 32.6 61 33.8 66" +
    "C34.6 70 35.4 73.6 35.2 77.6C35 84 34 92 33.6 100L66 100C65.6 92 64.6 84 64.4 77.6" +
    "C64.2 73.6 65 70 65.8 66C67 61 68.8 55.6 68.6 50.6C68.4 47.4 66.8 45.2 64 44.4" +
    "C61 43.4 57.2 42.2 55 39.6Z";
  return [
    torso,
    head,
    // raised arm, open hand
    limb([64.6, 47.6], 3.7, [74.6, 30.2], 2.7),
    limb([74.6, 30.2], 2.6, [78.6, 14.6], 1.8),
    ellipse([79.4, 11.4], 2.5, 3.1, 14),
    limb([79.4, 10.2], 0.8, [78.6, 4.6], 0.65),
    limb([80.6, 10.4], 0.8, [80.8, 4.2], 0.65),
    limb([81.6, 11], 0.75, [82.6, 5.6], 0.6),
    limb([82.2, 12.2], 0.7, [84.2, 8.2], 0.55),
    limb([77.4, 12.6], 0.85, [75.2, 9.4], 0.65),
    // the microphone arm: elbow out, hand up at the mouth
    limb([35.4, 47.4], 3.7, [29.8, 63], 2.7),
    limb([29.8, 63], 2.6, [53.6, 39.6], 1.9),
    ellipse([55.4, 37.6], 2.3, 2, -40),
    limb([55.8, 37], 0.95, [58.6, 32.6], 1.1),
    ellipse([59.3, 31.7], 1.35, 1.3),
  ];
}

/** A DJ at the decks, one hand in the air. */
function dj(): string[] {
  const head =
    // head nodding down to the decks, headphones on
    "M44.2 26.6C48.8 26.2 52.2 29 52.6 33.4C52.9 36.6 52 39.4 50.4 41.2L50.2 44.2L39 44.2L38.8 41.4" +
    "C36.8 39.4 35.8 36.6 36 33.4C36.4 29.2 39.6 26.8 44.2 26.6Z";
  const phones = [
    // the band over the head and a cup on each ear
    "M35.2 34.2C35 28.2 38.8 24.6 44.4 24.4C50 24.6 53.6 28.2 53.4 34.2L52.2 34.2C52.2 29.4 49 26.2 44.4 26C39.8 26.2 36.4 29.4 36.4 34.2Z",
    ellipse([35.6, 36], 2.2, 3.2, 6),
    ellipse([53, 36], 2.2, 3.2, -6),
  ];
  const torso =
    "M39.4 43C36.6 45.6 32.4 46.6 29.2 47.6C26.4 48.6 24.8 51 24.8 54.4C24.8 59.6 26.4 65 27.4 70L27.4 80" +
    "L61.4 80L61.4 70C62.4 65 64 59.6 64 54.4C64 51 62.4 48.6 59.6 47.6C56.4 46.6 52.2 45.6 49.4 43Z";
  const booth = [
    // the decks, a laptop and the front of the booth
    "M6 76.4L94 76.4L94 100L6 100Z",
    "M18 73.4L72 73.4L73.4 76.6L16.6 76.6Z",
    "M60.8 59.8L74.6 61.2L73.6 74.2L59.4 73.2Z",
  ];
  return [
    head,
    ...phones,
    torso,
    // a fist in the air
    limb([59.4, 50.6], 3.7, [70.2, 37], 2.7),
    limb([70.2, 37], 2.6, [72.4, 21.6], 1.9),
    ellipse([72.6, 18.8], 2.6, 3, 8),
    // the other hand down on the decks
    limb([29.4, 50.6], 3.7, [24.6, 64.6], 2.7),
    limb([24.6, 64.6], 2.6, [33.4, 72.2], 1.9),
    ...booth,
  ];
}

export type Pose = "mic" | "guitar" | "reach" | "dj";
export const PERFORMERS: Record<Pose, string[]> = {
  mic: micStandSinger(),
  guitar: guitarist(),
  reach: reachingSinger(),
  dj: dj(),
};

/** "bingo" in neon tube lettering (Tilt Neon, SIL Open Font License), 257.1 × 91.5. */
export const NEON_BINGO = {
  width: 257.1,
  height: 91.5,
  d: "M0 70.1Q0 72.6 1.4 73.9Q2.7 75.2 4.5 75.2Q6.3 75.2 7.7 73.9Q8.8 72.7 9 70.6Q11.4 72.4 14.3 73.7Q18.7 75.6 24 75.6Q29 75.6 33.4 73.7Q37.7 71.8 41 68.3Q44.3 64.9 46.2 60.2Q48 55.4 48 49.7Q48 42.1 44.8 36.2Q41.6 30.4 36.2 27Q30.7 23.7 23.9 23.7Q17 23.7 11.6 27Q10.2 27.8 9 28.8V5Q9 2.5 7.7 1.2Q6.3 0 4.5 0Q2.7 0 1.4 1.2Q0 2.5 0 5ZM9 54.2V49.5Q9 44.6 10.8 40.8Q12.7 37 16 34.8Q19.4 32.7 23.9 32.7Q27.2 32.7 30 33.9Q32.8 35.2 34.8 37.5Q36.8 39.8 37.9 42.9Q39 46 39 49.7Q39 53.4 37.9 56.5Q36.7 59.6 34.7 61.8Q32.7 64.1 30 65.3Q27.2 66.6 24 66.6Q20.8 66.6 18.1 65.4Q15.4 64.3 13.3 62.5Q11.3 60.7 10.2 58.5Q9 56.3 9 54.2ZM62.8 70.5Q62.8 73.1 64.2 74.3Q65.5 75.6 67.3 75.6Q69.1 75.6 70.5 74.3Q71.8 73 71.8 70.5V28.7Q71.8 26.2 70.5 24.9Q69.1 23.7 67.3 23.7Q65.5 23.7 64.2 24.9Q62.8 26.2 62.8 28.7ZM62.8 10.9Q62.8 13.2 64.2 14.3Q65.5 15.5 67.3 15.5Q69.1 15.5 70.5 14.3Q71.8 13.2 71.8 10.9V6Q71.8 3.7 70.5 2.5Q69.1 1.4 67.3 1.4Q65.5 1.4 64.2 2.5Q62.8 3.7 62.8 6ZM125 70.5Q125 73 126.4 74.3Q127.7 75.6 129.5 75.6Q131.3 75.6 132.7 74.3Q134 73 134 70.5V45.2Q134 40 132.5 36Q131 32 128.3 29.2Q125.6 26.5 122 25.1Q118.3 23.7 114 23.7Q108.8 23.7 104.3 25.8Q101.1 27.3 98.5 29.6V28.7Q98.5 26.2 97.2 24.9Q95.8 23.6 94 23.6Q92.2 23.6 90.8 24.9Q89.5 26.2 89.5 28.7V70.5Q89.5 72.5 90.4 73.8Q91.3 75 92.7 75.4Q94 75.8 95.3 75.4Q96.7 75 97.6 73.8Q98.5 72.5 98.5 70.5V48.7Q98.5 44.8 99.6 41.8Q100.7 38.8 102.7 36.8Q104.6 34.8 107.3 33.8Q110 32.7 113.3 32.7Q117.1 32.7 119.7 34.1Q122.3 35.5 123.7 38.2Q125 41 125 45.2ZM157.5 80Q155.2 78.9 153.5 79.6Q151.7 80.3 151 81.9Q150.2 83.5 150.8 85.3Q151.3 87.1 153.5 88.2Q158.6 90.6 164.1 91.2Q169.5 91.9 174.6 90.8Q179.7 89.8 183.8 87Q187.9 84.3 190.3 79.9Q192.7 75.5 192.7 69.6V28.7Q192.7 26.2 191.4 24.9Q190 23.6 188.2 23.6Q186.4 23.6 185.1 24.8Q183.9 25.9 183.7 28Q182.8 27.3 181.7 26.6Q176.6 23.7 170.1 23.7Q163.8 23.7 158.7 26.7Q153.6 29.7 150.6 34.9Q147.6 40.1 147.6 46.7Q147.6 51.7 149.3 56Q151 60.2 154.1 63.4Q157.2 66.5 161.3 68.2Q165.4 69.9 170.2 69.9Q175 69.9 179.1 68.2Q181.6 67.2 183.7 65.6V69.6Q183.7 74.4 181.2 77.3Q178.7 80.3 174.7 81.5Q170.6 82.8 166.1 82.4Q161.6 82 157.5 80ZM183.7 46.5V46.9Q183.7 50 182.7 52.5Q181.7 55.1 180 57Q178.2 58.9 175.7 59.9Q173.2 60.9 170.2 60.9Q167.2 60.9 164.7 59.8Q162.2 58.8 160.4 56.9Q158.6 55.1 157.6 52.4Q156.6 49.8 156.6 46.7Q156.6 43.6 157.6 41Q158.6 38.5 160.4 36.6Q162.2 34.8 164.7 33.8Q167.1 32.7 170.1 32.7Q174.1 32.7 177.2 34.4Q180.2 36.2 182 39.3Q183.7 42.4 183.7 46.5ZM224.6 74.6Q227 75.4 228.7 74.5Q230.3 73.6 230.9 71.9Q231.5 70.2 230.7 68.6Q229.9 66.9 227.5 66Q225.7 65.4 224.2 64.6Q222.7 63.8 221.5 62.7Q220.2 61.6 219.1 60Q217.7 57.9 217 55.2Q216.2 52.6 216.2 49.6Q216.2 44.7 218.2 40.9Q220.2 37 223.8 34.8Q227.4 32.7 232.1 32.7Q236.8 32.7 240.4 34.8Q244 37 246.1 40.9Q248.1 44.7 248.1 49.6Q248.1 52.6 247.4 55.2Q246.6 57.8 245.2 59.9Q243.5 62.3 241.6 63.6Q239.7 65 236.7 66Q234.3 66.9 233.5 68.6Q232.7 70.2 233.3 71.9Q233.9 73.6 235.6 74.5Q237.2 75.4 239.5 74.6Q244 73 247.1 70.8Q250.2 68.6 252.6 64.9Q254.8 61.7 256 57.9Q257.1 54 257.1 49.6Q257.1 42.1 253.9 36.2Q250.6 30.4 245 27Q239.3 23.7 232.1 23.7Q225 23.7 219.4 27Q213.7 30.4 210.5 36.2Q207.2 42.1 207.2 49.6Q207.2 54.1 208.4 58Q209.6 61.9 211.7 65Q214.1 68.6 217.2 70.8Q220.4 73.1 224.6 74.6Z",
};

// ── The crowd ───────────────────────────────────────────────────────────────

export type CrowdMember = {
  /** 0 = by the TV, 1 = the middle of the room, 2 = right in front of you (out of focus). */
  row: 0 | 1 | 2;
  /** Middle of the shoulders, in % of the scene's width. */
  x: number;
  y: number;
  /** Scene width % per drawing unit. */
  size: number;
  spec: PersonSpec;
  /** Degrees each way, and seconds per swing. */
  sway: number;
  period: number;
};

const her = { shoulders: 16.8, neck: 4.9, slope: 1.6 } as const;
const him = { shoulders: 19, neck: 5.8 } as const;

export const CROWD: CrowdMember[] = [
  // standing by the TV, in twos and threes, some further back than others
  { row: 0, x: 8.6, y: 72.4, size: 0.27, spec: { ...her, hair: "long", tilt: 5, turn: 0.8, twist: 0.4 }, sway: 0.9, period: 5.3 },
  { row: 0, x: 15.6, y: 73.6, size: 0.3, spec: { ...him, hair: "crop", tilt: -4, turn: -0.7, twist: 0.6, lean: 1 }, sway: 0.7, period: 4.4 },
  { row: 0, x: 30, y: 75.8, size: 0.31, spec: { ...him, hair: "short", twist: -0.4 }, sway: 0.6, period: 4.9 },
  { row: 0, x: 37.8, y: 72.2, size: 0.26, spec: { ...her, hair: "bun", tilt: -3, turn: -0.6, twist: -0.5 }, sway: 1.1, period: 6.1 },
  { row: 0, x: 45.2, y: 74.4, size: 0.29, spec: { ...him, hair: "curls", tilt: -2, twist: 0.3, lean: -0.8 }, sway: 1, period: 5.7 },
  { row: 0, x: 58.4, y: 72.6, size: 0.28, spec: { ...him, hair: "beanie", tilt: 2, twist: -0.7 }, sway: 0.8, period: 4.6 },
  { row: 0, x: 70.4, y: 74.2, size: 0.28, spec: { ...her, hair: "bob", tilt: 4, turn: 0.6, twist: 0.5 }, sway: 1.2, period: 6.4 },
  { row: 0, x: 78.6, y: 72.8, size: 0.29, spec: { ...him, hair: "buzz", tilt: -3, twist: -0.5, lean: 0.8 }, sway: 0.6, period: 5.1 },
  { row: 0, x: 92, y: 73.8, size: 0.28, spec: { ...her, hair: "long", tilt: -2, turn: -0.6 }, sway: 1, period: 5.9 },
  // sitting at tables in the middle of the room
  { row: 1, x: 5, y: 89.6, size: 0.44, spec: { ...him, hair: "short", tilt: -4, twist: 0.6 }, sway: 0.8, period: 5.8 },
  { row: 1, x: 17.6, y: 90.8, size: 0.42, spec: { ...her, hair: "long", tilt: 6, turn: 1.2, twist: -0.3, lean: -1 }, sway: 1.2, period: 6.6 },
  { row: 1, x: 29.4, y: 89.2, size: 0.45, spec: { ...him, hair: "crop", tilt: -5, turn: -0.8, twist: 0.4 }, sway: 0.9, period: 5.2 },
  { row: 1, x: 47.6, y: 90.6, size: 0.43, spec: { ...her, hair: "bob", tilt: 2, twist: -0.6 }, sway: 1, period: 6.1 },
  // at the next table, right in front of you
  { row: 2, x: 1, y: 112.6, size: 0.74, spec: { ...him, hair: "beanie", tilt: 4, twist: -0.3 }, sway: 0.6, period: 6.8 },
];
