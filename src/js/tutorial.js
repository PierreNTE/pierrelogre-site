/* =====================================================================
   Première visite : trois bêtises guidées, sans rien lire avant de jouer
   (faire sursauter le jardinier → voler son chapeau → le jeter dans la fontaine).
   Un post-it remplace le carnet pendant ce temps ; un chevron sautille au-dessus de la cible ;
   l'anneau au sol et la flèche de bord d'écran sont ceux du jeu. Le jardinier réagit un peu plus
   lentement (on doit pouvoir réussir du premier coup). On peut passer à tout moment ;
   vu une fois (ou passé), il ne revient plus.
   ===================================================================== */
import * as THREE from 'three';
import { SFX } from './audio.js';
import { track } from './config.js';
import { RM, isTouch } from './engine.js';
import { fox } from './fox.js';
import { HOOKS } from './hooks.js';
import { $, confetti, setNotebook, toScreen, toast } from './hud.js';
import { hat } from './items.js';
import { gardener } from './npc.js';
import { S, run, saved, store, t } from './state.js';
import { FOUNTAIN } from './world.js';

const IDS = ['jardinier', 'chapeau', 'chapeauEau'];
/** Rang de chaque étape : sert au compteur « Bêtise n/3 » et à savoir si l'on avance ou si l'on recule. */
const RANK = { yap: 1, knock: 2, grab: 2, again: 2, fountain: 3, done: 4 };
export const TUTO = { on: false, step: null, t0: 0, endAt: 0 };
const html = document.documentElement, box = $('#tuto'), chev = $('#tutoChev');
const yapBtn = $('#tYap'), grabBtn = $('#tGrab');
const _v = new THREE.Vector3(), _d = new THREE.Vector3();

/** Première partie libre d'un nouveau visiteur (pas après une ancienne version du jeu déjà bien entamée). */
export function tutoEligible() {
  if (saved.tuto || S.bench || run.mode !== 'libre') return false;
  if (saved.best != null || (saved.stats?.yaps || 0) > 40) return false;
  return Object.keys(run.done).every(id => IDS.includes(id));
}
/** Étape en cours, déduite de l'état du monde (survit à un rechargement et aux imprévus : chapeau repris, lâché ailleurs…). */
function stepNow() {
  if (run.done.chapeauEau) return 'done';
  if (fox.held === hat) return 'fountain';
  if (!run.done.jardinier) return 'yap';
  if (hat.worn) return 'knock';
  return run.done.chapeau ? 'again' : 'grab';
}
/** Ce que le joueur doit viser (null : rien, ou la fontaine déjà montrée par le jeu). */
function target(st) {
  if (st === 'yap' || st === 'knock') return { key: 'jardinier', p: gardener.pos, y: 3.75, r: 1.4 };
  if (st === 'grab' || st === 'again') return { key: 'chapeau', p: hat.pos, y: Math.max(0, hat.pos.y) + 1.25, r: .9 };
  if (st === 'fountain') return { key: 'fontaine', p: FOUNTAIN, y: 3.3, r: 0 };
  return null;
}
/** Anneau au sol + flèche de bord d'écran vers la cible (main.js ; la fontaine passe par destinationFor). */
export function tutoDest() {
  if (!TUTO.on || S.paused) return null;
  const tg = target(TUTO.step); if (!tg || !tg.r) return null;
  return { key: tg.key, pos: _d.set(tg.p.x, 0, tg.p.z), r: tg.r };
}

function render() {
  const L = t().tuto, s = L.steps[TUTO.step] || L.steps.yap;
  box.querySelector('small').textContent = TUTO.step === 'done' ? '✓' : L.n(Math.min(3, RANK[TUTO.step]), 3);
  box.querySelector('b').textContent = s[0];
  box.querySelector('span').innerHTML = isTouch && s[2] ? s[2] : s[1];
  $('#tutoSkip').textContent = L.skip;
  $('#tutoSkip').hidden = TUTO.step === 'done';
}
export const renderTuto = () => { if (TUTO.on) render(); };
function bump(cls) { box.classList.remove('bump', 'win'); void box.offsetWidth; box.classList.add(cls); }

