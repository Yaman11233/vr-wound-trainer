// Behandlingsrum på svensk akutmottagning. Allt fast batchas per material.
// Föremål som ska kunna greppas (handskar, kompresser, instrument) byggs i
// tools/ i senare etapper och läggs ovanpå.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { StaticBatcher } from '../core/batch.js';
import { materials } from './materials.js';
import { LabelAtlas, textLabel } from './labels.js';
import * as L from './layout.js';
import { createMonitor } from './monitor.js';
import { createClock } from './clock.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20);
const CYL8 = new THREE.CylinderGeometry(1, 1, 1, 10);
const SPH = new THREE.SphereGeometry(1, 16, 12);
const rbox = (w, h, d, r = 0.02, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, r);

export function buildRoom(world) {
  const m = materials();
  const b = new StaticBatcher();      // tar emot skuggor, kastar inte
  const bc = new StaticBatcher();     // möbler som kastar skugga
  const labels = new LabelAtlas();
  const R = L.ROOM;
  const W = R.maxX - R.minX, D = R.maxZ - R.minZ, H = R.height;
  const cx = (R.minX + R.maxX) / 2, cz = (R.minZ + R.maxZ) / 2;

  // --- Golv, tak, väggar ---------------------------------------------------
  const floorGeo = new THREE.PlaneGeometry(W, D);
  const floorMesh = new THREE.Mesh(floorGeo, m.floor);
  m.floor.map.repeat.set(W / 2, D / 2);
  m.floor.roughnessMap.repeat.set(W / 3, D / 3);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(cx, 0, cz);
  floorMesh.receiveShadow = true;
  floorMesh.name = 'floor';
  world.add(floorMesh);

  b.add(new THREE.PlaneGeometry(W, D), m.ceiling, { p: [cx, H, cz], r: [Math.PI / 2, 0, 0] });
  // takpaneler (600x1200) med raster
  for (const [x, z] of [[0.2, -1.2], [0.2, 0.4], [1.6, -1.2]]) {
    b.add(BOX, m.lightPanel, { p: [x, H - 0.005, z], s: [0.6, 0.01, 1.2] });
    b.add(BOX, m.ceilingGrid, { p: [x, H - 0.003, z], s: [0.64, 0.004, 1.24] }); // ram, ligger ovanför panelens underkant
  }

  const walls = [
    { p: [cx, H / 2, R.minZ], r: [0, 0, 0], w: W },               // bakvägg (bakom britsen)
    { p: [cx, H / 2, R.maxZ], r: [0, Math.PI, 0], w: W },         // vägg bakom användaren
    { p: [R.minX, H / 2, cz], r: [0, Math.PI / 2, 0], w: D },     // vänster
  ];
  for (const wl of walls) b.add(new THREE.PlaneGeometry(wl.w, H), m.wall, { p: wl.p, r: wl.r });

  // Höger vägg med dörröppning.
  const dz0 = L.DOOR.zCenter - L.DOOR.width / 2, dz1 = L.DOOR.zCenter + L.DOOR.width / 2;
  const rr = [0, -Math.PI / 2, 0];
  b.add(new THREE.PlaneGeometry(dz0 - R.minZ, H), m.wall, { p: [R.maxX, H / 2, (R.minZ + dz0) / 2], r: rr });
  b.add(new THREE.PlaneGeometry(R.maxZ - dz1, H), m.wall, { p: [R.maxX, H / 2, (dz1 + R.maxZ) / 2], r: rr });
  b.add(new THREE.PlaneGeometry(L.DOOR.width, H - L.DOOR.height), m.wall, { p: [R.maxX, (H + L.DOOR.height) / 2, L.DOOR.zCenter], r: rr });
  // dörr (stängd), karm och handtag
  b.add(BOX, m.door, { p: [R.maxX + 0.02, L.DOOR.height / 2, L.DOOR.zCenter], s: [0.04, L.DOOR.height, L.DOOR.width - 0.02] });
  for (const z of [dz0, dz1]) b.add(BOX, m.doorFrame, { p: [R.maxX - 0.01, L.DOOR.height / 2, z], s: [0.04, L.DOOR.height, 0.05] });
  b.add(BOX, m.doorFrame, { p: [R.maxX - 0.01, L.DOOR.height, L.DOOR.zCenter], s: [0.04, 0.05, L.DOOR.width + 0.05] });
  b.add(BOX, m.steel, { p: [R.maxX - 0.04, 1.05, dz1 - 0.12], s: [0.04, 0.025, 0.14] });
  b.add(BOX, m.door, { p: [R.maxX - 0.005, 1.55, L.DOOR.zCenter + 0.25], s: [0.005, 0.5, 0.25] }); // glasruta (mörkare)

  // Sockel (hålkäl) och stötskydd runt väggarna.
  const perim = [
    { a: [R.minX, R.minZ], b: [R.maxX, R.minZ] },
    { a: [R.minX, R.maxZ], b: [R.maxX, R.maxZ] },
    { a: [R.minX, R.minZ], b: [R.minX, R.maxZ] },
    { a: [R.maxX, R.minZ], b: [R.maxX, dz0] },
    { a: [R.maxX, dz1], b: [R.maxX, R.maxZ] },
  ];
  for (const s of perim) {
    const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    const mx = (s.a[0] + s.b[0]) / 2, mz = (s.a[1] + s.b[1]) / 2;
    const alongX = s.a[1] === s.b[1];
    b.add(BOX, m.skirting, { p: [mx, 0.05, mz], s: [alongX ? len : 0.02, 0.1, alongX ? 0.02 : len] });
    b.add(BOX, m.bumperRail, { p: [mx, 0.9, mz], s: [alongX ? len : 0.025, 0.12, alongX ? 0.025 : len] });
  }

  // --- Medicinsk gaspanel bakom britsens huvudände --------------------------
  b.add(BOX, m.gasPanel, { p: [-0.35, 1.45, R.minZ + 0.04], s: [1.6, 0.22, 0.08] });
  const outlets = [[-0.9, m.o2White], [-0.75, m.vacYellow], [-0.6, m.o2White]];
  for (const [x, mat] of outlets) b.add(CYL, mat, { p: [x, 1.45, R.minZ + 0.09], r: [Math.PI / 2, 0, 0], s: [0.028, 0.02, 0.028] });
  for (const x of [0.0, 0.12, 0.24]) b.add(BOX, m.plasticWhite, { p: [x, 1.45, R.minZ + 0.085], s: [0.08, 0.08, 0.01] }); // eluttag

  buildBed(bc, m);
  buildArmBoard(bc, m);
  buildCart(bc, m);
  buildWoundCart(bc, m);
  buildWallDispensers(b, m, labels);
  buildSharpsAndBins(bc, m, labels);
  buildExamLampArm(bc, m);
  buildSink(b, m);
  buildPaperRoll(bc, m);

  const nStatic = b.build(world, { castShadow: false, receiveShadow: true, name: 'room' });
  const nCast = bc.build(world, { castShadow: true, receiveShadow: true, name: 'furniture' });
  // etiketter: en mesh
  const lb = new StaticBatcher();
  for (const [g, t] of labels._queued || []) lb.add(g, labels.material, t);
  lb.build(world, { name: 'labels' });

  // --- Dynamiska delar ------------------------------------------------------
  const monitor = createMonitor(world, m);
  const clock = createClock(world);

  // --- Ljus ------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xfbfaf6, 0x7d786e, 0.9);
  world.add(hemi);
  // Allmänbelysning från takpanelerna (ingen skugga).
  const ceilingLight = new THREE.DirectionalLight(0xfff8ee, 1.1);
  ceilingLight.position.set(0.4, H, -0.4);
  ceilingLight.target.position.set(0.4, 0, -0.8);
  world.add(ceilingLight, ceilingLight.target);
  // Undersökningslampan: den enda realtidsskuggan, riktad mot såret.
  const lamp = createExamLampHead(world, m);

  return {
    monitor, clock, lamp,
    stats: { staticMeshes: nStatic + nCast },
    update(dt, now) { monitor.update(dt, now); clock.update(); },
  };

  // Hjälpare som köar en etikett i atlasen.
  function label(pw, ph, w, h, draw, t) {
    const g = labels.add(pw, ph, w, h, draw);
    (labels._queued ||= []).push([g, t]);
  }
  function buildWallDispensers(b, m) {
    // Handspritdispenser (armbågsmanövrerad, vit med rostfri arm).
    const [x, y, z] = L.SANITIZER.position;
    b.add(rbox(0.1, 0.26, 0.12, 0.012), m.plasticWhite, { p: [x + 0.06, y, z] });
    b.add(BOX, m.steel, { p: [x + 0.13, y + 0.05, z], s: [0.015, 0.2, 0.05] });          // spak
    b.add(BOX, m.plasticGrey, { p: [x + 0.08, y - 0.24, z], s: [0.1, 0.012, 0.11] });   // droppskål
    label(256, 96, 0.08, 0.03, textLabel('Handsprit', { bg: '#ffffff', fg: '#2a5d7a', font: 'bold 44px system-ui' }),
      { p: [x + 0.111, y + 0.08, z], r: [0, Math.PI / 2, 0] });

    // Handskhållare: trådställ med tre handskboxar (S, M, L), öppningen nedåt-fram.
    const [gx, gy, gz] = L.GLOVE_HOLDER.position;
    b.add(BOX, m.steel, { p: [gx + 0.01, gy, gz], s: [0.02, 0.3, 0.42] });
    ['S', 'M', 'L'].forEach((size, i) => {
      const bz = gz - 0.13 + i * 0.13;
      b.add(BOX, m.gloveBoxBlue, { p: [gx + 0.07, gy, bz], s: [0.1, 0.24, 0.12] });
      b.add(BOX, m.gloveBlue, { p: [gx + 0.122, gy - 0.02, bz], s: [0.01, 0.05, 0.04] }); // handske sticker ut
      label(128, 128, 0.05, 0.05, textLabel(size, { bg: '#dfe6ee', fg: '#173a6a', font: 'bold 80px system-ui' }),
        { p: [gx + 0.121, gy + 0.07, bz], r: [0, Math.PI / 2, 0] });
    });
    label(512, 96, 0.2, 0.038, textLabel('Nitril, ej sterila', { bg: '#ffffff', fg: '#333', font: '42px system-ui' }),
      { p: [gx + 0.025, gy + 0.18, gz], r: [0, Math.PI / 2, 0] });
  }

  function buildSharpsAndBins(bc, m) {
    // Kanylburk (gul med röd lock) på instrumentvagnen.
    const [sx, sy, sz] = L.SHARPS.position;
    bc.add(BOX, m.sharpsYellow, { p: [sx, sy + 0.1, sz], s: [0.14, 0.2, 0.12] });
    bc.add(BOX, m.sharpsLid, { p: [sx, sy + 0.21, sz], s: [0.15, 0.025, 0.13] });
    label(256, 96, 0.1, 0.035, textLabel('Stickande/skärande', { bg: '#f2c400', fg: '#000', font: 'bold 30px system-ui' }),
      { p: [sx, sy + 0.12, sz + 0.0605] });

    // Pedalhink för brännbart avfall (rostfri).
    const [gx, gz] = L.BINS.general;
    bc.add(CYL, m.steel, { p: [gx, 0.24, gz], s: [0.15, 0.46, 0.15] });
    bc.add(CYL, m.steelDark, { p: [gx, 0.475, gz], s: [0.152, 0.02, 0.152] });
    bc.add(BOX, m.plasticDark, { p: [gx - 0.17, 0.03, gz], s: [0.08, 0.02, 0.06] });   // pedal

    // Smittförande avfall: gul behållare med lock och märkning.
    const [ix, iz] = L.BINS.infectious;
    bc.add(BOX, m.infectiousBox, { p: [ix, 0.25, iz], s: [0.3, 0.5, 0.3] });
    bc.add(BOX, m.plasticDark, { p: [ix, 0.51, iz], s: [0.31, 0.025, 0.31] });
    label(384, 160, 0.22, 0.09, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#b3121a'; ctx.fillRect(0, 0, w, 36);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('SMITTFÖRANDE AVFALL', w / 2, 18);
      ctx.fillStyle = '#111'; ctx.font = '26px system-ui';
      ctx.fillText('Blodiga kompresser, handskar', w / 2, 80);
      ctx.fillText('och förband', w / 2, 116);
    }, { p: [ix - 0.151, 0.32, iz], r: [0, -Math.PI / 2, 0] });
  }
}

