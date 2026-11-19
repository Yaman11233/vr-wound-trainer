// Simulerad tid. Fysiologi, blödning och tryckets varaktighet räknas i
// simulerad tid, så att instruktören kan pausa eller snabbspola utan att
// handspårning och rendering påverkas (de går alltid i verklig tid).

let simTime = 0;     // sekunder sedan övningens start
let speed = 1;       // 1 = realtid
let paused = false;
const MAX_STEP = 0.1; // skydd mot stora hopp när fliken legat i bakgrunden

export const time = {
  /** Anropas en gång per bildruta med verklig tid i sekunder. Returnerar simulerat steg. */
  tick(realDt) {
    const dt = Math.min(Math.max(realDt, 0), MAX_STEP);
    if (paused) return 0;
    const simDt = dt * speed;
    simTime += simDt;
    return simDt;
  },
  now: () => simTime,
  get speed() { return speed; },
  setSpeed(s) { speed = Math.max(0, Math.min(s, 60)); },
  get paused() { return paused; },
  setPaused(p) { paused = !!p; },
  reset() { simTime = 0; speed = 1; paused = false; },
};
