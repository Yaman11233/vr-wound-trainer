// Delade PBR-material. Färger valda för att likna en svensk akutmottagning:
// ljusa väggar, grå-beige vinylgolv, rostfritt, mörkblå britsklädsel.
import * as THREE from 'three';
import { vinylFloor, wallPaint, brushedSteel, crinkledPaper, vinylUpholstery } from '../assets/proctex.js';

let M = null;

export function materials() {
  if (M) return M;
  const floor = vinylFloor();
  const wall = wallPaint();
  const steel = brushedSteel();
  const paper = crinkledPaper();
  const uph = vinylUpholstery();

  const std = (name, o) => Object.assign(new THREE.MeshStandardMaterial(o), { name });

  M = {
    floor: std('floor', { map: floor.map, roughnessMap: floor.rough, roughness: 1.0, metalness: 0 }),
    wall: std('wall', { color: 0xe9e7e1, roughness: 0.92, normalMap: wall.normal, normalScale: new THREE.Vector2(0.35, 0.35) }),
    wallAccent: std('wallAccent', { color: 0xb9c7c4, roughness: 0.9, normalMap: wall.normal, normalScale: new THREE.Vector2(0.3, 0.3) }),
    ceiling: std('ceiling', { color: 0xf1f1ee, roughness: 0.95, emissive: 0x3a3a38 }), // ersätter studsljus från golv/väggar
    ceilingGrid: std('ceilingGrid', { color: 0xd6d6d2, roughness: 0.6, metalness: 0.2 }),
    lightPanel: std('lightPanel', { color: 0xffffff, emissive: 0xfffaf0, emissiveIntensity: 1.6, roughness: 0.4 }),
    skirting: std('skirting', { color: 0x8c8c86, roughness: 0.7 }),
    bumperRail: std('bumperRail', { color: 0xbfae94, roughness: 0.55 }), // stötskydd i trälaminat
    steel: std('steel', { color: 0xc9cdd0, metalness: 1.0, roughness: 0.32, roughnessMap: steel.rough }),
    steelDark: std('steelDark', { color: 0x8b9094, metalness: 1.0, roughness: 0.45 }),
    chrome: std('chrome', { color: 0xe6e8ea, metalness: 1.0, roughness: 0.12 }),
    plasticWhite: std('plasticWhite', { color: 0xeeeeea, roughness: 0.45 }),
    plasticGrey: std('plasticGrey', { color: 0x6d7378, roughness: 0.5 }),
    plasticDark: std('plasticDark', { color: 0x2b2f33, roughness: 0.45 }),
    rubber: std('rubber', { color: 0x1c1d1f, roughness: 0.85 }),
    upholstery: std('upholstery', { color: 0x2f4253, roughness: 0.55, normalMap: uph.normal, normalScale: new THREE.Vector2(0.4, 0.4) }),
    pillow: std('pillow', { color: 0xe4e8ec, roughness: 0.92, normalMap: paper.normal, normalScale: new THREE.Vector2(0.25, 0.25) }),
    paper: std('paper', { color: 0xf6f5f0, roughness: 0.95, normalMap: paper.normal, normalScale: new THREE.Vector2(0.6, 0.6), side: THREE.DoubleSide }),
    sharpsYellow: std('sharpsYellow', { color: 0xf2c400, roughness: 0.5 }),
    sharpsLid: std('sharpsLid', { color: 0xd23b2a, roughness: 0.45 }),
    binGrey: std('binGrey', { color: 0x8e9599, roughness: 0.4, metalness: 0.0 }),
    infectiousBox: std('infectiousBox', { color: 0xe7d23a, roughness: 0.55 }),
    gloveBoxBlue: std('gloveBoxBlue', { color: 0xdfe6ee, roughness: 0.8 }),
    gloveBlue: std('gloveBlue', { color: 0x4f7fc8, roughness: 0.6 }),
    screenOff: std('screenOff', { color: 0x050607, roughness: 0.15, metalness: 0.0 }),
    door: std('door', { color: 0xd9d4c8, roughness: 0.6 }),
    doorFrame: std('doorFrame', { color: 0xa8acae, metalness: 0.6, roughness: 0.4 }),
    gauzeWhite: std('gauzeWhite', { color: 0xf8f8f4, roughness: 0.98 }),
    packageBlue: std('packageBlue', { color: 0x7fa6c9, roughness: 0.7 }),
    gasPanel: std('gasPanel', { color: 0xdcdcd8, roughness: 0.5, metalness: 0.1 }),
    o2White: std('o2White', { color: 0xf5f5f5, roughness: 0.4 }),
    vacYellow: std('vacYellow', { color: 0xe8c22a, roughness: 0.4 }),
    sink: std('sink', { color: 0xf3f3f1, roughness: 0.15, metalness: 0.0 }),
    mirror: std('mirror', { color: 0xffffff, metalness: 1.0, roughness: 0.03 }),
  };
  return M;
}