function backrestGeom() {
  // Ryggstödet roterar kring ett gångjärn i madrassens ovankant. up = längs ytan mot huvudet,
  // n = ut från ytan. Båda i (x, y)-planet.
  const { headX, topHeight, backrest } = L.BED;
  const t = THREE.MathUtils.degToRad(backrest.deg);
  const hingeX = headX + backrest.length;
  return { t, hingeX, up: [-Math.cos(t), Math.sin(t)], n: [Math.sin(t), Math.cos(t)], top: topHeight, len: backrest.length };
}

function buildBed(b, m) {
  const [x, z] = L.BED.center;
  const { length, width, topHeight, headX } = L.BED;
  const g = backrestGeom();
  // Underrede: grå pelare (hydraulik) och fot med fyra hjul.
  b.add(BOX, m.plasticGrey, { p: [x, 0.11, z], s: [length * 0.75, 0.08, width * 0.7] });
  b.add(BOX, m.steelDark, { p: [x, 0.4, z], s: [0.22, 0.5, 0.22] });
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    const px = x + dx * length * 0.36, pz = z + dz * width * 0.32;
    b.add(CYL, m.rubber, { p: [px, 0.055, pz], r: [Math.PI / 2, 0, 0], s: [0.05, 0.04, 0.05] });
    b.add(BOX, m.steelDark, { p: [px, 0.1, pz], s: [0.04, 0.06, 0.04] });
  }
  // Ram.
  b.add(BOX, m.steel, { p: [x, topHeight - 0.12, z], s: [length, 0.05, width] });
  // Sittdel (fotänden) och höjt ryggstöd (huvudänden), klädda i samma dyna.
  const seatLen = headX + length - g.hingeX;
  b.add(rbox(seatLen, 0.08, width, 0.03), m.upholstery, { p: [g.hingeX + seatLen / 2, topHeight - 0.04, z] });
  const bc = [g.hingeX + g.up[0] * g.len / 2 - g.n[0] * 0.04, topHeight + g.up[1] * g.len / 2 - g.n[1] * 0.04];
  b.add(rbox(g.len, 0.08, width, 0.03), m.upholstery, { p: [bc[0], bc[1], z], r: [0, 0, -g.t] });
  // Ryggstödets ram och stag ned till britsens ram.
  const fc = [g.hingeX + g.up[0] * g.len / 2 - g.n[0] * 0.095, topHeight + g.up[1] * g.len / 2 - g.n[1] * 0.095];
  b.add(BOX, m.steel, { p: [fc[0], fc[1], z], r: [0, 0, -g.t], s: [g.len * 0.95, 0.03, width * 0.9] });
  for (const dz of [-1, 1]) {
    const top = [g.hingeX + g.up[0] * g.len * 0.62 - g.n[0] * 0.1, topHeight + g.up[1] * g.len * 0.62 - g.n[1] * 0.1];
    segment(b, m.steelDark, new THREE.Vector3(top[0], top[1], z + dz * width * 0.38),
      new THREE.Vector3(g.hingeX - 0.05, topHeight - 0.12, z + dz * width * 0.38), 0.012);
  }
  // Kudde på ryggstödet under bakhuvudet.
  const P = L.PILLOW;
  b.add(rbox(P.size[0], P.thickness, P.size[1], Math.min(0.03, P.thickness * 0.45), 3), m.pillow || m.paper,
    { p: P.center, r: [0, 0, -g.t] });
  // Sidoskenor (rostfria) längs britsens långsidor, för tillbehör.
  for (const dz of [-1, 1]) b.add(BOX, m.steel, { p: [x, topHeight - 0.1, z + dz * (width / 2 + 0.02)], s: [length * 0.6, 0.03, 0.01] });
}

