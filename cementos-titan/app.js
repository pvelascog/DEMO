'use strict';

/* =========================================================================
 * Demo: inventario visual de Cementos TITAN
 * Todo corre en el navegador. El "reconocimiento" es una simulación:
 *  - Las fotos de ejemplo se generan por código, así que se conoce qué hay
 *    en ellas y el detector devuelve resultados coherentes (con ruido,
 *    confianza y casos que requieren revisión humana).
 *  - La foto aérea del patio trae detecciones anotadas a mano.
 *  - Sobre fotos propias se generan detecciones sintéticas.
 * ========================================================================= */

// ---------- Catálogo ----------
const FAMILIES = {
  CEM: 'Cemento ensacado',
  TUB: 'Tubería de concreto',
  BLO: 'Bloques de concreto',
  PRE: 'Prefabricados',
};

// layout 'grid': unidades en capas (cols visibles, perLayer reales por capa).
// layout 'pyramid': tubos apilados en pirámide vistos desde el extremo.
const PRODUCTS = [
  { sku: 'TT-UG50', fam: 'CEM', name: 'Cemento Uso General', short: 'Uso General', pres: 'Saco 50 kg', kg: 50, unit: 'sacos',
    shape: 'bag', color: '#d8d2c4', band: '#c0392b', layout: 'grid', cols: 3, perLayer: 5, layers: 8, uw: 64, uh: 27 },
  { sku: 'TT-ES425', fam: 'CEM', name: 'Cemento Estructural', short: 'Estructural', pres: 'Saco 42.5 kg', kg: 42.5, unit: 'sacos',
    shape: 'bag', color: '#c7d1db', band: '#1f5fa8', layout: 'grid', cols: 3, perLayer: 5, layers: 8, uw: 64, uh: 27 },
  { sku: 'TT-AR50', fam: 'CEM', name: 'Cemento Alta Resistencia', short: 'Alta Resist.', pres: 'Saco 50 kg', kg: 50, unit: 'sacos',
    shape: 'bag', color: '#3b4046', band: '#d38b1f', layout: 'grid', cols: 3, perLayer: 5, layers: 8, uw: 64, uh: 27 },
  { sku: 'TT-MO25', fam: 'CEM', name: 'Mortero', short: 'Mortero', pres: 'Saco 25 kg', kg: 25, unit: 'sacos',
    shape: 'bag', color: '#e6dbbd', band: '#2e8b57', layout: 'grid', cols: 4, perLayer: 8, layers: 7, uw: 48, uh: 24 },
  { sku: 'TT-BB15', fam: 'CEM', name: 'Cemento a granel (big bag)', short: 'Big Bag', pres: 'Big bag 1.5 t', kg: 1500, unit: 'big bags',
    shape: 'bigbag', color: '#f1f0ea', band: '#a83232', layout: 'grid', cols: 1, perLayer: 1, layers: 2, uw: 150, uh: 104 },
  { sku: 'TT-TC30', fam: 'TUB', name: 'Tubo de concreto 300 mm', short: 'Tubo 300', pres: 'Ø 300 mm × 2.5 m', kg: 280, unit: 'tubos',
    shape: 'pipe', color: '#cfcdc7', band: '#5a6f82', layout: 'pyramid', base: 5, d: 40, step: 1 },
  { sku: 'TT-TC60', fam: 'TUB', name: 'Tubo de concreto reforzado 600 mm', short: 'Tubo 600', pres: 'Ø 600 mm × 2.5 m', kg: 1250, unit: 'tubos',
    shape: 'pipe', color: '#cbc9c3', band: '#3f7aa3', layout: 'pyramid', base: 4, d: 58, step: 1 },
  { sku: 'TT-TC90', fam: 'TUB', name: 'Tubo de concreto reforzado 900 mm', short: 'Tubo 900', pres: 'Ø 900 mm × 2.5 m', kg: 2400, unit: 'tubos',
    shape: 'pipe', color: '#c6c4be', band: '#24547a', layout: 'pyramid', base: 3, d: 80, step: 1 },
  { sku: 'TT-BL15', fam: 'BLO', name: 'Bloque de concreto 15 cm', short: 'Bloque 15', pres: '15 × 20 × 40 cm', kg: 12, unit: 'bloques',
    shape: 'block', color: '#c4c3be', band: '#8a7550', layout: 'grid', cols: 5, perLayer: 15, layers: 6, uw: 34, uh: 19 },
  { sku: 'TT-BL20', fam: 'BLO', name: 'Bloque de concreto 20 cm', short: 'Bloque 20', pres: '20 × 20 × 40 cm', kg: 16, unit: 'bloques',
    shape: 'block', color: '#bdbcb6', band: '#a5772c', layout: 'grid', cols: 4, perLayer: 12, layers: 6, uw: 42, uh: 20 },
  { sku: 'TT-CJ60', fam: 'PRE', name: 'Caja de inspección 60 × 60', short: 'Caja insp.', pres: '60 × 60 × 60 cm', kg: 350, unit: 'cajas',
    shape: 'box', color: '#cfcec9', band: '#6d5a8a', layout: 'grid', cols: 2, perLayer: 2, layers: 2, uw: 70, uh: 62, step: 1 },
  { sku: 'TT-CN12', fam: 'PRE', name: 'Cono reductor para pozo', short: 'Cono reductor', pres: 'Ø 1.2 m → 0.6 m', kg: 900, unit: 'conos',
    shape: 'cone', color: '#cdccc6', band: '#8a4f6a', layout: 'grid', cols: 2, perLayer: 2, layers: 1, uw: 92, uh: 82, step: 1 },
  { sku: 'TT-BD100', fam: 'PRE', name: 'Bordillo de concreto', short: 'Bordillo', pres: 'Tipo A · 1.0 m', kg: 85, unit: 'bordillos',
    shape: 'curb', color: '#c8c7c1', band: '#3d7a5c', layout: 'grid', cols: 4, perLayer: 4, layers: 5, uw: 34, uh: 26 },
];
for (const p of PRODUCTS) {
  p.full = p.layout === 'pyramid' ? (p.base * (p.base + 1)) / 2 : p.perLayer * p.layers;
  p.step = p.step || p.perLayer; // variación típica entre sistema y físico
}
const P = Object.fromEntries(PRODUCTS.map((p) => [p.sku, p]));

