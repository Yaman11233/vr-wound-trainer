// Platshållarpatient, byggd av enkla former tills den riktiga modellen
// (MakeHuman/MPFB2, CC0) finns. Har samma gränssnitt som GLB-patienten:
// ankare för såret, andning, blinkning, blick och hudfärg.
//
// Patienten ligger på rygg med huvudet mot -X. Höger arm är abducerad ut på
// armbordet med handflatan uppåt (supinerad), så att volarsidan syns.
import * as THREE from 'three';
import * as L from '../env/layout.js';
import { skinDetail } from '../assets/proctex.js';
import { StaticBatcher } from '../core/batch.js';

const v3 = (a) => new THREE.Vector3(...a);

export function buildPlaceholderPatient() {
  const root = new THREE.Group();
  root.name = 'patient:placeholder';

  const skinBase = new THREE.Color(0xc8977c);
  const skin = new THREE.MeshStandardMaterial({
    name: 'skin', color: skinBase.clone(), roughness: 0.55,
    normalMap: skinDetail().normal, normalScale: new THREE.Vector2(0.25, 0.25),
  });
  const shirt = new THREE.MeshStandardMaterial({ name: 'tshirt', color: 0x8a9096, roughness: 0.95 });
  const jeans = new THREE.MeshStandardMaterial({ name: 'jeans', color: 0x2e3b52, roughness: 0.9 });
  const sock = new THREE.MeshStandardMaterial({ name: 'sock', color: 0x2a2a2a, roughness: 0.95 });
  const hair = new THREE.MeshStandardMaterial({ name: 'hair', color: 0x3a2a20, roughness: 0.8 });
  const eyeWhite = new THREE.MeshStandardMaterial({ name: 'eyeWhite', color: 0xf2efe8, roughness: 0.15 });
  const iris = new THREE.MeshStandardMaterial({ name: 'iris', color: 0x4a3828, roughness: 0.1 });

  const top = L.BED.topHeight + 0.002;
  const zc = L.BED.center[1];

  // --- Bål med andning ------------------------------------------------------
  const torso = new THREE.Group();
  root.add(torso);
  // Kapseln ligger längs X efter rotationen. Lokal x blir höjd (tjocklek),
  // lokal z blir bredd. Pivoten ligger på britsen, så andningen lyfter bröstet uppåt.
  const chest = mesh(new THREE.CapsuleGeometry(0.15, 0.08, 6, 16), shirt);
  chest.rotation.z = Math.PI / 2;
  const chestPivot = new THREE.Group();
  chestPivot.position.set(-0.02, top, zc);
  chest.position.set(0, 0.1, 0);
  chest.scale.set(0.72, 1.0, 1.35);
  chestPivot.add(chest);
  torso.add(chestPivot);

  const abdomen = mesh(new THREE.CapsuleGeometry(0.14, 0.14, 6, 16), shirt);
  abdomen.rotation.z = Math.PI / 2;
  abdomen.scale.set(0.62, 1.0, 1.3);
  const abdPivot = new THREE.Group();
  abdPivot.position.set(0.26, top, zc);
  abdomen.position.set(0, 0.085, 0);
  abdPivot.add(abdomen);
  torso.add(abdPivot);

  const pelvis = mesh(new THREE.CapsuleGeometry(0.15, 0.08, 6, 16), jeans);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.scale.set(0.6, 1, 1.25);
  pelvis.position.set(0.44, top + 0.09, zc);
  torso.add(pelvis);

  // Ben (jeans) och fötter (strumpor).
  for (const side of [-1, 1]) {
    const z = zc + side * 0.1;
    root.add(limb(v3([0.5, top + 0.08, z]), v3([0.92, top + 0.075, z]), 0.075, 0.055, jeans));
    root.add(limb(v3([0.92, top + 0.075, z]), v3([1.3, top + 0.05, z + side * 0.02]), 0.055, 0.04, jeans));
    const foot = mesh(new THREE.CapsuleGeometry(0.035, 0.12, 4, 10), sock);
    foot.position.set(1.33, top + 0.1, z + side * 0.03);
    foot.rotation.x = 0; // fot pekar uppåt
    root.add(foot);
  }

  // --- Vänster arm längs sidan ---------------------------------------------
  const lz = zc - 0.23;
  root.add(limb(v3([-0.12, top + 0.09, lz + 0.03]), v3([0.16, top + 0.06, lz - 0.01]), 0.048, 0.04, skin));
  root.add(limb(v3([-0.12, top + 0.09, lz + 0.03]), v3([-0.02, top + 0.085, lz + 0.02]), 0.055, 0.05, shirt)); // ärm
  root.add(limb(v3([0.16, top + 0.06, lz - 0.01]), v3([0.42, top + 0.04, lz - 0.02]), 0.04, 0.03, skin));
  const lhand = mesh(new THREE.BoxGeometry(0.17, 0.03, 0.08), skin);
  lhand.position.set(0.52, top + 0.03, lz - 0.02);
  root.add(lhand);

  // --- Höger arm på armbordet ----------------------------------------------
  const A = L.RIGHT_ARM;
  root.add(limb(v3(A.shoulder), v3(A.elbow), 0.05, 0.042, skin));
  root.add(limb(v3(A.shoulder), lerpV(A.shoulder, A.elbow, 0.35), 0.058, 0.054, shirt)); // ärm
  // Underarm: bredare än tjock (volar yta uppåt).
  const forearm = limb(v3(A.elbow), v3(A.wrist), 0.04, 0.03, skin, 0.72);
  root.add(forearm);
  const hand = buildHand(skin, A.wrist, A.fingertips);
  root.add(hand);

  // Sårets ankare: på volarsidan, där underarmen är. Såret byggs i etapp 3.
  const woundAnchor = new THREE.Object3D();
  woundAnchor.name = 'WoundAnchor';
  const wp = v3(L.WOUND.position);
  // underarmens ovansida vid sårets z: interpolera mellan armbåge och handled
  const f = (wp.z - A.elbow[2]) / (A.wrist[2] - A.elbow[2]);
  const centerY = A.elbow[1] + (A.wrist[1] - A.elbow[1]) * f;
  const radius = 0.04 + (0.03 - 0.04) * f;
  wp.y = centerY + radius * 0.72 + 0.0005;
  woundAnchor.position.copy(wp);
  root.add(woundAnchor);
  // Tillfällig markering av sårläget (ersätts av såret i etapp 3).
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.042, 0.004),
    new THREE.MeshStandardMaterial({ color: 0x5a0f12, roughness: 0.35, name: 'woundMark' }));
  mark.rotation.x = -Math.PI / 2;
  mark.rotation.z = 0.25; // lätt sned, tvärgående snittskada
  woundAnchor.add(mark);

  // --- Hals och huvud -------------------------------------------------------
  root.add(limb(v3([-0.2, top + 0.11, zc]), v3([-0.27, top + 0.13, zc]), 0.055, 0.05, skin));
  const headPivot = new THREE.Group();          // vrids för att titta på användaren
  headPivot.position.set(-0.28, top + 0.135, zc);
  root.add(headPivot);
  const head = new THREE.Group();
  head.position.set(-0.1, 0.0, 0);              // huvudets centrum ovanför kudden
  headPivot.add(head);
  const skull = mesh(new THREE.SphereGeometry(1, 28, 20), skin);
  skull.scale.set(0.105, 0.095, 0.078);
  head.add(skull);
  const hairCap = mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairCap.scale.set(0.108, 0.098, 0.082);
  hairCap.rotation.z = Math.PI / 2 + 0.35;      // täcker bakhuvud och hjässa (mot -X och ned)
  head.add(hairCap);
  const nose = mesh(new THREE.ConeGeometry(0.014, 0.035, 10), skin);
  nose.position.set(0.012, 0.095, 0);
  head.add(nose);
  for (const side of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(1, 10, 8), skin);
    ear.scale.set(0.022, 0.012, 0.03);
    ear.position.set(-0.01, 0.0, side * 0.08);
    head.add(ear);
  }
  // Ögon: tittar uppåt (+Y i huvudets system) när huvudet är rakt.
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(-0.018, 0.078, side * 0.032);
    const ball = mesh(new THREE.SphereGeometry(0.0125, 14, 10), eyeWhite);
    const ir = mesh(new THREE.CircleGeometry(0.0062, 16), iris);
    ir.position.y = 0.0124;
    ir.rotation.x = -Math.PI / 2;
    ball.add(ir);
    eye.add(ball);
    head.add(eye);
    eyes.push({ group: eye, ball });
  }
  // Ögonbryn
  for (const side of [-1, 1]) {
    const brow = mesh(new THREE.BoxGeometry(0.008, 0.004, 0.028), hair);
    brow.position.set(-0.04, 0.084, side * 0.034);
    head.add(brow);
  }

  // Slå ihop allt som inte rör sig till en mesh per material (draw calls).
  bakeStatic(root, new Set([chestPivot, abdPivot, headPivot, woundAnchor]));
  bakeStatic(head, new Set(eyes.map((e) => e.group)));

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  mark.castShadow = false;

  return {
    root,
    anchors: { wound: woundAnchor },
    parts: { chestPivot, abdPivot, headPivot, eyes },
    skin, skinBase,
  };
}