function buildPaperRoll(b, m) {
  // Pappersrulle i hållare vid fotändan och ett pappersskydd över sittdel och ryggstöd.
  const [x, z] = L.BED.center;
  const { length, width, topHeight, headX } = L.BED;
  const g = backrestGeom();
  const fx = x + length / 2 + 0.05;
  b.add(CYL, m.paper, { p: [fx, topHeight - 0.03, z], r: [Math.PI / 2, 0, 0], s: [0.05, width * 0.8, 0.05] });
  for (const dz of [-1, 1]) b.add(BOX, m.steel, { p: [fx, topHeight - 0.06, z + dz * width * 0.42], s: [0.02, 0.1, 0.01] });
  const crinkle = (geo) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.0015 + Math.sin(i * 1.7) * 0.0012);
    geo.computeVertexNormals(); return geo;
  };
  const seatLen = headX + length - g.hingeX - 0.03;
  b.add(crinkle(new THREE.PlaneGeometry(seatLen, width * 0.82, 24, 8)), m.paper,
    { p: [g.hingeX + 0.01 + seatLen / 2, topHeight + 0.001, z], r: [-Math.PI / 2, 0, 0] });
  const bl = g.len - 0.03;
  const c = [g.hingeX + g.up[0] * (bl / 2 + 0.01) + g.n[0] * 0.001, topHeight + g.up[1] * (bl / 2 + 0.01) + g.n[1] * 0.001];
  // planet läggs först ned (normal +Y, längd längs X) och vrids sedan som ryggstödet
  b.add(crinkle(new THREE.PlaneGeometry(bl, width * 0.82, 20, 8)).rotateX(-Math.PI / 2), m.paper,
    { p: [c[0], c[1], z], r: [0, 0, -g.t] });
}

