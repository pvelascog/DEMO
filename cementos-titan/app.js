'use strict';

/* =========================================================================
 * Demo: inventario visual de Cemento TITAN
 * Todo corre en el navegador. El "reconocimiento" es una simulación:
 *  - Las fotos de ejemplo se generan por código, así que se conoce qué hay
 *    en ellas y el detector devuelve resultados coherentes (con ruido,
 *    confianza y casos que requieren revisión humana).
 *  - Sobre fotos propias se generan detecciones sintéticas.
 * ========================================================================= */

// ---------- Catálogo ----------
const PRODUCTS = [
  { sku: 'TT-UG50', name: 'TITAN Uso General', pres: 'Saco 50 kg', kg: 50, unit: 'sacos',
    bag: '#d8d2c4', band: '#c0392b', perLayer: 5, cols: 3, layers: 8 },
  { sku: 'TT-ES425', name: 'TITAN Estructural', pres: 'Saco 42.5 kg', kg: 42.5, unit: 'sacos',
    bag: '#c7d1db', band: '#1f5fa8', perLayer: 5, cols: 3, layers: 8 },
  { sku: 'TT-AR50', name: 'TITAN Alta Resistencia', pres: 'Saco 50 kg', kg: 50, unit: 'sacos',
    bag: '#3b4046', band: '#e8a33d', perLayer: 5, cols: 3, layers: 8 },
  { sku: 'TT-MO25', name: 'TITAN Mortero', pres: 'Saco 25 kg', kg: 25, unit: 'sacos',
    bag: '#e6dbbd', band: '#2e8b57', perLayer: 8, cols: 4, layers: 7 },
  { sku: 'TT-BB15', name: 'TITAN Big Bag', pres: 'Big bag 1.5 t', kg: 1500, unit: 'big bags',
    bag: '#f1f0ea', band: '#c0392b', perLayer: 1, cols: 1, layers: 2, big: true },
];
const P = Object.fromEntries(PRODUCTS.map((p) => [p.sku, p]));

// Stock inicial en sistema (ERP) y mínimos por zona.
const ZONES = [
  { id: 'PLT-A', name: 'Planta · Bodega PT · Pasillo A', short: 'Planta – Pasillo A', sign: 'PASILLO A',
    stock: { 'TT-UG50': [160, 80], 'TT-ES425': [120, 80], 'TT-AR50': [60, 40] } },
  { id: 'PLT-B', name: 'Planta · Bodega PT · Pasillo B', short: 'Planta – Pasillo B', sign: 'PASILLO B',
    stock: { 'TT-UG50': [200, 80], 'TT-AR50': [100, 40] } },
  { id: 'CDN-M2', name: 'CD Norte · Muelle 2', short: 'CD Norte – Muelle 2', sign: 'MUELLE 2',
    stock: { 'TT-UG50': [120, 80], 'TT-ES425': [80, 40], 'TT-MO25': [96, 48] } },
  { id: 'CDS-Z1', name: 'CD Sur · Zona 1', short: 'CD Sur – Zona 1', sign: 'ZONA 1',
    stock: { 'TT-UG50': [80, 120], 'TT-MO25': [144, 48] } },
  { id: 'PAT-BB', name: 'Patio de despacho · Big bags', short: 'Patio – Big bags', sign: 'PATIO BB',
    stock: { 'TT-BB15': [16, 6] } },
];
const Z = Object.fromEntries(ZONES.map((z) => [z.id, z]));

const STORE_KEY = 'titan-inventario-visual-v1';
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
/**
 * Genera la "foto" de una zona a partir del stock en sistema, con variación:
 * a veces coincide, a veces faltan o sobran sacos (merma, despacho no
 * registrado, etc.). Devuelve la verdad de terreno de cada pallet.
 */
