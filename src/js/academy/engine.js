/* =====================================================================
   Académie Dell Storage : progression (sauvegardée dans le navigateur, à part de la partie de bêtises :
   « recommencer » une partie n'efface pas ce qu'on a appris), barème, maîtrise par famille, déblocages.
   Le contenu pédagogique est chargé à la demande (content/index.js : un fichier à part sur le site).
   ===================================================================== */
import { toast } from '../hud.js';
import { S, store } from '../state.js';
import { LEVELS, ROOMS, ROOM, RULES, UI, XP } from './meta.js';

const KEY = 'fox-academie-v1';
const blank = () => ({ v: 1, xp: 0, seen: {}, quiz: {}, tries: {}, qres: {}, mis: {}, sim: {}, badges: {}, flash: { best: 0, n: 0 }, lab: 0, final: { best: 0, passed: 0, n: 0 } });
/** État de l'académie (tout ce qui est appris). */
export const A = blank();
function load() {
  const raw = store.get(KEY); if (!raw || raw.v !== 1) return;
  for (const k of Object.keys(A)) if (raw[k] !== undefined && typeof raw[k] === typeof A[k]) A[k] = raw[k];
  A.xp = Math.max(0, +A.xp || 0);
}
load();
const save = () => store.set(A, KEY);

/* ---------- Langue ---------- */
export const lang = () => (S.lang === 'fr' ? 'fr' : 'en');
/** Texte bilingue → texte de la langue du jeu. */
export const tx = o => (o == null ? '' : typeof o === 'string' ? o : (o[lang()] ?? o.fr ?? ''));
export const ui = () => UI[lang()];

/* ---------- Contenu (chargé à la demande) ---------- */
let content = null, loading = null;
export function loadContent() {
  if (content) return Promise.resolve(content);
  return (loading ||= import('./content/index.js').then(m => { content = m; return m; }, e => { loading = null; throw e; }));
}
export const C = () => content;
export const roomContent = id => content?.ROOM_CONTENT[id];

/* ---------- Abonnés (décor, carnet, tableau) ---------- */
const subs = [];
export const onChange = fn => { subs.push(fn); };
function changed() { save(); for (const f of subs) { try { f(); } catch (e) { console.warn('académie :', e); } } }

/* ---------- Niveaux et points ---------- */
export function levelOf(xp = A.xp) {
  let i = 0; for (let k = 0; k < LEVELS.length; k++) if (xp >= LEVELS[k][0]) i = k;
  return { i, name: tx(LEVELS[i][1]), base: LEVELS[i][0], next: LEVELS[i + 1]?.[0] ?? null };
}
function gain(n, why) {
  n = Math.round(n); if (n <= 0) return 0;
  const before = levelOf().i; A.xp += n;
  toast(ui().toastXp(n, why));
  const after = levelOf();
  if (after.i > before) setTimeout(() => toast('⭐ ' + ui().levelUp(after.name)), 900);
  return n;
}

/* ---------- Ouverture des salles, du labo, de l'évaluation ---------- */
export const roomIndex = id => ROOMS.findIndex(r => r.id === id);
export const roomOpen = id => { const i = roomIndex(id); return i === 0 || (i > 0 && (A.tries[ROOMS[i - 1].id] || 0) > 0); };
export const labOpen = () => (A.tries[RULES.labAfter] || 0) > 0;
export const finalOpen = () => ROOMS.every(r => (A.tries[r.id] || 0) > 0);

