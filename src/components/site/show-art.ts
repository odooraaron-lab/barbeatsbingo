/**
 * Drawing data for the home page scene: the crowd's silhouettes, built from a few
 * measurements so each person looks different, the music videos on the TV, and the
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
  const shoulders = spec.shoulders ?? 19.2;
  const neck = spec.neck ?? 6.4;
  const slope = spec.slope ?? 0;
  const tilt = spec.tilt ?? 0;
  const turn = spec.turn ?? 0;
  const s = spec.head ?? 1;
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

// ── The TV: shots from music videos ─────────────────────────────────────────
// Drawn in the screen's own units, 160 × 90 (16:9). No performers: shots of a
// microphone, a record, a mirror ball, palms at sunset and a city at night look
// real, where a drawn person looks like a cut-out. The song's caption covers the
// top left of the screen, so each shot keeps its subject clear of it.

/** A small repeatable random sequence, so the drawings come out the same every time. */
function seeded(seed: number) {
  let v = seed >>> 0;
  return () => {
    v = (Math.imul(v, 1664525) + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

/** Two decimals, for small details. */
const g = (n: number) => (Math.round(n * 100) / 100).toString();
const fine = ([x, y]: Pt) => `${g(x)} ${g(y)}`;
const polygon = (pts: Pt[]) => `M${pts.map(fine).join("L")}Z`;
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const scale = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const unit = (a: Pt): Pt => scale(a, 1 / (Math.hypot(a[0], a[1]) || 1));
/** A direction turned by `deg` degrees, clockwise on screen. */
function turnBy([x, y]: Pt, deg: number): Pt {
  const r = (deg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
}
/** A box, outlined the same way round as the other shapes (so overlaps don't cut holes). */
const box = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y + h],
  [x, y],
  [x + w, y],
  [x + w, y + h],
];

/** Point and unit tangent on a quadratic curve. */
function quad(p0: Pt, p1: Pt, p2: Pt, t: number): { at: Pt; dir: Pt } {
  const u = 1 - t;
  const at: Pt = [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  return { at, dir: unit([2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])]) };
}

/** A tapering band along a quadratic curve, `width(t)` either side; `edge` roughens the sides. */
function band(p0: Pt, p1: Pt, p2: Pt, width: (t: number) => number, edge: (t: number) => number, steps: number) {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const { at, dir } = quad(p0, p1, p2, t);
    const normal: Pt = [-dir[1], dir[0]];
    const w = width(t) * edge(t);
    left.push(add(at, scale(normal, w)));
    right.push(add(at, scale(normal, -w)));
  }
  return polygon([...left, ...right.reverse()]);
}

/** A thin leaflet from `base` along `dir`, sagging as it goes. */
function leaflet(base: Pt, dir: Pt, len: number, w: number, sag: number) {
  const n: Pt = [-dir[1], dir[0]];
  const along = (s: number): Pt => add(add(base, scale(dir, len * s)), [0, sag * len * s * s]);
  const mid = along(0.5);
  return polygon([add(base, scale(n, w)), add(mid, scale(n, w * 0.6)), along(1), add(mid, scale(n, -w * 0.6)), add(base, scale(n, -w))]);
}

/**
 * One palm frond in silhouette: a stalk that sets off from the crown at `angle`
 * (degrees clockwise from pointing right), arches over and bows under its own
 * weight, with thin leaflets hanging from both sides.
 */
function frond(crown: Pt, angle: number, length: number, rnd: () => number) {
  const dir = turnBy([1, 0], angle);
  const out = Math.abs(dir[0]); // 1 reaching sideways, 0 pointing straight up or down
  const up = Math.max(0, -dir[1]);
  const lean = dir[0] < 0 ? -1 : 1;
  const p1 = add(crown, scale(dir, length * 0.5));
  const p2 = add(add(crown, scale(dir, length * 0.86)), [lean * up * length * 0.24, length * (0.08 + 0.44 * out)]);
  let d = band(crown, p1, p2, (t) => length * 0.014 * (1 - 0.8 * t), () => 1, 14);
  const count = Math.round(length * 0.9);
  for (let i = 0; i < count; i++) {
    const t = 0.05 + (0.93 * (i + rnd() * 0.6)) / count;
    const { at, dir: along } = quad(crown, p1, p2, t);
    // The near row of leaflets hangs from the stalk's lower side; the far row,
    // pointing away, looks shorter and rises a little before it droops.
    let down: Pt = [-along[1], along[0]];
    if (down[1] < 0) down = scale(down, -1);
    const reach = length * 0.3 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t)), 0.8);
    for (const row of [1, -1]) {
      if (rnd() < 0.06) continue; // torn off
      const near = row > 0;
      const spread = ((44 + rnd() * 20) * Math.PI) / 180;
      const way = unit(add(add(scale(along, Math.cos(spread)), scale(down, row * Math.sin(spread))), [0, near ? 0.3 + 0.3 * out : 0.18]));
      const len = reach * (0.82 + rnd() * 0.3) * (near ? 1 : 0.62 + 0.25 * (1 - out));
      d += leaflet(at, way, len, length * 0.0085, near ? 0.28 : 0.2);
    }
  }
  return d;
}

