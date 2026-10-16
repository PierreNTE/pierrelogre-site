/* =====================================================================
   Carnet de voyage (touche M) : carte du monde, succès, classement.
   + fenêtre de choix de destination (train, terriers).
   ===================================================================== */
import { ACHIEVEMENTS } from './achievements.js';
import { audio } from './audio.js';
import { canvas } from './engine.js';
import { fox } from './fox.js';
import { $, fmt } from './hud.js';
import { keys } from './input.js';
import { ONLINE, top, topDaily } from './leaderboard.js';
import { fillTimes } from './dailyboard.js';
import { todayKey } from './persist.js';
import { REGIONS, RG, isOpen, regionDone, regionGoals, travelTo } from './regions.js';
import { GOALS, S, modalOpen, run, saved, t } from './state.js';

let tab = 'map', wasPaused = false;
const el = $('#journal');

export function openJournal(which = tab) {
  if (!S.started || run.mode === 'defi' || S.mg) return;   // pas de voyage pendant le mini-jeu
  if (el.hidden) { wasPaused = S.paused; S.paused = true; for (const k in keys) keys[k] = false; }
  tab = which; el.hidden = false; render(); audio();
  $('#jClose').focus({ preventScroll: true });
}
export function closeJournal() { if (el.hidden) return; el.hidden = true; S.paused = wasPaused || !!S.cine || modalOpen(); canvas.focus(); }
export const journalOpen = () => !el.hidden;
/** Redessine le carnet s'il est ouvert (régions arrivées après le démarrage). */
export const refreshJournal = () => { if (!el.hidden) render(); };

function render() {
  for (const b of el.querySelectorAll('[data-tab]')) { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }
  for (const p of el.querySelectorAll('.j-pane')) p.hidden = p.id !== 'j-' + tab;
  const all = GOALS.length, d = GOALS.filter(g => run.done[g.id]).length;
  $('#jSum').textContent = t().journalSum(d, all, run.cards.length, REGIONS.filter(R => R.hasCard !== false).length, saved.acorns.length, fmt(run.elapsed));
  if (tab === 'map') drawMap();
  if (tab === 'ach') renderAch();
  if (tab === 'lb') renderLb();
}

/* ---------- Carte ---------- */
const mapC = $('#jMap'), mapList = $('#jRegions');
let boxes = [];
function drawMap() {
  const regs = REGIONS.filter(R => R.bounds && !R.hidden);
  const ext = regs.reduce((e, R) => ({ minX: Math.min(e.minX, R.bounds.minX), maxX: Math.max(e.maxX, R.bounds.maxX), minZ: Math.min(e.minZ, R.bounds.minZ), maxZ: Math.max(e.maxZ, R.bounds.maxZ) }), { minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9 });
  const dpr = Math.min(2, devicePixelRatio || 1), W = mapC.clientWidth || 600, H = Math.round(Math.min(W * .6, Math.max(180, innerHeight * .5)));   // téléphone à l'horizontale : la carte ne prend pas tout l'écran
  mapC.width = W * dpr; mapC.height = H * dpr; mapC.style.height = H + 'px';
  const g = mapC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = 14, sx = (W - pad * 2) / (ext.maxX - ext.minX), sz = (H - pad * 2) / (ext.maxZ - ext.minZ), k = Math.min(sx, sz);
  const ox = pad + ((W - pad * 2) - (ext.maxX - ext.minX) * k) / 2, oz = pad + ((H - pad * 2) - (ext.maxZ - ext.minZ) * k) / 2;
  const X = x => ox + (x - ext.minX) * k, Z = z => oz + (z - ext.minZ) * k;
  g.fillStyle = '#f6efe0'; g.fillRect(0, 0, W, H);
  // Liaisons : train et bateau
  g.setLineDash([5, 4]); g.lineWidth = 2; g.strokeStyle = '#a08a6a';
  const link = (a, b) => { if (!RG[a] || !RG[b]) return; const A = RG[a].spawn, B = RG[b].spawn; g.beginPath(); g.moveTo(X(A.x), Z(A.z)); g.lineTo(X(B.x), Z(B.z)); g.stroke(); };
  link('gare', 'nantes'); link('nantes', 'paris'); link('plage', 'ile'); g.setLineDash([]);
  boxes = []; const labels = [];
  for (const R of regs) {
    const b = R.bounds, open = isOpen(R.id), seen = run.discovered.includes(R.id);
    const x = X(b.minX), y = Z(b.minZ), w = (b.maxX - b.minX) * k, h = (b.maxZ - b.minZ) * k;
    g.fillStyle = !open ? '#d8d2c4' : (R.mapColor || '#a9cc86'); g.globalAlpha = seen || !open ? 1 : .7; g.beginPath(); g.roundRect(x, y, w, h, 6); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = '#3a2f27'; g.lineWidth = R.id === S.region ? 3 : 1.2; g.stroke();
    const name = open ? (seen ? t().regions[R.id] : '?') : '🔒';
    labels.push([`bold ${Math.max(10, Math.min(15, w / 6))}px "Patrick Hand",cursive`, name, x + w / 2, y + h / 2 - (open && seen ? 7 : 0)]);
    if (open && seen) labels.push(['11px "Patrick Hand",cursive', `${regionDone(R.id)}/${regionGoals(R.id).length}${run.cards.includes(R.id) ? ' 💌' : ''}`, x + w / 2, y + h / 2 + 9]);
    boxes.push({ R, x, y, w, h });
  }
  g.fillStyle = '#3a2f27'; g.textAlign = 'center'; g.textBaseline = 'middle';
  // Le renard, puis les noms par-dessus (cernés de papier : lisibles même quand le renard est au milieu de sa zone)
  if (fox.pos.x >= ext.minX && fox.pos.x <= ext.maxX) { g.font = '16px sans-serif'; g.fillText('🦊', X(fox.pos.x), Z(fox.pos.z)); }
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(251,246,230,.85)'; g.lineWidth = 3;
  for (const [font, txt, lx, ly] of labels) { g.font = font; g.strokeText(txt, lx, ly); g.fillText(txt, lx, ly); }
  // Liste lisible (et cliquable) des régions
  mapList.innerHTML = regs.map(R => {
    const open = isOpen(R.id), seen = run.discovered.includes(R.id);
    const status = !open ? `🔒 ${R.need ? R.need() : ''}` : !seen ? t().mapUnseen : `${regionDone(R.id)}/${regionGoals(R.id).length}`;
    const go = open && seen && R.id !== S.region && run.mode === 'libre' ? `<button class="alt j-go" data-go="${R.id}">${t().mapGo}</button>` : '';
    return `<li class="${open ? 'open' : 'locked'}"><b>${open && seen ? t().regions[R.id] : open ? '???' : t().regions[R.id]}</b><span>${status}</span>${go}</li>`;
  }).join('');
}
mapList.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; const id = b.dataset.go; el.hidden = true; S.paused = false; saved.stats.burrows = (saved.stats.burrows || 0) + 1; travelTo(id); });