// Foto aérea del patio (imagen de 1672 × 941 px) con detecciones anotadas.
const PHOTO = {
  src: 'img/patio-titan.webp', w: 1672, h: 941,
  dets: [
    { sku: 'TT-TC90', count: 64, conf: 0.71, box: [575, 368, 775, 202], reason: 'La grúa pórtico tapa parte de la estiba' },
    { sku: 'TT-TC60', count: 48, conf: 0.9, box: [160, 300, 620, 100] },
    { sku: 'TT-TC60', count: 56, conf: 0.88, box: [1140, 278, 532, 142] },
    { sku: 'TT-TC30', count: 120, conf: 0.82, box: [400, 252, 830, 70] },
    { sku: 'TT-BL15', count: 540, conf: 0.9, box: [0, 520, 390, 175] },
    { sku: 'TT-BL15', count: 360, conf: 0.87, box: [385, 455, 360, 105] },
    { sku: 'TT-BL20', count: 432, conf: 0.89, box: [1310, 430, 362, 210] },
    { sku: 'TT-CJ60', count: 18, conf: 0.93, box: [205, 645, 355, 190] },
    { sku: 'TT-CN12', count: 22, conf: 0.91, box: [495, 568, 400, 362] },
    { sku: 'TT-CN12', count: 16, conf: 0.76, box: [880, 600, 345, 335], reason: 'Conos acostados; conteo por bocas visibles' },
    { sku: 'TT-BD100', count: 96, conf: 0.86, box: [1040, 670, 632, 271] },
  ],
};

// Stock inicial en sistema (ERP) y mínimos: { sku: [sistema, mínimo] }.
const ZONES = [
  { id: 'PAT-AE', env: 'photo', name: 'Patio principal · vista aérea', short: 'Patio principal',
    stock: { 'TT-TC90': [70, 30], 'TT-TC60': [110, 50], 'TT-TC30': [120, 60], 'TT-BL15': [900, 400], 'TT-BL20': [432, 200],
      'TT-CJ60': [20, 10], 'TT-CN12': [38, 20], 'TT-BD100': [96, 50] } },
  { id: 'PAT-TB', env: 'yard', name: 'Patio de tubería · Bloque T1', short: 'Tubería T1', sign: 'TUBERÍA T1',
    stock: { 'TT-TC30': [30, 15], 'TT-TC60': [30, 20], 'TT-TC90': [12, 6] } },
  { id: 'PAT-BL', env: 'yard', name: 'Patio de bloques · Calle B3', short: 'Bloques B3', sign: 'BLOQUES B3',
    stock: { 'TT-BL15': [540, 270], 'TT-BL20': [216, 144] } },
  { id: 'PAT-PF', env: 'yard', name: 'Patio de prefabricados · Calle P2', short: 'Prefabricados P2', sign: 'PREFAB. P2',
    stock: { 'TT-CJ60': [12, 8], 'TT-CN12': [4, 4], 'TT-BD100': [60, 40] } },
  { id: 'PLT-A', env: 'warehouse', name: 'Planta · Bodega de cemento · Pasillo A', short: 'Bodega cemento A', sign: 'PASILLO A',
    stock: { 'TT-UG50': [160, 80], 'TT-ES425': [120, 80], 'TT-AR50': [60, 40] } },
  { id: 'CDN-M2', env: 'warehouse', name: 'CD Norte · Muelle 2', short: 'CD Norte – Muelle 2', sign: 'MUELLE 2',
    stock: { 'TT-UG50': [120, 160], 'TT-ES425': [80, 40], 'TT-MO25': [96, 48] } },
  { id: 'PAT-BB', env: 'yard', name: 'Patio de despacho · Big bags', short: 'Despacho big bags', sign: 'BIG BAGS',
    stock: { 'TT-BB15': [16, 6] } },
];
const Z = Object.fromEntries(ZONES.map((z) => [z.id, z]));

const STORE_KEY = 'titan-inventario-visual-v2';
const W = 1200;
const H = 720;

// ---------- Utilidades ----------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 0) => Number(n).toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });
const tons = (sku, n) => (n * P[sku].kg) / 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtDate = (ts) => new Date(ts).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Estado ----------
function initialState() {
  const stock = {};
  for (const z of ZONES) {
    stock[z.id] = {};
    for (const [sku, [system, min]] of Object.entries(z.stock)) {
      stock[z.id][sku] = { system, min, physical: null, countedAt: null };
    }
  }
  return { stock, history: [], moves: [] };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* almacenamiento no disponible */ }
  return initialState();
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    // Si no cabe, se descartan las imágenes más antiguas.
    try {
      state.history.slice(8).forEach((h) => { h.thumb = null; });
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e2) { /* sin persistencia */ }
  }
}

let state = loadState();

// ---------- Escenas sintéticas ----------
const FOOT = { bag: 16, bigbag: 16, block: 14, curb: 4, box: 2, cone: 2, pipe: 6 };

/** Posiciones de cada unidad dentro de una estiba con base en (x, baseY). */
function estibaGeom(p, count, s, x, baseY) {
  const pos = [];
  const foot = FOOT[p.shape] * s;
  if (p.layout === 'pyramid') {
    const d = p.d * s;
    let left = count;
    let row = 0;
    while (left > 0 && row < p.base) {
      const n = Math.min(p.base - row, left);
      for (let i = 0; i < n; i++) {
        pos.push({ x: x + 4 * s + (row * d) / 2 + i * d, y: baseY - foot - d - row * d * 0.866, w: d, h: d });
      }
      left -= n;
      row++;
    }
    return { pos, w: p.base * d + 8 * s, h: foot + d + Math.max(0, row - 1) * d * 0.866, levels: row, foot };
  }
  const uw = p.uw * s;
  const uh = p.uh * s;
  const full = Math.floor(count / p.perLayer);
  const rest = count % p.perLayer;
  const layers = full + (rest ? 1 : 0);
  const stagger = ['bag', 'block', 'curb'].includes(p.shape);
  for (let l = 0; l < layers; l++) {
    const n = l === layers - 1 && rest ? Math.max(1, Math.round((rest / p.perLayer) * p.cols)) : p.cols;
    const offset = stagger && l % 2 ? 4 * s : 0;
    for (let c = 0; c < n; c++) pos.push({ x: x + 5 * s + c * uw + offset, y: baseY - foot - (l + 1) * uh, w: uw, h: uh });
  }
  return { pos, w: p.cols * uw + 10 * s, h: foot + layers * uh, levels: layers, foot };
}

/**
 * Genera la "foto" de una zona a partir del stock en sistema, con variación:
 * a veces coincide, a veces faltan o sobran unidades (merma, rotura,
 * despacho no registrado...). Devuelve la verdad de terreno de cada estiba.
 */
