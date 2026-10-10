/* =====================================================================
   Interface : carnet, indices, toasts, bulles, fin de partie, glands, langue
   ===================================================================== */
import * as THREE from 'three';
import { SFX } from './audio.js';
import { CONFIG, track } from './config.js';
import { RM, camera, isTouch, redraws } from './engine.js';
import { fox } from './fox.js';
import { saveRun } from './persist.js';
import { GOALS, MAIN_IDS, S, activeGoals, goalOf, prog, run, saved, store, t } from './state.js';

export const $ = s => document.querySelector(s);
const goalsEl = $('#goals');
export const fmt = s => { s = Math.max(0, s | 0); return `${s / 60 | 0}:${String(s % 60).padStart(2, '0')}`; };
const ACH = ['fleau', 'insaisissable', 'express', 'ombre'];
/** Liste complète des succès (remplie par achievements.js). */
export const ACH_ALL = [];
const openHints = new Set();

/* ---------- Carnet ---------- */
export function renderGoals() {
  goalsEl.innerHTML = ''; let n = 0; const region = S.goalRegion || S.region || 'village'; const list = activeGoals(region);
  for (const g of list) {
    const done = !!run.done[g.id]; if (done && !g.secret) n++;
    const li = document.createElement('li'); li.dataset.id = g.id; li.tabIndex = 0; li.setAttribute('role', 'button');
    if (g.secret && !done) { li.className = 'secret'; li.textContent = t().secret; }
    else {
      li.textContent = t().goals[g.id] || g.id;
      if (g.need && !done) { const c = document.createElement('span'); c.className = 'count'; c.textContent = ` (${Math.min(g.need, prog(g.id).size)}/${g.need})`; li.append(c); }
    }
    const st = document.createElement('span'); st.className = 'strike'; li.append(st);
    if (done) li.classList.add('done');
    if (openHints.has(g.id) && !done && t().hints[g.id]) { const h = document.createElement('small'); h.className = 'hint-txt'; h.textContent = t().hints[g.id]; li.append(h); li.classList.add('open'); }
    goalsEl.append(li);
  }
  const total = list.filter(g => !g.secret).length;
  const daily = run.mode === 'defi';
  if (daily) $('#nbScore').textContent = `${n} / ${total}`;
  else { const all = GOALS.filter(g => !g.secret), d = GOALS.filter(g => run.done[g.id]).length; $('#nbScore').textContent = `${d} / ${all.length}`; $('#nbScore').title = t().totalTasks; }
  $('#nbMode').textContent = daily ? t().dailyLabel : `📍 ${t().regions?.[region] || ''} · ${n}/${total}`;
  $('#nbAcorns').textContent = `🌰 ${saved.acorns.length}/5`;
  $('#nbAcorns').title = t().acornCount;
  if (daily) $('#nbAch').innerHTML = '';
  else { const got = ACH_ALL.filter(a => saved.ach[a.id]).length; $('#nbAch').innerHTML = `<button class="nb-map" id="nbMap">🗺️ ${t().journalBtn}</button><span class="nb-medals" title="${t().achLabel}">🏅 ${got}/${ACH_ALL.length || ACH.length}</span>`; }
  $('#nbTip').textContent = t().hintTap;
  renderHook();
}
let renderHook = () => {};
export const onRender = fn => { renderHook = fn; };
function toggleHint(id) {
  if (run.done[id]) return;
  if (openHints.has(id)) openHints.delete(id); else { openHints.add(id); track('Indice', { goal: id }); }
  renderGoals();
}
goalsEl.addEventListener('click', e => { const li = e.target.closest('li'); if (li) toggleHint(li.dataset.id); });
goalsEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const li = e.target.closest('li'); if (li) { e.preventDefault(); toggleHint(li.dataset.id); } } });