/** A palm tree in silhouette: a curving trunk, and a crown of feathery fronds. */
export function palmTree(base: Pt, crown: Pt, size: number, seed: number) {
  const rnd = seeded(seed);
  const bend: Pt = [(base[0] + crown[0]) / 2 - size * 0.13, (base[1] + crown[1]) / 2 + size * 0.03];
  // The trunk tapers up from a flared foot, its rings just showing on the edges.
  const trunk = band(
    base,
    bend,
    crown,
    (t) => size * (0.016 + 0.012 * (1 - t) + 0.018 * Math.pow(1 - t, 10)),
    (t) => 1 + 0.05 * Math.sin(t * 80),
    60,
  );
  // The knot at the top of the trunk, and the coconuts under it.
  let knot = oval([crown[0], crown[1] + size * 0.008], size * 0.024, size * 0.028);
  for (const [dx, dy] of [
    [-0.017, 0.024],
    [0.013, 0.027],
    [-0.002, 0.038],
    [0.024, 0.014],
  ]) {
    knot += oval([crown[0] + dx * size, crown[1] + dy * size], size * 0.014, size * 0.015);
  }
  // Fronds all round the crown: seen side on they reach every way, some
  // foreshortened. The last two are old ones, hanging down.
  let fronds = "";
  const angles = [-198, -174, -150, -126, -102, -80, -56, -32, -10, 12, 106, 74];
  for (const [i, a] of angles.entries()) {
    const old = i >= angles.length - 2;
    const length = size * (old ? 0.26 : 0.38 + rnd() * 0.16) * (0.72 + rnd() * 0.28);
    fronds += frond(crown, a + (rnd() - 0.5) * 14, length, rnd);
  }
  return { trunk, knot, fronds };
}

/**
 * The sun's path across the sea: short flashes of light round a line under the
 * sun, more of them and wider nearer the viewer. Each set is a different scatter;
 * they take turns, so the water shimmers.
 */
export function sunGlitter(cx: number, horizon: number, seed: number, sets = 3) {
  const rnd = seeded(seed);
  return Array.from({ length: sets }, () => {
    let d = "";
    for (let i = 0; i < 64; i++) {
      const depth = Math.pow(rnd(), 1.35); // 0 at the horizon, 1 at the bottom of the screen
      const y = horizon + 0.35 + depth * (90 - horizon);
      const spread = 2.2 + depth * 12;
      const x = cx + (spread * (rnd() + rnd() + rnd() - 1.5)) / 1.5;
      const w = (0.5 + rnd() * 1.5) * (0.6 + depth * 2.4);
      const h = 0.12 + depth * 0.32;
      d += polygon([
        [x - w / 2, y],
        [x, y - h / 2],
        [x + w / 2, y],
        [x, y + h / 2],
      ]);
    }
    return d;
  });
}

/** A block's outline: setbacks and a mast on the tall ones, a water tank on some roofs. */
function block(x: number, w: number, top: number, bottom: number, tall: boolean, rnd: () => number) {
  const parts: Pt[][] = [box(x, top, w, bottom - top)];
  let roof = top;
  let left = x;
  let right = x + w;
  if (tall) {
    for (let s = rnd() < 0.5 ? 1 : 2; s > 0; s--) {
      const inset = (right - left) * (0.12 + rnd() * 0.12);
      const rise = 2 + rnd() * 4;
      parts.push(box(left + inset, roof - rise, right - left - inset * 2, rise + 0.3));
      left += inset;
      right -= inset;
      roof -= rise;
    }
  }
  let mast: Pt | null = null;
  if (tall && rnd() < 0.7) {
    const mx = (left + right) / 2;
    const height = 4 + rnd() * 5;
    parts.push(box(mx - 0.2, roof - height, 0.4, height + 0.3));
    mast = [mx, roof - height];
  } else if (!tall && w > 6 && rnd() < 0.35) {
    // a water tank on legs
    const tx = x + 1.2 + rnd() * (w - 4.4);
    parts.push(box(tx + 0.3, top - 1.4, 0.3, 1.7));
    parts.push(box(tx + 2, top - 1.4, 0.3, 1.7));
    parts.push(box(tx, top - 3.8, 2.6, 2.5));
    parts.push([
      [tx - 0.2, top - 3.7],
      [tx + 1.3, top - 5],
      [tx + 2.8, top - 3.7],
    ]);
  }
  return { outline: parts.map(polygon).join(""), mast };
}

