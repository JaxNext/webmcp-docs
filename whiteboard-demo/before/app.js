// app.js — whiteboard state and drawing. No WebMCP here.

const canvas = document.querySelector('#board');
const ctx = canvas.getContext('2d');
const status = document.querySelector('#status');

const state = {
  tool: 'brush',        // brush | rect | ellipse | line | text
  color: '#1e88e5',
  width: 4,
  fill: false,
  symmetry: 'none',     // none | rotation | mirror
  fold: 6,
  items: [],            // drawn objects, oldest first
  undoStack: [],        // JSON snapshots for undo
};

// The stroke/shape currently being drawn by the human (null when idle).
let draft = null;

// --- Seeded randomness -----------------------------------------------------

// mulberry32: small, fast, deterministic PRNG. Same seed → same sequence.
function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSeed() {
  return Math.floor(Math.random() * 1e9) + 1;
}

function setBrush({ tool, color, width, fill, symmetry, fold }) {
  Object.assign(state, { tool, color, width, fill, symmetry, fold });
  status.textContent = `Tool: ${state.tool} · Color: ${state.color} · Width: ${state.width}px · Symmetry: ${state.symmetry}`;
}

function currentSymmetry() {
  return state.symmetry === 'none' ? null : { mode: state.symmetry, fold: state.fold };
}

function pushSnapshot() {
  state.undoStack.push(JSON.stringify(state.items));
}

// --- Primitive drawing tools ----------------------------------------------

function drawShape({ type, x = 0, y = 0, width = 80, height = 80, color = state.color, symmetry = currentSymmetry() }) {
  pushSnapshot();
  state.items.push({ kind: 'shape', type, x, y, width, height, color, fill: state.fill, strokeWidth: state.width, symmetry });
  render();
}

function drawPath(points, { color = state.color, width = state.width, symmetry = currentSymmetry() } = {}) {
  pushSnapshot();
  state.items.push({ kind: 'path', points, color, width, symmetry });
  render();
}

function addText(text, x = 0, y = 0, color = state.color) {
  pushSnapshot();
  state.items.push({ kind: 'text', text, x, y, color });
  render();
}

function undo() {
  const prev = state.undoStack.pop();
  if (prev != null) {
    state.items = JSON.parse(prev);
    render();
  }
}

function clearCanvas() {
  pushSnapshot();
  state.items = [];
  render();
}

function getCanvasState() {
  return {
    shapeCount: state.items.length,
    items: state.items.map(({ kind, type, text, x, y, color, points }) => ({
      kind,
      type,
      text,
      x,
      y,
      color,
      pointCount: points ? points.length : undefined,
    })),
  };
}

function exportPng() {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'whiteboard.png';
  a.click();
}

// --- Perlin noise ----------------------------------------------------------

// Classic 2D Perlin noise with a deterministic permutation table.
function makeNoise(seed = 1) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  const rng = mulberry32(seed);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }

  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y) => {
    switch (h & 3) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      default: return -x - y;
    }
  };

  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const X = xi & 255;
    const Y = yi & 255;
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v,
    );
  };
}

// --- Bitmap helper ---------------------------------------------------------

// Renders an offscreen canvas into a bitmap item so Undo / Clear / Export work.
function pushBitmap(dataUrl) {
  pushSnapshot();
  state.items.push({ kind: 'bitmap', src: dataUrl });
  render();
}

// --- Generative: Perlin-noise flow field -----------------------------------

function generateFlowField({ particles = 1500, scale = 6, hue = 200, dark = true, steps = 80, seed = 1 } = {}) {
  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const octx = off.getContext('2d');

  if (dark) {
    octx.fillStyle = '#0d1017';
    octx.fillRect(0, 0, off.width, off.height);
  }

  const noise = makeNoise(seed);
  const rng = mulberry32(seed);
  const freq = 0.0025 * scale;   // pixels → noise space
  const stepLen = 3;

  octx.lineWidth = 1;
  octx.lineCap = 'round';
  for (let i = 0; i < particles; i++) {
    let x = rng() * off.width;
    let y = rng() * off.height;
    const h = (hue + (x / off.width) * 90) % 360;
    octx.strokeStyle = `hsla(${h}, 85%, ${dark ? 65 : 45}%, 0.5)`;
    octx.beginPath();
    octx.moveTo(x, y);
    for (let s = 0; s < steps; s++) {
      const angle = noise(x * freq, y * freq) * Math.PI * 2;
      x += Math.cos(angle) * stepLen;
      y += Math.sin(angle) * stepLen;
      if (x < 0 || y < 0 || x > off.width || y > off.height) break;
      octx.lineTo(x, y);
    }
    octx.stroke();
  }

  pushBitmap(off.toDataURL('image/png'));
}

