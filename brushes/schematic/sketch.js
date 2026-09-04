// Cezeri Mechanisms Brush
// A p5.js brush inspired by the water machines, clocks and automata described
// by al-Jazari at the Artuqid court. It does not reproduce manuscript pages;
// it composes a new, living vocabulary of vessels, water wheels, gears,
// pulleys, pumps and celestial-clock faces along each stroke.
//
// Nodes are snapped to an invisible grid at intervals along the stroke and
// wired to the previous node. Everything is recorded as primitives (ink runs,
// text, filled blots) and then drawn in like a pen plotter: lines extend at a
// fixed speed and text types itself out. The ink is wet: line weight swells
// and thins, lines bleed a soft halo, ink pools and drips where the pen
// lands, and specks fly. The lines themselves stay straight and true.
// Finished marks are baked into the paint layer.

const FONT = 'Menlo, Consolas, "Courier New", monospace';
const PEN_SPEED = 0.7;   // px per ms the pen travels
const CHAR_MS = 22;      // ms per typed character
const W = { heavy: 2.3, reg: 1.25, cable: 1.0, thin: 0.7 }; // line weights (px) at size 1
const PARCHMENT = '#e8d8ad';
const C = {
  // Aged walnut ink with deliberately restrained mineral-pigment accents.
  ink: '#302018', water: '#355f62', copper: '#624321', gold: '#86652b', red: '#71372a',
};

// Ink character. Runs are resampled and wobbled once when recorded, so the
// rough edges are stable from frame to frame.
const INK = {
  step: 2.5,      // px between resampled points along a run
  wobble: 0,      // px the line itself may wander sideways (0 keeps lines true)
  rag: 1.3,       // px of raggedness on blot outlines
  bleed: 2.6,     // how far ink wicks out, as a multiple of the line weight
  bleedAlpha: 34, // alpha of the innermost bleed layer
  fiber: 0.3,     // chance per segment of a fine fiber wicking sideways
  grain: 0.58,    // chance per segment of a grain of ink caught in the paper
  body: 232,      // alpha of the line itself
  pool: 0.7,      // chance a run pools ink where the pen lands and lifts
  blob: 0.3,      // chance a long run carries pooled blobs along its length
  drip: 0.18,     // chance a pooled blob runs into a drip
  speck: 0.48,    // chance a stamp throws specks
};

// The two sets bias each stroke toward water-driven devices or timekeeping
// devices. Mixed draws from both, rather than switching into modern CAD.
const WATER_NODES = [['vessel', 5], ['waterwheel', 4], ['pump', 4], ['gear', 3], ['pulley', 2]];
const CLOCK_NODES = [['clock', 5], ['gear', 5], ['pulley', 3], ['vessel', 2], ['automaton', 1]];
const STYLES = ['water', 'clock', 'mixed'];

const BRUSH = {
  name: 'Cezeri Mechanisms',
  swatch: false,
  help: [
    ['drag', 'draw water machines, clocks and mechanisms'],
    ['1 2 3 / 0', 'water, clock, mixed / random style'],
    ['[ ]', 'brush size   - = density   m mirror'],
    ['space', 'auto-fill page   e eraser'],
    ['c', 'clear   r new grid module'],
    ['s', 'save PNG   h hide this'],
  ],
};

let paint;              // finished marks
let paper;              // fixed parchment grain behind the marks
let u = 12;             // grid module (the unit everything is built from)
let bs = 1;             // brush size multiplier
let density = 1;        // nodes per unit of drag distance
let styleLock = null;   // one of STYLES, or null for random per stroke
let mirror = false;     // also stamp everything mirrored across the page centre
let eraser = false;

let st = null;          // current stroke state
let active = [];        // stamps still being drawn in
let autoDelay = 0;      // ms offset applied to everything created (auto-fill)
let rec = null;         // primitive list being recorded
let boxes = [];         // occupied rectangles [x0, y0, x1, y1]: numbers and node bodies

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(FONT);
  paint = makeLayer();
  paper = makePaper();
  // index.html?auto starts with a page that drafts itself; add
  // &style=water|clock|mixed and &mirror to preset the brush
  const params = new URLSearchParams(location.search);
  if (STYLES.includes(params.get('style'))) styleLock = params.get('style');
  if (params.has('mirror')) mirror = true;
  buildHUD(BRUSH);
  updateHUD();
  if (params.has('auto')) autoFill();
}

function makeLayer() {
  const g = createGraphics(width, height);
  g.strokeCap(ROUND);
  g.strokeJoin(ROUND);
  g.textFont(FONT);
  return g;
}

function makePaper() {
  const g = createGraphics(width, height);
  g.background('#d4bb80');
  g.noStroke();
  // Overlapping soft washes, made of nested irregular ellipses rather than a
  // tiled grid, give the sheet broad age variation without visible pixels.
  for (let i = 0; i < 48; i++) {
    const x = random(-width * 0.15, width * 1.15);
    const y = random(-height * 0.15, height * 1.15);
    const w = random(width * 0.1, width * 0.42);
    const h = random(height * 0.06, height * 0.28);
    for (let ring = 0; ring < 7; ring++) {
      const dark = random() < 0.68;
      g.fill(dark ? 103 : 248, dark ? random(1.5, 5) : random(1, 3));
      g.ellipse(x + random(-w * 0.05, w * 0.05), y + random(-h * 0.08, h * 0.08), w * (1 - ring * 0.1), h * (1 - ring * 0.1));
    }
  }
  // Non-uniform mottling at several scales; circles keep the grain organic.
  for (let i = 0; i < width * height / 340; i++) {
    const dark = random() < 0.58;
    g.fill(dark ? 90 : 255, dark ? random(2, 10) : random(2, 8));
    g.ellipse(random(width), random(height), random(1, 14), random(1, 9));
  }
  // Directional fibres and fine inclusions in the pulp.
  for (let i = 0; i < width * height / 1100; i++) {
    const x = random(width), y = random(height);
    g.stroke(95, 68, 37, random(4, 15));
    g.strokeWeight(random(0.2, 0.65));
    g.line(x, y, x + random(6, 30), y + random(-1.3, 1.3));
  }
  g.noStroke();
  for (let i = 0; i < width * height / 440; i++) {
    const dark = random() < 0.58;
    g.fill(dark ? 72 : 255, dark ? random(6, 25) : random(5, 17));
    g.circle(random(width), random(height), random(0.25, 1.8));
  }
  return g;
}

function windowResized() {
  const old = paint;
  resizeCanvas(windowWidth, windowHeight);
  paint = makeLayer();
  paper = makePaper();
  paint.image(old, 0, 0);
}

function draw() {
  const now = millis();
  advanceStroke();

  // bake finished stamps into the paint layer first, so nothing flickers
  const keep = [];
  for (const s of active) {
    if (now >= s.t0 + s.end) renderStamp(s, paint, Infinity);
    else keep.push(s);
  }
  active = keep;

  image(paper, 0, 0);
  image(paint, 0, 0);
  for (const s of active) renderStamp(s, window, now);
  drawBrushCursor();
}

// ---------------------------------------------------------------- stroke

function beginStroke(x, y) {
  st = { x, y, tx: x, ty: y, pressed: true, travel: 0, nodes: [], mode: styleLock || pick(STYLES) };
}

// A follower chases the cursor, closing a fraction of the gap per substep, so
// hand jitter is filtered before node positions are sampled.
function advanceStroke() {
  if (!st) return;
  for (let k = 0; k < 4; k++) {
    const dx = st.tx - st.x, dy = st.ty - st.y;
    const d = sqrt(dx * dx + dy * dy);
    if (d < 0.4) break;
    const step = min(d, max(1.5, d * 0.15));
    strokeTo(st.x + dx / d * step, st.y + dy / d * step);
  }
  if (!st.pressed && dist(st.x, st.y, st.tx, st.ty) < 0.8) endStroke();
}

