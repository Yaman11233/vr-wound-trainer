// Vitalparametermonitor på rullstativ. Skärmen ritas på en canvas.
// Etapp 1: inga givare anslutna, så monitorn visar streck, som en riktig
// monitor gör. I etapp 3 kopplas fysiologimodellen in via setVitals().
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as L from './layout.js';
import { t } from '../i18n/index.js';

const SW = 640, SH = 400;

export function createMonitor(world, m) {
  const [x, z] = L.MONITOR.position;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(-x, -z); // vänd mot användarens startplats
  world.add(g);

  // Stativ: fot med fem hjul, pelare, fäste.
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 5), m.plasticGrey);
  foot.position.y = 0.08;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, L.MONITOR.screenHeight - 0.15, 10), m.steel);
  pole.position.y = (L.MONITOR.screenHeight - 0.15) / 2 + 0.08;
  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.27, 0.08, 2, 0.015), m.plasticGrey);
  housing.position.set(0, L.MONITOR.screenHeight, 0);
  housing.rotation.x = -0.12;
  for (const o of [foot, pole, housing]) { o.castShadow = true; o.receiveShadow = true; }
  g.add(foot, pole, housing);

  const canvas = document.createElement('canvas');
  canvas.width = SW; canvas.height = SH;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.31 * SH / SW),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, name: 'monitorScreen' }));
  screen.position.set(0, 0.005, 0.041);
  housing.add(screen);

  const state = {
    connected: { ecg: false, spo2: false, nibp: false },
    hr: null, sys: null, dia: null, spo2: null, rr: null,
    alarm: null,
  };
  let acc = 0, sweep = 0;
  const trace = { ecg: new Float32Array(SW), pleth: new Float32Array(SW) };

  function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SW, SH);
    // kurvområden
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1;
    for (let y = 40; y < 280; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(430, y); ctx.stroke(); }
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#28d75a'; ctx.fillText('II', 8, 26);
    ctx.fillStyle = '#35c8f0'; ctx.fillText('Pleth', 8, 156);
    drawTrace(trace.ecg, state.connected.ecg, '#28d75a', 90, 40);
    drawTrace(trace.pleth, state.connected.spo2, '#35c8f0', 220, 30);

    // värdepaneler till höger
    numeric(440, 10, t('monitor.hr'), state.connected.ecg ? state.hr : null, '#28d75a', 'slag/min');
    numeric(440, 140, t('monitor.spo2'), state.connected.spo2 ? state.spo2 : null, '#35c8f0', '%');
    numeric(8, 290, t('monitor.bp'), state.connected.nibp && state.sys ? `${state.sys}/${state.dia}` : null, '#f2f2f2', 'mmHg', 300);
    numeric(440, 290, t('monitor.rr'), state.connected.ecg ? state.rr : null, '#f5d142', '/min');

    if (!state.connected.ecg && !state.connected.spo2 && !state.connected.nibp) {
      ctx.fillStyle = '#9a9a9a'; ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(t('monitor.noSignal'), 150, 160);
    }
    tex.needsUpdate = true;
  }

  function drawTrace(buf, on, color, mid, amp) {
    ctx.strokeStyle = on ? color : '#3a3a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < 430; x++) {
      const y = mid - (on ? buf[x] * amp : 0);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function numeric(x, y, label, value, color, unit, w = 190) {
    ctx.fillStyle = color; ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(label, x, y + 20);
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText(value == null ? '- - -' : String(value), x, y + 90);
    ctx.font = '16px system-ui, sans-serif'; ctx.globalAlpha = 0.8;
    ctx.fillText(unit, x + w - 70, y + 20); ctx.globalAlpha = 1;
  }

  draw();

  return {
    group: g,
    /** Anropas av fysiologin (etapp 3). Värden som är null visas som streck. */
    setVitals(v) { Object.assign(state, v); },
    setConnected(c) { Object.assign(state.connected, c); },
    update(dt) {
      acc += dt;
      const anyOn = state.connected.ecg || state.connected.spo2;
      const interval = anyOn ? 1 / 30 : 0.5;
      if (acc < interval) return;
      // svep: enkel EKG- och plethkurva efter aktuell puls
      if (anyOn && state.hr) {
        const beat = 60 / state.hr;
        const px = Math.round(acc * 120);
        for (let i = 0; i < px; i++) {
          sweep = (sweep + 1) % 430;
          const phase = ((performance.now() / 1000 + i / 120) % beat) / beat;
          trace.ecg[sweep] = ecgShape(phase);
          trace.pleth[sweep] = plethShape(phase);
        }
      }
      acc = 0;
      draw();
    },
    redraw: draw,
  };
}

// Schematiska kurvformer för visning, inte diagnostik.
function ecgShape(p) {
  if (p < 0.1) return Math.sin(p / 0.1 * Math.PI) * 0.12;         // P
  if (p < 0.16) return 0;
  if (p < 0.18) return -0.15;                                      // Q
  if (p < 0.21) return 1.0;                                        // R
  if (p < 0.24) return -0.25;                                      // S
  if (p < 0.4) return 0;
  if (p < 0.55) return Math.sin((p - 0.4) / 0.15 * Math.PI) * 0.25; // T
  return 0;
}
function plethShape(p) {
  const a = Math.max(0, Math.sin(Math.min(p / 0.35, 1) * Math.PI / 2));
  return p < 0.35 ? a : Math.exp(-(p - 0.35) * 4) * (1 + 0.15 * Math.sin((p - 0.35) * 18));
}
