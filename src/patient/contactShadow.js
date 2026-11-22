// Kontaktskugga (ambient occlusion) under underarmen och handen på armbordet.
// Realtidsskuggan från undersökningslampan faller snett och ger ingen mörk kontaktlinje där huden
// vilar mot dynan. Här räknas en mjuk skugga fram en gång från patientens hudpunkter nära
// bordsytan och läggs som en tunn yta på bordet (en draw call, ingen kostnad per bildruta).
import * as THREE from 'three';

export function createContactShadow(patientRoot, board, opts = {}) {
  let mesh = null;
  const build = (dh = 0) => {
    const next = computeShadow(patientRoot, { ...board, topHeight: board.topHeight + dh }, opts);
    if (mesh) { mesh.material.map.dispose(); mesh.material.map = next.material.map; mesh.position.y = next.position.y; next.geometry.dispose(); }
    else mesh = next;
    return mesh;
  };
  build(0);
  /** Räkna om skuggan när handbordet (och armen) flyttats dh meter. */
  mesh.userData.update = (dh) => build(dh);
  return mesh;
}

function computeShadow(patientRoot, board, { maxHeight = 0.035, cell = 0.002 } = {}) {
  const [cx, cz] = board.center;
  const axis = new THREE.Vector3(Math.sin(board.yaw), 0, Math.cos(board.yaw));   // längs bordet
  const across = new THREE.Vector3(Math.cos(board.yaw), 0, -Math.sin(board.yaw));
  const nu = Math.ceil(board.width / cell), nv = Math.ceil(board.length / cell);
  const acc = new Float32Array(nu * nv);
  const p = new THREE.Vector3(), rel = new THREE.Vector3();
  patientRoot.updateMatrixWorld(true);
  patientRoot.traverse((o) => {
    if (!o.isMesh || o.material?.name !== 'Skin_Arm') return;     // underarm och hand
    const pos = o.geometry.attributes.position;
    if (o.isSkinnedMesh) o.skeleton.update();
    for (let i = 0; i < pos.count; i++) {
      // hudad position (armen kan vara flyttad med handbordet)
      if (o.isSkinnedMesh) o.getVertexPosition(i, p); else p.fromBufferAttribute(pos, i);
      p.applyMatrix4(o.matrixWorld);
      const h = p.y - board.topHeight;
      if (h > maxHeight) continue;
      rel.set(p.x - cx, 0, p.z - cz);
      const u = rel.dot(across) / cell + nu / 2, v = rel.dot(axis) / cell + nv / 2;
      if (u < 0 || v < 0 || u >= nu || v >= nv) continue;
      const w = Math.pow(1 - Math.max(0, h) / maxHeight, 2);
      acc[(v | 0) * nu + (u | 0)] += w;
    }
  });
  // Två separerbara gaussfilter: ett smalt (kontaktlinjen) och ett brett (mjuk halvskugga).
  const blur = (src, sigma) => {
    const r = Math.ceil(sigma * 2.5), k = [];
    let ks = 0;
    for (let i = -r; i <= r; i++) { const g = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(g); ks += g; }
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
    for (let y = 0; y < nv; y++) for (let x = 0; x < nu; x++) {
      let s = 0; for (let i = -r; i <= r; i++) { const xx = x + i; if (xx >= 0 && xx < nu) s += src[y * nu + xx] * k[i + r]; } tmp[y * nu + x] = s / ks;
    }
    for (let y = 0; y < nv; y++) for (let x = 0; x < nu; x++) {
      let s = 0; for (let i = -r; i <= r; i++) { const yy = y + i; if (yy >= 0 && yy < nv) s += tmp[yy * nu + x] * k[i + r]; } out[y * nu + x] = s / ks;
    }
    return out;
  };
  const near = blur(acc, 1.5), wide = blur(acc, 6);
  const canvas = document.createElement('canvas'); canvas.width = nu; canvas.height = nv;
  const ctx = canvas.getContext('2d'); const img = ctx.createImageData(nu, nv);
  for (let i = 0; i < nu * nv; i++) {
    const a = Math.min(1, 1 - Math.exp(-near[i] * 1.6)) * 0.55 + Math.min(1, 1 - Math.exp(-wide[i] * 0.9)) * 0.3;
    img.data[i * 4 + 3] = Math.round(Math.min(0.75, a) * 255);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ color: 0x1a1410, map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, name: 'contactShadow' });
  // Planet: lokal x = tvärs bordet (u), lokal y = längs bordet (v); läggs ned och vrids som bordet.
  const geo = new THREE.PlaneGeometry(nu * cell, nv * cell);
  geo.rotateX(-Math.PI / 2);   // normal +Y; lokal +y blev -z
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'patient:contactShadow';
  mesh.position.set(cx, board.topHeight + 0.0026, cz);
  mesh.rotation.y = board.yaw;   // bildens kolumner längs 'across', rader (nedåt) längs +axis
  mesh.renderOrder = 1;
  return mesh;
}
