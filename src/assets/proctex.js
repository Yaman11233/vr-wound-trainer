// Procedurella texturer (canvas) för etapp 1. De ersätts av riktiga CC0
// PBR-texturer i KTX2-format i en senare etapp (se DECISIONS.md), men är
// gjorda för att ge rätt intryck: matt vinylgolv med svetsfogar, borstat
// rostfritt, skrynkligt britspapper, målad vägg.
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

/** Värdebrus i flera oktaver, sömlöst. Returnerar Float32Array 0..1. */
function fbm(size, { octaves = 5, base = 4, seed = 1, gain = 0.5 } = {}) {
  const out = new Float32Array(size * size);
  const r = rng(seed);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = base << o;
    const grid = new Float32Array(cells * cells);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * cells, y0 = Math.floor(gy), fy = smooth(gy - y0);
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * cells, x0 = Math.floor(gx), fx = smooth(gx - x0);
        const a = grid[(y0 % cells) * cells + (x0 % cells)];
        const b = grid[(y0 % cells) * cells + ((x0 + 1) % cells)];
        const c = grid[((y0 + 1) % cells) * cells + (x0 % cells)];
        const d = grid[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
        out[y * size + x] += amp * lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
      }
    }
    total += amp; amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

function toTexture(c, { srgb = true, repeat = [1, 1] } = {}) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.anisotropy = 4;
  return tex;
}

function heightToNormal(h, size, strength = 2) {
  const [c, ctx] = canvas(size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)];
    const u = h[((y - 1 + size) % size) * size + x], d = h[((y + 1) % size) * size + x];
    let nx = (l - r) * strength, ny = (u - d) * strength, nz = 1;
    const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const i = (y * size + x) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
    img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const cache = new Map();
function cached(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

/** Homogent vinylgolv (grå-beige med små flingor) och svetsfogar var 2:e meter. */
export function vinylFloor() {
  return cached('vinyl', () => {
    const S = 1024;
    const n = fbm(S, { octaves: 6, base: 8, seed: 7 });
    const [c, ctx] = canvas(S);
    const img = ctx.createImageData(S, S);
    const r = rng(11);
    for (let i = 0; i < S * S; i++) {
      const v = 0.92 + (n[i] - 0.5) * 0.10;
      img.data[i * 4] = 168 * v; img.data[i * 4 + 1] = 168 * v; img.data[i * 4 + 2] = 160 * v; img.data[i * 4 + 3] = 255;
    }
    // flingor
    for (let k = 0; k < 9000; k++) {
      const x = Math.floor(r() * S), y = Math.floor(r() * S), i = (y * S + x) * 4;
      const tone = r() < 0.5 ? 0.78 : 1.12;
      for (let j = 0; j < 3; j++) img.data[i + j] = Math.min(255, img.data[i + j] * tone);
    }
    ctx.putImageData(img, 0, 0);
    // svetsfog längs ena kanten (tiling 2 m -> fog var 2:e meter)
    ctx.fillStyle = 'rgba(90,92,88,0.55)';
    ctx.fillRect(0, 0, S, 2);
    const map = toTexture(c, { repeat: [2, 2] });
    // grovhet: lite variation, sliten där man går
    const [rc, rctx] = canvas(256);
    const rn = fbm(256, { octaves: 4, base: 4, seed: 3 });
    const rimg = rctx.createImageData(256, 256);
    for (let i = 0; i < rn.length; i++) {
      const v = 120 + (rn[i] - 0.5) * 60;
      rimg.data[i * 4] = rimg.data[i * 4 + 1] = rimg.data[i * 4 + 2] = v; rimg.data[i * 4 + 3] = 255;
    }
    rctx.putImageData(rimg, 0, 0);
    const rough = toTexture(rc, { srgb: false, repeat: [1, 1] });
    return { map, rough };
  });
}

/** Målad vägg med svag rollerstruktur. */
export function wallPaint() {
  return cached('wall', () => {
    const S = 512;
    const n = fbm(S, { octaves: 6, base: 16, seed: 21, gain: 0.6 });
    const normal = toTexture(heightToNormal(n, S, 1.2), { srgb: false, repeat: [3, 3] });
    return { normal };
  });
}

/** Borstat rostfritt stål: grovhetskarta med streck i en riktning. */
export function brushedSteel() {
  return cached('steel', () => {
    const W = 512, H = 512;
    const [c, ctx] = canvas(W, H);
    const img = ctx.createImageData(W, H);
    const r = rng(5);
    // Borstat stål: mycket svaga, utjämnade streck. Starka rad-för-rad-skillnader i råheten gav
    // synliga vågräta ränder i metallreflexen (även med mipmaps). Värdet är råheten direkt (0,30–0,40).
    const raw = new Float32Array(H);
    for (let y = 0; y < H; y++) raw[y] = r();
    const rows = new Float32Array(H);
    for (let y = 0; y < H; y++) { let s = 0; for (let k = -4; k <= 4; k++) s += raw[(y + k + H) % H]; rows[y] = s / 9; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = 255 * (0.35 + (rows[y] - 0.5) * 0.08 + (r() - 0.5) * 0.02);
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return { rough: toTexture(c, { srgb: false, repeat: [2, 2] }) };
  });
}

/** Britspapper: vitt med skrynklor (normalkarta). */
export function crinkledPaper() {
  return cached('paper', () => {
    const S = 512;
    const n = fbm(S, { octaves: 6, base: 6, seed: 33, gain: 0.55 });
    // vassa veck: ta absolutvärdet runt mitten
    for (let i = 0; i < n.length; i++) n[i] = 1 - Math.abs(n[i] - 0.5) * 2;
    const normal = toTexture(heightToNormal(n, S, 3.5), { srgb: false, repeat: [2, 1] });
    return { normal };
  });
}

/** Konstläder/vinyl på britsen. */
export function vinylUpholstery() {
  return cached('upholstery', () => {
    const S = 256;
    const n = fbm(S, { octaves: 3, base: 32, seed: 44, gain: 0.7 });
    const normal = toTexture(heightToNormal(n, S, 0.8), { srgb: false, repeat: [8, 4] });
    return { normal };
  });
}

/** Hud: svag porstruktur och färgvariation för platshållarpatienten. */
export function skinDetail() {
  return cached('skin', () => {
    const S = 512;
    const n = fbm(S, { octaves: 6, base: 24, seed: 55, gain: 0.55 });
    const normal = toTexture(heightToNormal(n, S, 0.6), { srgb: false, repeat: [4, 4] });
    return { normal };
  });
}
