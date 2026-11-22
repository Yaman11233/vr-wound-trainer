// Patienten: laddar MPFB2-modellen (GLB) om scenariot anger en, annars platshållaren.
// Gemensamt gränssnitt:
//   patient.anchors.wound            Object3D där såret sätts fast (följer underarmen)
//   patient.setBreathRate(n)         andetag per minut (från fysiologin)
//   patient.setBreathDepth(x)        0..1.5, andetagets djup (1 = lugnt andetag)
//   patient.setSkinState({ pallor, sweat })   0..1, blekhet och svettning (shader-parametrar)
//   patient.setExpression({ worried, pain })  0..1, ansiktsuttryck som basnivå
//   patient.flinch(strength)         kort smärtgrimas, t.ex. vid tryck på såret eller stick
//   patient.setFinger(name, flex)    höger hand; name = thumb|index|middle|ring|pinky, flex -0.2..1
//   patient.update(dt, viewerWorldPos)        andning, blinkning, uttryck, huvud och blick
//
// Modellen byggs med skripten i tools/blender (se README.md). Den innehåller ett skelett
// (game_engine-riggen), morph targets blink_L, blink_R, worried, pain, breath_chest och
// breath_abd, noderna Eye_L/Eye_R (med blickriktning i vila som extras.fwd) och WoundAnchor.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { buildPlaceholderPatient } from './placeholder.js';
import { makeSkinMaterial } from './skinShader.js';
import { bus } from '../core/bus.js';

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
// Största böjning per led (grader): grundled, mellanled, ytterled. Tummen: CMC/MCP/IP förenklat.
const FLEX_MAX = { thumb: [45, 55, 70], index: [80, 100, 70], middle: [85, 100, 70], ring: [85, 100, 70], pinky: [85, 100, 70] };

let ktx2 = null;

export async function createPatient(world, scenarioPatient, { renderer } = {}) {
  const url = scenarioPatient?.model;
  let impl = null;
  if (url) {
    impl = await loadGlbPatient(url, renderer).catch((err) => {
      console.warn('[patient] kunde inte ladda modellen, använder platshållare', err);
      return null;
    });
  }
  if (!impl) impl = placeholderImpl(scenarioPatient);
  world.add(impl.root);

  let breathRate = scenarioPatient?.baseline?.rr ?? 16;
  let breathDepth = 1;
  let breathPhase = 0;
  let nextBlink = 1.5 + Math.random() * 3;
  let blinkT = -1, doubleBlink = false;
  const BLINK_DOWN = 0.07, BLINK_UP = 0.16;
  const base = { worried: scenarioPatient?.affect === 'anxious' ? 0.35 : 0, pain: 0 };
  const expr = { worried: base.worried, pain: 0 };
  let flinchT = 0, flinchAmp = 0;

  const api = {
    root: impl.root,
    anchors: impl.anchors,
    kind: impl.kind,
    setBreathRate(n) { breathRate = Math.max(0, Math.min(n, 60)); },
    setBreathDepth(x) { breathDepth = THREE.MathUtils.clamp(x, 0, 1.5); },
    setSkinState({ pallor = 0, sweat = 0 } = {}) { impl.setSkin?.(pallor, sweat); },
    setExpression({ worried, pain } = {}) {
      if (worried !== undefined) base.worried = THREE.MathUtils.clamp(worried, 0, 1);
      if (pain !== undefined) base.pain = THREE.MathUtils.clamp(pain, 0, 1);
    },
    flinch(strength = 1) { flinchAmp = Math.max(flinchAmp, THREE.MathUtils.clamp(strength, 0, 1)); flinchT = 0; },
    setFinger(name, flex) { impl.setFinger?.(name, flex); },
    /** Handbordet höjt/sänkt dh meter från standardläget: armen följer med och ligger kvar an. */
    setArmSupport(dh) { impl.setArmSupport?.(dh); },
    update(dt, viewerPos) {
      // Andning: inandning ca 40 % av cykeln, mjuk ut- och inandning.
      breathPhase += dt * breathRate / 60;
      const c = breathPhase % 1;
      const s = (c < 0.4 ? Math.sin(c / 0.4 * Math.PI / 2) : Math.cos((c - 0.4) / 0.6 * Math.PI / 2)) * breathDepth;
      impl.breath?.(s);

      // Blinkning: oregelbundet var 2–6 s, ibland dubbelblink.
      nextBlink -= dt;
      if (nextBlink <= 0 && blinkT < 0) {
        blinkT = 0; doubleBlink = Math.random() < 0.15;
        nextBlink = 1.8 + Math.random() * 4.5;
      }
      let lid = 0;
      if (blinkT >= 0) {
        blinkT += dt;
        lid = blinkT < BLINK_DOWN ? blinkT / BLINK_DOWN : Math.max(0, 1 - (blinkT - BLINK_DOWN) / BLINK_UP);
        if (blinkT > BLINK_DOWN + BLINK_UP) {
          if (doubleBlink) { blinkT = 0; doubleBlink = false; } else blinkT = -1;
        }
      }

      // Uttryck: basnivå + kort grimas som klingar av.
      if (flinchAmp > 0) { flinchT += dt; if (flinchT > 1.6) flinchAmp = 0; }
      const fl = flinchAmp * (flinchT < 0.12 ? flinchT / 0.12 : Math.exp(-(flinchT - 0.12) * 2.2));
      const k = 1 - Math.exp(-dt * 4);
      expr.worried += (Math.max(base.worried, fl * 0.3) - expr.worried) * k;
      expr.pain += (Math.max(base.pain, fl) - expr.pain) * (fl > expr.pain ? 1 - Math.exp(-dt * 25) : k);
      const squint = expr.pain * 0.25;
      impl.face?.({ blinkL: Math.min(1, lid + squint), blinkR: Math.min(1, lid + squint), worried: expr.worried * (1 - expr.pain * 0.6), pain: expr.pain });

      impl.look?.(dt, viewerPos);
    },
  };
  bus.emit('patient.ready', { kind: api.kind });
  return api;
}

