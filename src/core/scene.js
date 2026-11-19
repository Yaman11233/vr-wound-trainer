// Renderare, scen, kamera och "rigg".
//
// Koordinatsystem: origo är platsen där användaren står när övningen börjar,
// och användaren tittar längs -Z. Allt i rummet placeras relativt den punkten
// (se env/layout.js). Kameran, händerna och kontrollerna sitter i `rig`.
// "Återställ position" flyttar riggen så att huvudet hamnar på origo igen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { XR_CONFIG } from './xr.js';

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2f33);

  // Miljökarta för reflexer i rostfritt stål och vinyl. Genereras en gång.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 30);
  camera.position.set(0, XR_CONFIG.standingEyeHeight, 0);

  const rig = new THREE.Group();
  rig.name = 'rig';
  rig.add(camera);
  scene.add(rig);

  const world = new THREE.Group();
  world.name = 'world';
  scene.add(world);

  window.addEventListener('resize', () => {
    if (renderer.xr.isPresenting) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, rig, world };
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

/**
 * Flytta riggen så att användarens huvud hamnar på origo (i golvplanet) och
 * tittar längs -Z. Höjden ändras bara via `baseHeight` (lyft när golvnivå saknas).
 */
export function recenterRig({ renderer, camera, rig, baseHeight = 0 }) {
  // Huvudets pose i riggens lokala system.
  const head = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  head.updateMatrixWorld(true);
  rig.updateMatrixWorld(true);
  _m.copy(rig.matrixWorld).invert().multiply(head.matrixWorld);
  _m.decompose(_p, _q, _s);
  _e.setFromQuaternion(_q, 'YXZ');
  const yaw = _e.y;

  rig.rotation.set(0, -yaw, 0);
  const c = Math.cos(-yaw), s = Math.sin(-yaw);
  // rig.position = -(R(-yaw) * p) i xz-planet
  rig.position.set(-(c * _p.x + s * _p.z), baseHeight, -(-s * _p.x + c * _p.z));
  rig.updateMatrixWorld(true);
}
