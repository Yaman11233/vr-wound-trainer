// Språkstöd. Svenska är standard och fullständig; saknas en nyckel i ett
// annat språk används den svenska texten. Arabiska skrivs höger-till-vänster.
import sv from './sv.js';
import en from './en.js';
import ar from './ar.js';

const DICTS = { sv, en, ar };
const RTL = new Set(['ar']);
let lang = 'sv';
const changeListeners = new Set();

export function setLanguage(code) {
  lang = DICTS[code] ? code : 'sv';
  try { localStorage.setItem('vwt.lang', lang); } catch { /* privat läge */ }
  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL() ? 'rtl' : 'ltr';
  applyToDom();
  for (const fn of changeListeners) fn(lang);
}

export function getLanguage() { return lang; }
export function isRTL() { return RTL.has(lang); }
export function onLanguageChange(fn) { changeListeners.add(fn); return () => changeListeners.delete(fn); }

export function savedLanguage() {
  try { return localStorage.getItem('vwt.lang') || 'sv'; } catch { return 'sv'; }
}

/** Slå upp en text. Parametrar ersätter {namn} i texten. */
export function t(key, params) {
  let s = DICTS[lang]?.[key] ?? sv[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Fyll i alla element med data-i18n. */
export function applyToDom(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
}