/**
 * A city at night in two layers: towers far off in the haze, and nearer blocks
 * with lit windows (warm, cool and dim), water tanks on the roofs and red lights
 * on the masts. Drawn wider than the screen, so the camera can pan across it.
 */
export function skyline(seed: number) {
  const rnd = seeded(seed);
  let far = "";
  let farLit = "";
  let near = "";
  const lit = ["", "", ""];
  const masts: Pt[] = [];
  for (let x = -12; x < 172; ) {
    const w = 3.5 + rnd() * 8;
    const height = 8 + rnd() * rnd() * 36;
    const top = 66 - height;
    far += block(x, w, top, 72, height > 26, rnd).outline;
    for (let wy = top + 1.2; wy < 70; wy += 1.5) {
      for (let wx = x + 0.8; wx < x + w - 1; wx += 1.2) {
        if (rnd() < 0.16) farLit += polygon(box(wx, wy, 0.42, 0.55));
      }
    }
    x += w + rnd() * 2;
  }
  for (let x = -12; x < 172; ) {
    const w = 6 + rnd() * 11;
    const height = 6 + rnd() * rnd() * 30 + (rnd() < 0.12 ? 14 : 0);
    const top = 76 - height;
    const b = block(x, w, top, 92, height > 24, rnd);
    near += b.outline;
    if (b.mast) masts.push(b.mast);
    const chance = 0.1 + rnd() * 0.42;
    for (let wy = top + 1.6; wy < 90; wy += 2.05) {
      const floor = rnd() < 0.08 ? 0.85 : chance; // now and then a whole floor still at work
      for (let wx = x + 1; wx < x + w - 1.3; wx += 1.55) {
        if (rnd() < floor) {
          const c = rnd();
          lit[c < 0.62 ? 0 : c < 0.84 ? 1 : 2] += polygon(box(wx, wy, 0.72, 1.05));
        }
      }
    }
    x += w + (rnd() < 0.3 ? rnd() * 2.5 : -0.5);
  }
  return { far, farLit, near, lit, masts };
}

type V3 = [number, number, number];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit3 = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * A mirror ball, facet by facet, in rows round it like the real thing. Each facet
 * shows a bit of the room: most catch the dark, some the coloured lights, and the
 * ones angled between the spotlight (upper left) and the camera flash white.
 * Returns the facets by shade, darkest first; two sets of facets that take turns
 * to catch the light as it turns; and the brightest points, where it glints.
 */
export function mirrorBall(cx: number, cy: number, r: number, seed: number) {
  const rnd = seeded(seed);
  const deg = Math.PI / 180;
  const light = unit3([-0.5, 0.62, 0.6]);
  const half = unit3([light[0], light[1], light[2] + 1]);
  const at = (lat: number, lon: number): Pt => [cx + r * Math.cos(lat * deg) * Math.sin(lon * deg), cy - r * Math.sin(lat * deg)];
  const shades = ["", "", "", "", "", ""];
  const flash = ["", ""];
  const bright: { p: Pt; spec: number }[] = [];
  const rows = 18;
  for (let row = 0; row < rows; row++) {
    const lat0 = -90 + (180 * row) / rows;
    const lat1 = lat0 + 180 / rows;
    const lat = (lat0 + lat1) / 2;
    // Fewer facets round the rows nearer the top and bottom, as on a real ball.
    const count = Math.max(6, Math.round(38 * Math.cos(lat * deg)));
    const step = 360 / count;
    const offset = rnd() * step;
    const gap = Math.min(step * 0.25, 0.9 / Math.cos(lat * deg));
    for (let k = 0; k < count; k++) {
      const a = -180 + offset + k * step;
      const lon0 = Math.max(-90, a + gap);
      const lon1 = Math.min(90, a + step - gap);
      if (lon1 <= lon0) continue; // round the back
      const lon = (lon0 + lon1) / 2;
      const n: V3 = [Math.cos(lat * deg) * Math.sin(lon * deg), Math.sin(lat * deg), Math.cos(lat * deg) * Math.cos(lon * deg)];
      const spec = Math.pow(Math.max(0, dot3(n, half)), 26);
      const facing = Math.max(0, dot3(n, light));
      const v = rnd();
      const shade = spec > 0.5 ? 5 : spec > 0.16 ? 4 : v < 0.12 ? 3 : v < 0.2 + 0.3 * facing ? 2 : v < 0.72 ? 1 : 0;
      const facet = polygon([at(lat0 + 0.9, lon0), at(lat0 + 0.9, lon1), at(lat1 - 0.9, lon1), at(lat1 - 0.9, lon0)]);
      shades[shade] += facet;
      if (shade < 4 && rnd() < 0.08) flash[k % 2] += facet;
      if (shade >= 4) bright.push({ p: at(lat, lon), spec });
    }
  }
  bright.sort((a, b) => b.spec - a.spec);
  const glints = [bright[0], bright[Math.floor(bright.length / 2)], bright[bright.length - 1]]
    .filter(Boolean)
    .map(({ p }) => p);
  return { shades, flash, glints };
}

