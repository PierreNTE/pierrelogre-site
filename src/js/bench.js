/* =====================================================================
   Test de performance intégré (pour mesurer sur un vrai appareil, sans outils).
   - Compteur à l'écran : adresse terminée par #perf, ou Maj+P.
   - Tour automatique des zones : adresse terminée par #bench, Maj+B, ou cinq tapes rapides sur le chrono
     du carnet (téléphone). Le test ne sauvegarde rien ; à la fin, un tableau à copier, puis on recharge.
   ===================================================================== */
import { RG, REGIONS, teleport, unlockRegion } from './regions.js';
import { renderer } from './engine.js';
import { Q } from './quality.js';
import { PACE, refreshHz } from './pacer.js';
import { DAY, S, t } from './state.js';
import { track } from './config.js';

const fr = () => S.lang === 'fr';
let hud = null, last = performance.now(), acc = [], hudOn = false;

/** Petit compteur en haut à gauche (images/s, ms par image, appels de dessin, triangles). */
function toggleHud(on = !hudOn) {
  hudOn = on;
  if (!hud) { hud = document.createElement('div'); hud.id = 'perfHud'; Object.assign(hud.style, { position: 'fixed', left: '50%', top: '6px', transform: 'translateX(-50%)', zIndex: 50, font: '600 12px/1.3 ui-monospace,monospace', color: '#fff', background: 'rgba(30,30,30,.72)', padding: '4px 8px', borderRadius: '6px', pointerEvents: 'none', whiteSpace: 'pre' }); document.body.append(hud); }
  hud.hidden = !on;
}
/** À appeler une fois par image (après le rendu). */
export function benchFrame() {
  const now = performance.now(), dt = now - last; last = now;
  if (B.on) B.samples.push(dt);
  if (!hudOn) return;
  acc.push(dt); if (acc.length < 20) return;
  const avg = acc.reduce((a, b) => a + b, 0) / acc.length; acc = [];
  const i = renderer.info.render;
  hud.textContent = `${(1000 / avg).toFixed(0)} ${fr() ? 'i/s' : 'fps'} · ${avg.toFixed(1)} ms · ${i.calls} ${fr() ? 'appels' : 'calls'} · ${(i.triangles / 1000).toFixed(0)} k tri · Q${Q.tier} · ×${renderer.getPixelRatio().toFixed(2)}`;
}