function buildArmBoard(b, m) {
  // Fristående handbord (armbord) med höjdinställbar pelare och fot. Bordet följer armen.
  const a = L.ARM_BOARD;
  const [cx, cz] = a.center;
  const yaw = a.yaw;
  b.add(rbox(a.width, 0.05, a.length, 0.02), m.upholstery, { p: [cx, a.topHeight - 0.025, cz], r: [0, yaw, 0] });
  b.add(BOX, m.steel, { p: [cx, a.topHeight - 0.062, cz], r: [0, yaw, 0], s: [0.07, 0.025, a.length * 0.85] });
  // Pelare och fot under bordets mitt, med lite förskjutning mot användaren.
  const col = [cx + Math.sin(yaw) * 0.08, cz + Math.cos(yaw) * 0.08];
  b.add(CYL, m.steel, { p: [col[0], (a.topHeight - 0.075) / 2 + 0.06, col[1]], s: [0.022, a.topHeight - 0.135, 0.022] });
  b.add(CYL, m.steelDark, { p: [col[0], 0.33, col[1]], s: [0.03, 0.42, 0.03] });
  for (let k = 0; k < 4; k++) {
    const ang = k * Math.PI / 2 + Math.PI / 4 + yaw;
    const ex = col[0] + Math.cos(ang) * 0.24, ez = col[1] + Math.sin(ang) * 0.24;
    segment(b, m.steelDark, new THREE.Vector3(col[0], 0.07, col[1]), new THREE.Vector3(ex, 0.05, ez), 0.014);
    b.add(CYL, m.rubber, { p: [ex, 0.03, ez], r: [Math.PI / 2, 0, 0], s: [0.028, 0.022, 0.028] });
  }
  // Pappersskydd på armbordet.
  b.add(new THREE.PlaneGeometry(a.width * 0.9, a.length * 0.95), m.paper, { p: [cx, a.topHeight + 0.002, cz], r: [-Math.PI / 2, 0, yaw] });
}

