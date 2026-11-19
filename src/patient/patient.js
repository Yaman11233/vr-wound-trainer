// Patienten: laddar riktig modell om den finns, annars platshållaren.
// Gemensamt gränssnitt för båda:
//   patient.anchors.wound      Object3D där såret sätts fast (etapp 3)
//   patient.setBreathRate(n)   andetag per minut (från fysiologin)
//   patient.setSkinState({ pallor, sweat })   0..1, blekhet och svettning
//   patient.update(dt, viewerWorldPos)        andning, blinkning, blick
//
// Byta modell: lägg en GLB i assets/models/patient/ och ange sökvägen i
// scenariofilens patient.model. Se README.md
// för vilka nodnamn och morph targets som används.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { buildPlaceholderPatient } from './placeholder.js';
import { bus } from '../core/bus.js';


export async function createPatient(world, scenarioPatient) {
  const url = scenarioPatient?.model;
  let impl = url ? await tryLoadGlb(url).catch((err) => { console.info('[patient] ingen GLB, använder platshållare', err?.message); return null; }) : null;
  if (!impl) impl = buildPlaceholderPatient(scenarioPatient);
  world.add(impl.root);

  let breathRate = scenarioPatient?.baseline?.rr ?? 16;
  let breathPhase = 0;
  let nextBlink = 2 + Math.random() * 3;
  let blinkT = -1;
  const skinPale = new THREE.Color(0xd8c6bd);
  const skinNow = new THREE.Color();
  const tmp = new THREE.Vector3();
  const headTarget = new THREE.Quaternion();
  const eyeTarget = new THREE.Quaternion();
  const BLINK_DUR = 0.15;

  const api = {
    root: impl.root,
    anchors: impl.anchors,
    kind: impl.kind || 'placeholder',
    setBreathRate(n) { breathRate = Math.max(0, Math.min(n, 60)); },
    setSkinState({ pallor = 0, sweat = 0 } = {}) {
      if (!impl.skin) return;
      skinNow.copy(impl.skinBase).lerp(skinPale, THREE.MathUtils.clamp(pallor, 0, 1));
      impl.skin.color.copy(skinNow);
      impl.skin.roughness = THREE.MathUtils.lerp(0.55, 0.28, THREE.MathUtils.clamp(sweat, 0, 1));
    },
    update(dt, viewerPos) {
      // Andning: bröst och buk höjs. Inandning ca 40 % av cykeln.
      breathPhase += dt * breathRate / 60;
      const c = breathPhase % 1;
      const s = c < 0.4 ? Math.sin(c / 0.4 * Math.PI / 2) : Math.cos((c - 0.4) / 0.6 * Math.PI / 2);
      const p = impl.parts;
      if (p?.chestPivot) p.chestPivot.scale.y = 1 + 0.045 * s;
      if (p?.abdPivot) p.abdPivot.scale.y = 1 + 0.03 * s;
      impl.morph?.('breath', s);

      // Blinkning var 2–6 s.
      nextBlink -= dt;
      if (nextBlink <= 0 && blinkT < 0) { blinkT = 0; nextBlink = 2 + Math.random() * 4; }
      let lid = 0;
      if (blinkT >= 0) {
        blinkT += dt;
        lid = Math.sin(Math.min(blinkT / BLINK_DUR, 1) * Math.PI);
        if (blinkT > BLINK_DUR) blinkT = -1;
      }
      if (p?.eyes) for (const e of p.eyes) e.ball.scale.y = 1 - 0.92 * lid;
      impl.morph?.('blink', lid);

      // Blick: huvudet vrids mot användaren (begränsat), ögonen följer resten.
      if (viewerPos && p?.headPivot) {
        const hp = p.headPivot;
        hp.parent.updateMatrixWorld();
        tmp.copy(viewerPos);
        hp.parent.worldToLocal(tmp);
        tmp.sub(hp.position);
        // huvudets "framåt" är +Y; vridning kring X (sidled) och Z (nick)
        const roll = THREE.MathUtils.clamp(Math.atan2(tmp.z, tmp.y), -0.75, 0.75);
        const nod = THREE.MathUtils.clamp(Math.atan2(-tmp.x, Math.hypot(tmp.y, tmp.z)) * 0.4, -0.25, 0.25);
        headTarget.setFromEuler(new THREE.Euler(roll, 0, nod, 'XZY'));
        hp.quaternion.slerp(headTarget, 1 - Math.exp(-dt * 2.5));
        for (const e of p.eyes) {
          tmp.copy(viewerPos);
          e.group.parent.worldToLocal(tmp);
          tmp.sub(e.group.position).normalize();
          eyeTarget.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp);
          // begränsa ögonrörelsen till ca 35°
          const ang = 2 * Math.acos(Math.min(1, Math.abs(eyeTarget.w)));
          if (ang > 0.6) eyeTarget.slerpQuaternions(new THREE.Quaternion(), eyeTarget, 0.6 / ang);
          e.group.quaternion.slerp(eyeTarget, 1 - Math.exp(-dt * 12));
        }
      }
    },
  };
  bus.emit('patient.ready', { kind: api.kind });
  return api;
}

async function tryLoadGlb(url) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;
  root.name = 'patient:glb';
  const find = (n) => root.getObjectByName(n);
  let skinMat = null;
  const morphMeshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    if (/skin|body/i.test(o.material?.name || '')) skinMat ||= o.material;
    if (o.morphTargetDictionary) morphMeshes.push(o);
  });
  const woundAnchor = find('WoundAnchor') || new THREE.Object3D();
  return {
    kind: 'glb',
    root,
    anchors: { wound: woundAnchor },
    parts: { headPivot: find('HeadPivot') || null, eyes: [] },
    skin: skinMat, skinBase: skinMat ? skinMat.color.clone() : null,
    morph(name, v) {
      for (const m of morphMeshes) {
        const i = m.morphTargetDictionary[name];
        if (i !== undefined) m.morphTargetInfluences[i] = v;
      }
    },
  };
}