function strokeTo(x, y) {
  if (!st) return;
  const d = dist(st.x, st.y, x, y);
  if (d < 0.3) return;
  if (eraser) {
    paint.erase(); paint.noStroke(); paint.circle(x, y, u * 5 * bs); paint.noErase();
    st.x = x; st.y = y;
    return;
  }
  st.travel += d;
  const spacing = (u * 6 * bs) / density;
  if (st.travel >= spacing) {
    st.travel = 0;
    placeNode(snap(x), snap(y));
  }
  st.x = x; st.y = y;
}

function endStroke() {
  if (st && !eraser && !st.nodes.length) placeNode(snap(st.x), snap(st.y)); // a plain click
  st = null;
}

function isCad(mode) { return mode === 'clock' || (mode === 'mixed' && random() < 0.5); }

function mousePressed(e) {
  if (!onCanvas(e) || mouseY < 0 || mouseY > height) return;
  beginStroke(mouseX, mouseY);
}
function mouseDragged() { if (st) { st.tx = mouseX; st.ty = mouseY; } }
function mouseReleased() { if (st) st.pressed = false; }

// ---------------------------------------------------------------- stamping

// Place a node on the grid, wire it to the previous node of the stroke, label
// it and hang decorations off it. Everything goes into `rec`, then `commit`
// schedules it to draw in.
function placeNode(x, y) {
  const prev = st.nodes[st.nodes.length - 1] || null;
  if (prev && dist(prev.x, prev.y, x, y) < u * 2.5 * bs) return;
  const clock = isCad(st.mode);
  const n = makeNode(x, y, clock);
  rec = [];
  claim([x - n.rx, y - n.ry, x + n.rx, y + n.ry]);
  if (prev) connect(prev, n, clock);
  drawNode(n);
  if (random() < 0.85) label(n);
  decorate(n, prev, clock);
  st.nodes.push(n);
  commit(rec);
}

// Give every primitive a start time and duration as if a single pen were
// drawing them one after another (with a little overlap).
function commit(prims) {
  if (!prims.length) { rec = null; return; }
  if (random() < INK.speck) {
    const src = prims.find(p => p.k === 'ink');
    if (src) prims.push(specksNear(src.runs[0].pts[0]));
  }
  let cursor = 0, end = 0;
  for (const p of prims) {
    if (p.k === 'ink') p.dur = max(80, p.len / PEN_SPEED);
    else if (p.k === 'text') p.dur = p.s.length * CHAR_MS + 60;
    else if (p.k === 'speck') p.dur = 90;
    else p.dur = 140;
    p.start = cursor;
    cursor += p.dur * 0.8;
    end = max(end, p.start + p.dur);
  }
  const t0 = millis() + autoDelay;
  active.push({ prims, t0, end });
  if (mirror) active.push({ prims: mirrorPrims(prims), t0, end });
  rec = null;
}

function mirrorPrims(prims) {
  const mx = width;
  const flip = pts => pts.map(p => [mx - p[0], p[1]]);
  return prims.map(p => {
    const c = { ...p };
    if (p.k === 'ink') {
      c.runs = p.runs.map(r => ({ ...r, pts: flip(r.pts) }));
      if (p.poly) c.poly = flip(p.poly);
    } else if (p.k === 'text') {
      c.x = mx - p.x;
      c.align = p.align === 'left' ? 'right' : p.align === 'right' ? 'left' : 'center';
      c.rot = -p.rot;
    } else if (p.k === 'speck') {
      c.dots = p.dots.map(d => [mx - d[0], d[1], d[2], d[3]]);
    } else {
      c.pts = flip(p.pts);
      c.cx = mx - p.cx;
    }
    return c;
  });
}

// ---------------------------------------------------------------- rendering

function easeOutBack(q) {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * pow(q - 1, 3) + c1 * pow(q - 1, 2);
}

function renderStamp(s, g, now) {
  for (const p of s.prims) {
    const q = now === Infinity ? 1 : constrain((now - s.t0 - p.start) / p.dur, 0, 1);
    if (q <= 0) continue;
    if (p.k === 'ink') drawInk(g, p, q);
    else if (p.k === 'text') drawText(g, p, q);
    else if (p.k === 'speck') drawSpecks(g, p, q);
    else drawBlot(g, p, q);
  }
}

// Ink runs revealed up to a pen-travel budget of q * total length.
function drawInk(g, p, q) {
  // Closed mechanisms remain transparent: gears, wheels and vessels read as
  // inked outlines on the parchment, never as cream-filled vector shapes.
  let budget = q >= 1 ? Infinity : q * p.len;
  for (const r of p.runs) {
    if (budget >= r.len) { drawRun(g, r, r.pts, p.w, true, p.col || C.ink); budget -= r.len; }
    else { drawRun(g, r, cutRun(r.pts, budget), p.w, false, p.col || C.ink); break; }
  }
}

function polyShape(g, pts, closed) {
  g.beginShape();
  for (const v of pts) g.vertex(v[0], v[1]);
  if (closed) g.endShape(CLOSE); else g.endShape();
}

// One run of wet ink: a soft bleed under a line whose weight wanders along
// its length, with pooled ink where the pen landed (and lifted, once done).
function drawRun(g, run, pts, w, complete, col) {
  if (pts.length < 2) return;
  g.noFill();
  bleedRun(g, run, pts, w, col);
  g.stroke(pigment(col, INK.body));
  for (let i = 1; i < pts.length; i++) {
    g.strokeWeight(w * (0.5 + 1.2 * noise(run.seed + i * 0.2)));
    g.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  }
  g.noStroke();
  if (run.pool) {
    poolBleed(g, run.seed + 7, pts[0][0], pts[0][1], w * 3, col);
    if (complete) poolBleed(g, run.seed + 11, pts[pts.length - 1][0], pts[pts.length - 1][1], w * 2.5, col);
  }
  g.fill(pigment(col, 225));
  if (run.pool) {
    g.circle(pts[0][0], pts[0][1], w * 3);
    if (complete) g.circle(pts[pts.length - 1][0], pts[pts.length - 1][1], w * 2.5);
  }
  for (const [i, size, drip] of run.blobs) {
    if (i >= pts.length) continue;
    const [x, y] = pts[i];
    g.noStroke();
    g.circle(x, y, w * size);
    if (drip > 0) {
      // ink running down the page from the blob, thinning to a bead
      g.stroke(pigment(col, 210));
      g.strokeWeight(w * 1.1);
      g.line(x, y, x, y + drip * 0.7);
      g.strokeWeight(w * 0.6);
      g.line(x, y + drip * 0.7, x, y + drip);
      g.noStroke();
      g.circle(x, y + drip, w * 1.6);
    }
  }
}

