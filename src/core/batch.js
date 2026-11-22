// Statisk batchning: alla fasta delar av rummet slås ihop till en mesh per
// material. Det håller antalet draw calls lågt (budget < 100 för hela scenen).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

function boxProjectUV(g, size) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i) / size, y = p.getY(i) / size, z = p.getZ(i) / size;
    if (ax >= ay && ax >= az) uv.setXY(i, z, y);
    else if (ay >= az) uv.setXY(i, x, z);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
}

export class StaticBatcher {
  constructor() { this.groups = new Map(); }

  /**
   * @param {THREE.BufferGeometry} geometry  kopieras, originalet kan återanvändas
   * @param {THREE.Material} material
   * @param {{p?:number[], r?:number[], s?:number[]|number, matrix?:THREE.Matrix4}} t
   */
  add(geometry, material, t = {}) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    }
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    g.morphAttributes = {};
    g.clearGroups();
    if (t.matrix) _m.copy(t.matrix);
    else {
      const s = t.s === undefined ? [1, 1, 1] : (typeof t.s === 'number' ? [t.s, t.s, t.s] : t.s);
      _q.setFromEuler(_e.set(...(t.r || [0, 0, 0])));
      _m.compose(new THREE.Vector3(...(t.p || [0, 0, 0])), _q, new THREE.Vector3(...s));
    }
    g.applyMatrix4(_m);
    // Material med userData.worldUV (meter per texturrepetition) får box-projicerade UV i världsskala,
    // så att texturen inte töjs ut på utdragna lådor (t.ex. vagnens hyllplan och ben).
    if (material.userData?.worldUV) boxProjectUV(g, material.userData.worldUV);
    if (!this.groups.has(material)) this.groups.set(material, []);
    this.groups.get(material).push(g);
    return this;
  }

  /** Bygg meshar och lägg dem i `parent`. Returnerar antalet skapade meshar. */
  build(parent, { castShadow = false, receiveShadow = true, name = 'static' } = {}) {
    let n = 0;
    for (const [material, geoms] of this.groups) {
      const merged = mergeGeometries(geoms, false);
      for (const g of geoms) g.dispose();
      if (!merged) { console.warn('[batch] kunde inte slå ihop', material.name); continue; }
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = `${name}:${material.name || 'mat'}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
      n++;
    }
    this.groups.clear();
    return n;
  }
}