function buildCart(b, m) {
  // Rostfri instrumentvagn med två hyllplan och kant.
  const [x, z] = L.CART.position;
  const [w, d] = L.CART.size;
  const h = L.CART.height;
  for (const y of [h - 0.02, 0.28]) {
    b.add(BOX, m.steel, { p: [x, y, z], s: [w, 0.015, d] });
    b.add(BOX, m.steel, { p: [x, y + 0.02, z - d / 2], s: [w, 0.04, 0.008] });
    b.add(BOX, m.steel, { p: [x, y + 0.02, z + d / 2], s: [w, 0.04, 0.008] });
    b.add(BOX, m.steel, { p: [x - w / 2, y + 0.02, z], s: [0.008, 0.04, d] });
    b.add(BOX, m.steel, { p: [x + w / 2, y + 0.02, z], s: [0.008, 0.04, d] });
  }
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    const px = x + dx * (w / 2 - 0.02), pz = z + dz * (d / 2 - 0.02);
    b.add(CYL8, m.steel, { p: [px, h / 2, pz], s: [0.012, h - 0.06, 0.012] });
    b.add(CYL, m.rubber, { p: [px, 0.04, pz], r: [Math.PI / 2, 0, 0], s: [0.035, 0.025, 0.035] });
  }
  // Handtag på kortsidan.
  b.add(CYL8, m.steel, { p: [x + w / 2 + 0.05, h - 0.02, z], r: [Math.PI / 2, 0, 0], s: [0.01, d * 0.8, 0.01] });
  // Kompressförpackningar på nedre hyllan (förråd).
  for (let i = 0; i < 4; i++) b.add(BOX, m.packageBlue, { p: [x - 0.18 + i * 0.12, 0.33, z], s: [0.1, 0.06, 0.16] });
}