function generateScene(zoneId, seed) {
  const zone = Z[zoneId];
  const r = rng(seed);
  const units = [];
  for (const [sku, s] of Object.entries(state.stock[zoneId])) {
    const p = P[sku];
    let qty = s.system;
    const roll = r();
    if (roll < 0.35) qty -= p.step * (1 + Math.floor(r() * 3));        // faltante
    else if (roll < 0.5) qty += p.step * (1 + Math.floor(r() * 2));    // sobrante
    else if (roll < 0.6 && p.step > 1) qty -= Math.ceil(r() * (p.step - 1)); // unidades sueltas
    qty = Math.max(0, qty);
    while (qty > 0) {
      const n = Math.min(p.full, qty);
      units.push({ sku, count: n });
      qty -= n;
    }
  }
  // Mezcla ligera para que no queden siempre ordenados por producto.
  for (let i = units.length - 1; i > 0; i--) {
    if (r() < 0.35) {
      const j = Math.floor(r() * (i + 1));
      [units[i], units[j]] = [units[j], units[i]];
    }
  }

  // Ranuras: fila del fondo (más pequeña) y fila delantera.
  const back = { n: 6, s: 0.72, baseY: 452, x0: 40, step: 186 };
  const front = { n: 5, s: 1, baseY: 690, x0: 30, step: 232 };
  const slots = [];
  for (let i = 0; i < back.n; i++) slots.push({ row: 'back', s: back.s, baseY: back.baseY, x: back.x0 + i * back.step + (r() - 0.5) * 14 });
  for (let i = 0; i < front.n; i++) slots.push({ row: 'front', s: front.s, baseY: front.baseY, x: front.x0 + i * front.step + (r() - 0.5) * 14 });

  // Las estibas anchas (tubo 900, sacos) no caben en 5 ranuras delanteras: se
  // usan 4 ranuras más separadas si alguna lo necesita.
  const wide = units.some((u) => estibaGeom(P[u.sku], P[u.sku].full, 1, 0, 0).w > 222);
  if (wide) {
    slots.splice(back.n);
    for (let i = 0; i < 4; i++) slots.push({ row: 'front', s: 1, baseY: front.baseY, x: 40 + i * 290 + (r() - 0.5) * 16 });
  }

  const pallets = units.slice(0, slots.length).map((u, i) => {
    const slot = slots[i];
    const g = estibaGeom(P[u.sku], u.count, slot.s, slot.x, slot.baseY);
    return { ...u, ...slot, geom: g, w: g.w, h: g.h, y: slot.baseY - g.h, occluded: false };
  });

  // Una columna (bodega) o la pata de la grúa pórtico (patio) tapa parcialmente una estiba.
  let obstacle = null;
  if (pallets.length && r() < 0.75) {
    const candidates = pallets.filter((p) => p.row === 'back');
    const target = candidates.length ? candidates[Math.floor(r() * candidates.length)] : pallets[0];
    target.occluded = true;
    obstacle = { x: target.x + target.w * (0.45 + r() * 0.2), w: 26 * target.s + 10, y1: target.baseY + 6 };
    obstacle.x2 = obstacle.x < W / 2 ? obstacle.x + 520 + r() * 200 : obstacle.x - 520 - r() * 200;
  }
  return { kind: 'scene', zoneId, seed, env: zone.env, sign: zone.sign, pallets, obstacle, truncated: units.length > slots.length };
}

function drawScene(ctx, scene) {
  const r = rng(scene.seed ^ 0x9e3779b9);
  if (scene.env === 'yard') drawYard(ctx, scene, r);
  else drawWarehouse(ctx, scene, r);

  const o = scene.obstacle;
  const yardCrane = o && scene.env === 'yard';
  // La viga y la pata lejana de la grúa quedan detrás de las estibas.
  if (yardCrane) {
    const left = Math.min(o.x, o.x2) - 10;
    const span = Math.abs(o.x2 - o.x) + o.w + 20;
    ctx.fillStyle = '#e8b917';
    ctx.fillRect(left, 118, span, 34);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(left, 144, span, 8);
    ctx.fillStyle = '#2459a8';
    ctx.fillRect((o.x + o.x2) / 2 - 30, 150, 60, 30);
    craneLeg(ctx, o.x2, o.w, 300);
  }

  const order = [...scene.pallets].sort((a, b) => a.baseY - b.baseY);
  for (const pl of order) drawEstiba(ctx, pl, r);

  if (yardCrane) {
    craneLeg(ctx, o.x, o.w, o.y1);
  } else if (o) {
    ctx.fillStyle = '#d8a51c';
    ctx.fillRect(o.x, 120, o.w, o.y1 - 120);
    ctx.fillStyle = '#1d1d1d';
    for (let y = 120; y < o.y1; y += 36) ctx.fillRect(o.x, y, o.w, 14);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(o.x + o.w, 120, 6, o.y1 - 120);
  }
  // Viñeta suave tipo cámara
  const v = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 780);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.3)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function craneLeg(ctx, x, w, y1) {
  ctx.fillStyle = '#e8b917';
  ctx.fillRect(x, 140, w, y1 - 140);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.fillRect(x + w - 6, 140, 6, y1 - 140);
}

function drawSign(ctx, text, x, y) {
  ctx.font = 'bold 28px system-ui, sans-serif';
  const w = Math.max(220, ctx.measureText(text).width + 40);
  ctx.fillStyle = '#f2c230';
  ctx.fillRect(x - w / 2, y, w, 56);
  ctx.fillStyle = '#1b1b1b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 29);
}

function drawWarehouse(ctx, scene, r) {
  const wall = ctx.createLinearGradient(0, 0, 0, 300);
  wall.addColorStop(0, '#6f747a');
  wall.addColorStop(1, '#9a9d9f');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, 300);
  ctx.strokeStyle = 'rgba(0,0,0,.12)';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 150) { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, 300); ctx.stroke(); }
  ctx.fillStyle = '#3f4448';
  ctx.fillRect(0, 30, W, 14);
  for (let x = 120; x < W; x += 320) {
    ctx.fillStyle = '#e9e6da';
    ctx.fillRect(x, 44, 90, 8);
    const g = ctx.createRadialGradient(x + 45, 56, 4, x + 45, 120, 160);
    g.addColorStop(0, 'rgba(255,250,225,.35)');
    g.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 120, 52, 330, 240);
  }
  drawSign(ctx, scene.sign, W - 180, 70);
  const floor = ctx.createLinearGradient(0, 300, 0, H);
  floor.addColorStop(0, '#8d8b85');
  floor.addColorStop(1, '#b7b4ac');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 300, W, H - 300);
  speckle(ctx, r, 300);
  ctx.strokeStyle = '#e3b72a';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 470); ctx.lineTo(W, 470); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 312); ctx.lineTo(W, 312); ctx.stroke();
}

