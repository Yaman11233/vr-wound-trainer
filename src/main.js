// Startpunkt. Kopplar ihop scen, rum, patient, indata och meny.
import * as THREE from 'three';
import { createStage, recenterRig } from './core/scene.js';
import { enterVR, exitVR, XR_CONFIG } from './core/xr.js';
import { bus } from './core/bus.js';
import { time } from './core/time.js';
import { buildRoom } from './env/room.js';
import { createPatient } from './patient/patient.js';
import { createXRInput } from './input/xrinput.js';
import { createDesktopControls } from './input/desktop.js';
import { createWristMenu } from './ui/wristmenu.js';
import { createFpsMeter } from './ui/fps.js';
import { createContactShadow } from './patient/contactShadow.js';
import { ARM_BOARD } from './env/layout.js';
import { setLanguage, savedLanguage, t, onLanguageChange } from './i18n/index.js';
import { SCENARIOS, getScenario } from '../scenarios/index.js';

export const APP_VERSION = 'etapp 1';

const params = new URLSearchParams(location.search);
if (params.has('iwer')) await installEmulator();

bus.setClock(time.now);

// --- Startsida ---------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const ui = {
  start: $('start'), enter: $('enter-vr'), desktop: $('enter-desktop'), status: $('xr-status'),
  scenario: $('scenario'), mode: $('mode'), lang: $('lang'), hud: $('hud'), back: $('hud-back'),
  fps: $('fps'), version: $('version'),
};
ui.lang.value = savedLanguage();
setLanguage(ui.lang.value);
fillScenarioSelect();
onLanguageChange(fillScenarioSelect);
ui.lang.addEventListener('change', () => setLanguage(ui.lang.value));
ui.mode.value = params.get('mode') || 'guided';
ui.version.textContent = `${APP_VERSION} · three r${THREE.REVISION}${params.has('iwer') ? ' · IWER' : ''}`;

function fillScenarioSelect() {
  const cur = ui.scenario.value;
  ui.scenario.innerHTML = '';
  for (const s of SCENARIOS) {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = t(s.titleKey); o.disabled = !s.available;
    ui.scenario.append(o);
  }
  if (cur) ui.scenario.value = cur;
}

function setStatus(msg, isError = false) {
  ui.status.textContent = msg || '';
  ui.status.classList.toggle('error', !!isError);
}

// --- Scen --------------------------------------------------------------------
const { renderer, scene, camera, rig, world } = createStage($('app'));
const room = buildRoom(world);
const scenario = getScenario(ui.scenario.value);
const patient = await createPatient(world, scenario.patient, { renderer });
if (patient.kind === 'glb') world.add(createContactShadow(patient.root, ARM_BOARD));
const input = createXRInput(renderer, rig);
const fps = createFpsMeter({ camera, domEl: ui.fps });
let baseHeight = 0;

const menu = createWristMenu({
  scene, input,
  onRecenter: () => recenter(),
  onToggleFps: () => fps.toggle(),
  onExit: () => exitVR(renderer),
  fpsOn: () => fps.on,
});

const desktop = createDesktopControls({
  camera, dom: renderer.domElement,
  onKey: (k) => {
    if (k === 'f') fps.toggle();
    if (k === 'escape') showStart();
  },
});

function recenter() {
  if (renderer.xr.isPresenting) recenterRig({ renderer, camera, rig, baseHeight });
  else desktop.reset();
  bus.emit('view.recentered', {});
}

function showStart() {
  desktop.setEnabled(false);
  ui.hud.hidden = true;
  ui.start.hidden = false;
  fps.setXR(false);
}

ui.enter.addEventListener('click', () => {
  ui.enter.disabled = true;
  enterVR({
    renderer,
    onStatus: setStatus,
    onStart: ({ space, hasFloor, session }) => {
      desktop.setEnabled(false);
      ui.start.hidden = true; ui.hud.hidden = true;
      camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0);
      baseHeight = hasFloor ? 0 : XR_CONFIG.standingEyeHeight;
      rig.position.set(0, baseHeight, 0); rig.rotation.set(0, 0, 0);
      menu.setInstructor(ui.mode.value === 'instructor');
      fps.setXR(true);
      // Meta-knappens omcentrering skickar 'reset' på referensrummet.
      renderer.xr.getReferenceSpace()?.addEventListener('reset', () => {
        rig.position.set(0, baseHeight, 0); rig.rotation.set(0, 0, 0);
        bus.emit('view.recentered', { source: 'system' });
      });
      bus.emit('session.started', { space, hasFloor, mode: ui.mode.value, scenario: scenario.id, blendMode: session.environmentBlendMode });
      ui.enter.disabled = false;
    },
    onEnd: () => {
      menu.hide();
      rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
      camera.position.set(0, XR_CONFIG.standingEyeHeight, 0);
      showStart();
      bus.emit('session.ended', {});
    },
  }).finally(() => { ui.enter.disabled = false; });
});

ui.desktop.addEventListener('click', () => {
  ui.start.hidden = true;
  ui.hud.hidden = false;
  desktop.setEnabled(true);
  fps.setXR(false);
  if (ui.mode.value !== 'instructor') fps.set(false);
});
ui.back.addEventListener('click', showStart);

// --- Huvudloop ---------------------------------------------------------------
const timer = new THREE.Timer();
timer.connect(document);
const headPos = new THREE.Vector3();

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const dt = timer.getDelta();
  const simDt = time.tick(dt);
  const xr = renderer.xr.isPresenting;
  const head = xr ? renderer.xr.getCamera() : camera;
  head.getWorldPosition(headPos);

  desktop.update(dt);
  if (xr) menu.update(dt, headPos);
  patient.update(simDt, headPos);
  room.update(dt);
  // I VR ritas varje öga för sig; visa draw calls per öga mot budgeten.
  const info = renderer.info;
  fps.frame(dt, { render: { calls: xr ? Math.ceil(info.render.calls / 2) : info.render.calls, triangles: xr ? Math.ceil(info.render.triangles / 2) : info.render.triangles } });

  renderer.render(scene, camera);
});

// Bakom startkortet: visa rummet från startplatsen.
desktop.setEnabled(false);
console.info('[app] klar', { staticMeshes: room.stats.staticMeshes, patient: patient.kind });

// För felsökning i konsolen.
Object.assign(window, { __app: { renderer, scene, camera, rig, world, patient, room, bus, time, desktop, fps, menu, input } });

async function installEmulator() {
  try {
    const { XRDevice, metaQuest3 } = await import('iwer');
    const { DevUI } = await import('@iwer/devui');
    const device = new XRDevice(metaQuest3);
    device.installRuntime({ forceInstall: true });
    new DevUI(device);
    window.__iwer = device;
    console.info('[iwer] Immersive Web Emulator installerad (Meta Quest 3)');
  } catch (err) {
    console.error('[iwer] kunde inte installera emulatorn', err);
  }
}
