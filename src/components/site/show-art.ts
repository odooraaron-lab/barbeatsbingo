/**
 * Drawing data for the home page scene: the crowd's silhouettes, built from a few
 * measurements so each person looks different, the performers on the TV, and the
 * neon sign's tube lettering.
 *
 * People are drawn from behind, in units where a head is about 16 wide. The shoulder
 * line is at y = 0, the nape of the neck at y = -9.5, the crown about 30 above the
 * shoulders, and the body runs off the bottom at y = 54. Outlines are smooth curves
 * through a few key points on one side, mirrored for the other.
 */

export type Hair = "buzz" | "short" | "crop" | "long" | "swept" | "bob" | "bun" | "curls" | "beanie";

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

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const pt = ([x, y]: Pt) => `${f(x)} ${f(y)}`;

function transform(p: Pt, angle: number, dx: number, dy: number, s = 1): Pt {
  const r = (angle * Math.PI) / 180;
  const [x, y] = [p[0] * s, p[1] * s];
  return [x * Math.cos(r) - y * Math.sin(r) + dx, x * Math.sin(r) + y * Math.cos(r) + dy];
}

/** A smooth closed outline through the points (Catmull-Rom curves), drawn clockwise. */
function smooth(points: Pt[]): string {
  const n = points.length;
  const at = (i: number) => points[(i + n) % n];
  let d = `M${pt(points[0])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + "Z";
}

/** A clockwise ellipse (so it joins the outlines it overlaps). */
function oval([cx, cy]: Pt, rx: number, ry: number, rot = 0): string {
  const r = (rot * Math.PI) / 180;
  const a: Pt = [cx + rx * Math.cos(r), cy + rx * Math.sin(r)];
  const b: Pt = [cx - rx * Math.cos(r), cy - rx * Math.sin(r)];
  return `M${pt(a)}A${f(rx)} ${f(ry)} ${f(rot)} 1 1 ${pt(b)}A${f(rx)} ${f(ry)} ${f(rot)} 1 1 ${pt(a)}Z`;
}

/**
 * One side of the body, from the neck down: a short neck, a smooth turn into the
 * slope of the shoulder (the trapezius), the round of the shoulder and the arm.
 */
function bodySide(s: number, n: number, slope: number): Pt[] {
  // The shoulder line drops `drop` per unit outwards: men about 23 degrees, women steeper.
  const drop = 0.42 + slope * 0.1;
  const tip: Pt = [s - 0.2, -1.4 + slope * 0.5];
  const along = (x: number): Pt => [x, tip[1] - drop * (tip[0] - x)];
  return [
    [n, -8.6],
    [n + 0.25, -7.1],
    [n + 1.2, -5.9 + slope * 0.15],
    along(n + 3.4),
    along(n + 7.4),
    tip,
    // the round of the shoulder
    [s + 1.7, tip[1] + 1.1],
    [s + 2.7, tip[1] + 3.2],
    [s + 3, tip[1] + 6.2],
    // the arm, hanging, the body narrowing a little below it
    [s + 2.9, 14],
    [s + 2.4, 25],
    [s + 1.9, 36],
    [s + 1.6, 54],
  ];
}

/** Right side of the head, by hairstyle, from the crown down. Nape at (0, 0). */
function headSide(hair: Hair): Pt[] {
  // The skull from behind: round on top, widest a third of the way down, tapering to the neck.
  const skull: Pt[] = [
    [0, -19.8],
    [3.7, -19.4],
    [6.4, -17.9],
    [7.9, -15.4],
    [8.5, -12.4],
    [8.4, -9.4],
    [7.9, -6.6],
    [7.2, -4.1],
    [6.6, -2.2],
  ];
  switch (hair) {
    case "buzz":
      return skull;
    case "short":
      return [[0, -20.7], [4.2, -20.3], [7, -18.6], [8.6, -15.6], [8.9, -12.4], [8.5, -9.4], ...skull.slice(6)];
    case "crop":
      return [
        [0, -21.3],
        [1.9, -21.7],
        [3.9, -21.2],
        [5.8, -20.4],
        [7.5, -18.7],
        [8.7, -15.7],
        [8.9, -12.4],
        [8.5, -9.4],
        ...skull.slice(6),
      ];
    case "beanie":
      return [
        [0, -22.5],
        [4.6, -21.9],
        [7.5, -19.6],
        [8.9, -16.2],
        // the folded cuff
        [9.4, -13.4],
        [9.5, -11.6],
        [8.8, -10.6],
        ...skull.slice(6),
      ];
    case "bun":
      // hair pulled back tight
      return [[0, -20.1], [3.9, -19.7], [6.6, -18.1], [8.1, -15.5], [8.7, -12.4], [8.5, -9.4], ...skull.slice(6)];
    case "curls": {
      // A full halo of curls with soft bumps, drawing in at the nape.
      const out: Pt[] = [];
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const a = -90 + (i / steps) * 128;
        const r = 11.4 + (i % 2 ? 0.45 : -0.2);
        out.push([r * Math.cos((a * Math.PI) / 180), -10.6 + r * Math.sin((a * Math.PI) / 180)]);
      }
      return [...out, [7.4, -1.6]];
    }
    case "bob":
      return [
        [0, -20.6],
        [4.4, -20.1],
        [7.3, -18.2],
        [8.8, -15],
        [9.3, -11.4],
        [9.2, -7.6],
        [9.1, -4],
        [9.4, -0.8],
        [9.7, 2],
        // the ends rest on the shoulders
        [8.8, 3.3],
        [4.4, 3.8],
        [0, 3.6],
      ];
    case "long":
    case "swept":
      // a centre parting, hair close at the neck, then spreading over the back
      return [
        [0, -20.3],
        [4.6, -20.1],
        [7.5, -18.1],
        [9, -14.9],
        [9.3, -11.3],
        [8.9, -7.7],
        [8.1, -4.4],
        [7.8, -1.4],
        [8.5, 2.4],
        [9.7, 6.8],
        [10.4, 11.2],
        [10.1, 15],
        // uneven ends down the back
        [9, 17.4],
        [7.2, 17.9],
        [4.6, 17.1],
        [2.2, 18.2],
        [0, 17.6],
      ];
  }
}

/** Hair swept over one shoulder: this side falls further and wider. */
const SWEPT: Pt[] = [
  [0, -20.3],
  [4.6, -20.1],
  [7.5, -18.1],
  [9, -14.9],
  [9.4, -11.3],
  [9.4, -7.6],
  [9.6, -3.8],
  [10.5, 0.4],
  [11.7, 4.8],
  [12.6, 9.8],
  [12.9, 15],
  [12.2, 19.6],
  [10.4, 21.7],
  [7.6, 21],
  [4.2, 18.6],
  [0, 17.6],
];

/** Hair that hides the neck and falls on the shoulders is drawn as its own shape. */
const fallsOnShoulders = (hair: Hair) => hair === "long" || hair === "swept" || hair === "bob";
const showsEars = (hair: Hair) => hair === "buzz" || hair === "short" || hair === "crop" || hair === "beanie" || hair === "bun";

const mirror = ([x, y]: Pt): Pt => [-x, y];

/** One person, from behind, as a single path. */
export function personPath(spec: PersonSpec): string {
  const shoulders = spec.shoulders ?? 17.6;
  const neck = spec.neck ?? 6.3;
  const slope = spec.slope ?? 0;
  const tilt = spec.tilt ?? 0;
  const turn = spec.turn ?? 0;
  const s = spec.head ?? 1.08;
  const twist = spec.twist ?? 0;
  const lean = spec.lean ?? 0;

  // A turned body shows one shoulder wider than the other.
  const bodyRight = bodySide(shoulders * (1 + 0.14 * twist), neck, slope + lean);
  const bodyLeft = bodySide(shoulders * (1 - 0.14 * twist), neck, slope - lean).map(mirror);
  // The head pivots on the top of the neck.
  const place = (p: Pt) => transform(p, tilt, turn, -9.5, s);
  const side = headSide(spec.hair);
  const headRight = side.map(place);
  const headLeft = (spec.hair === "swept" ? SWEPT : side).map(mirror).map(place);

  let d: string;
  if (fallsOnShoulders(spec.hair)) {
    // Body with its neck, and the hair over it.
    const neckTop: Pt[] = [[0, -15]];
    d = smooth([...neckTop, [neck, -15], ...bodyRight, ...[...bodyLeft].reverse(), [-neck, -15]]);
    d += smooth([...headRight, ...headLeft.slice(1, -1).reverse()]);
  } else {
    // One outline: over the head, down into the neck and out along the shoulders.
    d = smooth([...headRight, ...bodyRight, ...[...bodyLeft].reverse(), ...headLeft.slice(1).reverse()]);
  }

  if (showsEars(spec.hair)) {
    for (const x of [1, -1]) {
      const [cx, cy] = place([x * 8.35, -8.2]);
      d += oval([cx, cy], 0.9 * s, 2.4 * s, tilt + x * 10);
    }
  }
  if (spec.hair === "bun") {
    const [bx, by] = place([0.3, -20.2]);
    d += oval([bx, by], 4.3 * s, 3.7 * s, tilt);
  }
  return d;
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

/** "bar beats bingo" in neon tube lettering (Tilt Neon, SIL Open Font License), 759.2 × 91.5. */
export const NEON_SIGN = {
  width: 759.2,
  height: 91.5,
  /** "bar beats", lit white like the logo's top line */
  barBeats: "M0 70.1Q0 72.6 1.4 73.9Q2.7 75.2 4.5 75.2Q6.3 75.2 7.7 73.9Q8.8 72.7 9 70.6Q11.4 72.4 14.3 73.7Q18.7 75.6 24 75.6Q29 75.6 33.4 73.7Q37.7 71.8 41 68.3Q44.3 64.9 46.2 60.2Q48 55.4 48 49.7Q48 42.1 44.8 36.2Q41.6 30.4 36.2 27Q30.7 23.7 23.9 23.7Q17 23.7 11.6 27Q10.2 27.8 9 28.8V5Q9 2.5 7.7 1.2Q6.3 0 4.5 0Q2.7 0 1.4 1.2Q0 2.5 0 5ZM9 54.2V49.5Q9 44.6 10.8 40.8Q12.7 37 16 34.8Q19.4 32.7 23.9 32.7Q27.2 32.7 30 33.9Q32.8 35.2 34.8 37.5Q36.8 39.8 37.9 42.9Q39 46 39 49.7Q39 53.4 37.9 56.5Q36.7 59.6 34.7 61.8Q32.7 64.1 30 65.3Q27.2 66.6 24 66.6Q20.8 66.6 18.1 65.4Q15.4 64.3 13.3 62.5Q11.3 60.7 10.2 58.5Q9 56.3 9 54.2ZM107.7 29.3Q107.7 26.8 106.4 25.5Q105 24.2 103.2 24.2Q101.4 24.2 100.1 25.5Q98.8 26.7 98.7 28.9Q96.2 26.8 93.2 25.5Q88.8 23.7 83.7 23.7Q76.9 23.7 71.5 27Q66 30.3 62.9 36.1Q59.7 42 59.7 49.6Q59.7 55.3 61.5 60Q63.3 64.8 66.6 68.3Q69.9 71.8 74.3 73.7Q78.7 75.6 83.8 75.6Q88.9 75.6 93.3 74Q96.2 72.9 98.7 71.1V71.6Q98.7 74.1 100.1 75.4Q101.4 76.7 103.2 76.7Q105 76.7 106.4 75.4Q107.7 74.1 107.7 71.6ZM98.7 49.4V51.8Q98.7 55.5 97.7 58.3Q96.6 61.1 94.6 63Q92.6 64.8 89.9 65.7Q87.1 66.6 83.8 66.6Q80.5 66.6 77.7 65.3Q74.9 64.1 72.9 61.8Q70.9 59.5 69.8 56.4Q68.7 53.3 68.7 49.6Q68.7 45.9 69.8 42.8Q70.9 39.7 72.9 37.4Q74.8 35.2 77.6 33.9Q80.4 32.7 83.7 32.7Q88.1 32.7 91.5 34.8Q94.9 36.9 96.8 40.7Q98.7 44.5 98.7 49.4ZM150.5 33.4Q153 33.7 154.4 32.5Q155.9 31.4 156.2 29.6Q156.4 27.8 155.3 26.3Q154.2 24.8 151.7 24.4Q146.2 23.7 141.8 24.8Q137.5 25.9 134.3 28.4Q134 28.6 133.8 28.8Q133.7 26.5 132.5 25.3Q131.1 24 129.3 24Q127.5 24 126.2 25.2Q124.8 26.5 124.8 29.1V70.5Q124.8 72.5 125.7 73.8Q126.6 75 128 75.4Q129.3 75.8 130.7 75.3Q132 74.9 132.9 73.7Q133.8 72.5 133.8 70.5V48.4Q133.8 44.9 134.7 41.9Q135.6 38.9 137.6 36.8Q139.5 34.6 142.7 33.6Q145.9 32.7 150.5 33.4ZM199.2 70.1Q199.2 72.6 200.6 73.9Q201.9 75.2 203.7 75.2Q205.5 75.2 206.9 73.9Q208 72.7 208.2 70.6Q210.6 72.4 213.5 73.7Q217.9 75.6 223.2 75.6Q228.2 75.6 232.6 73.7Q236.9 71.8 240.2 68.3Q243.5 64.9 245.4 60.2Q247.2 55.4 247.2 49.7Q247.2 42.1 244 36.2Q240.8 30.4 235.4 27Q229.9 23.7 223.1 23.7Q216.2 23.7 210.8 27Q209.4 27.8 208.2 28.8V5Q208.2 2.5 206.9 1.2Q205.5 0 203.7 0Q201.9 0 200.6 1.2Q199.2 2.5 199.2 5ZM208.2 54.2V49.5Q208.2 44.6 210.1 40.8Q211.9 37 215.3 34.8Q218.6 32.7 223.1 32.7Q226.4 32.7 229.2 33.9Q232 35.2 234 37.5Q236 39.8 237.1 42.9Q238.2 46 238.2 49.7Q238.2 53.4 237.1 56.5Q235.9 59.6 233.9 61.8Q231.9 64.1 229.2 65.3Q226.4 66.6 223.2 66.6Q220 66.6 217.3 65.4Q214.6 64.3 212.6 62.5Q210.5 60.7 209.4 58.5Q208.2 56.3 208.2 54.2ZM268.1 52.6Q268.1 52.7 268.2 52.7Q269.5 54.1 272 54.1H291.7Q295.9 54.1 298.8 53.3Q301.6 52.5 303.2 51Q304.8 49.4 305.2 47Q305.6 44.6 305 41.5Q304 36 300.9 32Q297.9 28.1 293.3 25.9Q288.7 23.7 283.2 23.7Q276.3 23.7 270.8 26.9Q265.3 30.2 262.1 36Q258.9 41.9 258.9 49.7Q258.9 57.8 262.3 63.6Q265.7 69.4 271.4 72.5Q277.1 75.6 284.1 75.6Q286.9 75.6 289.9 75Q293 74.5 296.1 73.3Q299.2 72.2 302.3 70.4Q304.5 69.2 304.9 67.4Q305.4 65.6 304.5 64Q303.6 62.5 301.9 61.9Q300.1 61.3 297.9 62.6Q295.5 63.9 293.1 64.8Q290.8 65.7 288.5 66.2Q286.2 66.6 284.1 66.6Q279.4 66.6 275.8 64.7Q272.1 62.7 270 58.9Q268.5 56.2 268.1 52.6ZM272 45.1Q269.5 45.1 268.2 46.4Q268.1 46.5 268.1 46.6Q268.5 43.4 269.9 40.7Q271.8 36.9 275.2 34.8Q278.7 32.7 283.2 32.7Q286.6 32.7 289.3 33.9Q292 35.2 293.8 37.5Q295.5 39.9 296.2 43.1Q296.4 44.1 296.1 44.5Q295.9 44.9 295.4 45Q294.8 45.2 293.9 45.1Q292.9 45.1 291.7 45.1ZM365.7 29.3Q365.7 26.8 364.4 25.5Q363 24.2 361.2 24.2Q359.4 24.2 358.1 25.5Q356.8 26.7 356.7 28.9Q354.2 26.8 351.2 25.5Q346.8 23.7 341.7 23.7Q334.9 23.7 329.5 27Q324 30.3 320.9 36.1Q317.7 42 317.7 49.6Q317.7 55.3 319.5 60Q321.3 64.8 324.6 68.3Q327.9 71.8 332.3 73.7Q336.7 75.6 341.8 75.6Q346.9 75.6 351.3 74Q354.2 72.9 356.7 71.1V71.6Q356.7 74.1 358.1 75.4Q359.4 76.7 361.2 76.7Q363 76.7 364.4 75.4Q365.7 74.1 365.7 71.6ZM356.7 49.4V51.8Q356.7 55.5 355.7 58.3Q354.6 61.1 352.6 63Q350.6 64.8 347.9 65.7Q345.1 66.6 341.8 66.6Q338.5 66.6 335.7 65.3Q332.9 64.1 330.9 61.8Q328.9 59.5 327.8 56.4Q326.7 53.3 326.7 49.6Q326.7 45.9 327.8 42.8Q328.9 39.7 330.9 37.4Q332.8 35.2 335.6 33.9Q338.4 32.7 341.7 32.7Q346.1 32.7 349.5 34.8Q352.9 36.9 354.8 40.7Q356.7 44.5 356.7 49.4ZM388 70.5Q388 73.1 389.4 74.3Q390.7 75.6 392.5 75.6Q394.3 75.6 395.7 74.3Q397 73 397 70.5V33.7H404.1Q406.6 33.7 407.9 32.3Q409.2 31 409.2 29.2Q409.2 27.4 407.9 26Q406.6 24.7 404.1 24.7H397V15.7Q397 13.2 395.7 11.9Q394.3 10.6 392.5 10.6Q390.7 10.6 389.4 11.9Q388 13.2 388 15.7V24.7H381.9Q379.4 24.7 378.1 26Q376.8 27.4 376.8 29.2Q376.8 31 378.1 32.3Q379.4 33.7 381.9 33.7H388ZM447.3 35.3Q449.6 36.5 451.4 35.8Q453.1 35.1 453.9 33.5Q454.6 31.9 454.1 30.1Q453.5 28.4 451.3 27.3Q447.5 25.4 443.8 24.5Q440.1 23.7 436.7 23.7Q431.5 23.7 427.5 25.5Q423.5 27.4 421.2 30.7Q418.9 34 418.9 38.4Q418.9 42.9 421.2 45.6Q423.4 48.4 427.2 50.2Q431 52.1 435.7 53.7Q437.8 54.4 440.5 55.3Q443.1 56.3 445 57.8Q446.9 59.2 446.9 61.3Q446.9 63.2 445.7 64.3Q444.4 65.5 442.5 66Q440.5 66.6 438.2 66.6Q436.2 66.6 434.1 66.2Q431.9 65.7 429.7 64.9Q427.5 64.1 425.3 62.9Q423.1 61.7 421.4 62.3Q419.6 62.9 418.8 64.5Q417.9 66.1 418.4 67.9Q418.8 69.7 421.1 70.9Q425.4 73.2 429.8 74.4Q434.2 75.6 438.2 75.6Q443.4 75.6 447.4 73.8Q451.3 72.1 453.6 68.8Q455.9 65.6 455.9 61.3Q455.9 56.6 453.6 53.6Q451.2 50.6 447.2 48.6Q443.3 46.7 438.5 45.1Q437.1 44.7 435.3 44Q433.5 43.4 431.8 42.6Q430.1 41.8 429 40.8Q427.9 39.7 427.9 38.4Q427.9 36.4 429.2 35.1Q430.4 33.9 432.4 33.3Q434.4 32.7 436.7 32.7Q438.4 32.7 440.2 33Q441.9 33.3 443.7 33.9Q445.5 34.5 447.3 35.3Z",
  /** "bingo", lit red */
  bingo: "M502.1 70.1Q502.1 72.6 503.5 73.9Q504.8 75.2 506.6 75.2Q508.4 75.2 509.8 73.9Q510.9 72.7 511.1 70.6Q513.5 72.4 516.4 73.7Q520.8 75.6 526.1 75.6Q531.1 75.6 535.5 73.7Q539.8 71.8 543.1 68.3Q546.4 64.9 548.2 60.2Q550.1 55.4 550.1 49.7Q550.1 42.1 546.9 36.2Q543.7 30.4 538.2 27Q532.8 23.7 526 23.7Q519.1 23.7 513.7 27Q512.3 27.8 511.1 28.8V5Q511.1 2.5 509.8 1.2Q508.4 0 506.6 0Q504.8 0 503.5 1.2Q502.1 2.5 502.1 5ZM511.1 54.2V49.5Q511.1 44.6 513 40.8Q514.8 37 518.1 34.8Q521.5 32.7 526 32.7Q529.3 32.7 532.1 33.9Q534.9 35.2 536.9 37.5Q538.9 39.8 540 42.9Q541.1 46 541.1 49.7Q541.1 53.4 540 56.5Q538.8 59.6 536.8 61.8Q534.8 64.1 532 65.3Q529.3 66.6 526.1 66.6Q522.9 66.6 520.2 65.4Q517.5 64.3 515.5 62.5Q513.4 60.7 512.2 58.5Q511.1 56.3 511.1 54.2ZM564.9 70.5Q564.9 73.1 566.2 74.3Q567.6 75.6 569.4 75.6Q571.2 75.6 572.5 74.3Q573.9 73 573.9 70.5V28.7Q573.9 26.2 572.5 24.9Q571.2 23.7 569.4 23.7Q567.6 23.7 566.2 24.9Q564.9 26.2 564.9 28.7ZM564.9 10.9Q564.9 13.2 566.2 14.3Q567.6 15.5 569.4 15.5Q571.2 15.5 572.5 14.3Q573.9 13.2 573.9 10.9V6Q573.9 3.7 572.5 2.5Q571.2 1.4 569.4 1.4Q567.6 1.4 566.2 2.5Q564.9 3.7 564.9 6ZM627.1 70.5Q627.1 73 628.5 74.3Q629.8 75.6 631.6 75.6Q633.4 75.6 634.8 74.3Q636.1 73 636.1 70.5V45.2Q636.1 40 634.6 36Q633.1 32 630.4 29.2Q627.7 26.5 624 25.1Q620.4 23.7 616.1 23.7Q610.9 23.7 606.4 25.8Q603.2 27.3 600.6 29.6V28.7Q600.6 26.2 599.2 24.9Q597.9 23.6 596.1 23.6Q594.3 23.6 593 24.9Q591.6 26.2 591.6 28.7V70.5Q591.6 72.5 592.5 73.8Q593.4 75 594.8 75.4Q596.1 75.8 597.5 75.4Q598.8 75 599.7 73.8Q600.6 72.5 600.6 70.5V48.7Q600.6 44.8 601.7 41.8Q602.8 38.8 604.8 36.8Q606.7 34.8 609.4 33.8Q612.1 32.7 615.4 32.7Q619.2 32.7 621.8 34.1Q624.4 35.5 625.8 38.2Q627.1 41 627.1 45.2ZM659.6 80Q657.3 78.9 655.6 79.6Q653.8 80.3 653.1 81.9Q652.3 83.5 652.9 85.3Q653.4 87.1 655.6 88.2Q660.7 90.6 666.2 91.2Q671.6 91.9 676.7 90.8Q681.8 89.8 685.9 87Q690 84.3 692.4 79.9Q694.8 75.5 694.8 69.6V28.7Q694.8 26.2 693.5 24.9Q692.1 23.6 690.3 23.6Q688.5 23.6 687.2 24.8Q686 25.9 685.8 28Q684.9 27.3 683.8 26.6Q678.7 23.7 672.2 23.7Q665.9 23.7 660.8 26.7Q655.7 29.7 652.7 34.9Q649.7 40.1 649.7 46.7Q649.7 51.7 651.4 56Q653.1 60.2 656.2 63.4Q659.3 66.5 663.4 68.2Q667.5 69.9 672.3 69.9Q677.1 69.9 681.2 68.2Q683.7 67.2 685.8 65.6V69.6Q685.8 74.4 683.3 77.3Q680.8 80.3 676.8 81.5Q672.7 82.8 668.2 82.4Q663.7 82 659.6 80ZM685.8 46.5V46.9Q685.8 50 684.8 52.5Q683.8 55.1 682.1 57Q680.3 58.9 677.8 59.9Q675.3 60.9 672.3 60.9Q669.3 60.9 666.8 59.8Q664.3 58.8 662.5 56.9Q660.7 55.1 659.7 52.4Q658.7 49.8 658.7 46.7Q658.7 43.6 659.7 41Q660.7 38.5 662.5 36.6Q664.3 34.8 666.8 33.8Q669.2 32.7 672.2 32.7Q676.2 32.7 679.2 34.4Q682.3 36.2 684.1 39.3Q685.8 42.4 685.8 46.5ZM726.7 74.6Q729.1 75.4 730.8 74.5Q732.4 73.6 733 71.9Q733.6 70.2 732.8 68.6Q732 66.9 729.6 66Q727.8 65.4 726.3 64.6Q724.8 63.8 723.6 62.7Q722.3 61.6 721.2 60Q719.8 57.9 719.1 55.2Q718.3 52.6 718.3 49.6Q718.3 44.7 720.3 40.9Q722.3 37 725.9 34.8Q729.5 32.7 734.2 32.7Q738.9 32.7 742.5 34.8Q746.1 37 748.2 40.9Q750.2 44.7 750.2 49.6Q750.2 52.6 749.5 55.2Q748.7 57.8 747.3 59.9Q745.6 62.3 743.7 63.6Q741.8 65 738.8 66Q736.4 66.9 735.6 68.6Q734.8 70.2 735.4 71.9Q736 73.6 737.7 74.5Q739.3 75.4 741.6 74.6Q746.1 73 749.2 70.8Q752.3 68.6 754.7 64.9Q756.9 61.7 758.1 57.9Q759.2 54 759.2 49.6Q759.2 42.1 756 36.2Q752.7 30.4 747.1 27Q741.4 23.7 734.2 23.7Q727.1 23.7 721.5 27Q715.8 30.4 712.6 36.2Q709.3 42.1 709.3 49.6Q709.3 54.1 710.5 58Q711.7 61.9 713.8 65Q716.2 68.6 719.4 70.8Q722.5 73.1 726.7 74.6Z",
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

const her = { shoulders: 15.2, neck: 5.3, slope: 1.8 } as const;
const him = { shoulders: 17.6, neck: 6.3 } as const;

export const CROWD: CrowdMember[] = [
  // standing by the TV, in twos and threes, some further back than others
  { row: 0, x: 8.6, y: 72.4, size: 0.27, spec: { ...her, hair: "swept", tilt: 5, turn: 0.8, twist: 0.4 }, sway: 0.9, period: 5.3 },
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
