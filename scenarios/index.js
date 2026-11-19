// Register över scenarier. Ett nytt scenario = en ny fil + en rad här.
import forearm1a from './forearm-1a.js';

export const SCENARIOS = [
  forearm1a,
  { id: 'forearm-1b', titleKey: 'scenario.1b.title', available: false },
];

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id && s.available) || forearm1a;
}