// --- Generative: recursive tree --------------------------------------------

function growTree({ depth = 8, angle = 28, branches = 2, color = state.color, width = 6, seed = 1 } = {}) {
  pushSnapshot();
  state.items.push({
    kind: 'tree',
    x: canvas.width / 2,
    y: canvas.height - 20,
    length: canvas.height * 0.3,
    depth,
    angle,
    branches,
    color,
    width,
    seed,
    symmetry: currentSymmetry(),
  });
  render();
}

function drawTree(item) {
  ctx.strokeStyle = item.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const rng = mulberry32(item.seed ?? 1);
  const spread = (item.angle * Math.PI) / 180;

  const branch = (x, y, len, angle, depth) => {
    if (depth <= 0) return;
    const aj = (rng() - 0.5) * 0.24;     // ±12% angle jitter (of the spread)
    const lj = 0.94 + rng() * 0.12;      // length variation
    const a2 = angle + aj * spread;
    const x2 = x + Math.cos(a2) * len * lj;
    const y2 = y + Math.sin(a2) * len * lj;

    ctx.lineWidth = Math.max(1, (item.width * depth) / item.depth);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    for (let i = 0; i < item.branches; i++) {
      const t = item.branches === 1 ? 0 : (i / (item.branches - 1)) * 2 - 1;
      branch(x2, y2, len * 0.72, a2 + t * spread, depth - 1);
    }
  };

  branch(item.x, item.y, item.length, -Math.PI / 2, item.depth);
}

// --- Generative: spirograph (hypotrochoid) ---------------------------------

function drawSpirograph({ R = 180, r = 65, d = 90, turns = 300, color = state.color, width = 2, symmetry = currentSymmetry() } = {}) {
  pushSnapshot();
  state.items.push({ kind: 'spirograph', R, r, d, turns, color, width, symmetry });
  render();
}