/** Spots of light thrown round the room by the mirror ball, scattered over the 160 × 90 screen. */
export function discoSpots(seed: number, count: number) {
  const rnd = seeded(seed);
  const cols = Math.round(Math.sqrt((count * 160) / 90));
  const rows = Math.ceil(count / cols);
  const spots: { x: number; y: number; rx: number; ry: number; o: number }[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const x = ((j + 0.1 + rnd() * 0.8) * 160) / cols;
      const y = ((i + 0.1 + rnd() * 0.8) * 90) / rows;
      const size = 0.45 + rnd() * rnd() * 1.1;
      // Spots off to the sides land on the walls at a slant, so they stretch.
      const stretch = 1 + (Math.abs(x - 80) / 80) * 0.7;
      spots.push({
        x: +g(x),
        y: +g(y),
        rx: +g(size * stretch * (1 + rnd() * 0.25)),
        ry: +g(size),
        o: +g(0.35 + rnd() * 0.65),
      });
    }
  }
  return spots;
}

/** A stage microphone on its stand, seen from the front. */
export const MIC = {
  stand:
    // pole, the clip, and the base's legs (just in shot)
    "M79.3 90L79.3 41.5Q79.3 40.4 80 40.4Q80.7 40.4 80.7 41.5L80.7 90Z" +
    "M78.2 41.6L81.8 41.6L81.4 38.6L78.6 38.6Z",
  body:
    // the handle, tapering into the clip
    "M78.7 38.8L77.6 30.6Q77.5 29.6 78.6 29.4L81.6 29.2Q82.6 29.3 82.5 30.3L81.3 38.8Z" +
    // the ring under the grille
    "M77.1 30.1L82.9 29.6L82.8 28L77 28.5Z",
  grille: "M80 13.6A7.5 7.6 -6 1 1 79.9 13.6Z",
};

/**
 * A record player's arm, seen from above at an angle like the record: the pivot
 * just off the record at the right (clear of the channel logo), the arm reaching
 * onto the record, the headshell turned in toward the spindle, and the counter-
 * weight behind the pivot. `across` runs from one edge of the arm to the other,
 * for shading it like a metal tube.
 */
export const TONEARM = (() => {
  const pivot: Pt = [151, 27.6];
  const joint: Pt = [117, 47.6];
  const u = unit([joint[0] - pivot[0], joint[1] - pivot[1]]);
  const n: Pt = [-u[1], u[0]];
  const bar = (from: Pt, to: Pt, w0: number, w1 = w0) =>
    polygon([add(from, scale(n, w0)), add(to, scale(n, w1)), add(to, scale(n, -w1)), add(from, scale(n, -w0))]);
  const across = (w: number) => {
    const [a, b] = [add(pivot, scale(n, w)), add(pivot, scale(n, -w))];
    return { x1: +g(a[0]), y1: +g(a[1]), x2: +g(b[0]), y2: +g(b[1]) };
  };
  const h = turnBy(u, 22);
  const hn: Pt = [-h[1], h[0]];
  const on = (k: number, side = 0, drop = 0): Pt => add(add(add(joint, scale(h, k)), scale(hn, side)), [0, drop]);
  return {
    across: across(0.85),
    acrossWeight: across(2.1),
    plate: oval([151, 31.2], 7.2, 4.4),
    post: "M148 31.2L148 27.6A3 1.85 0 0 1 154 27.6L154 31.2A3 1.85 0 0 1 148 31.2Z",
    cap: oval(pivot, 3, 1.85),
    weight: bar(add(pivot, scale(u, -4.2)), add(pivot, scale(u, -9.6)), 2.1),
    arm: bar(add(pivot, scale(u, -3.6)), joint, 0.85, 0.72),
    cartridge: polygon([on(2.8, 1.05, 0.7), on(6.8, 1.05, 0.7), on(6.8, -1.05, 1.8), on(2.8, -1.05, 1.8)]),
    head: polygon([on(0, 1.1), on(7.4, 1.65), on(7.4, -1.65), on(0, -1.1)]),
    lift: polygon([on(5.4, 1.5), on(6.5, 4.1), on(7.1, 4), on(6.1, 1.5)]),
  };
})();

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

const her = { shoulders: 16.6, neck: 5.4, slope: 1.8 } as const;
const him = { shoulders: 19.2, neck: 6.4 } as const;

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
