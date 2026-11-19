// Väggklocka med sekundvisare. Visar verklig tid; behövs senare för att
// notera tidpunkt när en tourniquet läggs (scenario 1B).
import * as THREE from 'three';
import * as L from './layout.js';

export function createClock(world) {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, name: 'clockFace' });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.15, 40), mat);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.008, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0x9aa0a4, metalness: 0.8, roughness: 0.35, name: 'clockRim' }));
  const [x, y, z] = L.CLOCK.position;
  face.position.set(x, y, z + 0.02);
  rim.position.set(x, y, z + 0.022);
  world.add(face, rim);

  let lastSec = -1;
  function draw(d) {
    ctx.fillStyle = '#fbfbf8'; ctx.fillRect(0, 0, S, S);
    ctx.translate(S / 2, S / 2);
    ctx.strokeStyle = '#222';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2;
      const r0 = i % 5 === 0 ? 100 : 110;
      ctx.lineWidth = i % 5 === 0 ? 5 : 2;
      ctx.beginPath(); ctx.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); ctx.lineTo(Math.sin(a) * 120, -Math.cos(a) * 120); ctx.stroke();
    }
    const h = d.getHours() % 12 + d.getMinutes() / 60, mi = d.getMinutes() + d.getSeconds() / 60, s = d.getSeconds();
    hand(h / 12, 62, 8, '#1a1a1a');
    hand(mi / 60, 95, 5, '#1a1a1a');
    hand(s / 60, 105, 2, '#c4161c');
    ctx.fillStyle = '#c4161c'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    tex.needsUpdate = true;
  }
  function hand(f, len, w, color) {
    const a = f * Math.PI * 2;
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-Math.sin(a) * 12, Math.cos(a) * 12); ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len); ctx.stroke();
  }
  return {
    update() {
      const d = new Date();
      if (d.getSeconds() !== lastSec) { lastSec = d.getSeconds(); draw(d); }
    },
  };
}
