/* =====================================================================
   Mini-jeu « Tir au renard » : tirs au but de handball, 45 secondes.
   Viser : souris / doigt (ou flèches, ZQSD) · Tirer : clic, relâcher le doigt, Espace ou E.
   Combo ×1 à ×5 sur les buts d'affilée, lucarnes à 150 points, cibles bonus (+250, +3 s),
   gardien de plus en plus vif. Meilleur score gardé, classement partagé (leaderboard.js).
   ===================================================================== */
import * as THREE from 'three';
import { SFX, audio } from './audio.js';
import { track } from './config.js';
import { camera, canvas, mergeRig, noShadowCast, scene, sph } from './engine.js';
import { fox } from './fox.js';
import { emit } from './fx.js';
import { $, toast } from './hud.js';
import { keys } from './input.js';
import { cleanPseudo, pseudoOk, submit, top } from './leaderboard.js';
import { S, rnd, saved, store, t } from './state.js';

const GW = 1.5, GH = 2;           // demi-largeur et hauteur du but (3 m × 2 m)
const DUR = 45;
/** État public (lecture seule pour les tests) : partie en cours, score, tir en vol. */
export const MG = { active: false, get score() { return st.score; }, get busy() { return !!st.shot; }, get ready() { return MG.active && !st.shot && st.cool <= 0 && st.time > 0; } };
let cfg = null, onEnd = null;

// Ballon, réticule, cible bonus
const ball = new THREE.Group(); sph(.16, '#f6efe0', 0, 0, 0, ball, 1); sph(.165, '#2563c9', 0, 0, 0, ball, 0, false).scale.set(1, .35, 1);
noShadowCast(ball); ball.visible = false; scene.add(ball); mergeRig(ball, [ball]);
const ret = new THREE.Mesh(new THREE.RingGeometry(.16, .22, 24), new THREE.MeshBasicMaterial({ color: '#e8742a', transparent: true, opacity: .9, depthTest: false }));
ret.renderOrder = 5; ret.visible = false; scene.add(ret);
const bonus = new THREE.Mesh(new THREE.RingGeometry(.22, .34, 24), new THREE.MeshBasicMaterial({ color: '#f6d36b', transparent: true, opacity: .95, depthTest: false }));
bonus.renderOrder = 5; bonus.visible = false; scene.add(bonus);

const st = { time: 0, score: 0, streak: 0, goals: 0, shots: 0, level: 1, aim: { x: 0, y: 1 }, kx: 0, kv: 0, dive: 0, shot: null, cool: 0, bonus: null, bonusCd: 6, msg: '' };

/**
 * Lance le mini-jeu. c : { gx, gz (centre du but, ouverture vers +z), keeper (personnage de foule), onEnd(res) }
 */
export function startMinigame(c, end) {
  if (MG.active) return;
  cfg = c; onEnd = end; audio();
  Object.assign(st, { time: DUR, score: 0, streak: 0, goals: 0, shots: 0, level: 1, aim: { x: 0, y: 1 }, kx: 0, kv: 0, dive: 0, shot: null, cool: .6, bonus: null, bonusCd: 5 });
  MG.active = true; S.mg = true; document.documentElement.classList.add('mg'); for (const k in keys) keys[k] = false;
  fox.pos.set(c.gx - .7, 0, c.gz + 7.2); fox.yaw = Math.PI * .92; fox.vel.set(0, 0, 0); fox.held = null;
  ret.visible = true; ball.visible = true; resetBall();
  $('#mg').hidden = false; $('#mgEnd').hidden = true; hud();
  track('Mini-jeu lancé');
}
function resetBall() { ball.position.set(cfg.gx + .35, .2, cfg.gz + 6.4); st.shot = null; }
function stop() { MG.active = false; S.mg = false; document.documentElement.classList.remove('mg'); ret.visible = bonus.visible = ball.visible = false; $('#mg').hidden = true; if (cfg?.keeper) { cfg.keeper.pos.x = cfg.gx; cfg.keeper.armL = cfg.keeper.armR = 0; } }
export function quitMinigame() { if (!MG.active) return; stop(); $('#mgEnd').hidden = true; canvas.focus(); }

function hud() {
  $('#mgTime').textContent = Math.ceil(st.time);
  $('#mgScore').textContent = st.score;
  $('#mgCombo').textContent = '×' + Math.max(1, Math.min(5, st.streak));
  $('#mgLevel').textContent = t().mgLevel(st.level);
}
function flash(text, cls = '') { const el = $('#mgFlash'); el.textContent = text; el.className = cls; void el.offsetWidth; el.classList.add('show'); }

