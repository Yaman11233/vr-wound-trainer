// Etikettatlas: alla små texter i rummet (handskstorlekar, avfallsmärkning)
// ritas på en enda canvas, så att de kan batchas till en draw call.
import * as THREE from 'three';

export class LabelAtlas {
  constructor(width = 1024, height = 512) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width; this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);
    this.x = 0; this.y = 0; this.rowH = 0;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.material = new THREE.MeshStandardMaterial({ map: this.texture, roughness: 0.7, name: 'labels' });
  }

  /**
   * Rita en etikett och returnera en plan-geometri med rätt UV.
   * @param {(ctx:CanvasRenderingContext2D,w:number,h:number)=>void} draw
   * @param {number} pw pixelbredd, ph pixelhöjd, w/h i meter
   */
  add(pw, ph, w, h, draw) {
    if (this.x + pw > this.canvas.width) { this.x = 0; this.y += this.rowH + 2; this.rowH = 0; }
    const { ctx } = this;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.beginPath(); ctx.rect(0, 0, pw, ph); ctx.clip();
    draw(ctx, pw, ph);
    ctx.restore();
    const g = new THREE.PlaneGeometry(w, h);
    const W = this.canvas.width, H = this.canvas.height;
    const u0 = this.x / W, u1 = (this.x + pw) / W;
    const v1 = 1 - this.y / H, v0 = 1 - (this.y + ph) / H;
    const uv = g.attributes.uv;
    // PlaneGeometry: (0,1) (1,1) (0,0) (1,0)
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
    this.x += pw + 2;
    this.rowH = Math.max(this.rowH, ph);
    this.texture.needsUpdate = true;
    return g;
  }
}

/** Standardetikett: bakgrundsfärg, text centrerad. */
export function textLabel(text, { bg = '#ffffff', fg = '#1a1a1a', font = 'bold 40px system-ui, sans-serif', sub, subFont = '22px system-ui, sans-serif' } = {}) {
  return (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.fillText(text, w / 2, sub ? h * 0.4 : h / 2);
    if (sub) { ctx.font = subFont; ctx.fillText(sub, w / 2, h * 0.75); }
  };
}