function mesh(g, m) { return new THREE.Mesh(g, m); }

/** Flytta alla meshar under `group` (utom de under `keep`) till batchade meshar. */
function bakeStatic(group, keep) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const batch = new StaticBatcher();
  const victims = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p && p !== group; p = p.parent) if (keep.has(p)) return;
    batch.add(o.geometry, o.material, { matrix: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld) });
    victims.push(o);
  });
  for (const o of victims) { o.removeFromParent(); o.geometry.dispose(); }
  // Ta bort tomma grupper som blev kvar.
  for (const c of [...group.children]) if (c.isGroup && !keep.has(c) && countMeshes(c) === 0) c.removeFromParent();
  batch.build(group, { castShadow: true, receiveShadow: true, name: 'patient' });
}
function countMeshes(o) { let n = 0; o.traverse((c) => { if (c.isMesh) n++; }); return n; }
function lerpV(a, b, t) { return new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), t); }

/** Avsmalnande lem mellan två punkter. flat < 1 plattar till höjdled. */
function limb(a, b, r0, r1, mat, flat = 0.85) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 16, 1, false);
  // runda ändar
  const capA = new THREE.SphereGeometry(r0, 16, 8); capA.translate(0, -len / 2, 0);
  const capB = new THREE.SphereGeometry(r1, 16, 8); capB.translate(0, len / 2, 0);
  const group = new THREE.Group();
  for (const geo of [g, capA, capB]) group.add(new THREE.Mesh(geo, mat));
  group.position.copy(a).add(b).multiplyScalar(0.5);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  // platta till vinkelrätt mot britsen
  const inner = new THREE.Group();
  inner.add(...group.children);
  group.add(inner);
  // lokala y = längs lemmen; skala den lokala axel som pekar uppåt i världen
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion.clone().invert());
  inner.scale.set(1 - (1 - flat) * Math.abs(up.x), 1, 1 - (1 - flat) * Math.abs(up.z));
  return group;
}

/** Supinerad hand: handflata uppåt, fingrar lätt böjda. */
function buildHand(skin, wrist, tips) {
  const g = new THREE.Group();
  const w = v3(wrist), t = v3(tips);
  const dir = new THREE.Vector3().subVectors(t, w).normalize();
  g.position.copy(w);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.026, 0.095), skin);
  palm.position.set(0, 0.0, 0.055);
  g.add(palm);
  const fingerLen = [0.075, 0.082, 0.078, 0.065];
  // Höger hand, handflata upp, användaren tittar från +Z: tummen pekar mot -X (radialt).
  const xs = [-0.03, -0.01, 0.01, 0.03];
  xs.forEach((x, i) => {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, fingerLen[i] - 0.017, 4, 8), skin);
    f.rotation.x = Math.PI / 2 - 0.25; // lätt flekterade (uppåt)
    f.position.set(x, 0.008, 0.1 + fingerLen[i] / 2 - 0.005);
    g.add(f);
  });
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.045, 4, 8), skin);
  thumb.position.set(-0.05, 0.008, 0.045);
  thumb.rotation.set(Math.PI / 2, 0.6, 0);
  g.add(thumb);
  return g;
}