/* ---------- Viser ---------- */
const _ray = new THREE.Raycaster(), _v2 = new THREE.Vector2(), _plane = new THREE.Plane(), _hit = new THREE.Vector3();
function aimFromScreen(cx, cy) {
  const r = canvas.getBoundingClientRect(); _v2.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
  _ray.setFromCamera(_v2, camera); _plane.set(new THREE.Vector3(0, 0, 1), -cfg.gz);
  if (_ray.ray.intersectPlane(_plane, _hit)) { st.aim.x = Math.max(-GW + .12, Math.min(GW - .12, _hit.x - cfg.gx)); st.aim.y = Math.max(.15, Math.min(GH - .12, _hit.y)); }
}
let pDown = null;
canvas.addEventListener('pointerdown', e => { if (!MG.active) return; pDown = { x: e.clientX, y: e.clientY, id: e.pointerId }; aimFromScreen(e.clientX, e.clientY); });
canvas.addEventListener('pointermove', e => { if (!MG.active) return; if (e.pointerType === 'mouse' || pDown) aimFromScreen(e.clientX, e.clientY); });
addEventListener('pointerup', e => { if (!MG.active || !pDown || e.pointerId !== pDown.id) return; pDown = null; shoot(); });
addEventListener('keydown', e => {
  if (!MG.active) return;
  if (e.code === 'Escape') { e.preventDefault(); quitMinigame(); return; }
  if (['Space', 'KeyE', 'Enter'].includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) shoot(); return; }
  if (/Arrow|Key[WASDZQ]/.test(e.code)) { e.stopImmediatePropagation(); keys[e.code] = true; }
}, true);

/* ---------- Tir ---------- */
function shoot() {
  if (!MG.active || st.shot || st.cool > 0 || st.time <= 0) return;
  st.shots++; SFX.kick(); fox.hopT = .3; fox.yapT = .2;
  const from = ball.position.clone(), to = new THREE.Vector3(cfg.gx + st.aim.x + rnd(-.06, .06), st.aim.y + rnd(-.05, .05), cfg.gz);
  st.shot = { from, to, t: 0, dur: Math.max(.32, .5 - st.level * .02) };
  // Le gardien plonge (plus ou moins bien selon le niveau)
  const guess = Math.random() < Math.min(.62, .22 + st.level * .07) ? to.x - cfg.gx : rnd(-GW, GW);
  st.dive = Math.sign(guess - st.kx) * Math.min(Math.abs(guess - st.kx), .45 + st.level * .12);
}
function resolveShot() {
  const s = st.shot, ax = s.to.x - cfg.gx, ay = s.to.y;
  const reach = Math.min(.95, .52 + st.level * .06), kx = st.kx;
  const post = Math.abs(Math.abs(ax) - GW) < .05 || ay > GH - .1;
  const saved_ = !post && Math.abs(ax - kx) < reach && ay < 1.55 + st.level * .04;
  if (post) { st.streak = 0; SFX.save(); flash(t().mgPost, 'bad'); emit(s.to.clone(), '#ffffff', { n: 8, spd: 2, up: 2 }); }
  else if (saved_) { st.streak = 0; SFX.save(); flash(t().mgSaved, 'bad'); }
  else {
    st.streak++; st.goals++;
    const corner = Math.abs(ax) > 1 && (ay > 1.35 || ay < .45);
    let pts = (corner ? 150 : 100) * Math.min(5, st.streak);
    if (st.bonus && Math.hypot(ax - st.bonus.x, ay - st.bonus.y) < .38) { pts += 250; st.time += 3; st.bonus = null; bonus.visible = false; flash(t().mgBonus, 'good'); }
    else flash(corner ? t().mgCorner : t().mgGoal, 'good');
    st.score += pts; SFX.goal(); SFX.cheer();
    emit(new THREE.Vector3(s.to.x, s.to.y, cfg.gz - .3), '#f6d36b', { n: 20, spd: 2.5, up: 3 });
    if (st.goals % 4 === 0) { st.level++; toast(t().mgLevelUp(st.level)); }
    cfg.onGoal?.(st);
  }
  st.cool = .55; hud();
}

