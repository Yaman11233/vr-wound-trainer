// Lugn 3D-panel med knappar, ritad på canvas. Används för menyn och senare
// för guidepanelen och genomgången. Knappar kan tryckas med pekfingertoppen
// (med hysteres: tryck vid 6 mm in i ytan, släpp vid 2 mm framför), med
// kontrollens stråle + avtryckare, eller med musen i datorläge.
import * as THREE from 'three';
import { isRTL } from '../i18n/index.js';

const PRESS_DEPTH = 0.006;    // m bakom ytan för att trycka
const RELEASE_DEPTH = -0.002; // m framför ytan för att släppa
const HOVER_DIST = 0.03;      // m framför ytan där knappen markeras

export class Panel3D {
  /**
   * @param {{width:number, height:number, px?:number, title?:()=>string,
   *          buttons:{id:string,label:()=>string,onPress:()=>void}[]}} opts
   */
  constructor({ width, height, px = 1024, title, buttons }) {
    this.w = width; this.h = height;
    this.title = title;
    this.buttons = buttons;
    this.canvas = document.createElement('canvas');
    this.canvas.width = px;
    this.canvas.height = Math.round(px * height / width);
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false, depthWrite: false }));
    this.mesh.renderOrder = 10;
    this.mesh.name = 'panel';
    this.hover = null;
    this.pressed = null;
    this.layout();
    this.draw();
  }

  layout() {
    const H = this.canvas.height, W = this.canvas.width;
    const top = this.title ? H * 0.22 : H * 0.06;
    const gap = H * 0.035;
    const bh = (H - top - H * 0.05 - gap * (this.buttons.length - 1)) / this.buttons.length;
    this.buttons.forEach((b, i) => { b.rect = { x: W * 0.06, y: top + i * (bh + gap), w: W * 0.88, h: bh }; });
  }

  draw() {
    const { ctx } = this;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    roundRect(ctx, 0, 0, W, H, 28); ctx.fillStyle = 'rgba(24,30,34,0.92)'; ctx.fill();
    ctx.direction = isRTL() ? 'rtl' : 'ltr';
    ctx.textBaseline = 'middle';
    if (this.title) {
      ctx.fillStyle = '#c9d3d8'; ctx.font = `600 ${Math.round(H * 0.085)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.fillText(this.title(), W / 2, H * 0.11);
    }
    for (const b of this.buttons) {
      const r = b.rect;
      roundRect(ctx, r.x, r.y, r.w, r.h, 18);
      ctx.fillStyle = this.pressed === b ? '#3f7f99' : this.hover === b ? '#34444d' : '#2a3439';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#eef3f5'; ctx.font = `${Math.round(r.h * 0.4)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(b.label(), r.x + r.w / 2, r.y + r.h / 2);
    }
    this.texture.needsUpdate = true;
  }

  /** Knapp under en punkt i panelens lokala koordinater (meter, origo i mitten). */
  buttonAt(lx, ly) {
    const cx = (lx / this.w + 0.5) * this.canvas.width;
    const cy = (0.5 - ly / this.h) * this.canvas.height;
    return this.buttons.find((b) => cx >= b.rect.x && cx <= b.rect.x + b.rect.w && cy >= b.rect.y && cy <= b.rect.y + b.rect.h) || null;
  }

  /** Fingertopp i världen. Returnerar true om något ändrats. */
  // Knappen aktiveras när fingret når PRESS_DEPTH och måste sedan släppas
  // (dras tillbaka framför ytan) innan nästa tryck. Det är hysteresen.
  poke(worldPoint) {
    if (!this.mesh.visible || !worldPoint) { this.latched = false; return this.setState(null, null); }
    const p = this.mesh.worldToLocal(worldPoint.clone());
    const depth = -p.z; // positiv = fingret är bakom ytan
    const inRange = depth > -HOVER_DIST && depth < 0.05;
    const b = inRange ? this.buttonAt(p.x, p.y) : null;
    if (this.latched) {
      if (depth < RELEASE_DEPTH || !inRange) { this.latched = false; return this.setState(b, null); }
      return false;
    }
    if (b && depth > PRESS_DEPTH) {
      this.latched = true;
      this.setState(b, b);
      b.onPress();
      return true;
    }
    return this.setState(b, null);
  }

  /** Stråle (kontroll eller mus). Returnerar knappen under strålen. */
  ray(raycaster) {
    if (!this.mesh.visible) return null;
    const hit = raycaster.intersectObject(this.mesh, false)[0];
    if (!hit) { this.setState(null, null); return null; }
    const p = this.mesh.worldToLocal(hit.point.clone());
    const b = this.buttonAt(p.x, p.y);
    this.setState(b, this.pressed);
    return b;
  }

  setState(hover, pressed) {
    if (hover === this.hover && pressed === this.pressed) return false;
    this.hover = hover; this.pressed = pressed;
    this.draw();
    return true;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
