/* =====================================================================
   Qualité adaptative : mesure la fluidité au démarrage et allège le rendu
   sur les appareils modestes (résolution, ombres, feuilles, particules).
   ===================================================================== */
import { RM, isTouch, renderer, sun } from './engine.js';
import { LEAVES, PQ } from './fx.js';
import { S, saved } from './state.js';
import { track } from './config.js';

/** mode : 'auto' (mesure la fluidité), 'high' ou 'low' (choisis dans le menu, gardés dans le navigateur). */
export const Q = { decide: f => decide(f), tier: 0, leafCount: RM ? 14 : LEAVES, done: false, mode: ['auto', 'high', 'low'].includes(saved.quality) ? saved.quality : 'auto' };
let frames = 0, t0 = 0;
function setShadow(n) { sun.shadow.mapSize.set(n, n); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
if (Q.mode === 'high') Q.done = true;
if (Q.mode === 'low') { Q.tier = 2; Q.done = true; renderer.setPixelRatio(1); setShadow(512); Q.leafCount = 8; PQ.scale = .35; }

const PR_MAX = Math.min(devicePixelRatio, isTouch ? 1.75 : 2);
let fast = 0, trial = false;
/**
 * À appeler à chaque image rendue. Mesure par fenêtres de 3 s, seulement en jeu et hors construction de zone
 * (les à-coups du chargement ne comptent pas). Paliers : < 48 i/s puis < 28 i/s. Et dans l'autre sens :
 * si le palier 1 tourne à 57 i/s ou plus deux fois de suite, on retente la pleine résolution (une fois),
 * et on revient en arrière si elle passe sous 48 i/s.
 */
export function sampleQuality() {
  if (Q.done) return;
  const now = performance.now();
  if (!S.started || S.paused || now - (S.lastBuild || 0) < 1200) { t0 = 0; frames = 0; return; }
  if (!t0) { t0 = now; return; }
  frames++;
  if (now - t0 < 3000) return;
  const fps = frames * 1000 / (now - t0); frames = 0; t0 = now;
  decide(fps);
  // Qualité retenue et fluidité, par type d'appareil (mesure d'audience) : de quoi régler les paliers d'après les vrais téléphones
  if (Q.done) track('Qualité', { tier: Q.tier, fps: Math.round(fps), pr: +renderer.getPixelRatio().toFixed(2), mode: Q.mode });
}
/** Décision à la fin d'une fenêtre de mesure (séparée pour les tests : window.__fox.Q.decide). */
function decide(fps) {
  if (trial) { trial = false; Q.done = true; if (fps < 48) renderer.setPixelRatio(1); return; }
  if (Q.tier === 0 && fps < 48) { Q.tier = 1; renderer.setPixelRatio(1); setShadow(1024); Q.leafCount = Math.min(Q.leafCount, 20); PQ.scale = .6; fast = 0; }
  else if (Q.tier === 1 && fps < 28) { Q.tier = 2; setShadow(512); Q.leafCount = 8; PQ.scale = .35; Q.done = true; }
  else if (Q.tier === 1 && fps >= 57 && !RM && PR_MAX > 1) { if (++fast >= 2) { trial = true; renderer.setPixelRatio(PR_MAX); } }
  else Q.done = true;
}
