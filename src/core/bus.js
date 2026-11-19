// Händelsebuss mellan moduler. Instrument och patient skickar händelser
// (t.ex. 'glove.donned', 'pressure.applied', 'sterility.breached') utan att
// känna till vem som lyssnar. Bedömning och loggning prenumererar.
//
// Varje händelse får en tidsstämpel i simulerad tid (se core/time.js) och
// sparas i en ringbuffert så att loggen kan läsas i efterhand.

const listeners = new Map(); // namn -> Set<fn>
const anyListeners = new Set();
const history = [];
const HISTORY_MAX = 5000;
let clock = () => 0;

export const bus = {
  /** Koppla en klocka som ger simulerad tid i sekunder. */
  setClock(fn) { clock = fn; },

  on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name)?.delete(fn);
  },

  once(name, fn) {
    const off = bus.on(name, (e) => { off(); fn(e); });
    return off;
  },

  /** Lyssna på alla händelser (används av loggning och bedömning). */
  onAny(fn) { anyListeners.add(fn); return () => anyListeners.delete(fn); },

  emit(name, data = {}) {
    const event = { name, t: clock(), wall: performance.now(), data };
    history.push(event);
    if (history.length > HISTORY_MAX) history.shift();
    const set = listeners.get(name);
    if (set) for (const fn of [...set]) safeCall(fn, event);
    for (const fn of [...anyListeners]) safeCall(fn, event);
    return event;
  },

  history() { return history.slice(); },
  clearHistory() { history.length = 0; },
};

function safeCall(fn, event) {
  try { fn(event); } catch (err) { console.error(`[bus] fel i lyssnare för ${event.name}`, err); }
}