function drawSpiro(item) {
  ctx.strokeStyle = item.color;
  ctx.lineWidth = item.width;
  ctx.lineCap = 'round';

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const { R, r, d, turns } = item;
  const ratio = (R - r) / r;
  const steps = Math.min(20000, turns * 40);

  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const x = cx + (R - r) * Math.cos(t) + d * Math.cos(ratio * t);
    const y = cy + (R - r) * Math.sin(t) - d * Math.sin(ratio * t);
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// --- Generative: particle life ---------------------------------------------

// Emergent "artificial life": particles of a few types attract/repel each other
// according to a seeded symmetric matrix, clustering into organic colonies.
function runParticleLife({ particles = 500, types = 3, seed = 1, steps = 150 } = {}) {
  const rng = mulberry32(seed);

  // Symmetric attraction matrix in [-1, 1], derived from the seed.
  const G = [];
  for (let a = 0; a < types; a++) {
    G.push([]);
    for (let b = 0; b < types; b++) {
      G[a][b] = rng() * 2 - 1;
    }
  }
  for (let a = 0; a < types; a++) {
    for (let b = 0; b < a; b++) G[a][b] = G[b][a] = (G[a][b] + G[b][a]) / 2;
  }

  const P = [];
  for (let i = 0; i < particles; i++) {
    P.push({ type: Math.floor(rng() * types), x: rng() * canvas.width, y: rng() * canvas.height, vx: 0, vy: 0 });
  }

  const Rmax = 120;      // interaction radius
  const dt = 0.08;
  const damping = 0.8;

  const fx = new Float32Array(particles);
  const fy = new Float32Array(particles);

  for (let step = 0; step < steps; step++) {
    fx.fill(0); fy.fill(0);
    for (let i = 0; i < particles; i++) {
      const pi = P[i];
      for (let j = i + 1; j < particles; j++) {
        const pj = P[j];
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const r2 = dx * dx + dy * dy;
        if (r2 > 0 && r2 < Rmax * Rmax) {
          const r = Math.sqrt(r2);
          const f = G[pi.type][pj.type] * (1 - r / Rmax);
          const ux = dx / r;
          const uy = dy / r;
          fx[i] += ux * f; fy[i] += uy * f;
          fx[j] -= ux * f; fy[j] -= uy * f;   // action-reaction
        }
      }
    }
    for (let i = 0; i < particles; i++) {
      P[i].vx = (P[i].vx + fx[i] * dt) * damping;
      P[i].vy = (P[i].vy + fy[i] * dt) * damping;
      P[i].x += P[i].vx;
      P[i].y += P[i].vy;
    }
  }

  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const octx = off.getContext('2d');
  octx.fillStyle = '#0d1017';
  octx.fillRect(0, 0, off.width, off.height);

  const hueBase = (seed * 137.508) % 360;
  for (const p of P) {
    const hue = (hueBase + p.type * (360 / types)) % 360;
    octx.fillStyle = `hsla(${hue}, 80%, 65%, 0.85)`;
    octx.beginPath();
    octx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
    octx.fill();
  }

  pushBitmap(off.toDataURL('image/png'));
}

// --- Generative: truchet tiles ---------------------------------------------

function drawTruchet({ tileSize = 30, seed = 1, color = state.color, width = 2 } = {}) {
  const rng = mulberry32(seed);

  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const octx = off.getContext('2d');
  octx.fillStyle = '#fafafa';
  octx.fillRect(0, 0, off.width, off.height);
  octx.strokeStyle = color;
  octx.lineWidth = width;
  octx.lineCap = 'round';

  const cols = Math.ceil(off.width / tileSize);
  const rows = Math.ceil(off.height / tileSize);
  const half = tileSize / 2;

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const px = i * tileSize;
      const py = j * tileSize;
      const k = Math.floor(rng() * 4);
      octx.beginPath();
      switch (k) {
        case 0: octx.arc(px, py, half, Math.PI, Math.PI * 1.5); break;             // top-left corner
        case 1: octx.arc(px + tileSize, py, half, Math.PI * 1.5, Math.PI * 2); break; // top-right
        case 2: octx.arc(px + tileSize, py + tileSize, half, 0, Math.PI * 0.5); break; // bottom-right
        case 3: octx.arc(px, py + tileSize, half, Math.PI * 0.5, Math.PI); break;      // bottom-left
      }
      octx.stroke();
    }
  }

  pushBitmap(off.toDataURL('image/png'));
}

// --- Generative: Mondrian (recursive subdivision) ---------------------------

function drawMondrian({ minSize = 50, seed = 1, gap = 3 } = {}) {
  const rng = mulberry32(seed);

  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const octx = off.getContext('2d');

  const palette = ['#fafafa', '#111111', '#d32f2f', '#fbc02d', '#1565c0'];

  const rects = [];
  function split(x, y, w, h) {
    const canH = w >= minSize * 2;
    const canV = h >= minSize * 2;
    if (!canH && !canV) { rects.push([x, y, w, h]); return; }
    let horizontal;
    if (canH && canV) horizontal = rng() < 0.5;
    else horizontal = canH;
    if (horizontal) {
      const s = minSize + rng() * (w - minSize * 2);
      split(x, y, s, h);
      split(x + s, y, w - s, h);
    } else {
      const s = minSize + rng() * (h - minSize * 2);
      split(x, y, w, s);
      split(x, y + s, w, h - s);
    }
  }
  split(0, 0, off.width, off.height);

  for (const [x, y, w, h] of rects) {
    octx.fillStyle = palette[Math.floor(rng() * palette.length)];
    octx.fillRect(x, y, w, h);
  }
  octx.strokeStyle = '#111111';
  octx.lineWidth = gap;
  for (const [x, y, w, h] of rects) {
    octx.strokeRect(x + gap / 2, y + gap / 2, w - gap, h - gap);
  }

  pushBitmap(off.toDataURL('image/png'));
}