function buildWoundCart(b, m) {
  // Sårvagn: vit/grå plastvagn med lådor och rostfri topp.
  const [x, z] = L.WOUND_CART.position;
  const [w, d] = L.WOUND_CART.size;
  const h = L.WOUND_CART.height;
  b.add(rbox(w, h - 0.12, d, 0.015), m.plasticGrey, { p: [x, (h - 0.12) / 2 + 0.1, z] });
  b.add(BOX, m.steel, { p: [x, h - 0.01, z], s: [w + 0.02, 0.02, d + 0.02] });
  const n = 5;
  const drawerH = (h - 0.2) / n;
  for (let i = 0; i < n; i++) {
    const y = 0.14 + drawerH * (i + 0.5);
    b.add(rbox(w - 0.04, drawerH - 0.012, 0.012, 0.004), m.plasticWhite, { p: [x, y, z + d / 2 + 0.004] });
    b.add(BOX, m.steelDark, { p: [x, y + drawerH * 0.25, z + d / 2 + 0.015], s: [w * 0.4, 0.012, 0.012] });
  }
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    b.add(CYL, m.rubber, { p: [x + dx * (w / 2 - 0.05), 0.045, z + dz * (d / 2 - 0.05)], r: [Math.PI / 2, 0, 0], s: [0.04, 0.03, 0.04] });
  }
  // Förband och kompresser i öppna fack ovanpå.
  b.add(BOX, m.packageBlue, { p: [x - 0.14, h + 0.03, z - 0.05], s: [0.12, 0.05, 0.18] });
  b.add(BOX, m.gauzeWhite, { p: [x + 0.02, h + 0.025, z - 0.05], s: [0.1, 0.04, 0.1] });
  b.add(CYL, m.gauzeWhite, { p: [x + 0.17, h + 0.04, z - 0.05], r: [0, 0, Math.PI / 2], s: [0.035, 0.08, 0.035] }); // linda
}

