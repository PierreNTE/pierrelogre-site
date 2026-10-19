/* =====================================================================
   Défi du jour : 5 bêtises tirées au sort avec une graine = la date.
   Tout le monde a le même défi le même jour.
   ===================================================================== */
import { MAIN_IDS } from './state.js';
import { todayKey } from './persist.js';

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/** Les 5 bêtises du jour (ordre du carnet conservé). */
export function dailyGoals(day = todayKey()) {
  const seed = Number(day.replace(/-/g, ''));
  const r = mulberry32(seed), pool = [...MAIN_IDS];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const chosen = new Set(pool.slice(0, 5));
  return MAIN_IDS.filter(id => chosen.has(id));
}