let hintPick = null;
/** nudge.js choisit la bêtise à suggérer (la plus proche dont on connaît l'endroit) et la montre d'une flèche. */
export const setHintPicker = fn => { hintPick = fn; };
/** Indice automatique si le joueur n'avance plus : un premier après CONFIG.hintAfter s, puis tous les CONFIG.hintAgain s. */
export function autoHint() {
  const wait = S.hintN ? CONFIG.hintAgain : CONFIG.hintAfter;
  if ((run.tEnd && run.mode === 'defi') || run.elapsed - run.lastProgress < wait) return;
  run.lastProgress = run.elapsed; S.hintN = (S.hintN || 0) + 1;
  const todo = activeGoals(S.region || 'village').filter(g => !run.done[g.id] && !g.secret && t().hints[g.id]);
  if (!todo.length) return;
  const g = (hintPick && hintPick(todo)) || todo[Math.random() * todo.length | 0];
  toast(t().hintAuto(t().hints[g.id])); track('Indice', { goal: g.id, auto: true });
}

let finishHook = () => {};
/** main.js branche ici l'écran de fin (évite une dépendance circulaire). */
export const onFinish = fn => { finishHook = fn; };
const progressHooks = [];
/** Appelé après chaque bêtise accomplie (ouverture de régions, succès…). */
export const onProgress = fn => progressHooks.push(fn);

export function completeGoal(id) {
  if (run.done[id] || !goalOf(id)) return;
  if (run.mode === 'defi' && !run.goals.includes(id) && !goalOf(id).secret) return;
  run.done[id] = true; run.lastProgress = run.elapsed; S.hintN = 0; openHints.delete(id); renderGoals();
  // Bêtises enchaînées (moins de 12 s entre deux) : « Doublé ! », « Triplé !! »…
  S.combo = run.elapsed - (S.lastGoalT ?? -99) < 12 ? (S.combo || 1) + 1 : 1; S.lastGoalT = run.elapsed;
  const li = goalsEl.querySelector(`[data-id="${id}"]`);
  if (li) { li.classList.remove('done'); void li.offsetWidth; requestAnimationFrame(() => li.classList.add('done')); }
  SFX.scribble(); fox.wagT = 1.8;
  if (isTouch) try { navigator.vibrate?.(18); } catch (e) { /* vibreur facultatif (Android) */ }
  toast(`${goalOf(id).secret ? t().doneSecret : t().done} <b>${t().goals[id] || id}</b>`);
  if (S.combo >= 2) { const c = S.combo; setTimeout(() => { SFX.combo(); toast(`<b>${t().combo(c)}</b>`); }, 500); }
  saveRun();
  for (const h of progressHooks) h(id);
  const chapter = run.mode === 'defi' ? run.goals : MAIN_IDS;
  if (chapter.every(g => run.done[g]) && !run.tEnd) finishHook();
}
/** Avance une bêtise à plusieurs étapes (need) ; key identifie l'étape (pas de doublon). */
export function addProgress(id, key) {
  const g = goalOf(id); if (!g || run.done[id]) return;
  const p = prog(id); if (p.has(key)) return; p.add(key); run.lastProgress = run.elapsed; S.hintN = 0;
  if (p.size >= (g.need || 1)) completeGoal(id); else { renderGoals(); saveRun(); toast(`${t().goals[id] || id} <b>${p.size}/${g.need}</b>`); }
}

/* ---------- Toasts & bulles ---------- */
export function toast(html) { const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html; $('#toasts').append(el); setTimeout(() => el.remove(), 3400); }

const bubblesEl = $('#bubbles');
export const bubbles = [];
export function say(target, text, cls = '', dur = 1.8, yOff = 2.5, key) {
  key = key || target; const prev = bubbles.find(b => b.key === key); if (prev) { prev.el.remove(); bubbles.splice(bubbles.indexOf(prev), 1); }
  const el = document.createElement('div'); el.className = 'bubble ' + cls; el.textContent = text; bubblesEl.append(el);
  bubbles.push({ el, target, t: dur, yOff, key });
}
export const posOf = tg => tg.group ? tg.group.position : (tg.anchor || tg.pos);
export const hintEl = document.createElement('div'); hintEl.className = 'hint'; hintEl.textContent = 'E'; hintEl.hidden = true; bubblesEl.append(hintEl);
const tmpV = new THREE.Vector3();
export function toScreen(v) { tmpV.copy(v).project(camera); return [(tmpV.x * .5 + .5) * innerWidth, (-tmpV.y * .5 + .5) * innerHeight, tmpV.z < 1]; }