// ------------------------------------------------------------------ GLB-patienten
async function loadGlbPatient(url, renderer) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  if (!ktx2) {
    ktx2 = new KTX2Loader().setTranscoderPath(new URL('../../vendor/three/addons/libs/basis/', import.meta.url).href);
    if (renderer) ktx2.detectSupport(renderer);
  }
  loader.setKTX2Loader(ktx2);
  const dir = url.replace(/[^/]+$/, '');
  const [gltf, info, bodyMasks, armMasks, detail] = await Promise.all([
    loader.loadAsync(url),
    fetch(dir + 'tex_info.json').then((r) => r.json()),
    ktx2.loadAsync(dir + 'body_masks.ktx2'),
    ktx2.loadAsync(dir + 'arm_masks.ktx2'),
    ktx2.loadAsync(dir + 'skin_detail_normal.ktx2'),
  ]);
  for (const t of [bodyMasks, armMasks, detail]) { t.colorSpace = THREE.NoColorSpace; t.flipY = false; }
  detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
  const TILE = 0.012; // porkaklets storlek i meter (samma som i Blender)

  const root = gltf.scene;
  root.name = 'patient:glb';
  const morphMeshes = [];
  const skinMats = [];
  const softPasses = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    o.castShadow = !/Lashes|Brows|Cornea|Pillow/.test(m.name);
    o.receiveShadow = true;
    if (m.name === 'Skin_Body' || m.name === 'Skin_Arm') {
      const arm = m.name === 'Skin_Arm';
      const sm = makeSkinMaterial(m, {
        masks: arm ? armMasks : bodyMasks, detail,
        detailRepeat: (arm ? info.arm_m_per_uv : info.body_m_per_uv) / TILE,
      });
      o.material = sm; skinMats.push(sm);
    } else if (m.name === 'Hair') {
      // Två pass: en tät kärna (alphaTest + alpha-to-coverage, skriver djup) och en mjuk kant
      // ovanpå (alfablandning utan djupskrivning). Ger mjukare hårkanter som inte flimrar.
      m.alphaTest = 0.55; m.alphaToCoverage = true; m.transparent = false; m.side = THREE.DoubleSide; m.depthWrite = true;
      softPasses.push(o);
    } else if (/Brows|Lashes/.test(m.name)) {
      m.alphaTest = 0.04; m.transparent = true; m.depthWrite = false; m.side = THREE.DoubleSide;
      o.renderOrder = 1;
    } else if (m.name === 'Cornea') {
      // Hornhinnan: bara speglande reflexer (additivt), ger det fuktiga ögat utan dyr transmission.
      o.material = new THREE.MeshStandardMaterial({
        name: 'Cornea', color: 0x000000, roughness: 0.04, metalness: 0,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, envMapIntensity: 1.4,
      });
      o.renderOrder = 2;
    } else if (m.name === 'Eye') {
      m.roughness = 0.35;
    }
    if (o.morphTargetDictionary) morphMeshes.push(o);
  });

  for (const o of softPasses) {
    const soft = o.clone();
    soft.material = o.material.clone();
    Object.assign(soft.material, { alphaTest: 0.03, alphaToCoverage: false, transparent: true, depthWrite: false });
    soft.castShadow = false; soft.renderOrder = 1; soft.name = o.name + ':soft';
    o.parent.add(soft);
    if (soft.morphTargetDictionary) morphMeshes.push(soft);
  }

  const morph = (name, v) => {
    for (const m of morphMeshes) {
      const i = m.morphTargetDictionary[name];
      if (i !== undefined) m.morphTargetInfluences[i] = v;
    }
  };

  // Skelettet
  let skeleton = null;
  root.traverse((o) => { if (o.isSkinnedMesh && !skeleton) skeleton = o.skeleton; });
  const bone = (n) => skeleton?.getBoneByName(n) || root.getObjectByName(n);
  root.updateMatrixWorld(true);

  // Blick: ögonnoder + huvud och nacke. Varje led har sin viloriktning framåt (F) och uppåt (U)
  // i förälderns rum; målet delas upp i vridning (kring U) och nick, som begränsas var för sig.
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion();
  const D2R = THREE.MathUtils.degToRad;
  const eye0 = root.getObjectByName('Eye_L');
  const fwdW = new THREE.Vector3().fromArray(eye0?.userData.fwd || [1, 0, 0]).normalize();
  const upW = new THREE.Vector3().fromArray(eye0?.userData.up || [0, 1, 0]);
  upW.sub(fwdW.clone().multiplyScalar(upW.dot(fwdW))).normalize();
  function restFrame(obj) {
    const pq = obj.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const F = fwdW.clone().applyQuaternion(pq), U = upW.clone().applyQuaternion(pq);
    return { F, U, R: new THREE.Vector3().crossVectors(F, U).normalize() };
  }
  const head = bone('head'), neck = bone('neck_01');
  // Nacken tar 40 % och huvudet resten; gränserna gäller hela rörelsen (ungefär som en vaken patient
  // som halvsitter: vrida huvudet ca 70° åt sidan, nicka ned 25° och upp 30°).
  // [ben, andel, vridning, nick ned, nick upp] i grader; nacken tar 40 % av sin gräns, huvudet resten.
  const lookRig = [[neck, 0.4, 70, 25, 30], [head, 1.0, 42, 15, 18]].filter(([b]) => b)
    .map(([b, share, yw, dn, upw]) => ({ obj: b, q0: b.quaternion.clone(), ...restFrame(b), share, yaw: D2R(yw), down: D2R(dn), up: D2R(upw) }));
  const eyes = ['Eye_L', 'Eye_R'].map((n) => root.getObjectByName(n)).filter(Boolean)
    .map((e) => ({ obj: e, q0: e.quaternion.clone(), ...restFrame(e), share: 1, yaw: D2R(35), down: D2R(25), up: D2R(22) }));
  const gaze = { target: new THREE.Vector3(), hold: 0, has: false };
  const _d = new THREE.Vector3(), _t = new THREE.Vector3();

  function aimNode(n, dirWorld, rate, dt) {
    // Riktningen i förälderns rum (föräldern kan själv ha vridits, t.ex. huvudet för ögonen).
    n.obj.parent.getWorldQuaternion(tmpQ2).invert();
    const d = _d.copy(dirWorld).applyQuaternion(tmpQ2).normalize();
    let yaw = Math.atan2(d.dot(n.R), d.dot(n.F));
    let pitch = Math.atan2(d.dot(n.U), Math.hypot(d.dot(n.F), d.dot(n.R)));
    yaw = THREE.MathUtils.clamp(yaw, -n.yaw, n.yaw) * n.share;
    pitch = THREE.MathUtils.clamp(pitch, -n.down, n.up) * n.share;
    _t.copy(n.F).multiplyScalar(Math.cos(yaw)).addScaledVector(n.R, Math.sin(yaw)).multiplyScalar(Math.cos(pitch)).addScaledVector(n.U, Math.sin(pitch));
    tmpQ.setFromUnitVectors(n.F, _t.normalize());
    const goal = tmpQ.multiply(n.q0);
    n.obj.quaternion.slerp(goal, 1 - Math.exp(-dt * rate));
  }

  // Fingrar (höger hand): böjningsaxel i varje bens lokala rum, räknad från handflatans normal.
  const fingerRig = {};
  const handR = bone('hand_r');
  if (handR) {
    const p = (n) => bone(n).getWorldPosition(new THREE.Vector3());
    const hDir = p('middle_01_r').sub(p('hand_r')).normalize();
    const across = p('index_01_r').sub(p('pinky_01_r')).normalize();
    let palmN = new THREE.Vector3().crossVectors(hDir, across).normalize();
    if (palmN.y < 0) palmN.negate();              // handflatan uppåt (supinerad)
    for (const f of FINGERS) {
      fingerRig[f] = ['01', '02', '03'].map((j, idx) => {
        const b = bone(`${f}_${j}_r`);
        const a = p(`${f}_${j}_r`);
        const tail = b.children[0] ? b.children[0].getWorldPosition(new THREE.Vector3()) : a.clone().add(hDir.clone().multiplyScalar(0.02));
        const dir = tail.sub(a).normalize();
        const axisW = new THREE.Vector3().crossVectors(dir, palmN).normalize();
        const bq = b.getWorldQuaternion(new THREE.Quaternion());
        return { b, q0: b.quaternion.clone(), axisL: axisW.applyQuaternion(bq.invert()), max: THREE.MathUtils.degToRad(FLEX_MAX[f][idx]) };
      });
    }
  }
  const fingerTarget = Object.fromEntries(FINGERS.map((f) => [f, 0]));
  const fingerNow = Object.fromEntries(FINGERS.map((f) => [f, 0]));

  // Handbordets höjd: överarmen roteras kring axelleden tills armbågen ändrat höjd lika mycket som
  // bordet; underarmen behåller sin riktning i världen och ligger därför kvar plant mot bordet.
  const upper = bone('upperarm_r'), lower = bone('lowerarm_r');
  const armRest = upper && lower ? { qu: upper.quaternion.clone(), ql: lower.quaternion.clone() } : null;
  function setArmSupport(dh) {
    if (!armRest) return;
    upper.quaternion.copy(armRest.qu); lower.quaternion.copy(armRest.ql);
    root.updateMatrixWorld(true);
    if (Math.abs(dh) < 1e-5) return;
    const S = upper.getWorldPosition(new THREE.Vector3()), E = lower.getWorldPosition(new THREE.Vector3());
    const v = E.clone().sub(S);
    const k = new THREE.Vector3().crossVectors(v, new THREE.Vector3(0, 1, 0)).normalize();   // +vinkel lyfter armbågen
    const elbowY = (phi) => S.y + v.clone().applyAxisAngle(k, phi).y;
    let lo = -1.3, hi = 1.0;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (elbowY(mid) < E.y + dh) lo = mid; else hi = mid; }
    const rot = new THREE.Quaternion().setFromAxisAngle(k, (lo + hi) / 2);
    const lowerWorld = lower.getWorldQuaternion(new THREE.Quaternion());
    const upperWorld = upper.getWorldQuaternion(new THREE.Quaternion());
    const parentInv = upper.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const upperNew = rot.multiply(upperWorld);
    upper.quaternion.copy(parentInv.multiply(upperNew));
    upper.updateMatrixWorld(true);
    lower.quaternion.copy(upperNew.clone().invert().multiply(lowerWorld));
    root.updateMatrixWorld(true);
  }

  const woundAnchor = root.getObjectByName('WoundAnchor') || new THREE.Object3D();
  return {
    kind: 'glb',
    root,
    anchors: { wound: woundAnchor },
    breath(s) { morph('breath_chest', s * 0.8); morph('breath_abd', s); },
    face({ blinkL, blinkR, worried, pain }) {
      morph('blink_L', blinkL); morph('blink_R', blinkR); morph('worried', worried); morph('pain', pain);
    },
    setSkin(pallor, sweat) {
      for (const m of skinMats) {
        m.userData.skinUniforms.uPallor.value = THREE.MathUtils.clamp(pallor, 0, 1);
        m.userData.skinUniforms.uSweat.value = THREE.MathUtils.clamp(sweat, 0, 1);
      }
    },
    setFinger(name, flex) { if (name in fingerTarget) fingerTarget[name] = THREE.MathUtils.clamp(flex, -0.2, 1); },
    setArmSupport,
    look(dt, viewerPos) {
      // Fingrar mot målvärdet
      for (const f of FINGERS) {
        const r = fingerRig[f]; if (!r) continue;
        fingerNow[f] += (fingerTarget[f] - fingerNow[f]) * (1 - Math.exp(-dt * 6));
        for (const j of r) j.b.quaternion.copy(j.q0).multiply(tmpQ.setFromAxisAngle(j.axisL, j.max * fingerNow[f]));
      }
      if (!viewerPos) return;
      // Uppmärksamhet: byt mål med små pauser (0,4–1,6 s), som en människa som tittar till.
      gaze.hold -= dt;
      if (!gaze.has || gaze.hold <= 0 || gaze.target.distanceTo(viewerPos) > 0.35) {
        gaze.target.copy(viewerPos); gaze.has = true; gaze.hold = 0.4 + Math.random() * 1.2;
      }
      const hp = head ? head.getWorldPosition(new THREE.Vector3()) : root.position;
      const dirH = new THREE.Vector3().subVectors(gaze.target, hp).normalize();
      for (const n of lookRig) { aimNode(n, dirH, 2.2, dt); n.obj.updateMatrixWorld(true); }
      for (const e of eyes) {
        const ep = e.obj.getWorldPosition(new THREE.Vector3());
        aimNode(e, new THREE.Vector3().subVectors(viewerPos, ep).normalize(), 18, dt);
      }
    },
  };
}