/* ---------- Tour automatique ---------- */
const B = { on: false, samples: [] };
const wait = ms => new Promise(r => setTimeout(r, ms));
function stats(a) { const s = [...a].sort((x, y) => x - y), avg = a.reduce((x, y) => x + y, 0) / Math.max(1, a.length); return { fps: 1000 / avg, avg, p95: s[Math.floor(s.length * .95)] || 0, n: a.length }; }
function gpuName() { try { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { return '?'; } }

async function measure(label) {
  await wait(2500); B.samples = []; B.on = true; await wait(3000); B.on = false;
  const st = stats(B.samples), i = renderer.info.render;
  return { label, fps: st.fps, p95: st.p95, calls: i.calls, tris: i.triangles, tier: Q.tier, pr: renderer.getPixelRatio() };
}

export async function runBench(start) {
  if (B.running) return; B.running = true; S.bench = true;   // plus aucune sauvegarde à partir d'ici
  for (let i = 0; i < 100 && !S.regionsLoaded; i++) await new Promise(r => setTimeout(r, 300));   // toutes les régions mesurées
  if (!S.started) start('libre', false);
  toggleHud(true);
  const rows = [], t0 = performance.now();
  const go = (x, z, yaw = Math.PI) => new Promise(r => teleport(x, z, yaw, r));
  await wait(1500);
  await go(-4, 5.5); rows.push(await measure(fr() ? 'Village (place)' : 'Village (square)'));
  await go(-19, -12); rows.push(await measure(fr() ? 'Village (basse-cour)' : 'Village (farmyard)'));
  for (const id of ['foret', 'sport', 'moto', 'riviere', 'plage', 'gare', 'nantes', 'paris', 'montagne', 'ile', 'academie']) {
    const R = RG[id]; if (!R) continue; unlockRegion(R, false); await go(R.spawn.x, R.spawn.z, R.spawnYaw ?? 0);
    rows.push(await measure(t().regions?.[id] || id));
  }
  const t0d = DAY.t; DAY.t = .75; await go(-4, 5.5); rows.push(await measure(fr() ? 'Village le soir' : 'Village at dusk')); DAY.t = t0d;
  showResults(rows, (performance.now() - t0) / 1000);
}

const mk = n => { const e = performance.getEntriesByName(n)[0]; return e ? (e.startTime / 1000).toFixed(1) + ' s' : '?'; };
function showResults(rows, secs) {
  const ff = performance.getEntriesByName('fox:first-frame')[0];
  const head = [`pierrelogre.com · ${fr() ? 'test de performance' : 'performance test'} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `${navigator.userAgent}`, `${fr() ? 'Écran' : 'Screen'} ${innerWidth}×${innerHeight} ×${devicePixelRatio} · ≈ ${refreshHz() || '?'} Hz${PACE.cap ? (fr() ? ' (en jeu : plafonné à 60 i/s ; pas pendant ce test)' : ' (in play: capped to 60 fps; not during this test)') : ''} · GPU ${gpuName()}`,
    `${fr() ? 'Première image' : 'First frame'} : ${ff ? (ff.startTime / 1000).toFixed(1) + ' s' : '?'} (${fr() ? 'script' : 'script'} ${mk('fox:built')} · ${fr() ? 'fusion' : 'bake'} ${mk('fox:baked')}) · ${fr() ? 'durée du test' : 'test length'} ${secs.toFixed(0)} s`];
  const body = rows.map(r => `${r.label.slice(0, 24).padEnd(24)} ${r.fps.toFixed(0).padStart(3)} ${fr() ? 'i/s' : 'fps'}  p95 ${r.p95.toFixed(0).padStart(3)} ms  ${String(r.calls).padStart(3)} ${fr() ? 'appels' : 'calls'}  ${(r.tris / 1000).toFixed(0).padStart(4)} k tri  Q${r.tier} ×${r.pr.toFixed(2)}`);
  const worst = rows.reduce((a, r) => r.fps < a.fps ? r : a, rows[0]);
  const txt = [...head, '', ...body, '', `${fr() ? 'Moins fluide' : 'Slowest'} : ${worst.label} (${worst.fps.toFixed(0)} i/s)`].join('\n');
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'benchCard'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'benchTitle');
  o.innerHTML = `<div class="card" style="max-width:720px;transform:none"><h2 class="title" id="benchTitle" style="font-size:26px">${fr() ? 'Test de performance terminé' : 'Performance test done'}</h2>
    <p style="font-size:17px">${window.__foxStats?.on ? (fr() ? 'Résultats envoyés à Pierre (anonymement), merci ! Tu peux aussi copier ce texte. Rien n’a été sauvegardé dans ton navigateur.' : 'Results sent to Pierre (anonymously), thanks! You can also copy this text. Nothing was saved in your browser.') : (fr() ? 'Copie ce texte et envoie-le (ou fais une capture). Rien n’a été sauvegardé.' : 'Copy this text and send it (or take a screenshot). Nothing was saved.')}</p>
    <textarea readonly aria-label="${fr() ? 'Résultats' : 'Results'}" style="width:100%;height:260px;font:11px/1.35 ui-monospace,monospace;box-sizing:border-box"></textarea>
    <div class="card-actions" style="margin-top:10px"><button class="big" id="benchCopy">${fr() ? 'Copier' : 'Copy'}</button><button class="alt-btn" id="benchReload">${fr() ? 'Recharger la page' : 'Reload the page'}</button></div></div>`;
  document.body.append(o); const ta = o.querySelector('textarea'); ta.value = txt; S.paused = true;
  o.querySelector('#benchCopy').onclick = async () => { try { await navigator.clipboard.writeText(txt); o.querySelector('#benchCopy').textContent = fr() ? 'Copié ✓' : 'Copied ✓'; } catch (e) { ta.focus(); ta.select(); } };
  o.querySelector('#benchReload').onclick = () => { location.hash = ''; location.reload(); };
  window.__benchResult = { rows, txt };
  // Résultats envoyés à Pierre (mesure d'audience anonyme du site) : les mesures des vrais téléphones arrivent sans copier-coller
  const ab = { foret: 'fo', sport: 'sp', moto: 'mx', riviere: 'ri', plage: 'pl', gare: 'ga', nantes: 'na', paris: 'pa', montagne: 'mo', ile: 'il' };
  track('Bench', { fps: rows.map(r => Math.round(r.fps)).join(' '), pire: Math.round(worst.fps), zones: 'vp vb ' + Object.values(ab).join(' ') + ' soir',
    gpu: gpuName(), ecran: `${innerWidth}x${innerHeight}x${devicePixelRatio}`, hz: refreshHz() || 0, image1: ff ? +(ff.startTime / 1000).toFixed(1) : 0,
    tier: Q.tier, ua: navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 60) });
  window.__foxStats?.flush();
}

/** Branche les déclencheurs (appelé une fois par main.js, qui fournit start()). */
export function initBench(start) {
  if (/perf/.test(location.hash)) toggleHud(true);
  addEventListener('keydown', e => { if (!e.shiftKey) return; if (e.code === 'KeyP') toggleHud(); if (e.code === 'KeyB') runBench(start); });
  let taps = [];
  document.getElementById('clock')?.addEventListener('pointerdown', () => { const n = performance.now(); taps = taps.filter(t => n - t < 2500); taps.push(n); if (taps.length >= 5) { taps = []; runBench(start); } });
  if (/bench/.test(location.hash)) { const wait_ = () => window.__foxReady && S.regionsLoaded ? runBench(start) : setTimeout(wait_, 300); wait_(); }   // toutes les régions sont mesurées
  return REGIONS.length;
}