// --- Color helper ----------------------------------------------------------

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// --- Generative: line walk (Molnár-style) ----------------------------------

function drawLineWalk({ spacing = 30, jitter = 8, seed = 1, color = state.color, width = 1 } = {}) {
  const rng = mulberry32(seed);
  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const octx = off.getContext('2d');
  octx.fillStyle = '#fafafa';
  octx.fillRect(0, 0, off.width, off.height);
  octx.strokeStyle = color;
  octx.lineWidth = width;
  octx.lineCap = 'round';

  const step = 6;
  for (let x = spacing; x < off.width; x += spacing) {
    octx.beginPath();
    let first = true;
    for (let y = 0; y <= off.height; y += step) {
      const ox = x + (rng() - 0.5) * 2 * jitter;
      if (first) { octx.moveTo(ox, y); first = false; }
      else octx.lineTo(ox, y);
    }
    octx.stroke();
  }
  for (let y = spacing; y < off.height; y += spacing) {
    octx.beginPath();
    let first = true;
    for (let x = 0; x <= off.width; x += step) {
      const oy = y + (rng() - 0.5) * 2 * jitter;
      if (first) { octx.moveTo(x, oy); first = false; }
      else octx.lineTo(x, oy);
    }
    octx.stroke();
  }

  pushBitmap(off.toDataURL('image/png'));
}

// --- Generative: reaction-diffusion (Gray-Scott) ----------------------------

function runReactionDiffusion({ gw = 180, gh = 120, feed = 0.037, kill = 0.062, iterations = 1000, seed = 1 } = {}) {
  const rng = mulberry32(seed);
  const W = gw, H = gh;
  const du = 0.16, dv = 0.08, dt = 1.0;

  let U = new Float32Array(W * H);
  let V = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    U[i] = 1.0;
    V[i] = rng() < 0.08 ? 1.0 : 0.0;
  }
  // Seed a central blob.
  const cx0 = (W * 0.5) | 0, cy0 = (H * 0.5) | 0, r0 = 8;
  for (let y = cy0 - r0; y <= cy0 + r0; y++) {
    for (let x = cx0 - r0; x <= cx0 + r0; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      U[i] = 0.5; V[i] = 0.25;
    }
  }

  const at = (A, x, y) => A[Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))];
  const lap = (A, i) => {
    const x = i % W, y = (i / W) | 0;
    return 0.2 * (at(A, x, y - 1) + at(A, x, y + 1) + at(A, x - 1, y) + at(A, x + 1, y))
         + 0.05 * (at(A, x - 1, y - 1) + at(A, x + 1, y - 1) + at(A, x - 1, y + 1) + at(A, x + 1, y + 1))
         - A[i];
  };

  for (let it = 0; it < iterations; it++) {
    const nU = new Float32Array(W * H);
    const nV = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const u = U[i], v = V[i];
      const uvv = u * v * v;
      nU[i] = u + (du * lap(U, i) - uvv + feed * (1 - u)) * dt;
      nV[i] = v + (dv * lap(V, i) + uvv - (feed + kill) * v) * dt;
    }
    U = nU; V = nV;
  }

  const img = new ImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const v = Math.max(0, Math.min(1, V[i]));
    const j = i * 4;
    img.data[j] = Math.floor(255 * (1 - v));
    img.data[j + 1] = Math.floor(255 * (1 - v) * 0.5);
    img.data[j + 2] = Math.floor(255 * v);
    img.data[j + 3] = 255;
  }
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tctx = tmp.getContext('2d');
  tctx.putImageData(img, 0, 0);

  const off = document.createElement('canvas');
  off.width = canvas.width; off.height = canvas.height;
  const octx = off.getContext('2d');
  octx.drawImage(tmp, 0, 0, off.width, off.height);   // smoothed upscale

  pushBitmap(off.toDataURL('image/png'));
}

// --- Generative: cyclic cellular automata -----------------------------------