/* ---------- Maîtrise d'une famille : exploration 20 %, quiz 40 %, missions 20 %, simulation 20 % ---------- */
export function mastery(id) {
  const c = roomContent(id);
  if (!c) return { explore: 0, quiz: 0, missions: 0, sim: 0, total: 0, started: false };
  const explore = c.facts.filter(f => A.seen[f.id]).length / c.facts.length;
  const quiz = Math.min(1, (A.quiz[id] || 0) / c.quiz.length);
  const missions = c.missions.reduce((s, m) => s + (A.mis[m.id] || 0), 0) / c.missions.length;
  const sim = A.sim[id] || 0;
  const started = explore > 0 || (A.tries[id] || 0) > 0 || c.missions.some(m => A.mis[m.id] !== undefined) || A.sim[id] !== undefined;
  return { explore, quiz, missions, sim, total: .2 * explore + .4 * quiz + .2 * missions + .2 * sim, started };
}
/** Conditions du badge : tous les faits vus, quiz ≥ 70 %, toutes les missions résolues, simulation ≥ 60 %. */
export function badgeReady(id) {
  const c = roomContent(id); if (!c) return false;
  const m = mastery(id);
  return m.explore >= 1 && m.quiz >= RULES.badgeQuiz && c.missions.every(x => (A.mis[x.id] || 0) >= .5) && m.sim >= RULES.badgeSim;
}
function checkBadge(id) {
  if (A.badges[id] || !badgeReady(id)) return;
  A.badges[id] = 1; const r = ROOM[id];
  setTimeout(() => toast(ui().toastBadge(tx(r.name))), 500);
  gain(XP.badge, ui().badge + ' ' + tx(r.name));
}

/* ---------- Enregistrement des activités ---------- */
export function seeFact(roomId, f) {
  if (A.seen[f.id]) return 0;
  A.seen[f.id] = 1; const x = gain(XP.fact, tx(f.title)); checkBadge(roomId); changed(); return x;
}
/** Quiz terminé : points (une association compte au prorata), réponses par question (1 juste, 0 faux). */
export function recordQuiz(roomId, pts, perQ) {
  const first = !(A.tries[roomId] > 0), prev = A.quiz[roomId] || 0;
  A.tries[roomId] = (A.tries[roomId] || 0) + 1;
  for (const [qid, v] of Object.entries(perQ)) A.qres[qid] = v;
  let x = 0; if (pts > prev) { A.quiz[roomId] = pts; x = gain(XP.quizPt * (pts - prev), ui().quiz + ' ' + tx(ROOM[roomId].name)); }
  // La salle suivante s'ouvre au premier essai (on apprend aussi de ses erreurs)
  const nxt = ROOMS[roomIndex(roomId) + 1];
  if (first && nxt) setTimeout(() => toast(ui().unlockRoom(tx(nxt.name))), 1300);
  if (first && roomId === RULES.labAfter) setTimeout(() => toast('🔓 ' + ui().lab), 2200);
  if (first && finalOpen()) setTimeout(() => toast('🔓 ' + ui().final), 2600);
  checkBadge(roomId); changed();
  return { x, best: Math.max(prev, pts), unlocked: first ? nxt?.id || null : null };
}
/** Mission : le premier choix compte en entier ; une réussite après correction vaut au plus la moitié. */
export function recordMission(roomId, mid, score, firstTry) {
  const prev = A.mis[mid], v = firstTry ? score : Math.min(score, .5);
  if (prev !== undefined && prev >= v) return 0;
  A.mis[mid] = v;
  let x = 0;
  if (v >= 1) x = gain(XP.mission - (prev >= .5 ? XP.missionLate : 0), ui().missions);
  else if (v >= .5 && !(prev >= .5)) x = gain(XP.missionLate, ui().missions);
  checkBadge(roomId); changed(); return x;
}
export function recordSim(roomId, score) {
  const prev = A.sim[roomId] || 0; let x = 0;
  if (score > prev || A.sim[roomId] === undefined) { A.sim[roomId] = Math.max(prev, score); x = gain(XP.sim * Math.max(0, score - prev), ui().sim); }
  checkBadge(roomId); changed(); return x;
}
export function recordFlash(n) {
  const prev = A.flash.best || 0; A.flash.n = (A.flash.n || 0) + 1;
  let x = 0; if (n > prev) { A.flash.best = n; x = gain(XP.flashPt * (n - prev), ui().flash); }
  changed(); return x;
}
export function completeLab() { if (A.lab) return 0; A.lab = 1; const x = gain(XP.lab, ui().lab); changed(); return x; }
export function recordFinal(score) {
  A.final.n = (A.final.n || 0) + 1; A.final.best = Math.max(A.final.best || 0, score); let x = 0;
  if (score >= RULES.finalPass && !A.final.passed) { A.final.passed = 1; x = gain(XP.final, ui().final); }
  changed(); return x;
}
export function resetAcademy() { Object.assign(A, blank()); store.del(KEY); changed(); }