// Ink wicking into the paper: several soft layers whose reach varies along
// the run (heavier where the pen dwelt), fading outward, plus fine fibers
// where the ink follows the grain sideways. All driven by noise on the run's
// seed so it is identical from frame to frame.
function bleedRun(g, run, pts, w, col) {
  const reach = w * INK.bleed;
  // soft layers, fading outward; reach varies slowly and also flickers
  // segment to segment so the edge is uneven rather than a smooth glow
  const layers = [[1, 0.16], [0.6, 0.38], [0.33, 1]];
  for (const [mult, af] of layers) {
    g.stroke(pigment(col, INK.bleedAlpha * af));
    for (let i = 1; i < pts.length; i++) {
      const slow = pow(noise(run.seed + 40 + i * 0.11), 1.7);
      const fast = noise(run.seed + 60 + i * 0.55);
      const k = 0.15 + 1.3 * slow + 0.6 * fast * slow;
      g.strokeWeight(w + reach * mult * k);
      g.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    }
  }
  // fibers and grains: ink drawn sideways along the paper's fibres, and
  // specks of pigment caught just off the line
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const m = sqrt(nx * nx + ny * ny) || 1;
    nx /= m; ny /= m;
    if (noise(run.seed + 90 + i * 2.3) > 1 - INK.fiber) {
      const side = noise(run.seed + 130 + i * 1.3) < 0.5 ? -1 : 1;
      const len = reach * (0.3 + 1.2 * noise(run.seed + 170 + i * 0.9));
      g.stroke(pigment(col, 35 + 50 * noise(run.seed + 210 + i * 0.7)));
      g.strokeWeight(max(0.35, w * 0.3));
      g.line(b[0], b[1], b[0] + nx * side * len, b[1] + ny * side * len);
    }
    if (noise(run.seed + 250 + i * 3.1) > 1 - INK.grain) {
      const side = noise(run.seed + 290 + i * 1.7) < 0.5 ? -1 : 1;
      const off = w * 0.6 + reach * 0.9 * noise(run.seed + 330 + i * 1.1);
      const r = 0.25 + 0.55 * noise(run.seed + 370 + i * 0.8);
      g.noStroke();
      g.fill(pigment(col, 40 + 90 * noise(run.seed + 410 + i * 0.6)));
      g.circle(b[0] + nx * side * off, b[1] + ny * side * off, r * 2 * sqrt(bs));
    }
  }
  g.noFill();
}

// Lobed bleed around a pool of ink: a soft disc with a few offset lobes
// where the paper drank more on one side.
function poolBleed(g, seed, x, y, d, col = C.ink) {
  g.noStroke();
  g.fill(pigment(col, 18));
  g.circle(x, y, d * 2.2);
  for (let k = 0; k < 3; k++) {
    const a = noise(seed + k * 3.1) * TWO_PI * 2;
    const r = d * (0.3 + 0.5 * noise(seed + 50 + k * 2.7));
    g.fill(pigment(col, 14 + 12 * noise(seed + 80 + k)));
    g.circle(x + cos(a) * r, y + sin(a) * r, d * (0.9 + 0.8 * noise(seed + 110 + k * 1.9)));
  }
}

