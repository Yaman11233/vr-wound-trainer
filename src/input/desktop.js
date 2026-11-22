// Datorläge: titta med musen (dra), gå med W A S D, Q/E för att sänka/höja
// blicken (t.ex. för att titta ner i såret). Används för att testa utan headset.
import * as THREE from 'three';
import { ROOM } from '../env/layout.js';
import { XR_CONFIG } from '../core/xr.js';

const START = { pos: [0, XR_CONFIG.standingEyeHeight, 0], yaw: 0, pitch: -0.55 };

export function createDesktopControls({ camera, dom, onKey }) {
  let enabled = false;
  let yaw = START.yaw, pitch = START.pitch;
  let dragging = false, lx = 0, ly = 0;
  const keys = new Set();
  const tapped = new Set();   // korta tryck som släpps före nästa bildruta räknas ändå en gång
  const v = new THREE.Vector3();

  camera.rotation.order = 'YXZ';
  reset();

  dom.addEventListener('pointerdown', (e) => { if (!enabled) return; dragging = true; lx = e.clientX; ly = e.clientY; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener('pointerup', (e) => { dragging = false; try { dom.releasePointerCapture(e.pointerId); } catch { /* ok */ } });
  dom.addEventListener('pointermove', (e) => {
    if (!enabled || !dragging) return;
    yaw -= (e.clientX - lx) * 0.004;
    pitch = THREE.MathUtils.clamp(pitch - (e.clientY - ly) * 0.004, -1.45, 1.2);
    lx = e.clientX; ly = e.clientY;
  });
  // Piltangenterna fungerar som W A S D.
  const ALIAS = { arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd', pageup: 'e', pagedown: 'q' };
  // Ett formulärfält räknas bara om det syns (startkortets menyer är dolda i datorläget men
  // kan ha kvar fokus, och då gick tangenterna tidigare till menyn i stället för kameran).
  const typingIn = (t) => t?.closest?.('select,input,textarea') && t.offsetParent !== null;
  window.addEventListener('keydown', (e) => {
    if (!enabled || typingIn(e.target)) return;
    const k = ALIAS[e.key.toLowerCase()] || e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'shift'].includes(k)) e.preventDefault();
    keys.add(k); tapped.add(k);
    if (k === 'r') reset();
    onKey?.(k, e);
  });
  window.addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); keys.delete(ALIAS[k] || k); });
  window.addEventListener('blur', () => keys.clear());

  function reset() {
    camera.position.set(...START.pos);
    yaw = START.yaw; pitch = START.pitch;
    apply();
  }
  function apply() { camera.rotation.set(pitch, yaw, 0); }

  return {
    get enabled() { return enabled; },
    setEnabled(on) {
      enabled = on; keys.clear();
      if (on) {
        // ta fokus från startkortet så att tangenterna når kameran
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        dom.tabIndex = -1; dom.focus({ preventScroll: true });
        reset();
      }
    },
    reset,
    /** Ställ kameran på en punkt och rikta den mot ett mål (världskoordinater), t.ex. för skärmbilder. */
    setView(pos, target) {
      camera.position.set(...pos);
      const d = new THREE.Vector3(...target).sub(camera.position).normalize();
      yaw = Math.atan2(-d.x, -d.z);
      pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
      apply();
    },
    update(dt) {
      if (!enabled) return;
      const has = (k) => keys.has(k) || tapped.has(k);
      const speed = has('shift') ? 2.2 : 1.1;
      v.set((has('d') ? 1 : 0) - (has('a') ? 1 : 0), 0, (has('s') ? 1 : 0) - (has('w') ? 1 : 0));
      if (v.lengthSq() > 0) {
        v.normalize().multiplyScalar(speed * dt).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        camera.position.add(v);
      }
      if (has('q')) camera.position.y = Math.max(0.9, camera.position.y - dt * 0.6);
      if (has('e')) camera.position.y = Math.min(1.9, camera.position.y + dt * 0.6);
      tapped.clear();
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, ROOM.minX + 0.25, ROOM.maxX - 0.25);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, ROOM.minZ + 0.25, ROOM.maxZ - 0.25);
      apply();
    },
  };
}