function generateScene(zoneId, seed) {
  const zone = Z[zoneId];
  const r = rng(seed);
  const units = [];
  for (const [sku, s] of Object.entries(state.stock[zoneId])) {
    const p = P[sku];
    const full = p.perLayer * p.layers;
    let qty = s.system;
    const roll = r();
    if (roll < 0.35) qty -= p.perLayer * (1 + Math.floor(r() * 3));        // faltante
    else if (roll < 0.5) qty += p.perLayer * (1 + Math.floor(r() * 2));    // sobrante
    else if (roll < 0.6) qty -= Math.ceil(r() * (p.perLayer - 1));         // saco suelto faltante
    qty = Math.max(0, qty);
    while (qty > 0) {
      const n = Math.min(full, qty);
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
  const big = units.some((u) => P[u.sku].big);
  const back = { n: 6, s: 0.72, baseY: 452, x0: 40, step: 186 };
  const front = { n: 4, s: 1, baseY: 690, x0: 40, step: 290 };
  const slots = [];
  for (let i = 0; i < back.n; i++) slots.push({ row: 'back', s: back.s, baseY: back.baseY, x: back.x0 + i * back.step + (r() - 0.5) * 16 });
  for (let i = 0; i < front.n; i++) slots.push({ row: 'front', s: front.s, baseY: front.baseY, x: front.x0 + i * front.step + 20 + (r() - 0.5) * 20 });

  const pallets = units.slice(0, slots.length).map((u, i) => {
    const slot = slots[i];
    const p = P[u.sku];
    const bw = (p.big ? 150 : p.cols === 4 ? 48 : 64) * slot.s;
    const bh = (p.big ? 104 : p.cols === 4 ? 24 : 27) * slot.s;
    const layersDrawn = Math.ceil(u.count / p.perLayer);
    const w = p.cols * bw + 10 * slot.s;
    const h = layersDrawn * bh + 16 * slot.s;
    return { ...u, ...slot, bw, bh, w, h, y: slot.baseY - h, occluded: false };
  });

  // Una columna o montacargas tapa parcialmente un pallet (caso para revisión).
  let obstacle = null;
  if (pallets.length && r() < 0.75) {
    const candidates = pallets.filter((p) => p.row === 'back');
    const target = candidates.length ? candidates[Math.floor(r() * candidates.length)] : pallets[0];
    target.occluded = true;
    obstacle = { x: target.x + target.w * (0.45 + r() * 0.2), w: 26 * target.s + 10, y0: 120, y1: target.baseY + 6 };
  }
  return { kind: 'scene', zoneId, seed, sign: zone.sign, big, pallets, obstacle, truncated: units.length > slots.length };
}

function drawScene(ctx, scene) {
  const r = rng(scene.seed ^ 0x9e3779b9);
  // Muro
  const wall = ctx.createLinearGradient(0, 0, 0, 300);
  wall.addColorStop(0, '#6f747a');
  wall.addColorStop(1, '#9a9d9f');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, 300);
  // Paneles del muro
  ctx.strokeStyle = 'rgba(0,0,0,.12)';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 150) { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, 300); ctx.stroke(); }
  // Viga y luminarias
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
  // Letrero de zona
  ctx.fillStyle = '#f2c230';
  ctx.fillRect(W - 300, 70, 240, 58);
  ctx.fillStyle = '#1b1b1b';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(scene.sign, W - 180, 100);
  // Piso
  const floor = ctx.createLinearGradient(0, 300, 0, H);
  floor.addColorStop(0, '#8d8b85');
  floor.addColorStop(1, '#b7b4ac');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 300, W, H - 300);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * W, 300 + r() * (H - 300), 2 + r() * 10, 1 + r() * 3);
  }
  // Líneas de seguridad
  ctx.strokeStyle = '#e3b72a';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 470); ctx.lineTo(W, 470); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 312); ctx.lineTo(W, 312); ctx.stroke();

  const order = [...scene.pallets].sort((a, b) => a.baseY - b.baseY);
  for (const pl of order) drawPallet(ctx, pl, r);

  if (scene.obstacle) {
    const o = scene.obstacle;
    ctx.fillStyle = '#d8a51c';
    ctx.fillRect(o.x, o.y0, o.w, o.y1 - o.y0);
    ctx.fillStyle = '#1d1d1d';
    for (let y = o.y0; y < o.y1; y += 36) ctx.fillRect(o.x, y, o.w, 14);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(o.x + o.w, o.y0, 6, o.y1 - o.y0);
  }
  // Viñeta suave tipo cámara
  const v = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 780);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.35)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function drawPallet(ctx, pl, r) {
  const p = P[pl.sku];
  const s = pl.s;
  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(pl.x + pl.w / 2, pl.baseY + 2, pl.w * 0.58, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tarima de madera
  const ph = 16 * s;
  ctx.fillStyle = '#8a6237';
  ctx.fillRect(pl.x, pl.baseY - ph, pl.w, ph);
  ctx.fillStyle = '#5b3f22';
  for (let i = 0; i < 3; i++) ctx.fillRect(pl.x + 8 * s + i * (pl.w - 30 * s) / 2, pl.baseY - ph + 6 * s, 14 * s, ph - 6 * s);

  const full = Math.floor(pl.count / p.perLayer);
  const rest = pl.count % p.perLayer;
  const layers = full + (rest ? 1 : 0);
  for (let l = 0; l < layers; l++) {
    const y = pl.baseY - ph - (l + 1) * pl.bh;
    const isTop = l === layers - 1 && rest;
    const n = isTop ? Math.max(1, Math.round((rest / p.perLayer) * p.cols)) : p.cols;
    const offset = l % 2 ? 4 * s : 0;
    for (let c = 0; c < n; c++) {
      const x = pl.x + 5 * s + c * pl.bw + offset;
      if (p.big) drawBigBag(ctx, x, y, pl.bw - 6 * s, pl.bh - 3 * s, p, s);
      else drawBag(ctx, x, y, pl.bw - 3 * s, pl.bh - 2 * s, p, s, r);
    }
  }
}

function drawBag(ctx, x, y, w, h, p, s, r) {
  const shade = (r() - 0.5) * 0.12;
  ctx.fillStyle = p.bag;
  roundRect(ctx, x, y, w, h, 6 * s);
  ctx.fill();
  ctx.fillStyle = `rgba(${shade > 0 ? '255,255,255' : '0,0,0'},${Math.abs(shade)})`;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Franja del empaque (identifica el producto)
  ctx.fillStyle = p.band;
  ctx.fillRect(x + w * 0.12, y + h * 0.34, w * 0.76, h * 0.32);
  if (w > 40) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(8 * s + 1)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TITAN', x + w / 2, y + h / 2 + 0.5);
  }
}