function runCyclicCA({ cell = 4, states = 8, iterations = 150, seed = 1 } = {}) {
  const rng = mulberry32(seed);
  const W = Math.floor(canvas.width / cell);
  const H = Math.floor(canvas.height / cell);
  let grid = new Uint8Array(W * H);
  for (let i = 0; i < grid.length; i++) grid[i] = Math.floor(rng() * states);

  let next = new Uint8Array(W * H);
  for (let it = 0; it < iterations; it++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const target = (grid[i] + 1) % states;
        let advance = false;
        for (let dy = -1; dy <= 1 && !advance; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = (x + dx + W) % W;
            const ny = (y + dy + H) % H;
            if (grid[ny * W + nx] === target) { advance = true; break; }
          }
        }
        next[i] = advance ? target : grid[i];
      }
    }
    [grid, next] = [next, grid];
  }

  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const octx = off.getContext('2d');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const s = grid[y * W + x];
      octx.fillStyle = `hsl(${(s / states) * 360}, 80%, 55%)`;
      octx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  pushBitmap(off.toDataURL('image/png'));
}

// --- Generative: diffusion-limited aggregation ------------------------------

function runDLA({ particles = 2000, seed = 1, color = state.color, dot = 2 } = {}) {
  const rng = mulberry32(seed);
  const W = canvas.width, H = canvas.height;
  const cx = W >> 1, cy = H >> 1;
  const occupied = new Set();
  const key = (x, y) => y * W + x;
  occupied.add(key(cx, cy));

  let maxR = 3;
  for (let n = 0; n < particles; n++) {
    const a = rng() * Math.PI * 2;
    let x = Math.floor(cx + Math.cos(a) * (maxR + 8));
    let y = Math.floor(cy + Math.sin(a) * (maxR + 8));
    let stuck = false;
    for (let s = 0; s < 3000; s++) {
      const dir = Math.floor(rng() * 4);
      if (dir === 0) x++; else if (dir === 1) x--; else if (dir === 2) y++; else y--;
      if (x < 0 || y < 0 || x >= W || y >= H) break;         // walked off → discard
      const r = Math.hypot(x - cx, y - cy);
      if (r > maxR + 40) break;                              // wandered too far → discard
      if (occupied.has(key(x + 1, y)) || occupied.has(key(x - 1, y)) ||
          occupied.has(key(x, y + 1)) || occupied.has(key(x, y - 1))) {
        occupied.add(key(x, y));
        if (r > maxR) maxR = r;
        stuck = true;
        break;
      }
    }
  }

  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const octx = off.getContext('2d');
  octx.fillStyle = '#0d1017';
  octx.fillRect(0, 0, W, H);
  octx.fillStyle = color;
  for (const k of occupied) {
    const x = k % W, y = (k / W) | 0;
    octx.fillRect(x - (dot >> 1), y - (dot >> 1), dot, dot);
  }

  pushBitmap(off.toDataURL('image/png'));
}

// --- Generative: Voronoi mosaic ---------------------------------------------

function drawVoronoi({ cells = 60, seed = 1 } = {}) {
  const rng = mulberry32(seed);
  const GW = 300, GH = 200;
  const seeds = [];
  for (let i = 0; i < cells; i++) seeds.push({ x: rng() * GW, y: rng() * GH, hue: rng() * 360 });

  const img = new ImageData(GW, GH);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      let best = Infinity, bh = 0;
      for (const s of seeds) {
        const dx = x - s.x, dy = y - s.y;
        const d = dx * dx + dy * dy;
        if (d < best) { best = d; bh = s.hue; }
      }
      const [r, g, b] = hslToRgb(bh, 0.7, 0.55);
      const i = (y * GW + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  const tmp = document.createElement('canvas');
  tmp.width = GW; tmp.height = GH;
  const tctx = tmp.getContext('2d');
  tctx.putImageData(img, 0, 0);

  const off = document.createElement('canvas');
  off.width = canvas.width; off.height = canvas.height;
  const octx = off.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(tmp, 0, 0, off.width, off.height);

  pushBitmap(off.toDataURL('image/png'));
}

// --- Rendering -------------------------------------------------------------

const imageCache = new Map();

function getImage(src) {
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.onload = () => render();
    img.src = src;
    imageCache.set(src, img);
  }
  return img;
}

