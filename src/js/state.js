/* =====================================================================
   État du jeu : préférences, bêtises, partie en cours
   ===================================================================== */
import { T } from './i18n.js';

/** localStorage protégé (navigation privée, stockage bloqué…). */
export const store = {
  get(key = 'fox-betises-v2') { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } },
  set(v, key = 'fox-betises-v2') { if (S.bench) return; try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },   // test de performance : rien n'est sauvegardé
  del(key) { if (S.bench) return; try { localStorage.removeItem(key); } catch (e) { /* idem */ } },
};
/** Préférences et succès, gardés d'une partie à l'autre. */
export const saved = Object.assign({ ach: {}, best: null, lang: null, muted: false, acorns: [], daily: {}, stats: {}, days: [], pseudo: '', mgBest: 0 }, store.get());

/** État partagé modifiable par plusieurs modules. */
export const S = {
  // anglais par défaut ; français sur /fr/ ; le choix du visiteur (bouton FR / EN) l'emporte (boot.js a déjà réglé <html lang>)
  lang: saved.lang === 'fr' || saved.lang === 'en' ? saved.lang : document.documentElement.lang === 'fr' ? 'fr' : 'en',
  regionsLoaded: false,   // toutes les régions sont-elles arrivées ? (voir regions/lazy.js)
  paused: true, muted: !!saved.muted, coffeeShake: 0, printing: 0, sneakToggle: false, started: false, time: 0,
};
export const t = () => T[S.lang];
/** Vrai si une fenêtre est ouverte (fin de partie, fiche, carnet de voyage, profil, mini-jeu terminé, test) : le jeu doit rester en pause. */
const MODALS = ['#endCard', '#factCard', '#burrow', '#journal', '#mgEnd', '#benchCard'];
export const modalOpen = () => MODALS.some(q => { const e = document.querySelector(q); return !!e && !e.hidden; });

/** Toutes les bêtises. need = nombre d'actions ; secret = cachée jusqu'à découverte ; chain = bêtise en chaîne. */
export const GOALS = [
  { id: 'carottes', need: 3 }, { id: 'jardinier' }, { id: 'chapeau' }, { id: 'chapeauEau', chain: true },
  { id: 'baguette' }, { id: 'pots', need: 3 }, { id: 'mug' }, { id: 'cafe' }, { id: 'boue', chain: true },
  { id: 'serveur' }, { id: 'imprimante' }, { id: 'diversion', chain: true }, { id: 'reunion' },
  { id: 'terrier', secret: true },
].map(g => Object.assign(g, { region: 'village' }));
/** Bêtises du village (chapitre 1, défi du jour). */
export const MAIN_IDS = GOALS.filter(g => !g.secret).map(g => g.id);
/** Ajoute les bêtises d'une région (appelé par defineRegion). */
export function addGoals(region, list) { for (const g of list) GOALS.push(Object.assign({ region }, g)); }
/** Toutes les bêtises non secrètes de toutes les régions. */
export const allMain = () => GOALS.filter(g => !g.secret).map(g => g.id);
export const goalOf = id => GOALS.find(g => g.id === id);

/** Partie en cours. mode 'libre' (toutes les bêtises) ou 'defi' (5 bêtises du jour). */
export const run = {
  mode: 'libre', goals: MAIN_IDS, day: null,
  done: {}, progress: { carottes: new Set(), pots: new Set() },
  elapsed: 0, tEnd: null, caught: 0, alerts: 0, loot: false,
  lastProgress: 0, eatenCarrots: [], knockedPots: [],
  // Aventure (v2) : régions ouvertes / découvertes, cartes postales, compteurs de dialogues, drapeaux divers
  unlocked: [], discovered: ['village'], cards: [], talks: {}, flags: {}, foxPos: null, villageDone: false,
};
/** Compteur de progression d'une bêtise à plusieurs étapes (créé à la demande). */
export const prog = id => run.progress[id] || (run.progress[id] = new Set());
/** Bêtises à afficher dans le carnet pour le mode en cours (+ la secrète en mode libre). */
export const activeGoals = (region = 'village') => GOALS.filter(g => (run.mode === 'defi' ? run.goals.includes(g.id) : g.region === region) && !(g.secret && run.mode === 'defi'));

/* Hasard : pendant la construction du décor, une suite rejouable (graine par lieu) pour que chaque visite montre
   le même monde composé ; le reste du temps (jeu, animations), le hasard ordinaire. */
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hashStr = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
let RNG = mulberry32(hashStr('pierrelogre'));   // construction du village au chargement : rejouable
/** Fin du chargement : le jeu reprend le hasard ordinaire. */
export const endBoot = () => { RNG = Math.random; };
/** Exécute fn avec un hasard rejouable (même graine → même résultat). */
export function seeded(seed, fn) { const prev = RNG; RNG = mulberry32(typeof seed === 'number' ? seed : hashStr(seed)); try { return fn(); } finally { RNG = prev; } }
export const random = () => RNG();
export const pick = a => a[RNG() * a.length | 0];
export const rnd = (a, b) => a + RNG() * (b - a);
/** Heure du jour et météo (voir daytime.js) : t de 0 à 1 sur un cycle ; golden, eve, lamp, rain de 0 à 1. */
export const DAY = { t: .03, golden: 0, eve: 0, lamp: 0, rain: 0, sunK: 1, hemiK: 1, exposure: 1, rainT: 0, nextRain: rnd(160, 240) };