// ------------------------------------------------------------------ platshållaren (reserv)
function placeholderImpl(scenarioPatient) {
  const p = buildPlaceholderPatient(scenarioPatient);
  const skinPale = new THREE.Color(0xd8c6bd);
  const tmp = new THREE.Vector3();
  const headTarget = new THREE.Quaternion();
  const eyeTarget = new THREE.Quaternion();
  return {
    kind: 'placeholder',
    root: p.root,
    anchors: p.anchors,
    breath(s) {
      if (p.parts?.chestPivot) p.parts.chestPivot.scale.y = 1 + 0.045 * s;
      if (p.parts?.abdPivot) p.parts.abdPivot.scale.y = 1 + 0.03 * s;
    },
    face({ blinkL }) { if (p.parts?.eyes) for (const e of p.parts.eyes) e.ball.scale.y = 1 - 0.92 * blinkL; },
    setSkin(pallor, sweat) {
      if (!p.skin) return;
      p.skin.color.copy(p.skinBase).lerp(skinPale, THREE.MathUtils.clamp(pallor, 0, 1));
      p.skin.roughness = THREE.MathUtils.lerp(0.55, 0.28, THREE.MathUtils.clamp(sweat, 0, 1));
    },
    look(dt, viewerPos) {
      const hp = p.parts?.headPivot;
      if (!viewerPos || !hp) return;
      hp.parent.updateMatrixWorld();
      tmp.copy(viewerPos); hp.parent.worldToLocal(tmp); tmp.sub(hp.position);
      const roll = THREE.MathUtils.clamp(Math.atan2(tmp.z, tmp.y), -0.75, 0.75);
      const nod = THREE.MathUtils.clamp(Math.atan2(-tmp.x, Math.hypot(tmp.y, tmp.z)) * 0.4, -0.25, 0.25);
      headTarget.setFromEuler(new THREE.Euler(roll, 0, nod, 'XZY'));
      hp.quaternion.slerp(headTarget, 1 - Math.exp(-dt * 2.5));
      for (const e of p.parts.eyes) {
        tmp.copy(viewerPos); e.group.parent.worldToLocal(tmp); tmp.sub(e.group.position).normalize();
        eyeTarget.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp);
        const ang = 2 * Math.acos(Math.min(1, Math.abs(eyeTarget.w)));
        if (ang > 0.6) eyeTarget.slerpQuaternions(new THREE.Quaternion(), eyeTarget, 0.6 / ang);
        e.group.quaternion.slerp(eyeTarget, 1 - Math.exp(-dt * 12));
      }
    },
  };
}