function drawYard(ctx, scene, r) {
  const sky = ctx.createLinearGradient(0, 0, 0, 260);
  sky.addColorStop(0, '#5f9fe0');
  sky.addColorStop(1, '#cfe3f3');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 270);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 5; i++) {
    const cx = r() * W;
    const cy = 30 + r() * 80;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(cx + k * 26, cy + (k % 2) * 6, 34, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Montañas y árboles al fondo
  ctx.fillStyle = '#6d88a3';
  ctx.beginPath();
  ctx.moveTo(0, 230);
  for (let x = 0; x <= W; x += 60) ctx.lineTo(x, 170 + Math.sin(x / 140 + scene.seed) * 30 + r() * 18);
  ctx.lineTo(W, 270);
  ctx.lineTo(0, 270);
  ctx.fill();
  ctx.fillStyle = '#3f6b3a';
  for (let x = -20; x < W + 20; x += 28) {
    ctx.beginPath();
    ctx.ellipse(x, 262 - r() * 14, 22, 18 + r() * 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Piso de concreto del patio
  const ground = ctx.createLinearGradient(0, 270, 0, H);
  ground.addColorStop(0, '#bdb7aa');
  ground.addColorStop(1, '#ddd8cc');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 270, W, H - 270);
  speckle(ctx, r, 270);
  ctx.strokeStyle = '#e3b72a';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, 470); ctx.lineTo(W, 470); ctx.stroke();
  // Rieles de la grúa
  ctx.strokeStyle = '#6f6a60';
  ctx.lineWidth = 3;
  for (const y of [300, 306]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // Letrero en poste
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(W - 186, 120, 8, 170);
  drawSign(ctx, scene.sign, W - 182, 80);
}

function speckle(ctx, r, top) {
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * W, top + r() * (H - top), 2 + r() * 10, 1 + r() * 3);
  }
}

function drawEstiba(ctx, pl, r) {
  const p = P[pl.sku];
  const s = pl.s;
  const g = pl.geom;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(pl.x + pl.w / 2, pl.baseY + 2, pl.w * 0.58, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  if (['bag', 'bigbag', 'block'].includes(p.shape)) {
    // Tarima de madera
    ctx.fillStyle = '#8a6237';
    ctx.fillRect(pl.x, pl.baseY - g.foot, pl.w, g.foot);
    ctx.fillStyle = '#5b3f22';
    for (let i = 0; i < 3; i++) ctx.fillRect(pl.x + 8 * s + (i * (pl.w - 30 * s)) / 2, pl.baseY - g.foot + 6 * s, 14 * s, g.foot - 6 * s);
  } else if (p.shape === 'pipe') {
    // Calzas
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(pl.x, pl.baseY - g.foot, 14 * s, g.foot);
    ctx.fillRect(pl.x + pl.w - 14 * s, pl.baseY - g.foot, 14 * s, g.foot);
  }
  for (const u of g.pos) SHAPES[p.shape](ctx, u, p, s, r);
}

const SHAPES = {
  bag(ctx, u, p, s, r) {
    const w = u.w - 3 * s;
    const h = u.h - 2 * s;
    shadeFill(ctx, () => roundRect(ctx, u.x, u.y, w, h, 6 * s), p.color, r);
    ctx.fillStyle = p.band;
    ctx.fillRect(u.x + w * 0.12, u.y + h * 0.34, w * 0.76, h * 0.32);
    if (w > 40) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(8 * s + 1)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TITAN', u.x + w / 2, u.y + h / 2 + 0.5);
    }
  },
  bigbag(ctx, u, p, s) {
    const w = u.w - 6 * s;
    const h = u.h - 3 * s;
    ctx.fillStyle = p.color;
    roundRect(ctx, u.x, u.y + 10 * s, w, h - 10 * s, 10 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#c9c4b5';
    ctx.lineWidth = 5 * s;
    for (const ax of [u.x + w * 0.18, u.x + w * 0.82]) {
      ctx.beginPath();
      ctx.arc(ax, u.y + 12 * s, 9 * s, Math.PI, 0);
      ctx.stroke();
    }
    ctx.fillStyle = p.band;
    ctx.fillRect(u.x + w * 0.2, u.y + h * 0.42, w * 0.6, h * 0.26);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(13 * s)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TITAN 1.5 t', u.x + w / 2, u.y + h * 0.55);
  },
  block(ctx, u, p, s, r) {
    const w = u.w - 2 * s;
    const h = u.h - 2 * s;
    shadeFill(ctx, () => { ctx.beginPath(); ctx.rect(u.x, u.y, w, h); }, p.color, r);
    ctx.fillStyle = '#77756f';
    ctx.fillRect(u.x + w * 0.1, u.y + h * 0.25, w * 0.33, h * 0.5);
    ctx.fillRect(u.x + w * 0.57, u.y + h * 0.25, w * 0.33, h * 0.5);
  },
  curb(ctx, u, p, s, r) {
    const w = u.w - 3 * s;
    const h = u.h - 4 * s;
    shadeFill(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(u.x, u.y + h);
      ctx.lineTo(u.x + w, u.y + h);
      ctx.lineTo(u.x + w, u.y + h * 0.35);
      ctx.lineTo(u.x + w * 0.72, u.y);
      ctx.lineTo(u.x, u.y);
      ctx.closePath();
    }, p.color, r);
    ctx.fillStyle = '#7a5733';
    ctx.fillRect(u.x - 1, u.y + h, w + 4 * s, 4 * s);
  },
  box(ctx, u, p, s, r) {
    const w = u.w - 6 * s;
    const h = u.h - 2 * s;
    const t = h * 0.26;
    const d = w * 0.16;
    const front = { x: u.x, y: u.y + t, w: w - d, h: h - t };
    shadeFill(ctx, () => { ctx.beginPath(); ctx.rect(front.x, front.y, front.w, front.h); }, p.color, r);
    poly(ctx, [[u.x, u.y + t], [u.x + d, u.y], [u.x + w, u.y], [u.x + w - d, u.y + t]], '#e2e1dc');
    poly(ctx, [[u.x + w - d, u.y + t], [u.x + w, u.y], [u.x + w, u.y + h - t], [u.x + w - d, u.y + h]], '#a9a8a3');
    poly(ctx, [[u.x + w * 0.2, u.y + t * 0.8], [u.x + w * 0.27, u.y + t * 0.2], [u.x + w * 0.78, u.y + t * 0.2], [u.x + w * 0.71, u.y + t * 0.8]], '#55534f');
  },
  cone(ctx, u, p, s) {
    const w = u.w - 6 * s;
    const h = u.h;
    const g = ctx.createLinearGradient(u.x, 0, u.x + w, 0);
    g.addColorStop(0, '#a9a7a1');
    g.addColorStop(0.45, '#e1e0da');
    g.addColorStop(1, '#9c9a94');
    poly(ctx, [[u.x + w * 0.04, u.y + h], [u.x + w * 0.96, u.y + h], [u.x + w * 0.74, u.y + h * 0.18], [u.x + w * 0.26, u.y + h * 0.18]], g);
    ctx.fillStyle = '#d9d8d2';
    ctx.beginPath();
    ctx.ellipse(u.x + w / 2, u.y + h * 0.18, w * 0.24, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4c4a46';
    ctx.beginPath();
    ctx.ellipse(u.x + w / 2, u.y + h * 0.18, w * 0.17, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  pipe(ctx, u, p) {
    const cx = u.x + u.w / 2;
    const cy = u.y + u.h / 2;
    const R = u.w / 2 - 1;
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R);
    g.addColorStop(0, '#ecebe6');
    g.addColorStop(1, p.color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const gi = ctx.createRadialGradient(cx + R * 0.15, cy + R * 0.15, R * 0.1, cx, cy, R * 0.8);
    gi.addColorStop(0, '#2c2b29');
    gi.addColorStop(1, '#5d5b56');
    ctx.fillStyle = gi;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.78, 0, Math.PI * 2);
    ctx.fill();
  },
};

function shadeFill(ctx, path, color, r) {
  const shade = (r() - 0.5) * 0.12;
  path();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = `rgba(${shade > 0 ? '255,255,255' : '0,0,0'},${Math.abs(shade)})`;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function poly(ctx, pts, fill) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, rad) {
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// ---------- "Modelo" de reconocimiento (simulado) ----------
function detail(p, count) {
  if (p.layout === 'pyramid') {
    let left = count;
    const rows = [];
    for (let n = p.base; n > 0 && left > 0; n--) { rows.push(Math.min(n, left)); left -= n; }
    return `pirámide ${rows.join('-')}`;
  }
  const layers = Math.ceil(count / p.perLayer);
  return `${layers} ${layers === 1 ? 'nivel' : 'niveles'}`;
}

function detectScene(scene) {
  const r = rng(scene.seed ^ 0x51ed27);
  return scene.pallets.map((pl, i) => {
    const p = P[pl.sku];
    let est = pl.count;
    let conf = 0.93 + r() * 0.06;
    let reason = null;
    if (pl.count < p.full) conf = 0.84 + r() * 0.08;
    if (pl.occluded) {
      conf = 0.58 + r() * 0.14;
      reason = scene.env === 'yard' ? 'La grúa pórtico tapa parte de la estiba' : 'Estiba parcialmente oculta por una columna';
      if (r() < 0.7) est = Math.max(1, pl.count - p.step);
    }
    const pad = 4;
    return {
      id: `E${i + 1}`, sku: pl.sku, count: est, conf, reason, review: conf < 0.8, detail: detail(p, pl.count),
      box: { x: pl.x - pad, y: pl.y - pad, w: pl.w + pad * 2, h: pl.h + pad * 2 },
    };
  });
}

function photoRect(img) {
  const k = Math.min(W / img.w, H / img.h);
  const w = img.w * k;
  const h = img.h * k;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h, k };
}

function detectPhoto() {
  const rect = photoRect(PHOTO);
  return PHOTO.dets.map((d, i) => ({
    id: `E${i + 1}`, sku: d.sku, count: d.count, conf: d.conf, reason: d.reason || null, review: d.conf < 0.8,
    detail: 'agrupación en patio',
    box: { x: rect.x + d.box[0] * rect.k, y: rect.y + d.box[1] * rect.k, w: d.box[2] * rect.k, h: d.box[3] * rect.k },
  }));
}

/** Detecciones sintéticas sobre una foto externa (no hay modelo real). */
function detectUpload(img, zoneId) {
  const skus = Object.keys(state.stock[zoneId]);
  const r = rng(img.hash);
  const n = 3 + Math.floor(r() * 4);
  const area = img.rect;
  const cols = Math.min(n, 4);
  const rows = Math.ceil(n / cols);
  const cw = area.w / cols;
  const ch = (area.h * 0.62) / rows;
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const rw = Math.floor(i / cols);
    const sku = skus[Math.floor(r() * skus.length)];
    const p = P[sku];
    const count = r() < 0.7 ? p.full : Math.max(1, p.full - p.step * (1 + Math.floor(r() * 3)));
    const conf = 0.62 + r() * 0.33;
    const w = cw * (0.62 + r() * 0.2);
    const h = ch * (0.7 + r() * 0.2);
    out.push({
      id: `E${i + 1}`, sku, count, conf, review: conf < 0.8, detail: detail(p, count),
      reason: conf < 0.8 ? 'Confianza baja en la clasificación del producto' : null,
      box: { x: area.x + c * cw + (cw - w) / 2, y: area.y + area.h * 0.33 + rw * ch + (ch - h) / 2, w, h },
    });
  }
  return out;
}

function drawDetections(ctx, dets, upTo = dets.length, highlight = null) {
  ctx.clearRect(0, 0, W, H);
  dets.slice(0, upTo).forEach((d) => {
    const color = d.review ? '#ffb020' : '#2fe07a';
    const b = d.box;
    ctx.lineWidth = highlight === d.id ? 5 : 3;
    ctx.strokeStyle = color;
    ctx.setLineDash(d.review ? [10, 6] : []);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    if (highlight === d.id) {
      ctx.fillStyle = 'rgba(47, 224, 122, .12)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    const label = `${d.id} · ${P[d.sku].short} · ${fmt(d.count)} · ${Math.round(d.conf * 100)}%`;
    ctx.font = 'bold 15px system-ui, sans-serif';
    const tw = ctx.measureText(label).width + 12;
    const ly = b.y - 22 < 0 ? b.y + 2 : b.y - 22;
    const lx = Math.max(0, Math.min(b.x, W - tw));
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly, tw, 22);
    ctx.fillStyle = '#0d1a10';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + 6, ly + 11);
  });
}