function setStep(st) {
  const prev = TUTO.step; TUTO.step = st; render();
  // Le jardinier est un peu plus lent tant que le chapeau est en jeu (premier essai réussi, sans être trop facile)
  gardener.easeK = st === 'yap' || st === 'done' ? 1 : .8;
  if (!prev) return;
  if (st === 'done') { celebrate(); return; }
  if (RANK[st] > RANK[prev]) { SFX.ding(); bump('bump'); } else bump('bump');
}
/** Petite fête de fin : fanfare, confettis, le carnet apparaît avec « la suite est ici ». */
function celebrate() {
  bump('win'); SFX.tada(); if (!RM) confetti(40);
  if (isTouch) try { navigator.vibrate?.([20, 60, 30]); } catch (e) { /* facultatif */ }
  TUTO.endAt = performance.now() + 4600;
  saved.tuto = 1; store.set(saved);
  track('Tutoriel terminé', { secondes: Math.round(run.elapsed - TUTO.t0) });
  setTimeout(revealNotebook, 1400);
}
let nbTimer = 0;
/** Le carnet revient, souligné « La suite est ici ! ». Déplié sur grand écran ; replié sur téléphone
   (déplié, il couvrirait le joystick), mais il s'allume quand même. */
function revealNotebook() {
  html.classList.remove('tuto');
  const nb = $('#notebook'), small = innerWidth < 640 || innerHeight < 500;
  setNotebook(!small);
  nb.classList.remove('nb-new'); void nb.offsetWidth; nb.classList.add('nb-new');
  let tag = nb.querySelector('.nb-more');
  if (!tag) { tag = document.createElement('p'); tag.className = 'nb-more'; nb.querySelector('h2').after(tag); }
  tag.textContent = t().tuto.more;
  clearTimeout(nbTimer);
  nbTimer = setTimeout(() => { nb.classList.remove('nb-new'); tag.remove(); }, 8000);
}
function finish() {
  TUTO.on = false; gardener.easeK = 1; chev.hidden = true;
  yapBtn?.classList.remove('cue'); grabBtn?.classList.remove('cue');
  box.classList.add('out'); setTimeout(() => { box.hidden = true; box.classList.remove('out', 'win', 'bump'); }, 450);
  html.classList.remove('tuto');
  if (!run.done.terrier && !run.villageDone) setTimeout(() => toast(t().rumor), 1800);
}
export function skipTuto() {
  if (!TUTO.on) return;
  saved.tuto = 1; store.set(saved); track('Tutoriel passé', { etape: TUTO.step });
  revealNotebook(); finish();
}
$('#tutoSkip').addEventListener('click', skipTuto);

export function beginTuto() {
  TUTO.on = true; TUTO.step = null; TUTO.t0 = run.elapsed; TUTO.endAt = 0;
  html.classList.add('tuto'); box.hidden = false; box.classList.remove('out', 'win', 'bump');
  // Le renard regarde déjà vers le jardinier
  if (!run.done.jardinier) fox.yaw = Math.atan2(gardener.pos.x - fox.pos.x, gardener.pos.z - fox.pos.z);
  setStep(stepNow()); bump('bump');
}
// Chapeau qui s'envole : le jardinier met plus longtemps à réagir pendant le tutoriel
HOOKS.hatGrace = () => (TUTO.on ? 2.6 : .7);

/** À chaque image (main.js). */
export function updateTuto(dt, now) {
  if (!TUTO.on) return;
  if (S.started) run.lastProgress = run.elapsed;   // pas d'indice automatique pendant ce temps
  const st = stepNow(); if (st !== TUTO.step) setStep(st);
  if (TUTO.step === 'done') { chev.hidden = true; if (performance.now() > TUTO.endAt) finish(); return; }
  // Chevron au-dessus de la cible (caché si elle est hors de l'écran : la flèche de bord prend le relais)
  const tg = target(TUTO.step);
  let show = false;
  if (tg && !S.paused && !S.cine) {
    _v.set(tg.p.x, tg.y, tg.p.z); const [x, y, vis] = toScreen(_v);
    show = vis && x > 20 && x < innerWidth - 20 && y > 30 && y < innerHeight - 10;
    if (show) { chev.style.left = x + 'px'; chev.style.top = y + 'px'; }
  }
  chev.hidden = !show;
  // Au doigt : le bouton à toucher se signale quand c'est le moment
  if (isTouch) {
    const near = (TUTO.step === 'yap' || TUTO.step === 'knock') && Math.hypot(gardener.pos.x - fox.pos.x, gardener.pos.z - fox.pos.z) < 4.2;
    const wet = TUTO.step === 'fountain' && Math.hypot(FOUNTAIN.x - fox.pos.x, FOUNTAIN.z - fox.pos.z) < FOUNTAIN.r + 1.4;
    yapBtn.classList.toggle('cue', near); grabBtn.classList.toggle('cue', wet);
  }
}
