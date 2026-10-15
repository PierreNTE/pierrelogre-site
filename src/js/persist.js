/* =====================================================================
   Sauvegarde de la partie en cours (localStorage, sans cookie)
   Une sauvegarde par mode : partie libre, et défi du jour (valable le jour même).
   ===================================================================== */
import { GOALS, MAIN_IDS, S, run, store } from './state.js';

const KEY = { libre: 'fox-run-libre', defi: 'fox-run-defi' };
export const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const ADV = ['unlocked', 'discovered', 'cards', 'talks', 'flags', 'foxPos', 'villageDone'];
export function saveRun() {
  if (run.tEnd && run.mode === 'defi') { store.del(KEY[run.mode]); return; }
  const o = {
    v: 2, mode: run.mode, goals: run.goals, day: run.day, done: run.done,
    progress: Object.fromEntries(Object.entries(run.progress).map(([k, v]) => [k, [...v]])),
    elapsed: run.elapsed, caught: run.caught, alerts: run.alerts, loot: run.loot,
    eatenCarrots: run.eatenCarrots, knockedPots: run.knockedPots, tEnd: run.tEnd,
  };
  if (run.mode === 'libre') for (const k of ADV) o[k] = run[k];
  store.set(o, KEY[run.mode]);
}

/** Renvoie la sauvegarde du mode demandé si elle est utilisable, sinon null. */
export function peekRun(mode) {
  const s = store.get(KEY[mode]);
  if (!s || (s.v !== 1 && s.v !== 2) || !s.done) return null;
  if (mode === 'defi' && s.day !== todayKey()) return null;
  if (mode === 'libre' && !Array.isArray(s.goals)) return null;
  if (mode === 'defi' && s.goals.some(g => !MAIN_IDS.includes(g))) return null;
  // Les bêtises inconnues (version plus récente ou retirée) sont ignorées… une fois toutes les régions arrivées
  // (avant, une bêtise inconnue est peut-être celle d'une région pas encore chargée : on la garde)
  if (S.regionsLoaded) for (const k of Object.keys(s.done)) if (!GOALS.find(g => g.id === k)) delete s.done[k];
  return s;
}

/** Charge une sauvegarde dans run (l'application à la scène se fait dans restoreWorld). */
export function loadRun(s) {
  Object.assign(run, {
    mode: s.mode, goals: s.goals, day: s.day, done: s.done || {},
    progress: Object.fromEntries(Object.entries({ carottes: [], pots: [], ...(s.progress || {}) }).map(([k, v]) => [k, new Set(v)])),
    elapsed: s.elapsed || 0, tEnd: s.mode === 'libre' ? (s.tEnd || null) : null, caught: s.caught || 0, alerts: s.alerts || 0, loot: !!s.loot,
    eatenCarrots: s.eatenCarrots || [], knockedPots: s.knockedPots || [], lastProgress: s.elapsed || 0,
    unlocked: s.unlocked || [], discovered: s.discovered || ['village'], cards: s.cards || [], talks: s.talks || {}, flags: s.flags || {},
    foxPos: s.foxPos || null, villageDone: !!(s.villageDone || s.tEnd),
  });
}

/** Démarre une partie neuve dans le mode donné. */
export function freshRun(mode, goals, day = null) {
  store.del(KEY[mode]);
  Object.assign(run, {
    mode, goals, day, done: {}, progress: { carottes: new Set(), pots: new Set() },
    elapsed: 0, tEnd: null, caught: 0, alerts: 0, loot: false, lastProgress: 0, eatenCarrots: [], knockedPots: [],
    unlocked: [], discovered: ['village'], cards: [], talks: {}, flags: {}, foxPos: null, villageDone: false,
  });
}

export const clearRun = mode => store.del(KEY[mode]);