// ---------- Captura ----------
const cvBase = $('#cv-base');
const cvOver = $('#cv-overlay');
const ctxBase = cvBase.getContext('2d');
const ctxOver = cvOver.getContext('2d');
let current = null; // { source: scene|photo|upload, scene?, img?, dets?, zoneId, name }
let analyzing = false;

const STAGES = ['Preprocesado', 'Detección de estibas', 'Clasificación del producto', 'Conteo de unidades', 'Conciliación'];

function setPipeline(active) {
  $('#pipeline').innerHTML = active < 0 ? '' : STAGES.map((s, i) =>
    `<li class="${i < active ? 'done' : i === active ? 'active' : ''}">${i < active ? '✓ ' : ''}${s}</li>`).join('');
}

function loadExample() {
  const zoneId = $('#zone-select').value;
  ctxOver.clearRect(0, 0, W, H);
  if (Z[zoneId].env === 'photo') {
    const img = new Image();
    img.onload = () => {
      const rect = photoRect(PHOTO);
      ctxBase.fillStyle = '#1a1c1f';
      ctxBase.fillRect(0, 0, W, H);
      ctxBase.drawImage(img, rect.x, rect.y, rect.w, rect.h);
      current = { source: 'photo', zoneId, name: 'patio-titan.webp' };
      afterImageLoaded(`Foto aérea · ${Z[zoneId].short} · dron, 1672×941px`);
    };
    img.onerror = () => toast('No se pudo cargar la foto del patio.');
    img.src = PHOTO.src;
    return;
  }
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const scene = generateScene(zoneId, seed);
  ctxBase.clearRect(0, 0, W, H);
  drawScene(ctxBase, scene);
  current = { source: 'scene', scene, zoneId, name: `IMG_${String(seed).slice(-6)}.jpg` };
  afterImageLoaded(`Foto de ejemplo · ${Z[zoneId].short} · ${current.name}`);
}

function loadFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    ctxBase.fillStyle = '#1a1c1f';
    ctxBase.fillRect(0, 0, W, H);
    const rect = photoRect({ w: img.width, h: img.height });
    ctxBase.drawImage(img, rect.x, rect.y, rect.w, rect.h);
    URL.revokeObjectURL(url);
    // Huella simple de la imagen para que el resultado sea repetible.
    let hash = 2166136261;
    try {
      const data = ctxBase.getImageData(0, 0, W, H).data;
      for (let i = 0; i < data.length; i += 4099) hash = Math.imul(hash ^ data[i], 16777619);
    } catch (e) {
      for (const ch of file.name + file.size) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    }
    ctxOver.clearRect(0, 0, W, H);
    current = { source: 'upload', img: { rect, hash: hash >>> 0 }, zoneId: $('#zone-select').value, name: file.name };
    afterImageLoaded(`Foto propia · ${file.name} · ${img.width}×${img.height}px`);
  };
  img.onerror = () => toast('No se pudo leer la imagen.');
  img.src = url;
}

function afterImageLoaded(meta) {
  $('#viewer-empty').hidden = true;
  $('#img-meta').textContent = meta;
  $('#btn-analyze').disabled = false;
  setPipeline(-1);
  $('#results-empty').hidden = false;
  $('#results-body').hidden = true;
}

async function analyze() {
  if (!current || analyzing) return;
  const zoneId = $('#zone-select').value;
  if (current.source !== 'upload' && current.zoneId !== zoneId) {
    toast('La foto cargada es de otra zona; cargue la foto de esta zona.');
    return;
  }
  current.zoneId = zoneId;
  analyzing = true;
  $('#btn-analyze').disabled = true;
  $('#scan').hidden = false;
  const fast = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (let i = 0; i < STAGES.length - 1; i++) {
    setPipeline(i);
    await sleep(fast ? 120 : 420 + Math.random() * 250);
  }
  const dets = current.source === 'scene' ? detectScene(current.scene)
    : current.source === 'photo' ? detectPhoto()
      : detectUpload(current.img, current.zoneId);
  current.dets = dets;
  $('#scan').hidden = true;
  for (let i = 1; i <= dets.length; i++) {
    drawDetections(ctxOver, dets, i);
    await sleep(fast ? 0 : 140);
  }
  setPipeline(STAGES.length - 1);
  await sleep(fast ? 50 : 300);
  setPipeline(STAGES.length);
  analyzing = false;
  $('#btn-analyze').disabled = false;
  renderResults();
}

function countedSkus() {
  // Una foto de ejemplo cubre la zona completa; con una foto propia solo se
  // registran los productos detectados.
  const zoneSkus = Object.keys(state.stock[current.zoneId]);
  if (current.source !== 'upload') return zoneSkus;
  return zoneSkus.filter((s) => current.dets.some((d) => d.sku === s));
}

function totalsBySku() {
  const t = {};
  for (const sku of countedSkus()) t[sku] = 0;
  for (const d of current.dets) if (d.sku in t) t[d.sku] += d.count;
  return t;
}

function renderResults() {
  const dets = current.dets;
  const zone = Z[current.zoneId];
  const reviewN = dets.filter((d) => d.review).length;
  const avg = dets.length ? dets.reduce((a, d) => a + d.conf, 0) / dets.length : 0;
  const body = $('#results-body');
  body.innerHTML = `
    <p class="muted" style="margin:0">${esc(zone.name)} · ${dets.length} estibas detectadas · confianza media ${Math.round(avg * 100)}%</p>
    ${reviewN ? `<p class="note">${reviewN} detección(es) con baja confianza. Verifique el conteo antes de confirmar.</p>` : ''}
    ${current.source === 'upload' ? '<p class="note">Imagen externa: las detecciones son sintéticas (modo simulación).</p>' : ''}
    ${current.scene && current.scene.truncated ? '<p class="note">Hay estibas fuera del encuadre; complete con otra captura.</p>' : ''}
    <h3>Detecciones</h3>
    <div class="det-list">
      ${dets.map((d) => `
        <div class="det ${d.review ? 'review' : ''}" data-id="${d.id}">
          <span class="id" style="background:${P[d.sku].band}">${d.id}</span>
          <span class="what">${esc(P[d.sku].name)} <small>${esc(P[d.sku].pres)} · ${esc(d.detail)} · ${Math.round(d.conf * 100)}%${d.reason ? ' · ' + esc(d.reason) : ''}</small></span>
          <input type="number" min="0" step="1" value="${d.count}" aria-label="Cantidad ${d.id}" data-det="${d.id}">
        </div>`).join('')}
    </div>
    <h3>Conciliación con sistema</h3>
    <div id="recon"></div>
    <div class="actions">
      <button class="btn primary" id="btn-confirm">Confirmar conteo</button>
      <button class="btn" id="btn-confirm-adjust">Confirmar y ajustar sistema</button>
      <button class="btn ghost" id="btn-discard">Descartar</button>
    </div>`;
  $('#results-empty').hidden = true;
  body.hidden = false;
  renderRecon();

  body.querySelectorAll('input[data-det]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const d = dets.find((x) => x.id === inp.dataset.det);
      d.count = Math.max(0, Math.round(Number(inp.value) || 0));
      d.edited = true;
      drawDetections(ctxOver, dets);
      renderRecon();
    });
  });
  body.querySelectorAll('.det').forEach((el) => {
    el.addEventListener('mouseenter', () => drawDetections(ctxOver, dets, dets.length, el.dataset.id));
    el.addEventListener('mouseleave', () => drawDetections(ctxOver, dets));
  });
  $('#btn-confirm').addEventListener('click', () => confirmCount(false));
  $('#btn-confirm-adjust').addEventListener('click', () => confirmCount(true));
  $('#btn-discard').addEventListener('click', () => {
    current.dets = null;
    ctxOver.clearRect(0, 0, W, H);
    body.hidden = true;
    $('#results-empty').hidden = false;
    setPipeline(-1);
  });
}

function renderRecon() {
  const t = totalsBySku();
  const rows = Object.entries(t).map(([sku, fis]) => {
    const sys = state.stock[current.zoneId][sku].system;
    const diff = fis - sys;
    return `<tr><td>${esc(P[sku].name)}<br><small class="muted">${esc(P[sku].pres)} · ${esc(P[sku].unit)}</small></td>
      <td class="num">${fmt(sys)}</td><td class="num">${fmt(fis)}</td>
      <td class="num ${diff > 0 ? 'pos' : diff < 0 ? 'neg' : ''}">${diff > 0 ? '+' : ''}${fmt(diff)}</td></tr>`;
  }).join('');
  $('#recon').innerHTML = `<table class="summary-table">
    <thead><tr><th>Producto</th><th class="num">Sistema</th><th class="num">Físico</th><th class="num">Dif.</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="muted">Sin productos de esta zona en la imagen.</td></tr>'}</tbody></table>`;
}