function buildExamLampArm(b, m) {
  // Väggmonterad undersökningslampa: fäste, två armsegment, led.
  const [mx, my, mz] = L.EXAM_LAMP.mount;
  const [hx, hy, hz] = L.EXAM_LAMP.head;
  b.add(BOX, m.plasticWhite, { p: [mx, my, mz + 0.03], s: [0.12, 0.2, 0.06] });
  const elbow = new THREE.Vector3((mx + hx) / 2 - 0.1, my + 0.12, (mz + hz) / 2);
  segment(b, m.plasticWhite, new THREE.Vector3(mx, my, mz + 0.07), elbow, 0.018);
  segment(b, m.plasticWhite, elbow, new THREE.Vector3(hx, hy + 0.06, hz), 0.015);
  b.add(SPH, m.plasticGrey, { p: elbow.toArray(), s: 0.03 });
}

function segment(b, mat, a, c, r) {
  const dir = new THREE.Vector3().subVectors(c, a);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const mtx = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(r, len, r));
  b.add(CYL8, mat, { matrix: mtx });
}

function createExamLampHead(world, m) {
  const [hx, hy, hz] = L.EXAM_LAMP.head;
  const [wx, wy, wz] = L.WOUND.position;
  const g = new THREE.Group();
  g.position.set(hx, hy, hz);
  g.lookAt(wx, wy, wz);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.07, 24, 1, false), m.plasticWhite); // bred ände (+Z) mot såret
  shell.rotation.x = Math.PI / 2;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.095, 24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfffbf2, emissiveIntensity: 2.5, name: 'lampLens' }));
  lens.position.z = 0.036;
  g.add(shell, lens);
  world.add(g);

  const spot = new THREE.SpotLight(0xfff6e8, 5, 3, THREE.MathUtils.degToRad(26), 0.55, 1.6);
  spot.position.set(hx, hy, hz);
  spot.target.position.set(wx, wy, wz);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0004;
  spot.shadow.normalBias = 0.01;
  spot.shadow.camera.near = 0.2;
  spot.shadow.camera.far = 3;
  world.add(spot, spot.target);
  return { group: g, light: spot };
}

function buildSink(b, m) {
  // Tvättställ med spegel och pappershanddukar på väggen bakom användaren.
  const [x, z] = L.SINK.position;
  b.add(rbox(0.5, 0.14, 0.4, 0.03), m.sink, { p: [x, 0.82, z - 0.2] });
  b.add(CYL8, m.chrome, { p: [x, 0.98, z - 0.06], s: [0.015, 0.2, 0.015] });
  b.add(CYL8, m.chrome, { p: [x, 1.07, z - 0.12], r: [Math.PI / 2, 0, 0], s: [0.012, 0.12, 0.012] });
  b.add(BOX, m.chrome, { p: [x + 0.06, 1.0, z - 0.06], s: [0.14, 0.01, 0.02] });         // armbågsspak
  b.add(new THREE.PlaneGeometry(0.5, 0.6), m.mirror, { p: [x, 1.5, z - 0.005], r: [0, Math.PI, 0] });
  b.add(rbox(0.3, 0.4, 0.12, 0.015), m.plasticWhite, { p: [x + 0.55, 1.3, z - 0.06] });  // pappershanddukar
}