/* ---------- Flèche vers la destination (objet porté) ---------- */
const arrow = $('#destArrow'); let arrowLabel = null, arrowHalf = 20;
export function updateDestArrow(dest) {
  if (!dest) { arrow.hidden = true; return; }
  tmpV.copy(dest.pos).setY(1).project(camera);
  const behind = tmpV.z > 1; let x = tmpV.x, y = tmpV.y; if (behind) { x = -x; y = -y; }
  const inside = !behind && Math.abs(x) < .92 && Math.abs(y) < .88;
  if (inside) { arrow.hidden = true; return; }
  const k = Math.max(Math.abs(x) / .9, Math.abs(y) / .82), ex = x / k, ey = y / k;
  arrow.hidden = false;
  const label = t().dest[dest.key] || '';
  if (label !== arrowLabel) { arrowLabel = label; arrow.querySelector('span').textContent = label; arrowHalf = Math.max(20, arrow.offsetWidth / 2 + 4); }
  // l'étiquette reste entière au bord de l'écran
  const px = Math.max(arrowHalf, Math.min(innerWidth - arrowHalf, (ex * .5 + .5) * innerWidth)), py = (-ey * .5 + .5) * innerHeight;
  arrow.style.left = px + 'px'; arrow.style.top = py + 'px';
  arrow.querySelector('i').style.transform = `rotate(${Math.atan2(-ey, ex)}rad)`;
}

/* ---------- Fin de partie ---------- */
export function showEndCard({ secs, unlocked, newBest }) {
  const T_ = t(), daily = run.mode === 'defi';
  $('#endTitle').textContent = daily ? T_.endDaily : T_.endTitle;
  $('#endSub').textContent = daily ? T_.endDailySub : T_.endSubAdv;
  const best = daily ? saved.daily[run.day] : saved.best;
  const rows = [[T_.endTime, fmt(secs) + (newBest ? ` · ${T_.newBadge}` : '')], [T_.endBest, fmt(best)], [T_.endCaught, T_.times(run.caught)], [T_.endSeen, T_.times(run.alerts)]];
  $('#endStats').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#contBtn').hidden = daily; $('#replayBtn').hidden = !daily;
  $('#endAch').innerHTML = daily ? '' : ACH.map(id => `<span class="medal-s${saved.ach[id] ? ' on' : ''}${unlocked.includes(id) ? ' new' : ''}" title="${T_.ach[id][1]}"><i></i>${T_.ach[id][0]}${unlocked.includes(id) ? ` <b>${T_.newBadge}</b>` : ''}</span>`).join('');
  $('#endLi').href = CONFIG.linkedin;
  $('#endCard').hidden = false; $(daily ? '#replayBtn' : '#contBtn').focus({ preventScroll: true });
  if (!RM) confetti();
}
$('#endLi').addEventListener('click', () => track('Clic LinkedIn', { depuis: 'fin' }));
export function confetti(n = 80) {
  const cols = ['#e8742a', '#f6d36b', '#7ea35c', '#8fc9df', '#f2b8c6'];
  for (let i = 0; i < n; i++) { const c = document.createElement('div'); c.className = 'confetti'; c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
    c.style.animationDuration = (2 + Math.random() * 2) + 's'; c.style.animationDelay = Math.random() * .6 + 's'; document.body.append(c); setTimeout(() => c.remove(), 5000); }
}

