/* =====================================================================
   Succès : ceux du village (fin du chapitre 1) + ceux de l'aventure.
   Chaque succès : id, secret (nom caché tant qu'il n'est pas obtenu), test().
   Les textes sont dans T.ach[id] = [nom, description].
   ===================================================================== */
import { SFX } from './audio.js';
import { track } from './config.js';
import { ACH_ALL, renderGoals, toast } from './hud.js';
import { REGIONS, onAch, regionGoals } from './regions.js';
import { todayKey } from './persist.js';
import { GOALS, S, run, saved, store, t } from './state.js';

const allDone = id => { const g = regionGoals(id); return g.length > 0 && g.every(x => run.done[x.id]); };
const hour = () => new Date().getHours();

export const ACHIEVEMENTS = [
  // Chapitre 1 (décernés à la fin du village, voir main.js)
  { id: 'fleau' }, { id: 'insaisissable' }, { id: 'express' }, { id: 'ombre' },
  // Aventure
  { id: 'petitRenard', test: () => GOALS.filter(g => run.done[g.id]).length >= 10 },
  { id: 'explorateur', test: () => S.regionsLoaded && REGIONS.every(R => R.hidden || run.discovered.includes(R.id)) },
  { id: 'forestier', test: () => allDone('foret') },
  { id: 'sportif', test: () => allDone('sport') },
  { id: 'pilote', test: () => allDone('moto') },
  { id: 'vendeen', test: () => allDone('plage') && allDone('riviere') },
  { id: 'nantais', test: () => allDone('nantes') },
  { id: 'parisien', test: () => allDone('paris') },
  { id: 'souverain', test: () => allDone('montagne') },
  { id: 'speedFox', test: () => (saved.mgBest || 0) >= 3000 },
  { id: 'buteur', test: () => (saved.stats.goals || 0) >= 50 },
  { id: 'collectionneur', test: () => S.regionsLoaded && saved.acorns.length >= 5 && REGIONS.filter(R => R.hasCard !== false).every(R => run.cards.includes(R.id)) },
  { id: 'fouineur', test: () => GOALS.filter(g => g.secret && run.done[g.id]).length >= 10 },
  { id: 'demenageur', test: () => (run.flags.souv || []).length >= 9 },
  { id: 'amiDesBetes', test: () => ['basseCour', 'chat', 'coq', 'canetons', 'meuh', 'crabes', 'ecureuil'].every(id => run.done[id]) },
  { id: 'centPourCent', test: () => S.regionsLoaded && GOALS.every(g => run.done[g.id]) },
  // Secrets
  { id: 'fidele', secret: true, test: () => (saved.days || []).length >= 3 },
  { id: 'noctambule', secret: true, test: () => hour() >= 22 || hour() < 5 },
  { id: 'bavard', secret: true, test: () => (saved.stats.yaps || 0) >= 200 },
  { id: 'touriste', secret: true, test: () => (saved.stats.trains || 0) >= 5 },
];
ACH_ALL.push(...ACHIEVEMENTS);

/** Débloque un succès (une seule fois) avec un petit toast. */
export function grant(id) {
  if (saved.ach[id]) return false;
  saved.ach[id] = true; store.set(saved);
  SFX.fanfare(); toast(`🏅 ${t().achLabel}${t().colon} <b>${t().ach[id]?.[0] || id}</b>`); track('Succès', { id });
  renderGoals(); return true;
}
/** Vérifie les succès de l'aventure (appelé après chaque progrès). */
export function checkAch() {
  if (run.mode === 'defi') return;
  for (const a of ACHIEVEMENTS) if (a.test && !saved.ach[a.id]) { try { if (a.test()) grant(a.id); } catch (e) { /* région absente */ } }
}
onAch(checkAch);

/** Jours de jeu distincts (succès « Fidèle »). */
export function markDay() {
  const d = todayKey(); saved.days = saved.days || [];
  if (!saved.days.includes(d)) { saved.days.push(d); if (saved.days.length > 30) saved.days.shift(); store.set(saved); }
}