function snapshot() {
  try {
    const c = document.createElement('canvas');
    c.width = 480;
    c.height = 288;
    const x = c.getContext('2d');
    x.drawImage(cvBase, 0, 0, c.width, c.height);
    x.drawImage(cvOver, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
  } catch (e) {
    return null; // p. ej. al abrir el archivo localmente (file://)
  }
}

function confirmCount(adjust) {
  const t = totalsBySku();
  if (!Object.keys(t).length) { toast('No hay productos de esta zona para registrar.'); return; }
  const now = Date.now();
  const lines = [];
  for (const [sku, fis] of Object.entries(t)) {
    const row = state.stock[current.zoneId][sku];
    const before = row.system;
    row.physical = fis;
    row.countedAt = now;
    lines.push({ sku, system: before, physical: fis });
    if (adjust && fis !== before) {
      state.moves.unshift({ ts: now, zoneId: current.zoneId, sku, delta: fis - before, reason: 'Ajuste por conteo visual' });
      row.system = fis;
    }
  }
  state.history.unshift({
    id: `CAP-${String(now).slice(-6)}`, ts: now, zoneId: current.zoneId, source: current.source, name: current.name,
    pallets: current.dets.length, edited: current.dets.filter((d) => d.edited).length,
    review: current.dets.filter((d) => d.review).length, lines, adjusted: adjust, thumb: snapshot(),
  });
  state.history = state.history.slice(0, 30);
  saveState();
  toast(adjust ? 'Conteo registrado y stock del sistema ajustado.' : 'Conteo registrado. Revise las diferencias en Inventario.');
  current.dets = null;
  ctxOver.clearRect(0, 0, W, H);
  $('#results-body').hidden = true;
  $('#results-empty').hidden = false;
  setPipeline(-1);
  renderAll();
  showTab('inventario');
}

// ---------- Vistas ----------
function rowsAll() {
  const out = [];
  for (const z of ZONES) {
    for (const [sku, s] of Object.entries(state.stock[z.id])) out.push({ zone: z, sku, ...s });
  }
  return out;
}

function status(row) {
  if (row.physical === null) return { cls: 'neutral', text: 'Sin conteo' };
  const diff = row.physical - row.system;
  if (diff === 0) return { cls: 'ok', text: 'Conciliado' };
  const pct = row.system ? Math.abs(diff) / row.system : 1;
  return pct <= 0.05 ? { cls: 'warn', text: 'Diferencia menor' } : { cls: 'bad', text: 'Diferencia' };
}

function renderPanel() {
  const rows = rowsAll();
  const sysT = rows.reduce((a, r) => a + tons(r.sku, r.system), 0);
  const counted = rows.filter((r) => r.physical !== null);
  const exact = counted.filter((r) => r.physical === r.system).length;
  const diffT = counted.reduce((a, r) => a + tons(r.sku, r.physical - r.system), 0);
  const zonesCounted = ZONES.filter((z) => Object.values(state.stock[z.id]).some((s) => s.physical !== null)).length;
  const today = new Date().toDateString();
  const capsToday = state.history.filter((h) => new Date(h.ts).toDateString() === today).length;
  $('#kpis').innerHTML = [
    ['Stock en sistema', `${fmt(sysT, 0)} t`, `${PRODUCTS.length} productos · ${rows.length} posiciones producto-zona`],
    ['Exactitud de inventario', counted.length ? `${Math.round((exact / counted.length) * 100)}%` : '—', `${exact} de ${counted.length} posiciones contadas coinciden`],
    ['Diferencia neta', counted.length ? `${diffT > 0 ? '+' : ''}${fmt(diffT, 1)} t` : '—', 'Físico menos sistema'],
    ['Cobertura de conteo', `${zonesCounted}/${ZONES.length} zonas`, `${capsToday} captura(s) hoy`],
  ].map(([l, v, s]) => `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join('');

  // Barras por familia de producto
  const agg = Object.entries(FAMILIES).map(([fam, name]) => {
    const rs = rows.filter((r) => P[r.sku].fam === fam);
    const sys = rs.reduce((a, r) => a + tons(r.sku, r.system), 0);
    const cnt = rs.filter((r) => r.physical !== null);
    const fis = cnt.length ? rs.reduce((a, r) => a + tons(r.sku, r.physical ?? r.system), 0) : null;
    const skus = new Set(rs.map((r) => r.sku)).size;
    return { name, skus, sys, fis, partial: cnt.length > 0 && cnt.length < rs.length };
  }).filter((a) => a.sys > 0);
  const max = Math.max(...agg.map((a) => Math.max(a.sys, a.fis ?? 0)), 1);
  $('#chart-products').innerHTML = agg.map((a) => `
    <div class="bar-row">
      <div class="bar-name">${esc(a.name)}<small>${a.skus} producto(s)</small></div>
      <div class="bars">
        <div class="bar sys"><i style="width:${(a.sys / max) * 82}%"></i>${fmt(a.sys, 1)}</div>
        <div class="bar fis"><i style="width:${((a.fis ?? 0) / max) * 82}%"></i>${a.fis === null ? 'sin conteo' : fmt(a.fis, 1) + (a.partial ? ' (parcial)' : '')}</div>
      </div>
    </div>`).join('');

  $('#zones-status').innerHTML = ZONES.map((z) => {
    const rs = rows.filter((r) => r.zone.id === z.id);
    const last = Math.max(0, ...rs.map((r) => r.countedAt || 0));
    const sts = rs.map(status);
    const worst = sts.find((s) => s.cls === 'bad') || sts.find((s) => s.cls === 'warn') || sts.find((s) => s.cls === 'neutral') || sts[0];
    return `<div class="zone-row">
      <div><div class="name">${esc(z.short)}</div><div class="meta">${rs.length} producto(s) · ${last ? 'último conteo ' + fmtDate(last) : 'sin conteo visual'}</div></div>
      <div class="btn-row"><span class="chip ${worst.cls}">${worst.text}</span>
      <button class="btn small" data-count-zone="${z.id}">Contar</button></div>
    </div>`;
  }).join('');
  document.querySelectorAll('[data-count-zone]').forEach((b) => b.addEventListener('click', () => {
    $('#zone-select').value = b.dataset.countZone;
    showTab('captura');
    loadExample();
  }));

  const alerts = [];
  for (const r of rows) {
    const qty = r.physical ?? r.system;
    if (qty < r.min) alerts.push(['bad', 'Bajo mínimo', `${r.zone.short}: ${P[r.sku].name} con ${fmt(qty)} ${P[r.sku].unit} (mínimo ${fmt(r.min)}).`]);
    const st = status(r);
    if (st.cls === 'bad' || st.cls === 'warn') {
      const d = r.physical - r.system;
      alerts.push([st.cls, 'Diferencia', `${r.zone.short}: ${P[r.sku].name} ${d > 0 ? '+' : ''}${fmt(d)} ${P[r.sku].unit} frente al sistema.`]);
    }
  }
  const stale = ZONES.filter((z) => Object.values(state.stock[z.id]).every((s) => s.physical === null));
  if (stale.length) alerts.push(['neutral', 'Pendiente', `Zonas sin conteo visual: ${stale.map((z) => z.short).join(', ')}.`]);
  $('#alerts').innerHTML = alerts.length
    ? alerts.map(([c, t, m]) => `<li><span class="chip ${c}">${t}</span><span>${esc(m)}</span></li>`).join('')
    : '<li class="muted">Sin alertas. Todo el inventario contado está conciliado.</li>';
}

function renderInventory() {
  const f = $('#inv-filter').value;
  const rows = rowsAll().filter((r) => !f || r.zone.id === f);
  $('#inv-body').innerHTML = rows.map((r) => {
    const st = status(r);
    const d = r.physical === null ? null : r.physical - r.system;
    return `<tr>
      <td>${esc(r.zone.short)}</td>
      <td>${esc(P[r.sku].name)}<br><small class="muted">${esc(r.sku)} · ${esc(P[r.sku].pres)}</small></td>
      <td class="num">${fmt(r.system)}</td>
      <td class="num">${r.physical === null ? '—' : fmt(r.physical)}</td>
      <td class="num ${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}">${d === null ? '—' : (d > 0 ? '+' : '') + fmt(d)}</td>
      <td>${esc(P[r.sku].unit)}</td>
      <td class="num">${fmt(tons(r.sku, r.physical ?? r.system), 1)}</td>
      <td>${r.countedAt ? fmtDate(r.countedAt) : '—'}</td>
      <td><span class="chip ${st.cls}">${st.text}</span></td>
      <td>${d ? `<button class="btn small" data-adjust="${r.zone.id}|${r.sku}">Ajustar</button>` : ''}</td>
    </tr>`;
  }).join('');
  document.querySelectorAll('[data-adjust]').forEach((b) => b.addEventListener('click', () => {
    const [zid, sku] = b.dataset.adjust.split('|');
    const row = state.stock[zid][sku];
    state.moves.unshift({ ts: Date.now(), zoneId: zid, sku, delta: row.physical - row.system, reason: 'Ajuste manual tras conteo visual' });
    row.system = row.physical;
    saveState();
    renderAll();
    toast('Stock del sistema ajustado.');
  }));
  $('#moves').innerHTML = state.moves.length
    ? state.moves.slice(0, 15).map((m) => `<li><span class="chip ${m.delta >= 0 ? 'ok' : 'bad'}">${m.delta > 0 ? '+' : ''}${fmt(m.delta)}</span>
        <span>${fmtDate(m.ts)} · ${esc(Z[m.zoneId].short)} · ${esc(P[m.sku].name)} — ${esc(m.reason)}</span></li>`).join('')
    : '<li class="muted">Aún no hay ajustes registrados.</li>';
}

function renderHistory() {
  const src = { scene: 'foto de ejemplo', photo: 'foto aérea', upload: 'foto propia' };
  $('#history').innerHTML = state.history.length
    ? state.history.map((h) => `
      <article class="card hist-card">
        ${h.thumb ? `<img src="${h.thumb}" alt="Captura ${esc(h.id)} con detecciones">` : '<div class="empty">Imagen no disponible</div>'}
        <div class="body">
          <p><b>${esc(h.id)}</b> · ${fmtDate(h.ts)}</p>
          <p class="muted">${esc(Z[h.zoneId].short)} · ${h.pallets} estibas · ${src[h.source] || ''}${h.edited ? ` · ${h.edited} corregida(s)` : ''}</p>
          <ul>${h.lines.map((l) => {
            const d = l.physical - l.system;
            return `<li>${esc(P[l.sku].name)}: ${fmt(l.physical)} ${esc(P[l.sku].unit)} (${d > 0 ? '+' : ''}${fmt(d)})</li>`;
          }).join('')}</ul>
          ${h.adjusted ? '<p><span class="chip ok">Sistema ajustado</span></p>' : ''}
        </div>
      </article>`).join('')
    : '<div class="card empty">No hay capturas registradas. Vaya a <b>Captura</b> para iniciar un conteo.</div>';
}

function renderAll() {
  renderPanel();
  renderInventory();
  renderHistory();
}

function exportCsv() {
  const head = ['zona', 'sku', 'familia', 'producto', 'presentacion', 'unidad', 'stock_sistema', 'conteo_fisico', 'diferencia', 'toneladas', 'ultimo_conteo', 'estado'];
  const lines = rowsAll().map((r) => [
    r.zone.name, r.sku, FAMILIES[P[r.sku].fam], P[r.sku].name, P[r.sku].pres, P[r.sku].unit, r.system, r.physical ?? '',
    r.physical === null ? '' : r.physical - r.system, tons(r.sku, r.physical ?? r.system).toFixed(3),
    r.countedAt ? new Date(r.countedAt).toISOString() : '', status(r).text,
  ]);
  const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `inventario-titan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Navegación y eventos ----------
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('.tab-view').forEach((s) => { s.hidden = s.id !== `tab-${name}`; });
  try { sessionStorage.setItem('titan-tab', name); } catch (e) { /* sin almacenamiento */ }
  window.scrollTo({ top: 0 });
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

function init() {
  const opts = ZONES.map((z) => `<option value="${z.id}">${esc(z.name)}</option>`).join('');
  $('#zone-select').innerHTML = opts;
  $('#inv-filter').innerHTML = `<option value="">Todas las zonas</option>${opts}`;

  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.goto)));
  $('#btn-scene').addEventListener('click', loadExample);
  $('#file-input').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
  $('#cam-input').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
  $('#btn-analyze').addEventListener('click', analyze);
  $('#zone-select').addEventListener('change', () => {
    if (current && current.source !== 'upload' && !analyzing) loadExample();
  });
  $('#inv-filter').addEventListener('change', renderInventory);
  $('#btn-csv').addEventListener('click', exportCsv);
  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('¿Restablecer el stock, el historial y los ajustes de la demo?')) return;
    state = initialState();
    saveState();
    renderAll();
    toast('Demo restablecida.');
  });

  renderAll();
  let tab = 'panel';
  try { tab = sessionStorage.getItem('titan-tab') || 'panel'; } catch (e) { /* sin almacenamiento */ }
  showTab(tab);
}

init();