// p5 1.9 rejects `stroke('#hex', alpha)`, but accepts one CSS rgba string.
function pigment(col, alpha) {
  const hex = col.startsWith('#') ? col.slice(1) : '302018';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${constrain(alpha / 255, 0, 1)})`;
}

// The first `budget` px of a polyline.
function cutRun(pts, budget) {
  if (budget <= 0) return [];
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = dist(a[0], a[1], b[0], b[1]);
    if (budget >= L) { out.push(b); budget -= L; }
    else { const t = budget / L; out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]); break; }
  }
  return out;
}

function drawSpecks(g, p, q) {
  const sc = q >= 1 ? 1 : easeOutBack(q);
  g.noStroke();
  for (const [x, y, r, a] of p.dots) {
    g.fill(0, a);
    g.circle(x, y, r * 2 * sc);
  }
}

// Text types itself out. Partial strings are drawn left-aligned from where
// the full string would start, so centred labels do not shuffle.
function drawText(g, p, q) {
  const n = q >= 1 ? p.s.length : ceil(q * p.s.length);
  if (n <= 0) return;
  g.textFont(FONT);
  g.textSize(p.size);
  g.textAlign(LEFT, p.va === 'top' ? TOP : p.va === 'bottom' ? BOTTOM : CENTER);
  const tw = g.textWidth(p.s);
  const x0 = p.align === 'left' ? 0 : p.align === 'center' ? -tw / 2 : -tw;
  g.push();
  g.translate(p.x, p.y);
  if (p.rot) g.rotate(p.rot);
  const part = p.s.slice(0, n);
  // ink wicking out from the figures: a fuzzy wide pass, then a crisp one
  g.fill(0, 0);
  g.stroke(0, 16);
  g.strokeWeight(max(0.8, p.size * 0.22));
  g.text(part, x0, 0);
  g.stroke(0, 70);
  g.strokeWeight(max(0.6, p.size * 0.1));
  g.fill(0, 245);
  g.text(part, x0, 0);
  g.pop();
}

function drawBlot(g, p, q) {
  const sc = q >= 1 ? 1 : easeOutBack(q);
  g.stroke(0, 70);
  g.strokeWeight(2.2);
  g.fill(p.col);
  g.push();
  g.translate(p.cx, p.cy);
  g.scale(sc);
  g.beginShape();
  for (const v of p.pts) g.vertex(v[0] - p.cx, v[1] - p.cy);
  g.endShape(CLOSE);
  g.pop();
}

// ---------------------------------------------------------------- helpers

function weightedPick(pairs) {
  let total = 0;
  for (const p of pairs) total += p[1];
  let r = random(total);
  for (const p of pairs) {
    r -= p[1];
    if (r < 0) return p[0];
  }
  return pairs[pairs.length - 1][0];
}

function pick(a) { return a[floor(random(a.length))]; }
function snap(v) { const s = u * 0.5; return round(v / s) * s; }
function wt(k) { return W[k] * sqrt(bs); }
function fs(m = 0.72) { return max(6.5, u * m * bs * 0.92); }
function measure(s, size) { textFont(FONT); textSize(size); return textWidth(s); }

// Every annotation is a random number: a small integer, a two-place decimal
// or a longer reference number.
function num() {
  const r = random();
  if (r < 0.3) return String(floor(random(1, 13)));
  if (r < 0.7) return random(1, 30).toFixed(2);
  if (r < 0.85) return random(0, 10).toFixed(1);
  return String(floor(random(100, 1000)));
}
function smallNum() { return String(floor(random(1, 13))); }
function refNum() { return `${floor(random(1, 5))}.${floor(random(1, 5))}`; }

// recorders --------------------------------------------------------------

// A polyline of ink. `dash` = [on, off] splits it into runs; `fill` marks a
// closed shape that is filled once its outline is complete.
function ink(pts, w, dash = null, fill = null, col = C.ink) {
  if (pts.length < 2) return;
  const runs = dash ? dashRuns(pts, dash) : [mkRun(pts)];
  let len = 0;
  for (const r of runs) len += r.len;
  if (len <= 0) return;
  rec.push({ k: 'ink', runs, w, len, fill, col, poly: fill ? pts : null });
}

function mkRun(raw) {
  const pts = roughen(raw);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  const run = { pts, len, seed: random(1000), pool: len > u * 1.5 && random() < INK.pool, blobs: [] };
  if (len > u * 3 && random() < INK.blob) {
    const count = floor(random(1, 3));
    for (let k = 0; k < count; k++) {
      const drip = random() < INK.drip ? random(u * 0.8, u * 3) * bs : 0;
      run.blobs.push([floor(random(2, pts.length - 2)), random(2.2, 3.8), drip]);
    }
  }
  return run;
}

// Resample a polyline every few px so the line weight can wander along it.
// With INK.wobble > 0 each point is also pushed sideways by a slow noise.
function roughen(raw) {
  if (raw.length < 2) return raw;
  const dense = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1], b = raw[i];
    const L = dist(a[0], a[1], b[0], b[1]);
    const n = max(1, ceil(L / INK.step));
    for (let k = 1; k <= n; k++) dense.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  if (INK.wobble <= 0) return dense;
  const seed = random(1000);
  const amp = INK.wobble * sqrt(bs);
  const out = [];
  for (let i = 0; i < dense.length; i++) {
    const p0 = dense[max(0, i - 1)], p1 = dense[min(dense.length - 1, i + 1)];
    let tx = p1[0] - p0[0], ty = p1[1] - p0[1];
    const m = sqrt(tx * tx + ty * ty) || 1;
    tx /= m; ty /= m;
    const off = (noise(seed + i * 0.35) - 0.5) * 2 * amp;
    out.push([dense[i][0] - ty * off, dense[i][1] + tx * off]);
  }
  return out;
}

// A few flecks of ink thrown around a point.
function specksNear(pt) {
  const dots = [];
  const n = floor(random(6, 16));
  for (let i = 0; i < n; i++) {
    const a = random(TWO_PI), d = random(u * 0.4, u * 3.5) * bs;
    dots.push([pt[0] + cos(a) * d, pt[1] + sin(a) * d, random(0.4, 2) * sqrt(bs), random(120, 240)]);
  }
  return { k: 'speck', dots };
}

function dashRuns(pts, dash) {
  const runs = [];
  let cur = [pts[0]], on = true, rem = dash[0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = dist(a[0], a[1], b[0], b[1]);
    let t = 0;
    while (t < L) {
      const step = min(rem, L - t);
      t += step; rem -= step;
      const p = [lerp(a[0], b[0], t / L), lerp(a[1], b[1], t / L)];
      if (on) cur.push(p);
      if (rem <= 0) {
        if (on) { runs.push(mkRun(cur)); cur = []; }
        else cur = [p];
        on = !on;
        rem = on ? dash[0] : dash[1];
      }
    }
  }
  if (cur.length > 1) runs.push(mkRun(cur));
  return runs;
}

function circ(cx, cy, r, w, dash = null, fill = null, col = C.ink, a0 = 0, a1 = TWO_PI) {
  const n = max(12, floor(r * abs(a1 - a0) / 3));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n);
    pts.push([cx + cos(a) * r, cy + sin(a) * r]);
  }
  ink(pts, w, dash, fill, col);
}

function rrectPts(x, y, w, h, rad) {
  rad = min(rad, w / 2, h / 2);
  const pts = [];
  const corners = [[x + w - rad, y + rad, -HALF_PI], [x + w - rad, y + h - rad, 0], [x + rad, y + h - rad, HALF_PI], [x + rad, y + rad, PI]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + HALF_PI * i / 6;
      pts.push([cx + cos(a) * rad, cy + sin(a) * rad]);
    }
  }
  pts.push(pts[0]);
  return pts;
}
function rrect(x, y, w, h, rad, wgt, dash = null, fill = null, col = C.ink) { ink(rrectPts(x, y, w, h, rad), wgt, dash, fill, col); }

// A number that must land clear of everything placed so far: the box is
// nudged through a few nearby positions and the number is dropped if none
// is free. Returns the final [x, y] or null.
function txt(s, x, y, size, align = 'left', va = 'center', rot = 0) {
  const g = u * bs;
  const tries = [[0, 0], [0, -g], [0, g], [g, 0], [-g, 0], [0, -2 * g], [0, 2 * g], [g, -g], [g, g], [-g, -g], [-g, g]];
  for (const [ox, oy] of tries) {
    const b = textBox(s, x + ox, y + oy, size, align, va, rot);
    if (!isFree(b)) continue;
    claim(b);
    txtRaw(s, x + ox, y + oy, size, align, va, rot);
    return [x + ox, y + oy];
  }
  return null;
}

// A number drawn exactly where asked (inside a bubble or marker).
function txtRaw(s, x, y, size, align = 'left', va = 'center', rot = 0) {
  rec.push({ k: 'text', s, x, y, size, align, va, rot });
}

// Padded bounding box of a number in page coordinates.
function textBox(s, x, y, size, align, va, rot) {
  const w = measure(s, size), h = size;
  const lx = align === 'left' ? 0 : align === 'center' ? -w / 2 : -w;
  const ly = va === 'top' ? 0 : va === 'center' ? -h / 2 : -h;
  const c = cos(rot), sn = sin(rot);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [px, py] of [[lx, ly], [lx + w, ly], [lx, ly + h], [lx + w, ly + h]]) {
    const wx = x + px * c - py * sn, wy = y + px * sn + py * c;
    x0 = min(x0, wx); y0 = min(y0, wy); x1 = max(x1, wx); y1 = max(y1, wy);
  }
  const pad = u * 0.22 * bs;
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

function isFree(b) {
  for (const o of boxes) if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return false;
  return true;
}

function claim(b) {
  boxes.push(b);
  if (mirror) boxes.push([width - b[2], b[1], width - b[0], b[3]]);
}

function blot(raw, col = '#000') {
  let cx = 0, cy = 0;
  for (const p of raw) { cx += p[0]; cy += p[1]; }
  cx /= raw.length; cy /= raw.length;
  // rag the outline: each vertex wanders a little in and out from the centre
  const amp = INK.rag * sqrt(bs);
  const pts = raw.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    const m = sqrt(dx * dx + dy * dy) || 1;
    const off = (random() - 0.5) * 2 * amp;
    return [x + dx / m * off, y + dy / m * off];
  });
  rec.push({ k: 'blot', pts, cx, cy, col });
}
function dotBlot(x, y, r) {
  const pts = [];
  for (let i = 0; i < 14; i++) pts.push([x + cos(i / 14 * TWO_PI) * r, y + sin(i / 14 * TWO_PI) * r]);
  blot(pts);
}

function bezierPts(x1, y1, cx1, cy1, cx2, cy2, x2, y2, n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([bezierPoint(x1, cx1, cx2, x2, t), bezierPoint(y1, cy1, cy2, y2, t)]);
  }
  return pts;
}

// ---------------------------------------------------------------- nodes

function makeNode(x, y, clock) {
  const kind = weightedPick(clock ? CLOCK_NODES : WATER_NODES);
  const n = { x, y, kind, r: u * random(0.8, 1.2) * bs };
  if (kind === 'waterwheel' || kind === 'clock') n.r = u * random(2.0, 3.1) * bs;
  else if (kind === 'gear') n.r = u * random(1.25, 2.0) * bs;
  else if (kind === 'pulley') n.r = u * random(1.0, 1.55) * bs;
  else if (kind === 'pump') { n.rx = u * random(2.6, 3.5) * bs; n.ry = u * random(1.4, 2.1) * bs; }
  else if (kind === 'vessel') { n.rx = u * random(1.0, 1.5) * bs; n.ry = u * random(1.7, 2.5) * bs; }
  else if (kind === 'automaton') { n.rx = u * 1.6 * bs; n.ry = u * 2.4 * bs; }
  if (n.rx === undefined) { n.rx = n.r; n.ry = n.r; }
  return n;
}

function drawNode(n) {
  switch (n.kind) {
    case 'waterwheel': nodeWaterwheel(n); break;
    case 'clock':      nodeClock(n); break;
    case 'gear':       nodeGear(n); break;
    case 'pulley':     nodePulley(n); break;
    case 'pump':       nodePump(n); break;
    case 'vessel':     nodeVessel(n); break;
    case 'automaton':  nodeAutomaton(n); break;
  }
}

function nodeWaterwheel(n) {
  const { x, y, r } = n;
  circ(x, y, r, wt('reg'), null, PARCHMENT, C.copper);
  circ(x, y, r * 0.16, wt('reg'), null, C.gold, C.copper);
  for (let i = 0; i < 12; i++) {
    const a = i * TWO_PI / 12;
    ink([[x + cos(a) * r * 0.18, y + sin(a) * r * 0.18], [x + cos(a) * r * 0.94, y + sin(a) * r * 0.94]], wt('thin'), null, null, C.copper);
    const bx = x + cos(a) * r * 0.73, by = y + sin(a) * r * 0.73;
    circ(bx, by, r * 0.16, wt('thin'), null, PARCHMENT, C.copper);
  }
  waterArc(x, y, r * 1.22, random() < 0.5 ? -1 : 1);
}

function nodeClock(n) {
  const { x, y, r } = n;
  circ(x, y, r, wt('heavy'), null, PARCHMENT, C.ink);
  circ(x, y, r * 0.73, wt('thin'), null, null, C.gold);
  for (let i = 0; i < 12; i++) {
    const a = i * TWO_PI / 12 - HALF_PI;
    ink([[x + cos(a) * r * 0.77, y + sin(a) * r * 0.77], [x + cos(a) * r * 0.9, y + sin(a) * r * 0.9]], wt('thin'), null, null, C.gold);
  }
  const hand = random(TWO_PI);
  ink([[x, y], [x + cos(hand) * r * 0.58, y + sin(hand) * r * 0.58]], wt('reg'), null, null, C.red);
  dotBlot(x, y, r * 0.1);
}

function nodeGear(n) {
  const { x, y, r } = n, teeth = floor(random(10, 16));
  const pts = [];
  for (let i = 0; i <= teeth * 2; i++) {
    const a = i * PI / teeth;
    const rr = i % 2 ? r * 0.82 : r;
    pts.push([x + cos(a) * rr, y + sin(a) * rr]);
  }
  ink(pts, wt('reg'), null, PARCHMENT, C.copper);
  circ(x, y, r * 0.48, wt('thin'), null, PARCHMENT, C.copper);
  circ(x, y, r * 0.13, wt('reg'), null, C.gold, C.copper);
}

function nodePulley(n) {
  const { x, y, r } = n;
  circ(x, y, r, wt('reg'), null, PARCHMENT, C.copper);
  circ(x, y, r * 0.38, wt('thin'), null, PARCHMENT, C.copper);
  ink([[x - r * 1.5, y - r * 1.55], [x - r * 1.5, y + r * 2.8]], wt('thin'), null, null, C.ink);
  ink([[x + r * 1.5, y - r * 1.55], [x + r * 1.5, y + r * 2.8]], wt('thin'), null, null, C.ink);
  rrect(x + r * 0.9, y + r * 2.3, r * 1.2, r * 0.9, r * 0.12, wt('thin'), null, C.gold, C.copper);
}

function nodePump(n) {
  const { x, y, rx, ry } = n;
  rrect(x - rx, y - ry, rx * 2, ry * 2, u * 0.35 * bs, wt('reg'), PARCHMENT, C.ink);
  const cy = y + ry * 0.15;
  ink([[x - rx * 0.82, cy], [x + rx * 0.82, cy]], wt('reg'), null, null, C.copper);
  for (const dx of [-0.55, 0, 0.55]) circ(x + dx * rx, cy, ry * 0.32, wt('thin'), null, PARCHMENT, C.copper);
  const crank = x + rx * 0.62;
  ink([[crank, cy], [crank + rx * 0.6, cy - ry * 0.72], [crank + rx * 1.05, cy - ry * 0.72]], wt('reg'), null, null, C.red);
  circ(crank + rx * 1.08, cy - ry * 0.72, ry * 0.18, wt('thin'), null, C.gold, C.red);
  waterArc(x - rx * 1.15, y, ry * 0.8, -1);
}

function nodeVessel(n) {
  const { x, y, rx, ry } = n;
  const pts = [[x - rx * 0.55, y - ry], [x + rx * 0.55, y - ry], [x + rx * 0.7, y - ry * 0.52], [x + rx, y + ry * 0.68], [x + rx * 0.55, y + ry], [x - rx * 0.55, y + ry], [x - rx, y + ry * 0.68], [x - rx * 0.7, y - ry * 0.52], [x - rx * 0.55, y - ry]];
  ink(pts, wt('reg'), null, PARCHMENT, C.copper);
  const level = y + random(-ry * 0.1, ry * 0.45);
  ink([[x - rx * 0.85, level], [x + rx * 0.85, level]], wt('thin'), null, null, C.water);
  for (let i = 0; i < 3; i++) ink([[x - rx * 0.55 + i * rx * 0.5, level], [x - rx * 0.3 + i * rx * 0.5, level + ry * 0.2]], wt('thin'), null, null, C.water);
}

function nodeAutomaton(n) {
  const { x, y, rx, ry } = n;
  circ(x, y - ry * 0.55, rx * 0.42, wt('reg'), null, PARCHMENT, C.ink);
  ink([[x, y - ry * 0.13], [x, y + ry * 0.7]], wt('reg'), null, null, C.red);
  ink([[x - rx, y + ry * 0.18], [x, y], [x + rx, y + ry * 0.18]], wt('thin'), null, null, C.ink);
  rrect(x - rx * 0.7, y + ry * 0.7, rx * 1.4, ry * 0.38, rx * 0.1, wt('thin'), null, C.gold, C.copper);
}

function waterArc(x, y, r, dir) {
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const a = lerp(-HALF_PI, HALF_PI, i / 18);
    pts.push([x + cos(a) * r * dir, y + sin(a) * r]);
  }
  ink(pts, wt('thin'), [u * 0.45 * bs, u * 0.25 * bs], null, C.water);
}

// Circle with a small inner ring and crosshair ticks passing through it.
function nodePin(n) {
  const { x, y, r } = n;
  circ(x, y, r, wt('reg'), null, '#fff');
  circ(x, y, r * 0.42, wt('thin'));
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ink([[x + dx * r * 0.7, y + dy * r * 0.7], [x + dx * r * 1.45, y + dy * r * 1.45]], wt('thin'));
  }
  if (random() < 0.3) circ(x, y, r * 1.9, wt('thin'), [u * 0.3 * bs, u * 0.25 * bs]);
}

// Rounded module box with some internal detail.
function cell(x, y, w, h) {
  rrect(x, y, w, h, u * 0.3 * bs, wt('reg'), null, '#fff');
  const cx = x + w / 2, cy = y + h / 2;
  const v = random();
  if (v < 0.4) {
    circ(cx, cy, h * 0.28, wt('thin'));
    ink([[cx - h * 0.4, cy], [cx + h * 0.4, cy]], wt('thin'));
    ink([[cx, cy - h * 0.4], [cx, cy + h * 0.4]], wt('thin'));
  } else if (v < 0.7) {
    const k = floor(random(1, 4));
    for (let i = 0; i < k; i++) {
      const yy = y + h * (i + 1) / (k + 1);
      ink([[x + u * 0.4 * bs, yy], [x + w - u * 0.4 * bs, yy]], wt('thin'));
    }
  } else {
    const k = floor(random(2, 5));
    for (let i = 0; i < k; i++) circ(x + w * (i + 0.5) / k, y + h - u * 0.45 * bs, u * 0.2 * bs, wt('thin'));
  }
}

function nodeStack(n) {
  const cellH = u * 1.7 * bs, gap = u * 0.25 * bs;
  let y = n.y - n.ry;
  for (let i = 0; i < n.cells; i++) {
    cell(n.x - n.rx, y, n.rx * 2, cellH);
    y += cellH + gap;
  }
}

// Large ring with an inner ring, centre dot, radial ticks and a partial outer arc.
function nodeHub(n) {
  const { x, y, r } = n;
  circ(x, y, r, wt('reg'), null, '#fff');
  circ(x, y, r * 0.62, wt('thin'));
  dotBlot(x, y, r * 0.12);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ink([[x + dx * r * 0.7, y + dy * r * 0.7], [x + dx * r * 1.25, y + dy * r * 1.25]], wt('thin'));
  }
  const a0 = random(TWO_PI);
  circ(x, y, r * 1.5, wt('thin'), random() < 0.5 ? [u * 0.4 * bs, u * 0.3 * bs] : null, null, a0, a0 + random(PI * 0.6, PI * 1.4));
}

// Small square with a dot, or a target of concentric rings.
function nodeTerminal(n) {
  const { x, y, r } = n;
  if (random() < 0.5) {
    ink([[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r], [x - r, y - r]], wt('reg'), null, '#fff');
    dotBlot(x, y, r * 0.3);
  } else {
    circ(x, y, r, wt('reg'), null, '#fff');
    circ(x, y, r * 0.62, wt('thin'));
    dotBlot(x, y, r * 0.22);
  }
}

// Callout bubble: circle split by a bar, reference above and sheet below.
function nodeBubble(n) {
  const { x, y, r } = n;
  circ(x, y, r, wt('reg'), null, '#fff');
  ink([[x - r, y], [x + r, y]], wt('thin'));
  txtRaw(smallNum(), x, y - u * 0.1 * bs, fs(0.68), 'center', 'bottom');
  txtRaw(refNum(), x, y + u * 0.12 * bs, fs(0.55), 'center', 'top');
}

// Section marker: a diamond with a number, a sheet reference and a pointer.
function nodeSection(n) {
  // a rhombus wider than it is tall, so the figures sit inside its waist
  const { x, y } = n, sw = n.r * 1.9, sh = n.r * 1.45;
  ink([[x, y - sh], [x + sw, y], [x, y + sh], [x - sw, y], [x, y - sh]], wt('reg'), null, '#fff');
  ink([[x - sw, y], [x + sw, y]], wt('thin'));
  // each figure centred in its half, where the rhombus is still wide
  txtRaw(smallNum(), x, y - sh * 0.4, fs(0.5), 'center', 'center');
  txtRaw(refNum(), x, y + sh * 0.42, fs(0.42), 'center', 'center');
  const d = pick([[0, -1], [0, 1], [-1, 0], [1, 0]]);
  const s = d[0] === 0 ? sh : sw;          // half-extent along the pointer axis
  const tip = [x + d[0] * (s + sh * 0.7), y + d[1] * (s + sh * 0.7)];
  const bx = x + d[0] * s, by = y + d[1] * s;
  blot([tip, [bx + d[1] * sh * 0.4, by + d[0] * sh * 0.4], [bx - d[1] * sh * 0.4, by - d[0] * sh * 0.4]]);
}

// Dashed outer ring around solid inner rings, with a centre cross.
function nodeRings(n) {
  const { x, y, r } = n;
  circ(x, y, r, wt('reg'), [u * 0.5 * bs, u * 0.35 * bs]);
  circ(x, y, r * 0.62, wt('thin'));
  circ(x, y, r * 0.3, wt('thin'));
  ink([[x - r * 0.15, y], [x + r * 0.15, y]], wt('thin'));
  ink([[x, y - r * 0.15], [x, y + r * 0.15]], wt('thin'));
}

// ---------------------------------------------------------------- wiring

function connect(a, b, clock) {
  const r = random();
  if (!clock && r < 0.55) { waterChannel(a, b); return; }
  if (r < 0.82) { rope(a, b); return; }
  driveShaft(a, b);
}

function waterChannel(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L = sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / L, ny = dx / L, off = u * 0.22 * bs;
  const sag = u * random(1.5, 4) * bs * (random() < 0.5 ? -1 : 1);
  const c1 = [a.x + dx * 0.28 + nx * sag, a.y + dy * 0.28 + ny * sag];
  const c2 = [b.x - dx * 0.28 + nx * sag, b.y - dy * 0.28 + ny * sag];
  for (const sign of [-1, 1]) {
    ink(bezierPts(a.x + nx * off * sign, a.y + ny * off * sign, c1[0] + nx * off * sign, c1[1] + ny * off * sign, c2[0] + nx * off * sign, c2[1] + ny * off * sign, b.x + nx * off * sign, b.y + ny * off * sign, 32), wt('thin'), null, null, C.water);
  }
}

function rope(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const nx = -dy / (sqrt(dx * dx + dy * dy) || 1), ny = dx / (sqrt(dx * dx + dy * dy) || 1);
  const sag = u * random(1.5, 4) * bs;
  ink(bezierPts(a.x, a.y, a.x + dx * 0.3 + nx * sag, a.y + dy * 0.3 + ny * sag, b.x - dx * 0.3 + nx * sag, b.y - dy * 0.3 + ny * sag, b.x, b.y, 28), wt('thin'), [u * 0.25 * bs, u * 0.18 * bs], null, C.copper);
}

function driveShaft(a, b) {
  ink([[a.x, a.y], [b.x, b.y]], wt('reg'), null, null, C.copper);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  circ(mx, my, u * 0.32 * bs, wt('thin'), null, C.gold, C.copper);
}

// Patch cable(s): a bezier that sweeps or sags between the two nodes.
function cable(a, b, count) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L = sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const kind = random();
  const sag = u * random(2, 7) * bs * (random() < 0.5 ? -1 : 1);
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * u * 0.38 * bs;
    const ox = nx * off, oy = ny * off;
    let c1, c2;
    if (kind < 0.45) { c1 = [a.x + dx * 0.5, a.y]; c2 = [b.x - dx * 0.5, b.y]; }
    else if (kind < 0.8) {
      c1 = [a.x + dx * 0.2 + nx * sag, a.y + dy * 0.2 + ny * sag];
      c2 = [b.x - dx * 0.2 + nx * sag, b.y - dy * 0.2 + ny * sag];
    } else { c1 = [a.x, a.y + dy * 0.5]; c2 = [b.x, b.y - dy * 0.5]; }
    ink(bezierPts(a.x + ox, a.y + oy, c1[0] + ox, c1[1] + oy, c2[0] + ox, c2[1] + oy, b.x + ox, b.y + oy, 40), wt('cable'));
  }
}

// Orthogonal route with one or two right-angle bends.
function orthoRoute(a, b) {
  const r = random();
  let pts;
  if (r < 0.4) pts = [[a.x, a.y], [b.x, a.y], [b.x, b.y]];
  else if (r < 0.8) pts = [[a.x, a.y], [a.x, b.y], [b.x, b.y]];
  else {
    const mx = snap(lerp(a.x, b.x, 0.5));
    pts = [[a.x, a.y], [mx, a.y], [mx, b.y], [b.x, b.y]];
  }
  ink(pts, wt('reg'));
  if (random() < 0.5) for (let i = 1; i < pts.length - 1; i++) dotBlot(pts[i][0], pts[i][1], u * 0.12 * bs);
}

// ---------------------------------------------------------------- labels

function label(n) {
  // A non-linguistic folio mark avoids pretending to provide historical text.
  const x = n.x + n.rx + u * 0.65 * bs, y = n.y - n.ry * 0.55;
  rosette(x, y, u * 0.42 * bs);
}

// ---------------------------------------------------------------- decorations

function decorate(n, prev, clock) {
  if (random() < 0.42) rosette(n.x + random(-n.rx, n.rx), n.y + random(-n.ry, n.ry), u * random(0.28, 0.6) * bs);
  if (!clock && random() < 0.35) flowMarks(n);
  if (clock && random() < 0.3) celestialArc(n);
  if (prev && random() < 0.2) hangingWeight(n);
}

function rosette(x, y, r) {
  circ(x, y, r, wt('thin'), null, PARCHMENT, C.gold);
  for (let i = 0; i < 8; i++) {
    const a = i * TWO_PI / 8;
    ink([[x, y], [x + cos(a) * r * 1.45, y + sin(a) * r * 1.45]], wt('thin'), null, null, C.gold);
  }
  circ(x, y, r * 0.2, wt('thin'), null, C.red, C.gold);
}

function flowMarks(n) {
  const y = n.y + n.ry + u * 0.55 * bs, x = n.x - n.rx;
  for (let i = 0; i < 3; i++) {
    const px = x + i * u * 1.15 * bs;
    ink([[px, y], [px + u * 0.55 * bs, y], [px + u * 0.35 * bs, y - u * 0.2 * bs]], wt('thin'), null, null, C.water);
  }
}

function celestialArc(n) {
  const r = max(n.rx, n.ry) + u * 0.8 * bs;
  circ(n.x, n.y, r, wt('thin'), [u * 0.35 * bs, u * 0.28 * bs], null, C.gold, -PI * 0.8, -PI * 0.15);
}

function hangingWeight(n) {
  const x = n.x + n.rx + u * random(-0.3, 0.3) * bs, y = n.y + n.ry;
  ink([[x, y], [x, y + u * 2.2 * bs]], wt('thin'), null, null, C.copper);
  rrect(x - u * 0.32 * bs, y + u * 2.2 * bs, u * 0.64 * bs, u * 0.8 * bs, u * 0.08 * bs, wt('thin'), null, C.gold, C.copper);
}

// Dimension line offset from the pair, with extension lines, tick slashes
// and a measurement.
function dimension(a, b) {
  const horiz = abs(b.x - a.x) >= abs(b.y - a.y);
  const span = horiz ? abs(b.x - a.x) : abs(b.y - a.y);
  if (span < u * 2) return;
  const sgn = random() < 0.5 ? -1 : 1;
  const off = u * random(2.5, 4.5) * bs * sgn;
  const tk = u * 0.22 * bs, w = wt('thin');
  const s = num();
  if (horiz) {
    const y = snap((sgn < 0 ? min(a.y, b.y) : max(a.y, b.y)) + off);
    for (const p of [a, b]) ink([[p.x, p.y + sgn * u * 0.6 * bs], [p.x, y + sgn * u * 0.5 * bs]], w);
    ink([[a.x, y], [b.x, y]], w);
    for (const p of [a, b]) ink([[p.x - tk, y + tk], [p.x + tk, y - tk]], wt('reg'));
    txt(s, (a.x + b.x) / 2, y - u * 0.15 * bs, fs(0.6), 'center', 'bottom');
  } else {
    const x = snap((sgn < 0 ? min(a.x, b.x) : max(a.x, b.x)) + off);
    for (const p of [a, b]) ink([[p.x + sgn * u * 0.6 * bs, p.y], [x + sgn * u * 0.5 * bs, p.y]], w);
    ink([[x, a.y], [x, b.y]], w);
    for (const p of [a, b]) ink([[x - tk, p.y + tk], [x + tk, p.y - tk]], wt('reg'));
    txt(s, x - u * 0.15 * bs, (a.y + b.y) / 2, fs(0.6), 'center', 'bottom', -HALF_PI);
  }
}

// Bubble on a leader line pointing at the node.
function callout(n) {
  const r = u * 1.1 * bs;
  let cx, cy, box = null;
  for (let i = 0; i < 8 && !box; i++) {
    const a = random(TWO_PI);
    const d = u * random(3, 5) * bs + n.r;
    cx = snap(n.x + cos(a) * d); cy = snap(n.y + sin(a) * d);
    const b = [cx - r, cy - r, cx + r, cy + r];
    if (isFree(b)) box = b;
  }
  if (!box) return;
  claim(box);
  const ang = atan2(n.y - cy, n.x - cx);
  ink([[n.x, n.y], [cx + cos(ang) * r, cy + sin(ang) * r]], wt('thin'));
  if (random() < 0.5) dotBlot(n.x, n.y, u * 0.12 * bs);
  circ(cx, cy, r, wt('reg'), null, '#fff');
  ink([[cx - r, cy], [cx + r, cy]], wt('thin'));
  txtRaw(smallNum(), cx, cy - u * 0.1 * bs, fs(0.66), 'center', 'bottom');
  txtRaw(refNum(), cx, cy + u * 0.12 * bs, fs(0.52), 'center', 'top');
}

// Nested U-shaped contours (a bowl) opening toward one side of the node.
function contours(n) {
  const count = floor(random(3, 7));
  const rot = floor(random(4)) * HALF_PI;
  const step = u * 0.45 * bs;
  const w0 = n.rx * 2 + u * 1.2 * bs, h0 = n.ry + u * 1.2 * bs;
  const cr = cos(rot), sr = sin(rot);
  for (let i = 0; i < count; i++) {
    const w = w0 + i * step * 2, h = h0 + i * step;
    const local = [];
    local.push([-w / 2, h]);
    local.push([-w / 2, 0]);
    for (let k = 0; k <= 14; k++) {
      const a = PI + PI * k / 14;
      local.push([cos(a) * w / 2, sin(a) * w / 2]);
    }
    local.push([w / 2, h]);
    const pts = local.map(([px, py]) => [n.x + px * cr - py * sr, n.y + px * sr + py * cr]);
    ink(pts, wt(i === count - 1 ? 'reg' : 'thin'));
    if (i === count - 1) claim(bounds(pts));
  }
}

function bounds(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = min(x0, x); y0 = min(y0, y); x1 = max(x1, x); y1 = max(y1, y); }
  return [x0, y0, x1, y1];
}

// Small rectangle filled with diagonal hatching.
function hatch(n) {
  const w = u * random(1.5, 3) * bs, h = u * random(0.6, 1.2) * bs;
  const x = snap(n.x + u * random(-4, 4) * bs), y = snap(n.y + u * random(1.5, 3.5) * bs * (random() < 0.5 ? -1 : 1));
  if (!isFree([x, y, x + w, y + h])) return;
  claim([x, y, x + w, y + h]);
  ink([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], wt('thin'));
  const step = u * 0.28 * bs;
  for (let o = step; o < w + h; o += step) {
    const p1 = o <= w ? [x + o, y] : [x + w, y + (o - w)];
    const p2 = o <= h ? [x, y + o] : [x + (o - h), y + h];
    ink([p1, p2], wt('thin'));
  }
}

// Leader line out to a short shelf with a number written on it.
function leaderNote(n) {
  const s = num();
  const size = fs(0.6);
  const tw = measure(s, size);
  for (const a of shuffle([-QUARTER_PI, -3 * QUARTER_PI, QUARTER_PI, 3 * QUARTER_PI])) {
    const d = u * random(2.5, 4.5) * bs + n.r;
    const px = snap(n.x + cos(a) * d), py = snap(n.y + sin(a) * d);
    const dir = cos(a) > 0 ? 1 : -1;
    const tx = px + dir * u * 0.15 * bs, ty = py - u * 0.1 * bs;
    const align = dir > 0 ? 'left' : 'right';
    const b = textBox(s, tx, ty, size, align, 'bottom', 0);
    if (!isFree(b)) continue;
    claim(b);
    ink([[n.x + cos(a) * n.r * 0.6, n.y + sin(a) * n.r * 0.6], [px, py], [px + dir * (tw + u * 0.3 * bs), py]], wt('thin'));
    txtRaw(s, tx, ty, size, align, 'bottom');
    return;
  }
}

// Short arrow with a number beside it.
function numArrow(n) {
  const px = snap(n.x + u * random(-3, 3) * bs), py = snap(n.y + u * random(2, 4) * bs * (random() < 0.5 ? -1 : 1));
  const L = u * 1.6 * bs, dir = random() < 0.5 ? -1 : 1;
  const s = smallNum(), size = fs(0.6), align = dir > 0 ? 'right' : 'left';
  const tx = px - dir * u * 0.15 * bs;
  const b = textBox(s, tx, py, size, align, 'center', 0);
  if (!isFree([min(b[0], px), b[1], max(b[2], px + dir * L), b[3]])) return;
  claim(b);
  ink([[px, py], [px + dir * L, py]], wt('thin'));
  const hx = px + dir * L;
  blot([[hx, py], [hx - dir * u * 0.35 * bs, py - u * 0.2 * bs], [hx - dir * u * 0.35 * bs, py + u * 0.2 * bs]]);
  txtRaw(s, tx, py, size, align, 'center');
}

// Long thin construction line ending in a marker.
function axisLine(n, cad) {
  const horiz = random() < 0.5;
  const L = u * random(10, 26) * bs;
  const s = random() < 0.5 ? -1 : 1;
  const ex = snap(horiz ? n.x + s * L : n.x), ey = snap(horiz ? n.y : n.y + s * L);
  const mr = cad ? u * 1.8 * bs : u * 0.75 * bs;
  if (!isFree([ex - mr, ey - mr, ex + mr, ey + mr])) return;
  claim([ex - mr, ey - mr, ex + mr, ey + mr]);
  ink([[n.x, n.y], [ex, ey]], wt('thin'), random() < 0.5 ? [u * 0.9 * bs, u * 0.35 * bs] : null);
  if (cad) nodeSection({ x: ex, y: ey, r: u * 0.85 * bs });
  else {
    const r = u * 0.4 * bs;
    circ(ex, ey, r, wt('reg'), null, '#fff');
    ink([[ex - r * 1.8, ey], [ex + r * 1.8, ey]], wt('thin'));
    ink([[ex, ey - r * 1.8], [ex, ey + r * 1.8]], wt('thin'));
  }
}

// Cable back to a node a few steps earlier in the stroke.
function loopback(n) {
  const k = floor(random(1, min(5, st.nodes.length)));
  const target = st.nodes[st.nodes.length - 1 - k];
  if (!target) return;
  cable(target, n, 1);
}

// Small ports beside the node, each wired to it with a tiny line.
function ports(n) {
  const k = floor(random(2, 4));
  const side = random() < 0.5 ? -1 : 1;
  const x = snap(n.x + side * (n.rx + u * 1.6 * bs));
  for (let i = 0; i < k; i++) {
    const y = snap(n.y + (i - (k - 1) / 2) * u * 1.2 * bs);
    ink([[n.x + side * n.rx, y], [x, y]], wt('thin'));
    circ(x, y, u * 0.3 * bs, wt('reg'), null, '#fff');
  }
}

// Little graph inset with a couple of rising curves.
function chart(n) {
  const w = u * 7 * bs, h = u * 4.5 * bs;
  const x0 = snap(n.x + u * random(3, 6) * bs), y0 = snap(n.y - u * random(1, 3) * bs);
  const box = [x0, y0, x0 + w, y0 + h + fs(0.55) + u * 0.4 * bs];
  if (!isFree(box)) return;
  claim(box);
  ink([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]], wt('thin'));
  const ax = x0 + u * 0.6 * bs, ay = y0 + h - u * 0.6 * bs;
  ink([[ax, y0 + u * 0.4 * bs], [ax, ay], [x0 + w - u * 0.4 * bs, ay]], wt('thin'));
  const curves = floor(random(2, 4));
  for (let c = 0; c < curves; c++) {
    const p = random(0.6, 2), amp = random(0.5, 0.85), seed = random(1000);
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const v = 0.1 + amp * pow(t, p) + (noise(seed + t * 3) - 0.5) * 0.15;
      pts.push([ax + u * 0.2 * bs + t * (w - u * 1.2 * bs), ay - u * 0.2 * bs - v * (h - u * 1.4 * bs)]);
    }
    ink(pts, wt('thin'));
  }
  txtRaw(num(), x0 + u * 0.2 * bs, y0 + h + u * 0.15 * bs, fs(0.55), 'left', 'top');
}

// ---------------------------------------------------------------- auto fill

function autoFill() {
  // with mirror on, only draft the left half; the mirror fills in the right
  const w = mirror ? width / 2 : width;
  const runs = [];
  const rows = max(1, floor(height / (u * 18)));
  for (let r = 0; r < rows; r++) {
    const y = u * 9 + r * u * 18 + random(-u * 2, u * 2);
    runs.push([[random(u * 3, u * 10), y], [w - random(u * 3, u * 14), y + random(-u * 3, u * 3)]]);
  }
  for (let c = 0; c < 1; c++) {
    const x = random(w * 0.2, w * 0.8);
    runs.push([[x, random(u * 4, u * 10)], [x + random(-u * 4, u * 4), height - random(u * 4, u * 10)]]);
  }
  for (let d = 0; d < 1; d++) {
    runs.push([[random(w * 0.1, w * 0.4), random(height * 0.1, height * 0.9)], [random(w * 0.6, w * 0.9), random(height * 0.1, height * 0.9)]]);
  }
  let t = 0;
  for (const [a, b] of runs) {
    beginStroke(a[0], a[1]);
    const steps = floor(dist(a[0], a[1], b[0], b[1]) / 5);
    const seed = random(1000);
    for (let i = 1; i <= steps; i++) {
      const q = i / steps;
      autoDelay = t + q * 1400;
      const wob = (noise(seed + q * 4) - 0.5) * u * 6;
      strokeTo(lerp(a[0], b[0], q) + wob, lerp(a[1], b[1], q) + wob);
    }
    autoDelay = t + 1500;
    endStroke();
    t += 500;
  }
  autoDelay = 0;
}

// ---------------------------------------------------------------- UI

function clearAll() {
  paint.clear();
  active = [];
  boxes = [];
}

function keyPressed() {
  if (key === '1') styleLock = 'water';
  else if (key === '2') styleLock = 'clock';
  else if (key === '3') styleLock = 'mixed';
  else if (key === '0') styleLock = null;
  else if (key === '[') bs = max(0.4, bs / 1.2);
  else if (key === ']') bs = min(4, bs * 1.2);
  else if (key === '-') density = max(0.25, density / 1.4);
  else if (key === '=' || key === '+') density = min(6, density * 1.4);
  else if (key === ' ') { autoFill(); updateHUD(); return false; }
  else if (key === 'm' || key === 'M') mirror = !mirror;
  else if (key === 'e' || key === 'E') eraser = !eraser;
  else if (key === 'c' || key === 'C') clearAll();
  else if (key === 'r' || key === 'R') { clearAll(); u = floor(random(9, 16)); }
  else if (key === 's' || key === 'S') saveCanvas('schematic-brush', 'png');
  else if (key === 'h' || key === 'H') toggleHUD();
  updateHUD();
}

function updateHUD() {
  setStatus(
    `style: ${styleLock || 'random'}  size: ${bs.toFixed(2)}  density: ${density.toFixed(2)}` +
    `  mirror: ${mirror ? 'on' : 'off'}` + (eraser ? '  [ERASER]' : ''));
}