/* ---------- Ce qu'il reste à travailler, et la prochaine étape ---------- */
/** Familles commencées et pas encore maîtrisées (sous 70 %), avec les raisons. */
export function weakAreas() {
  if (!content) return [];
  const L_ = lang(), out = [];
  for (const r of ROOMS) {
    if (!roomOpen(r.id)) continue;
    const c = roomContent(r.id), m = mastery(r.id);
    if (!m.started || m.total >= .7) continue;
    const why = [];
    const unseen = c.facts.filter(f => !A.seen[f.id]).length;
    if (unseen) why.push(L_ === 'fr' ? `${unseen} point${unseen > 1 ? 's' : ''} clé${unseen > 1 ? 's' : ''} à découvrir` : `${unseen} key point${unseen > 1 ? 's' : ''} to discover`);
    const missed = c.quiz.filter(q => A.qres[q.id] !== undefined && A.qres[q.id] < 1);
    if (!(A.tries[r.id] > 0)) why.push(L_ === 'fr' ? 'quiz pas encore tenté' : 'quiz not tried yet');
    else if (m.quiz < RULES.badgeQuiz) why.push(L_ === 'fr' ? `quiz à ${Math.round(m.quiz * 100)} %` : `quiz at ${Math.round(m.quiz * 100)}%`);
    const misTodo = c.missions.filter(x => !((A.mis[x.id] || 0) >= .5)).length;
    if (misTodo) why.push(L_ === 'fr' ? `${misTodo} mission${misTodo > 1 ? 's' : ''} à résoudre` : `${misTodo} mission${misTodo > 1 ? 's' : ''} to solve`);
    if (m.sim < RULES.badgeSim) why.push(A.sim[r.id] === undefined ? (L_ === 'fr' ? 'simulation pas encore jouée' : 'simulation not played yet') : (L_ === 'fr' ? `simulation à ${Math.round(m.sim * 100)} %` : `simulation at ${Math.round(m.sim * 100)}%`));
    out.push({ room: r, total: m.total, why, missed: missed.map(q => q.q) });
  }
  return out.sort((a, b) => a.total - b.total);
}
/** Prochaine étape conseillée : { room, act } (act : facts | quiz | missions | sim | lab | final | done). */
export function nextStep() {
  for (const r of ROOMS) {
    if (!roomOpen(r.id)) break;
    if (A.badges[r.id]) continue;
    const c = roomContent(r.id); if (!c) return { room: r, act: 'facts' };
    if (c.facts.some(f => !A.seen[f.id])) return { room: r, act: 'facts' };
    if (!(A.tries[r.id] > 0) || mastery(r.id).quiz < RULES.badgeQuiz) return { room: r, act: 'quiz' };
    if (c.missions.some(x => !((A.mis[x.id] || 0) >= .5))) return { room: r, act: 'missions' };
    if ((A.sim[r.id] || 0) < RULES.badgeSim) return { room: r, act: 'sim' };
  }
  if (labOpen() && !A.lab) return { act: 'lab' };
  if (finalOpen() && !A.final.passed) return { act: 'final' };
  if (ROOMS.every(r => A.badges[r.id]) && A.lab && A.final.passed) return { act: 'done' };
  return { act: 'explore' };
}

/** Tout le moteur en un objet (évite un import « * as » : esbuild en ferait un petit fichier de plus au démarrage). */
export const E = { A, lang, tx, ui, loadContent, C, roomContent, onChange, levelOf, roomIndex, roomOpen, labOpen, finalOpen, mastery, badgeReady,
  seeFact, recordQuiz, recordMission, recordSim, recordFlash, completeLab, recordFinal, resetAcademy, weakAreas, nextStep };