/* ---------- Carte « gland doré » ---------- */
let factResume = null;
export function showFact(i, onClose) { showCard({ icon: '🌰', title: t().acornTitle(saved.acorns.length), text: t().acorns[i], li: true }, onClose); }
/** Carte générique (gland, carte postale, chapitre terminé…). */
export function showCard({ icon = '🌰', title, text, li = false }, onClose) {
  $('#factIcon').textContent = icon;
  $('#factTitle').textContent = title;
  $('#factText').innerHTML = text;
  $('#factLi').href = CONFIG.linkedin; $('#factLi').hidden = !li;
  factResume = onClose; $('#factCard').hidden = false; $('#factClose').focus({ preventScroll: true });
}
export function closeFact() { if ($('#factCard').hidden) return; $('#factCard').hidden = true; const f = factResume; factResume = null; if (f) f(); }
$('#factClose').addEventListener('click', closeFact);
$('#factLi').addEventListener('click', () => track('Clic LinkedIn', { depuis: 'gland' }));

/* ---------- Carnet replié / déplié ---------- */
export function toggleNotebook() { setNotebook($('#notebook').classList.contains('collapsed')); }
/** Carnet déplié (true) ou replié (false). */
export function setNotebook(open) { const nb = $('#notebook'); nb.classList.toggle('collapsed', !open); $('#nbToggle').textContent = open ? t().fold : t().unfold; $('#nbToggle').setAttribute('aria-expanded', String(open)); }
$('#nbToggle').addEventListener('click', toggleNotebook);

/* ---------- Menu mobile ---------- */
$('#menuBtn').addEventListener('click', () => { const tr = $('#topRight'); const o = !tr.classList.contains('open'); tr.classList.toggle('open', o); $('#menuBtn').setAttribute('aria-expanded', String(o)); });

/* ---------- Langue ---------- */
/** Applique la langue à l'interface ; textures = false : sans redessiner les panneaux 3D (ouverture du profil). */
export function applyLang(textures = true) {
  document.documentElement.lang = S.lang;
  document.querySelectorAll('[data-t]').forEach(el => { const v = t()[el.dataset.t]; if (typeof v === 'string') el.textContent = v; });
  $('#help').innerHTML = t().help; $('#introH1').innerHTML = t().introH1;
  $('#introKeys').innerHTML = t().keys.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join('');
  ['#langBtn', '#langBtn2'].forEach(s => $(s).textContent = S.lang === 'fr' ? 'EN' : 'FR');
  $('#muteBtn').textContent = S.muted ? t().muted : t().sound;
  $('#nbToggle').textContent = $('#notebook').classList.contains('collapsed') ? t().unfold : t().fold;
  $('#resetBtn').textContent = t().reset;
  $('#menuBtn').setAttribute('aria-label', t().menu);
  if (isTouch) hintEl.textContent = t().hintGrab;
  const B = t();
  $('#bStats').innerHTML = B.stats.map(([v, l]) => `<div class="stat"><strong>${v === '{loot}' ? (run.loot ? '1' : '0') : v}</strong><span>${l}</span></div>`).join('');
  $('#bTrail').innerHTML = B.trail.map(([y, c, r, d]) => `<li><span class="yr">${y}</span><div class="what"><b>${c}</b><em>${r}</em><p>${d}</p></div></li>`).join('');
  $('#bCerts').innerHTML = B.certs.map(c => `<span>${c}</span>`).join('');
  $('#bSkillsList').innerHTML = B.skills.map(c => `<span>${c}</span>`).join('');
  $('#bEdu').innerHTML = B.edu.map(c => `<li>${c}</li>`).join('');
  $('#bHobbies').innerHTML = B.hobbies.map(c => `<li>${c}</li>`).join('');
  $('#loot').textContent = run.loot ? B.loot1 : B.loot0; $('#bLegal').innerHTML = B.legal;
  if (textures) redraws.forEach(r => r());
  renderGoals(); langHook();
}
let langHook = () => {};
export const onLang = fn => { langHook = fn; };
export function toggleLang() { S.lang = S.lang === 'fr' ? 'en' : 'fr'; saved.lang = S.lang; store.set(saved); applyLang(); }
document.fonts?.ready?.then(() => redraws.forEach(r => r()));