/* ---------- Succès ---------- */
function renderAch() {
  $('#j-ach').innerHTML = `<div class="ach-grid">${ACHIEVEMENTS.map(a => {
    const on = !!saved.ach[a.id], hide = a.secret && !on, [nm, ds] = t().ach[a.id] || [a.id, ''];
    return `<div class="ach${on ? ' on' : ''}"><i>${on ? '🏅' : hide ? '❔' : '○'}</i><b>${hide ? '???' : nm}</b><span>${hide ? t().achSecret : ds}</span></div>`;
  }).join('')}</div>`;
}

/* ---------- Classement ---------- */
async function renderLb() {
  const pane = $('#j-lb'); pane.innerHTML = `<p class="lb-note">${t().lbLoading}</p>`;
  const { list, online } = await top();
  if (tab !== 'lb') return;
  pane.innerHTML = `<h3>${t().mgTitle}</h3><p class="lb-note">${online ? t().lbOnline : (ONLINE ? t().lbOffline : t().lbLocal)}</p>`
    + (list.length ? `<ol class="lb">${list.map(x => `<li${x.pseudo === saved.pseudo ? ' class="me"' : ''}><b></b><span>${x.pseudo.replace(/[<>&]/g, '')}</span><em>${x.score}</em></li>`).join('')}</ol>` : `<p class="lb-note">${t().lbEmpty}</p>`)
    + `<p class="lb-note">${t().lbBest(saved.mgBest || 0)}</p>`
    + `<h3>${t().dlToday}</h3><ol class="lb" id="jDaily"><li class="empty">${t().lbLoading}</li></ol>`;
  pane.querySelectorAll('.lb b').forEach((b, i) => { b.textContent = i + 1; });
  // Défi du jour : les meilleurs temps d'aujourd'hui
  const d = await topDaily(todayKey());
  if (tab === 'lb' && $('#jDaily')) fillTimes($('#jDaily'), d.list, saved.pseudo);
}

el.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } });
// Onglets au clavier (comme partout ailleurs) : flèches gauche/droite, Début, Fin
el.querySelector('[role=tablist]').addEventListener('keydown', e => {
  const tabs = [...el.querySelectorAll('[data-tab]')], i = tabs.findIndex(b => b.dataset.tab === tab);
  const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
  if (j === undefined) return;
  e.preventDefault(); e.stopPropagation(); const n = tabs[(j + tabs.length) % tabs.length]; tab = n.dataset.tab; render(); n.focus();
});
$('#jClose').addEventListener('click', closeJournal);
addEventListener('resize', () => { if (!el.hidden && tab === 'map') drawMap(); });

/* ---------- Choix de destination (train) ---------- */
const tr = $('#travel');
let trWas = false;
export function openTravel(title, options) {
  trWas = S.paused; S.paused = true; for (const k in keys) keys[k] = false;
  $('#trTitle').textContent = title;
  const list = $('#trList'); list.innerHTML = '';
  for (const o of options) { const b = document.createElement('button'); b.className = o.current ? 'alt' : 'big'; b.disabled = !!o.current; b.textContent = o.label; b.addEventListener('click', () => { tr.hidden = true; S.paused = false; o.go(); }); list.append(b); }
  tr.hidden = false; list.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
}
export function closeTravel() { if (tr.hidden) return; tr.hidden = true; S.paused = trWas; canvas.focus(); }
export const travelOpen = () => !tr.hidden;
$('#trClose').addEventListener('click', closeTravel);
