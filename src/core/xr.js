// Start och stopp av WebXR-sessionen, med lärdomarna från mini-vr:
//  - avsluta en gammal session innan en ny startas
//  - spärra dubbelklick på "Gå in i VR"
//  - prova local-floor, sedan local, sist viewer; lyft scenen om golvnivå saknas
//  - visa fel med stegnummer under startknappen
import { t } from '../i18n/index.js';

export const XR_CONFIG = {
  // Quest 3: 1.0 ger webbläsarens rekommenderade upplösning. Kan ändras med
  // ?fbs=0.8 i adressen om bildfrekvensen inte räcker.
  framebufferScaleFactor: 1.0,
  // Fixed foveated rendering: 0 = av, 1 = maximal. 1 är rimligt i ett rum
  // där det viktiga ligger mitt i synfältet.
  foveation: 1.0,
  standingEyeHeight: 1.6,
  referenceSpaceOrder: ['local-floor', 'local', 'viewer'],
};

let starting = false;

/**
 * @param {object} o
 * @param {THREE.WebGLRenderer} o.renderer
 * @param {(msg:string, isError?:boolean)=>void} o.onStatus
 * @param {(info:{space:string, hasFloor:boolean, session:XRSession})=>void} o.onStart
 * @param {()=>void} o.onEnd
 */
export async function enterVR({ renderer, onStatus, onStart, onEnd }) {
  if (starting) return;            // dubbelklicksspärr
  starting = true;
  let step = 'xr.step1';
  let session = null;
  try {
    onStatus(t('xr.checking'));
    if (!navigator.xr) throw new UserFacingError(t('xr.notSupported'));
    const supported = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
    if (!supported) throw new UserFacingError(t('xr.vrUnsupported'));

    // Steg 1: avsluta en kvarhängande session (t.ex. från en tidigare klick).
    const old = renderer.xr.getSession();
    if (old) { try { await old.end(); } catch { /* redan avslutad */ } }

    // Steg 2: begär sessionen. Allt valfritt, så att sessionen startar även
    // om handspårning eller golvnivå saknas.
    step = 'xr.step2';
    onStatus(t('xr.starting') + '\n' + t('xr.permissionHint'));
    session = await navigator.xr.requestSession('immersive-vr', {
      // 'layers' utelämnas tills vidare för att hålla etapp 1 enkel.
      // Kan ge lite bättre prestanda på Quest; prövas i etapp 7.
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
    });

    // Steg 3: hitta ett koordinatsystem som fungerar.
    step = 'xr.step3';
    let space = null;
    for (const type of XR_CONFIG.referenceSpaceOrder) {
      try { await session.requestReferenceSpace(type); space = type; break; } catch { /* prova nästa */ }
    }
    if (!space) throw new Error('inget referensrum fungerade');

    // Steg 4: koppla renderaren.
    step = 'xr.step4';
    const fbs = Number(new URLSearchParams(location.search).get('fbs')) || XR_CONFIG.framebufferScaleFactor;
    renderer.xr.setFramebufferScaleFactor(fbs);
    renderer.xr.setReferenceSpaceType(space);
    await renderer.xr.setSession(session);
    renderer.xr.setFoveation(XR_CONFIG.foveation);

    session.addEventListener('end', () => { onEnd(); onStatus(t('xr.ended')); }, { once: true });
    const hasFloor = space === 'local-floor';
    onStatus(hasFloor ? t('xr.active', { space }) : t('xr.noFloor', { space }));
    onStart({ space, hasFloor, session });
  } catch (err) {
    console.error('[xr]', step, err);
    if (session) { try { await session.end(); } catch { /* ignorera */ } }
    const msg = err instanceof UserFacingError ? err.message : `${t(step)}: ${err?.message || err}`;
    onStatus(msg, true);
  } finally {
    starting = false;
  }
}

export async function exitVR(renderer) {
  const s = renderer.xr.getSession();
  if (s) await s.end().catch(() => {});
}

class UserFacingError extends Error {}