// Repeats a drawing operation across mirrored/rotated copies around the center.
function withSymmetry(item, draw) {
  const s = item.symmetry;
  if (!s || s.mode === 'none' || !(s.fold > 1)) {
    draw();
    return;
  }
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  for (let i = 0; i < s.fold; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((Math.PI * 2 * i) / s.fold);
    if (s.mode === 'mirror' && i % 2 === 1) ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
    draw();
    ctx.restore();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const item of state.items) drawItem(item);
  if (draft) drawItem(draft);   // show the in-progress stroke on top
}

function drawItem(item) {
  if (item.kind === 'bitmap') {
    const img = getImage(item.src);
    if (img.complete) ctx.drawImage(img, 0, 0);
    return;
  }

  withSymmetry(item, () => {
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (item.kind === 'path') {
      ctx.lineWidth = item.width;
      if (item.points.length === 1) {
        const [p] = item.points;                 // single click → dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, item.width / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(item.points[0].x, item.points[0].y);
      for (const p of item.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else if (item.kind === 'shape') {
      ctx.lineWidth = item.strokeWidth;          // outline width captured at draw time
      ctx.beginPath();
      if (item.type === 'ellipse') {
        ctx.ellipse(item.x, item.y, Math.abs(item.width) / 2, Math.abs(item.height) / 2, 0, 0, Math.PI * 2);
      } else if (item.type === 'line') {
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(item.x + item.width, item.y + item.height);
      } else { // rect
        ctx.rect(item.x, item.y, item.width, item.height);
      }
      if (item.type === 'line') ctx.stroke();
      else if (item.fill) ctx.fill();
      else ctx.stroke();
    } else if (item.kind === 'text') {
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(item.text, item.x, item.y);
    } else if (item.kind === 'tree') {
      drawTree(item);
    } else if (item.kind === 'spirograph') {
      drawSpiro(item);
    }
  });
}

// --- Pointer handlers (human input) ----------------------------------------

function toLocal(e) {
  const rect = canvas.getBoundingClientRect();
  // Scale client coordinates into the canvas's internal pixel grid, so drawing
  // stays correct even when CSS resizes the element.
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  const { x, y } = toLocal(e);

  if (state.tool === 'text') {
    const text = prompt('Text to add:');   // a nicer inline editor can replace this
    if (text) addText(text, x, y);
    return;
  }

  if (state.tool === 'brush') {
    draft = { kind: 'path', points: [{ x, y }], color: state.color, width: state.width, symmetry: currentSymmetry() };
  } else {
    draft = { kind: 'shape', type: state.tool, x, y, width: 0, height: 0, color: state.color, fill: state.fill, strokeWidth: state.width, symmetry: currentSymmetry() };
  }
  render();
});

canvas.addEventListener('pointermove', (e) => {
  if (!draft) return;
  const { x, y } = toLocal(e);
  if (draft.kind === 'path') {
    draft.points.push({ x, y });
  } else {
    draft.width = x - draft.x;
    draft.height = y - draft.y;
  }
  render();
});

canvas.addEventListener('pointerup', () => {
  if (!draft) return;
  if (draft.kind === 'path') {
    drawPath(draft.points, { color: draft.color, width: draft.width, symmetry: draft.symmetry });
  } else {
    drawShape({ type: draft.type, x: draft.x, y: draft.y, width: draft.width, height: draft.height, color: draft.color, symmetry: draft.symmetry });
  }
  draft = null;
});

canvas.addEventListener('pointercancel', () => {
  draft = null;
  render();
});

// --- Palette + toolbar (human controls) ------------------------------------

const colorInput = document.querySelector('#brush-color');
const widthInput = document.querySelector('#brush-width');
const toolSelect = document.querySelector('#brush-tool');
const fillInput = document.querySelector('#brush-fill');
const symmetrySelect = document.querySelector('#symmetry-mode');
const foldInput = document.querySelector('#symmetry-fold');

function syncBrush() {
  setBrush({
    color: colorInput.value,
    width: Number(widthInput.value),
    tool: toolSelect.value,
    fill: fillInput.checked,
    symmetry: symmetrySelect.value,
    fold: Number(foldInput.value),
  });
}

colorInput.addEventListener('input', syncBrush);
widthInput.addEventListener('input', syncBrush);
toolSelect.addEventListener('change', syncBrush);
fillInput.addEventListener('change', syncBrush);
symmetrySelect.addEventListener('change', syncBrush);
foldInput.addEventListener('input', syncBrush);

document.querySelector('#undo-btn').addEventListener('click', () => {
  undo();
  status.textContent = 'Undid last action.';
});

document.querySelector('#clear-btn').addEventListener('click', () => {
  clearCanvas();
  status.textContent = 'Cleared whiteboard.';
});

document.querySelector('#export-btn').addEventListener('click', () => {
  exportPng();
  status.textContent = 'Exported PNG.';
});

// --- Generative controls (human) -------------------------------------------

const RANGES = [
  ['#symmetry-fold', '#symmetry-fold-out'],
  ['#flow-particles', '#flow-particles-out'],
  ['#flow-scale', '#flow-scale-out'],
  ['#flow-hue', '#flow-hue-out'],
  ['#tree-depth', '#tree-depth-out'],
  ['#tree-angle', '#tree-angle-out'],
  ['#tree-branches', '#tree-branches-out'],
  ['#spiro-R', '#spiro-R-out'],
  ['#spiro-r', '#spiro-r-out'],
  ['#spiro-d', '#spiro-d-out'],
  ['#spiro-turns', '#spiro-turns-out'],
  ['#life-particles', '#life-particles-out'],
  ['#life-types', '#life-types-out'],
  ['#truchet-size', '#truchet-size-out'],
  ['#mondrian-min', '#mondrian-min-out'],
  ['#linewalk-spacing', '#linewalk-spacing-out'],
  ['#linewalk-jitter', '#linewalk-jitter-out'],
  ['#rd-feed', '#rd-feed-out'],
  ['#rd-kill', '#rd-kill-out'],
  ['#rd-iter', '#rd-iter-out'],
  ['#ca-cell', '#ca-cell-out'],
  ['#ca-states', '#ca-states-out'],
  ['#ca-iter', '#ca-iter-out'],
  ['#dla-particles', '#dla-particles-out'],
  ['#voronoi-cells', '#voronoi-cells-out'],
];

function syncOutputs() {
  for (const [inId, outId] of RANGES) {
    const out = document.querySelector(outId);
    if (out) out.textContent = document.querySelector(inId).value;
  }
}
RANGES.forEach(([inId]) => document.querySelector(inId).addEventListener('input', syncOutputs));

const readInt = (id) => Number(document.querySelector(id).value);
const setInt = (id, v) => { document.querySelector(id).value = v; };

// Flow field
document.querySelector('#flow-generate').addEventListener('click', runFlow);
document.querySelector('#flow-randomize').addEventListener('click', () => { setInt('#flow-seed', randomSeed()); runFlow(); });
function runFlow() {
  generateFlowField({
    particles: readInt('#flow-particles'),
    scale: readInt('#flow-scale'),
    hue: readInt('#flow-hue'),
    dark: document.querySelector('#flow-dark').checked,
    seed: readInt('#flow-seed'),
  });
  status.textContent = 'Generated flow field.';
}

// Tree
document.querySelector('#tree-grow').addEventListener('click', runTree);
document.querySelector('#tree-randomize').addEventListener('click', () => { setInt('#tree-seed', randomSeed()); runTree(); });
function runTree() {
  growTree({
    depth: readInt('#tree-depth'),
    angle: readInt('#tree-angle'),
    branches: readInt('#tree-branches'),
    color: state.color,
    width: Math.max(3, state.width),
    seed: readInt('#tree-seed'),
  });
  status.textContent = 'Grew recursive tree.';
}

// Spirograph
document.querySelector('#spiro-draw').addEventListener('click', runSpiro);
document.querySelector('#spiro-randomize').addEventListener('click', () => {
  setInt('#spiro-R', 60 + Math.floor(Math.random() * 160));
  setInt('#spiro-r', 20 + Math.floor(Math.random() * 100));
  setInt('#spiro-d', 20 + Math.floor(Math.random() * 160));
  setInt('#spiro-turns', 50 + Math.floor(Math.random() * 550));
  syncOutputs();
  runSpiro();
});
function runSpiro() {
  drawSpirograph({
    R: readInt('#spiro-R'),
    r: readInt('#spiro-r'),
    d: readInt('#spiro-d'),
    turns: readInt('#spiro-turns'),
    color: state.color,
    width: Math.max(1, Math.round(state.width / 2)),
  });
  status.textContent = 'Drew spirograph.';
}

// Particle life
document.querySelector('#life-run').addEventListener('click', runLife);
document.querySelector('#life-randomize').addEventListener('click', () => { setInt('#life-seed', randomSeed()); runLife(); });
function runLife() {
  runParticleLife({
    particles: readInt('#life-particles'),
    types: readInt('#life-types'),
    seed: readInt('#life-seed'),
  });
  status.textContent = 'Ran particle life.';
}

// Truchet
document.querySelector('#truchet-draw').addEventListener('click', runTruchet);
document.querySelector('#truchet-randomize').addEventListener('click', () => { setInt('#truchet-seed', randomSeed()); runTruchet(); });
function runTruchet() {
  drawTruchet({
    tileSize: readInt('#truchet-size'),
    seed: readInt('#truchet-seed'),
    color: state.color,
    width: Math.max(1, Math.round(state.width / 2)),
  });
  status.textContent = 'Drew truchet tiles.';
}

// Mondrian
document.querySelector('#mondrian-draw').addEventListener('click', runMondrian);
document.querySelector('#mondrian-randomize').addEventListener('click', () => { setInt('#mondrian-seed', randomSeed()); runMondrian(); });
function runMondrian() {
  drawMondrian({
    minSize: readInt('#mondrian-min'),
    seed: readInt('#mondrian-seed'),
  });
  status.textContent = 'Drew mondrian.';
}

// Line walk
document.querySelector('#linewalk-draw').addEventListener('click', runLineWalk);
document.querySelector('#linewalk-randomize').addEventListener('click', () => { setInt('#linewalk-seed', randomSeed()); runLineWalk(); });
function runLineWalk() {
  drawLineWalk({
    spacing: readInt('#linewalk-spacing'),
    jitter: readInt('#linewalk-jitter'),
    seed: readInt('#linewalk-seed'),
    color: state.color,
  });
  status.textContent = 'Drew line walk.';
}

// Reaction-diffusion
document.querySelector('#rd-run').addEventListener('click', runRD);
document.querySelector('#rd-randomize').addEventListener('click', () => { setInt('#rd-seed', randomSeed()); runRD(); });
function runRD() {
  status.textContent = 'Running reaction-diffusion…';
  setTimeout(() => {
    runReactionDiffusion({
      feed: readInt('#rd-feed'),
      kill: readInt('#rd-kill'),
      iterations: readInt('#rd-iter'),
      seed: readInt('#rd-seed'),
    });
    status.textContent = 'Ran reaction-diffusion.';
  }, 30);   // let the status line paint before the (brief) compute
}

// Cyclic automata
document.querySelector('#ca-run').addEventListener('click', runCA);
document.querySelector('#ca-randomize').addEventListener('click', () => { setInt('#ca-seed', randomSeed()); runCA(); });
function runCA() {
  runCyclicCA({
    cell: readInt('#ca-cell'),
    states: readInt('#ca-states'),
    iterations: readInt('#ca-iter'),
    seed: readInt('#ca-seed'),
  });
  status.textContent = 'Ran cyclic automata.';
}

// DLA
document.querySelector('#dla-run').addEventListener('click', runDla);
document.querySelector('#dla-randomize').addEventListener('click', () => { setInt('#dla-seed', randomSeed()); runDla(); });
function runDla() {
  runDLA({
    particles: readInt('#dla-particles'),
    seed: readInt('#dla-seed'),
    color: state.color,
  });
  status.textContent = 'Ran DLA.';
}

// Voronoi
document.querySelector('#voronoi-draw').addEventListener('click', runVoronoi);
document.querySelector('#voronoi-randomize').addEventListener('click', () => { setInt('#voronoi-seed', randomSeed()); runVoronoi(); });
function runVoronoi() {
  drawVoronoi({
    cells: readInt('#voronoi-cells'),
    seed: readInt('#voronoi-seed'),
  });
  status.textContent = 'Drew voronoi.';
}

// Initial state.
syncBrush();
syncOutputs();
render();
