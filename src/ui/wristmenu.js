// Handledsmeny på vänster hand.
//  Handspårning: vänd vänster handflata mot ansiktet så visas menyn.
//                Tryck på knapparna med höger pekfinger.
//  Kontroller:   Y-knappen på vänster kontroll visar/döljer menyn.
//                Sikta med höger kontroll och tryck på avtryckaren.
import * as THREE from 'three';
import { Panel3D } from './panel3d.js';
import { t } from '../i18n/index.js';

const SHOW_DOT = 0.72, HIDE_DOT = 0.45; // hysteres för "handflatan mot ansiktet"
const BUTTON_Y = 5;                      // xr-standard: Y på vänster kontroll

export function createWristMenu({ scene, input, onRecenter, onToggleFps, onExit, fpsOn, onArmBoard, armBoardText }) {
  const all = [
    { id: 'recenter', label: () => t('menu.recenter'), onPress: onRecenter },
    { id: 'fps', instructorOnly: true, label: () => `${t('menu.fps')}: ${fpsOn() ? t('menu.on') : t('menu.off')}`, onPress: () => { onToggleFps(); panel.draw(); } },
    { id: 'board-up', instructorOnly: true, label: () => `${t('menu.boardUp')} (${armBoardText?.() ?? ''} m)`, onPress: () => { onArmBoard?.(+1); panel.draw(); } },
    { id: 'board-down', instructorOnly: true, label: () => t('menu.boardDown'), onPress: () => { onArmBoard?.(-1); panel.draw(); } },
    { id: 'exit', label: () => t('menu.exit'), onPress: onExit },
  ];
  const panel = new Panel3D({
    width: 0.16, height: 0.21,
    title: () => t('menu.title'),
    buttons: all.filter((b) => !b.instructorOnly),
  });
  panel.mesh.visible = false;
  scene.add(panel.mesh);

  let open = false;
  let controllerOpen = false;
  const target = new THREE.Vector3();
  const toHead = new THREE.Vector3();
  const palm = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  let lastSelect = false;

  return {
    panel,
    update(dt, headPos) {
      const w = input.wrist('left');
      if (!w) { panel.mesh.visible = open = false; return; }

      if (w.isHand) {
        controllerOpen = false;
        const n = input.palmNormal('left', palm);
        if (n) {
          toHead.subVectors(headPos, w.position).normalize();
          const d = n.dot(toHead);
          if (!open && d > SHOW_DOT) open = true;
          else if (open && d < HIDE_DOT && !panel.pressed) open = false;
        }
        if (open) target.copy(w.position).addScaledVector(palm, 0.07).addScaledVector(toHead, 0.03);
      } else {
        if (input.buttonPressed('left', BUTTON_Y)) controllerOpen = !controllerOpen;
        open = controllerOpen;
        if (open) {
          toHead.subVectors(headPos, w.position).normalize();
          target.copy(w.position).add(new THREE.Vector3(0, 0.12, 0)).addScaledVector(toHead, 0.05);
        }
      }

      panel.mesh.visible = open;
      if (!open) { panel.setState(null, null); return; }
      // Mjuk följning så att menyn inte darrar med handen.
      const k = 1 - Math.exp(-dt * 18);
      if (panel._placed) panel.mesh.position.lerp(target, k); else { panel.mesh.position.copy(target); panel._placed = true; }
      panel.mesh.lookAt(headPos);
      panel.mesh.updateMatrixWorld();

      // Tryck: höger pekfinger, annars höger kontrolls stråle.
      const tip = input.indexTip('right');
      if (tip) { panel.poke(tip); return; }
      const r = input.rayWorld('right');
      if (r) {
        raycaster.set(r.origin, r.dir);
        const b = panel.ray(raycaster);
        const sel = r.slot.select;
        if (sel && !lastSelect && b) { panel.setState(b, b); b.onPress(); }
        lastSelect = sel;
      }
    },
    hide() { open = controllerOpen = false; panel.mesh.visible = false; panel._placed = false; },
    /** Instruktörsläget visar fler knappar (FPS-mätare; senare paus, snabbspolning m.m.). */
    setInstructor(on) {
      panel.buttons = all.filter((b) => on || !b.instructorOnly);
      panel.layout();
      panel.draw();
    },
  };
}
