// Dold FPS-mätare (instruktörsverktyg). Visar bildfrekvens, ram-tid,
// draw calls och trianglar, så att prestandabudgeten kan kontrolleras i
// headsetet. I VR visas den som en liten skylt nere till vänster i synfältet.
import * as THREE from 'three';

export const BUDGET = { triangles: 300_000, drawCalls: 100 };

export function createFpsMeter({ camera, domEl }) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  mesh.position.set(-0.12, -0.13, -0.5);
  mesh.renderOrder = 999;
  mesh.visible = false;
  camera.add(mesh);

  let on = false, xr = false, frames = 0, acc = 0, worst = 0;
  let last = { fps: 0, ms: 0, worst: 0, calls: 0, tris: 0 };

  function draw() {
    const okCalls = last.calls <= BUDGET.drawCalls, okTris = last.tris <= BUDGET.triangles;
    const text = `${last.fps.toFixed(0)} fps   ${last.ms.toFixed(1)} ms (max ${last.worst.toFixed(1)})\n` +
      `draw calls ${last.calls}${okCalls ? '' : ' !'}   tri ${(last.tris / 1000).toFixed(0)}k${okTris ? '' : ' !'}`;
    if (domEl) domEl.textContent = text;
    ctx.clearRect(0, 0, 512, 160);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, 512, 160);
    ctx.font = '30px ui-monospace, Consolas, monospace';
    ctx.fillStyle = last.fps >= 70 ? '#9ef59a' : last.fps >= 60 ? '#f5d76e' : '#ff8a80';
    const [a, b] = text.split('\n');
    ctx.fillText(a, 16, 60);
    ctx.fillStyle = okCalls && okTris ? '#d6e2e8' : '#ff8a80';
    ctx.fillText(b, 16, 115);
    tex.needsUpdate = true;
  }

  return {
    get on() { return on; },
    set(v) {
      on = !!v;
      // I datorläget bara i hörnet (DOM), som skylt i synfältet bara i VR.
      if (domEl) domEl.hidden = !on || xr;
      mesh.visible = on && xr;
    },
    toggle() { this.set(!on); },
    /** Anropas varje bildruta, före render, med verklig dt och renderer.info. */
    frame(dt, info) {
      frames++; acc += dt; worst = Math.max(worst, dt);
      if (acc >= 0.5) {
        last = { fps: frames / acc, ms: (acc / frames) * 1000, worst: worst * 1000, calls: info.render.calls, tris: info.render.triangles };
        frames = 0; acc = 0; worst = 0;
        if (on) draw();
      }
    },
    setXR(isXR) { xr = !!isXR; this.set(on); },
  };
}