function drawBigBag(ctx, x, y, w, h, p, s) {
  ctx.fillStyle = p.bag;
  roundRect(ctx, x, y + 10 * s, w, h - 10 * s, 10 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Asas
  ctx.strokeStyle = '#c9c4b5';
  ctx.lineWidth = 5 * s;
  for (const ax of [x + w * 0.18, x + w * 0.82]) {
    ctx.beginPath();
    ctx.arc(ax, y + 12 * s, 9 * s, Math.PI, 0);
    ctx.stroke();
  }
  ctx.fillStyle = p.band;
  ctx.fillRect(x + w * 0.2, y + h * 0.42, w * 0.6, h * 0.26);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(13 * s)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TITAN 1.5 t', x + w / 2, y + h * 0.55);
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
function detectScene(scene) {
  const r = rng(scene.seed ^ 0x51ed27);
  return scene.pallets.map((pl, i) => {
    const p = P[pl.sku];
    const partial = pl.count % p.perLayer !== 0 || pl.count < p.perLayer * p.layers;
    let est = pl.count;
    let conf = 0.93 + r() * 0.06;
    let reason = null;
    if (partial) { conf = 0.84 + r() * 0.08; }
    if (pl.occluded) {
      conf = 0.58 + r() * 0.14;
      reason = 'Pallet parcialmente oculto; estimación por capas visibles';
      if (!p.big) est = Math.max(p.perLayer, pl.count - p.perLayer * (r() < 0.7 ? 1 : 0));
    }
    const pad = 4;
    return {
      id: `P${i + 1}`, sku: pl.sku, count: est, conf, reason, review: conf < 0.8,
      box: { x: pl.x - pad, y: pl.y - pad, w: pl.w + pad * 2, h: pl.h + pad * 2 },
      layers: Math.ceil(pl.count / p.perLayer),
    };
  });
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
    const full = p.perLayer * p.layers;
    const count = r() < 0.7 ? full : p.perLayer * (2 + Math.floor(r() * (p.layers - 2)));
    const conf = 0.62 + r() * 0.33;
    const w = cw * (0.62 + r() * 0.2);
    const h = ch * (0.7 + r() * 0.2);
    out.push({
      id: `P${i + 1}`, sku, count, conf, review: conf < 0.8,
      reason: conf < 0.8 ? 'Confianza baja en la clasificación del empaque' : null,
      box: { x: area.x + c * cw + (cw - w) / 2, y: area.y + area.h * 0.33 + rw * ch + (ch - h) / 2, w, h },
      layers: Math.ceil(count / p.perLayer),
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
    const label = `${d.id} · ${P[d.sku].name.replace('TITAN ', '')} · ${d.count} · ${Math.round(d.conf * 100)}%`;
    ctx.font = 'bold 15px system-ui, sans-serif';
    const tw = ctx.measureText(label).width + 12;
    const ly = b.y - 22 < 0 ? b.y + 2 : b.y - 22;
    const lx = Math.min(b.x, W - tw);
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
let current = null; // { source: scene|upload, scene?, img?, dets?, zoneId, name }
let analyzing = false;

const STAGES = ['Preprocesado', 'Detección de pallets', 'Clasificación del empaque', 'Conteo de capas', 'Conciliación'];

function setPipeline(active) {
  $('#pipeline').innerHTML = active < 0 ? '' : STAGES.map((s, i) =>
    `<li class="${i < active ? 'done' : i === active ? 'active' : ''}">${i < active ? '✓ ' : ''}${s}</li>`).join('');
}

function loadScene() {
  const zoneId = $('#zone-select').value;
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const scene = generateScene(zoneId, seed);
  ctxBase.clearRect(0, 0, W, H);
  drawScene(ctxBase, scene);
  ctxOver.clearRect(0, 0, W, H);
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
    const k = Math.min(W / img.width, H / img.height);
    const rect = { w: img.width * k, h: img.height * k };
    rect.x = (W - rect.w) / 2;
    rect.y = (H - rect.h) / 2;
    ctxBase.drawImage(img, rect.x, rect.y, rect.w, rect.h);
    URL.revokeObjectURL(url);
    // Huella simple de la imagen para que el resultado sea repetible.
    const data = ctxBase.getImageData(0, 0, W, H).data;
    let hash = 2166136261;
    for (let i = 0; i < data.length; i += 4099) hash = Math.imul(hash ^ data[i], 16777619);
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
  analyzing = true;
  current.zoneId = $('#zone-select').value;
  if (current.source === 'scene' && current.scene.zoneId !== current.zoneId) {
    toast('La foto de ejemplo es de otra zona; se generó una nueva.');
    loadScene();
  }
  $('#btn-analyze').disabled = true;
  $('#scan').hidden = false;
  const fast = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (let i = 0; i < STAGES.length - 1; i++) {
    setPipeline(i);
    await sleep(fast ? 120 : 420 + Math.random() * 250);
  }
  const dets = current.source === 'scene' ? detectScene(current.scene) : detectUpload(current.img, current.zoneId);
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
  // Con una foto de ejemplo se cubre la zona completa; con una foto propia,
  // solo se registran los productos detectados.
  const zoneSkus = Object.keys(state.stock[current.zoneId]);
  if (current.source === 'scene') return zoneSkus;
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
    <p class="muted" style="margin:0">${esc(zone.name)} · ${dets.length} pallets detectados · confianza media ${Math.round(avg * 100)}%</p>
    ${reviewN ? `<p class="note">${reviewN} detección(es) con baja confianza. Verifique el conteo antes de confirmar.</p>` : ''}
    ${current.source === 'upload' ? '<p class="note">Imagen externa: las detecciones son sintéticas (modo simulación).</p>' : ''}
    ${current.scene && current.scene.truncated ? '<p class="note">Hay pallets fuera del encuadre; complete con otra captura.</p>' : ''}
    <h3>Detecciones</h3>
    <div class="det-list">
      ${dets.map((d) => `
        <div class="det ${d.review ? 'review' : ''}" data-id="${d.id}">
          <span class="id" style="background:${P[d.sku].band}">${d.id}</span>
          <span class="what">${esc(P[d.sku].name)} <small>${esc(P[d.sku].pres)} · ${d.layers} capas · ${Math.round(d.conf * 100)}%${d.reason ? ' · ' + esc(d.reason) : ''}</small></span>
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
    return `<tr><td>${esc(P[sku].name)}<br><small class="muted">${esc(P[sku].pres)}</small></td>
      <td class="num">${fmt(sys)}</td><td class="num">${fmt(fis)}</td>
      <td class="num ${diff > 0 ? 'pos' : diff < 0 ? 'neg' : ''}">${diff > 0 ? '+' : ''}${fmt(diff)}</td></tr>`;
  }).join('');
  $('#recon').innerHTML = `<table class="summary-table">
    <thead><tr><th>Producto</th><th class="num">Sistema</th><th class="num">Físico</th><th class="num">Dif.</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="muted">Sin productos de esta zona en la imagen.</td></tr>'}</tbody></table>`;
}

function snapshot() {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 288;
  const x = c.getContext('2d');
  x.drawImage(cvBase, 0, 0, c.width, c.height);
  x.drawImage(cvOver, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.7);
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
    ['Stock en sistema', `${fmt(sysT, 1)} t`, `${rows.length} posiciones producto-zona`],
    ['Exactitud de inventario', counted.length ? `${Math.round((exact / counted.length) * 100)}%` : '—', `${exact} de ${counted.length} posiciones contadas coinciden`],
    ['Diferencia neta', counted.length ? `${diffT > 0 ? '+' : ''}${fmt(diffT, 2)} t` : '—', 'Físico menos sistema'],
    ['Cobertura de conteo', `${zonesCounted}/${ZONES.length} zonas`, `${capsToday} captura(s) hoy`],
  ].map(([l, v, s]) => `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join('');

  // Barras por producto
  const agg = PRODUCTS.map((p) => {
    const rs = rows.filter((r) => r.sku === p.sku);
    const sys = rs.reduce((a, r) => a + tons(r.sku, r.system), 0);
    const cnt = rs.filter((r) => r.physical !== null);
    const fis = cnt.length ? rs.reduce((a, r) => a + tons(r.sku, r.physical ?? r.system), 0) : null;
    return { p, sys, fis };
  }).filter((a) => a.sys > 0);
  const max = Math.max(...agg.map((a) => Math.max(a.sys, a.fis ?? 0)), 1);
  $('#chart-products').innerHTML = agg.map((a) => `
    <div class="bar-row">
      <div class="bar-name">${esc(a.p.name.replace('TITAN ', ''))}<small>${esc(a.p.pres)}</small></div>
      <div class="bars">
        <div class="bar sys"><i style="width:${(a.sys / max) * 85}%"></i>${fmt(a.sys, 1)}</div>
        <div class="bar fis"><i style="width:${((a.fis ?? 0) / max) * 85}%"></i>${a.fis === null ? 'sin conteo' : fmt(a.fis, 1)}</div>
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
    loadScene();
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
      <td class="num">${fmt(tons(r.sku, r.physical ?? r.system), 2)}</td>
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
  $('#history').innerHTML = state.history.length
    ? state.history.map((h) => `
      <article class="card hist-card">
        ${h.thumb ? `<img src="${h.thumb}" alt="Captura ${esc(h.id)} con detecciones">` : '<div class="empty">Imagen no disponible</div>'}
        <div class="body">
          <p><b>${esc(h.id)}</b> · ${fmtDate(h.ts)}</p>
          <p class="muted">${esc(Z[h.zoneId].short)} · ${h.pallets} pallets · ${h.source === 'scene' ? 'foto de ejemplo' : 'foto propia'}${h.edited ? ` · ${h.edited} corregido(s)` : ''}</p>
          <ul>${h.lines.map((l) => {
            const d = l.physical - l.system;
            return `<li>${esc(P[l.sku].name)}: ${fmt(l.physical)} (${d > 0 ? '+' : ''}${fmt(d)})</li>`;
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
  const head = ['zona', 'sku', 'producto', 'presentacion', 'stock_sistema', 'conteo_fisico', 'diferencia', 'toneladas', 'ultimo_conteo', 'estado'];
  const lines = rowsAll().map((r) => [
    r.zone.name, r.sku, P[r.sku].name, P[r.sku].pres, r.system, r.physical ?? '', r.physical === null ? '' : r.physical - r.system,
    tons(r.sku, r.physical ?? r.system).toFixed(3), r.countedAt ? new Date(r.countedAt).toISOString() : '', status(r).text,
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
  $('#btn-scene').addEventListener('click', loadScene);
  $('#file-input').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
  $('#cam-input').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
  $('#btn-analyze').addEventListener('click', analyze);
  $('#zone-select').addEventListener('change', () => {
    if (current && current.source === 'scene' && !analyzing) loadScene();
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