/* ---------- Mise à jour (appelée à chaque image) ---------- */
export function updateMinigame(dt, now) {
  if (!MG.active) return;
  const k = cfg.keeper;
  // Viser au clavier
  const ix = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA || keys.KeyQ ? 1 : 0), iy = (keys.ArrowUp || keys.KeyW || keys.KeyZ ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0);
  st.aim.x = Math.max(-GW + .12, Math.min(GW - .12, st.aim.x + ix * dt * 2.4)); st.aim.y = Math.max(.15, Math.min(GH - .12, st.aim.y + iy * dt * 2));
  ret.position.set(cfg.gx + st.aim.x, st.aim.y, cfg.gz + .05); ret.scale.setScalar(1 + Math.sin(now * 8) * .08);
  // Chrono
  st.time -= dt; if (st.time <= 0 && !st.shot) { st.time = 0; finish(); return; }
  st.cool -= dt;
  // Cible bonus
  st.bonusCd -= dt;
  if (!st.bonus && st.bonusCd <= 0) { st.bonus = { x: rnd(-1.1, 1.1), y: rnd(.4, 1.6), t: 4 }; st.bonusCd = rnd(5, 8); }
  if (st.bonus) { st.bonus.t -= dt; if (st.bonus.t <= 0) st.bonus = null; }
  bonus.visible = !!st.bonus; if (st.bonus) { bonus.position.set(cfg.gx + st.bonus.x, st.bonus.y, cfg.gz + .04); bonus.rotation.z = now * 2; }
  // Gardien : suit la visée avec un temps de retard, puis plonge au tir
  const spd = 1.2 + st.level * .45;
  const target = st.shot ? st.dive : st.aim.x * Math.min(.85, .35 + st.level * .08) + Math.sin(now * (1.3 + st.level * .2)) * .5;
  if (st.shot) { st.kx += Math.sign(st.dive) * Math.min(Math.abs(st.dive) * dt * 6, Math.abs(st.dive)); st.dive *= Math.pow(.02, dt); }
  else st.kx += Math.max(-spd * dt, Math.min(spd * dt, target - st.kx));
  st.kx = Math.max(-GW + .4, Math.min(GW - .4, st.kx));
  if (k) {
    k.pos.set(cfg.gx + st.kx, 0, cfg.gz + .5); k.yaw = 0; k.moving = false;
    const up = st.shot ? -2.9 : -2.2 + Math.sin(now * 6) * .2;
    k.armL = k.armR = up; k.armLz = -.6; k.armRz = .6; k.jump = st.shot ? .3 : 0; k.lean = 0;
  }
  // Ballon
  if (st.shot && !st.shot.done) {
    const s = st.shot; s.t += dt / s.dur; const u = Math.min(1, s.t);
    ball.position.lerpVectors(s.from, s.to, u); ball.position.y += Math.sin(u * Math.PI) * .5; ball.rotation.x += dt * 20;
    if (u >= 1) { resolveShot(); s.after = .35; st.shot = { ...s, done: true }; }
  }
  if (st.shot?.done) { st.shot.after -= dt; ball.position.z -= dt * 3; ball.position.y = Math.max(.16, ball.position.y - dt * 3); if (st.shot.after <= 0) resetBall(); }
  fox.pos.set(cfg.gx - .7, 0, cfg.gz + 7.2); fox.yaw = Math.PI * .92;
  hud();
}
/** Caméra du mini-jeu (derrière le tireur). */
export function mgCamera() {
  camera.position.set(cfg.gx + .3, 4.3, cfg.gz + 12.6); camera.lookAt(cfg.gx, .75, cfg.gz);
}

/* ---------- Fin de partie ---------- */
function finish() {
  stop();
  const res = { score: st.score, goals: st.goals, shots: st.shots };
  saved.stats.goals = (saved.stats.goals || 0) + st.goals;
  const best = st.score > (saved.mgBest || 0); if (best) saved.mgBest = st.score;
  store.set(saved); track('Mini-jeu terminé', { score: st.score });
  $('#mgEndScore').textContent = st.score;
  $('#mgEndStats').textContent = t().mgStats(st.goals, st.shots, saved.mgBest);
  $('#mgNew').hidden = !best;
  $('#mgPseudo').value = saved.pseudo || '';
  $('#mgSend').disabled = st.score <= 0; $('#mgSent').textContent = '';
  $('#mgEnd').hidden = false; S.paused = true;
  renderTop();
  onEnd?.(res);
}
async function renderTop() {
  const { list, online } = await top();
  $('#mgTop').innerHTML = list.map((x, i) => `<li${x.pseudo === saved.pseudo ? ' class="me"' : ''}><b>${i + 1}</b><span></span><em>${x.score}</em></li>`).join('') || `<li class="empty">${t().lbEmpty}</li>`;
  $('#mgTop').querySelectorAll('li span').forEach((sp, i) => { sp.textContent = list[i].pseudo; });
  $('#mgOnline').textContent = online ? t().lbOnline : t().lbLocal;
}
$('#mgSend').addEventListener('click', async () => {
  const p = cleanPseudo($('#mgPseudo').value);
  if (p.length < 2) { $('#mgSent').textContent = t().mgPseudoShort; return; }
  if (!pseudoOk($('#mgPseudo').value)) { $('#mgSent').textContent = t().mgPseudoBad; return; }
  saved.pseudo = p; store.set(saved); $('#mgSend').disabled = true;
  const ok = await submit(p, st.score);
  $('#mgSent').textContent = ok ? t().mgSentOnline : t().mgSentLocal; renderTop();
});
$('#mgAgain').addEventListener('click', () => { $('#mgEnd').hidden = true; S.paused = false; startMinigame(cfg, onEnd); });
$('#mgQuit').addEventListener('click', () => { $('#mgEnd').hidden = true; S.paused = false; fox.pos.set(cfg.gx + 2.5, 0, cfg.gz + 8); canvas.focus(); });
$('#mgExit').addEventListener('click', quitMinigame);
$('#mgPseudo').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); $('#mgSend').click(); } });

/** Pour les tests : termine la partie en cours. */
export function endMinigameNow() { if (MG.active) { st.shot = null; st.time = 0; } }
