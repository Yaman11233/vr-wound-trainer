// XR-indata: händer (huvudläge) och handkontroller (reserv).
//
// Etapp 1: händerna visas med W3C:s generiska handmodell (riktig handform,
// inte ett skelett) och används för att trycka på menyknappar med
// pekfingertoppen. Etapp 2 ersätter detta med egen handmodell, One Euro-
// filter, gester med hysteres, kolliderare och handskar.
import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { bus } from '../core/bus.js';

const HAND_PATH = 'assets/models/hands/generic-hand/';

export function createXRInput(renderer, rig) {
  const handFactory = new XRHandModelFactory();
  handFactory.setPath(HAND_PATH);
  const controllerFactory = new XRControllerModelFactory();

  const slots = [0, 1].map((i) => {
    const ray = renderer.xr.getController(i);
    const grip = renderer.xr.getControllerGrip(i);
    const hand = renderer.xr.getHand(i);
    const slot = { i, ray, grip, hand, handedness: null, isHand: false, connected: false, source: null, select: false };

    grip.add(controllerFactory.createControllerModel(grip));
    hand.add(handFactory.createHandModel(hand, 'mesh'));

    // Siktlinje för kontroller (visas bara när en kontroll är aktiv).
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }),
    );
    line.name = 'ray';
    line.scale.z = 1.5;
    line.visible = false;
    ray.add(line);
    slot.line = line;

    ray.addEventListener('connected', (e) => {
      slot.connected = true;
      slot.source = e.data;
      slot.handedness = e.data.handedness;
      slot.isHand = !!e.data.hand;
      line.visible = !slot.isHand;
      bus.emit('input.connected', { handedness: slot.handedness, kind: slot.isHand ? 'hand' : 'controller' });
    });
    ray.addEventListener('disconnected', () => {
      bus.emit('input.disconnected', { handedness: slot.handedness });
      slot.connected = false; slot.source = null; slot.isHand = false; line.visible = false;
    });
    ray.addEventListener('selectstart', () => { slot.select = true; bus.emit('input.selectstart', { handedness: slot.handedness, kind: slot.isHand ? 'hand' : 'controller' }); });
    ray.addEventListener('selectend', () => { slot.select = false; bus.emit('input.selectend', { handedness: slot.handedness }); });

    rig.add(ray, grip, hand);
    return slot;
  });

  const _v = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const prevButtons = new Map();

  return {
    slots,
    get(handedness) { return slots.find((s) => s.connected && s.handedness === handedness) || null; },

    /** Pekfingertoppens världsposition, eller null. */
    indexTip(handedness, out = new THREE.Vector3()) {
      const s = this.get(handedness);
      const j = s?.isHand ? s.hand.joints['index-finger-tip'] : null;
      if (!j || !j.visible) return null;
      return j.getWorldPosition(out);
    },

    /** Handledsled (för handledsmeny), med orientering. */
    wrist(handedness) {
      const s = this.get(handedness);
      if (!s) return null;
      if (s.isHand) {
        const j = s.hand.joints['wrist'];
        if (!j || !j.visible) return null;
        return { object: j, position: j.getWorldPosition(new THREE.Vector3()), quaternion: j.getWorldQuaternion(new THREE.Quaternion()), isHand: true };
      }
      return { object: s.grip, position: s.grip.getWorldPosition(new THREE.Vector3()), quaternion: s.grip.getWorldQuaternion(new THREE.Quaternion()), isHand: false };
    },

    /** Handflatans normal i världen (för att avgöra om handflatan är vänd mot ansiktet). */
    palmNormal(handedness, out = new THREE.Vector3()) {
      const s = this.get(handedness);
      const j = s?.isHand ? s.hand.joints['middle-finger-metacarpal'] : null;
      if (!j || !j.visible) return null;
      j.getWorldQuaternion(_q);
      // I WebXR:s ledsystem pekar -Y ut från handflatan.
      return out.set(0, -1, 0).applyQuaternion(_q);
    },

    /** Kontrollknappar som "nyss tryckta" (kant), för t.ex. menyknappen. */
    buttonPressed(handedness, index) {
      const s = this.get(handedness);
      const gp = s?.source?.gamepad;
      if (!gp || s.isHand) return false;
      const key = `${handedness}:${index}`;
      const now = !!gp.buttons[index]?.pressed;
      const was = prevButtons.get(key) || false;
      prevButtons.set(key, now);
      return now && !was;
    },

    rayWorld(handedness) {
      const s = this.get(handedness);
      if (!s || s.isHand) return null;
      const origin = s.ray.getWorldPosition(new THREE.Vector3());
      const dir = _v.set(0, 0, -1).applyQuaternion(s.ray.getWorldQuaternion(_q)).clone();
      return { origin, dir, slot: s };
    },
  };
}
