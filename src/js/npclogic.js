/* =====================================================================
   Logique des PNJ : navigation A*, perception (vue, ouïe), machine à états
   États : idle · alert · chase · bring · tired · investigate · return · search · fish · slip · shoo
   ===================================================================== */
import * as THREE from 'three';
import { alertNPC, foxForward, tire } from './actions.js';
import { SFX } from './audio.js';
import { BOUNDS, blockedAt, flat2, resolve } from './engine.js';
import { fox } from './fox.js';
import { emit } from './fx.js';
import { say } from './hud.js';
import { items } from './items.js';
import { VIEW, lines } from './npc.js';
import { S, pick, rnd, run, t } from './state.js';
import { FOUNTAIN, MUD } from './world.js';

export function lerpAngle(a, b, k) { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; }
const angDiff = (a, b) => Math.abs(((a - b + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);

/* ---------- Grilles de navigation (une par région) + A* ---------- */
const NAVS = [];
/** Crée la grille de marche/vue d'une région. Les obstacles doivent déjà être posés. */
export function makeNav(b, cs = .5) {
  const nav = { x0: b.minX, z0: b.minZ, x1: b.maxX, z1: b.maxZ, cs, run: 0 };
  nav.w = Math.ceil((b.maxX - b.minX) / cs) + 1; nav.h = Math.ceil((b.maxZ - b.minZ) / cs) + 1;
  const N = nav.w * nav.h; nav.b = new Uint8Array(N); nav.sight = new Uint8Array(N); nav.g = new Float32Array(N); nav.from = new Int32Array(N); nav.stamp = new Uint32Array(N); nav.closed = new Uint32Array(N);
  for (let iz = 0; iz < nav.h; iz++) for (let ix = 0; ix < nav.w; ix++) {
    const x = nav.x0 + ix * cs, z = nav.z0 + iz * cs;
    nav.b[iz * nav.w + ix] = blockedAt(x, z, .48) ? 1 : 0;
    nav.sight[iz * nav.w + ix] = blockedAt(x, z, .05, 1.2) ? 1 : 0;   // seuls les obstacles hauts cachent le renard
  }
  NAVS.push(nav); return nav;
}
/** Grille du village (construite au démarrage). */
export let NAV = null;
export function buildNav() { NAV = makeNav(BOUNDS); return NAV; }
/** Recalcule une grille après l'ouverture d'un passage (obstacle retiré). */
export function refreshNav(nav) { if (!nav) return; const fresh = makeNav({ minX: nav.x0, maxX: nav.x1, minZ: nav.z0, maxZ: nav.z1 }, nav.cs); NAVS.pop(); Object.assign(nav, fresh); }
/** Grille qui contient le point (ou celle du village). */
export const navAt = p => NAVS.find(n => p.x >= n.x0 && p.x <= n.x1 && p.z >= n.z0 && p.z <= n.z1) || NAV;
const cX = (nav, x) => Math.max(0, Math.min(nav.w - 1, Math.round((x - nav.x0) / nav.cs))), cZ = (nav, z) => Math.max(0, Math.min(nav.h - 1, Math.round((z - nav.z0) / nav.cs)));
const freeAt = (nav, x, z) => !nav.b[cZ(nav, z) * nav.w + cX(nav, x)];
/** Ligne de vue : seuls les obstacles hauts (murs, maisons, haies, arbres…) cachent. */
export function sightLine(a, b, nav = navAt(a)) { const d = flat2(a, b), n = Math.ceil(d / .25); for (let i = 1; i < n; i++) { const k = i / n; if (nav.sight[cZ(nav, a.z + (b.z - a.z) * k) * nav.w + cX(nav, a.x + (b.x - a.x) * k)]) return false; } return true; }
export function los(a, b, nav = navAt(a)) { const d = flat2(a, b), n = Math.ceil(d / .25); for (let i = 1; i < n; i++) { const k = i / n; if (!freeAt(nav, a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k)) return false; } return true; }
function nearestFree(nav, ix, iz) {
  if (!nav.b[iz * nav.w + ix]) return iz * nav.w + ix;
  for (let r = 1; r < 10; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; const x = ix + dx, z = iz + dz; if (x < 0 || z < 0 || x >= nav.w || z >= nav.h) continue; if (!nav.b[z * nav.w + x]) return z * nav.w + x;
  }
  return -1;
}
/** Point libre le plus proche (centre de cellule) : sert à reposer un objet hors des meubles. */
export function nearestFreePoint(p, nav = navAt(p)) { const c = nearestFree(nav, cX(nav, p.x), cZ(nav, p.z)); return c < 0 ? null : new THREE.Vector3(nav.x0 + (c % nav.w) * nav.cs, 0, nav.z0 + (c / nav.w | 0) * nav.cs); }
export function findPath(a, b, nav = navAt(a)) {
  const W = nav.w, s0 = nearestFree(nav, cX(nav, a.x), cZ(nav, a.z)), g0 = nearestFree(nav, cX(nav, b.x), cZ(nav, b.z)); if (s0 < 0 || g0 < 0) return null;
  const runId = ++nav.run, gx = g0 % W, gz = g0 / W | 0, H = i => { const dx = Math.abs(i % W - gx), dz = Math.abs((i / W | 0) - gz); return Math.max(dx, dz) + .414 * Math.min(dx, dz); };
  const heap = [[H(s0), s0]]; nav.stamp[s0] = runId; nav.g[s0] = 0; nav.from[s0] = -1; let it = 0;
  const push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= e[0]) break; heap[i] = heap[p]; i = p; } heap[i] = e; };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; const tmp = heap[i]; heap[i] = heap[m]; heap[m] = tmp; i = m; } } return top; };
  while (heap.length && it++ < 9000) {
    const [, c] = pop(); if (nav.closed[c] === runId) continue; nav.closed[c] = runId;
    if (c === g0) break;
    const cx = c % W, cz = c / W | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue; const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= W || z >= nav.h) continue; const n = z * W + x; if (nav.b[n]) continue;
      if (dx && dz && (nav.b[cz * W + x] || nav.b[z * W + cx])) continue;
      const ng = nav.g[c] + (dx && dz ? 1.414 : 1); if (nav.stamp[n] === runId && ng >= nav.g[n]) continue;
      nav.stamp[n] = runId; nav.g[n] = ng; nav.from[n] = c; push([ng + H(n), n]);
    }
  }
  if (nav.stamp[g0] !== runId) return null;
  const pts = []; for (let c = g0; c !== -1; c = nav.from[c]) pts.push(new THREE.Vector3(nav.x0 + (c % W) * nav.cs, 0, nav.z0 + (c / W | 0) * nav.cs));
  pts.reverse(); pts.push(new THREE.Vector3(b.x, 0, b.z)); return pts;
}
export function steer(n, target, speed, dt) {
  let tg = target; const nav = n.nav || NAV;
  if (nav && !los(n.pos, target, nav)) {
    n.pathT = (n.pathT || 0) - dt;
    if (!n.path || n.pathT <= 0 || flat2(n.pathGoal, target) > 1.2) { n.path = findPath(n.pos, target, nav); n.pathGoal = target.clone(); n.pathT = .7; n.pathI = 0; }
    if (n.path) { while (n.pathI < n.path.length - 1 && los(n.pos, n.path[n.pathI + 1], nav)) n.pathI++; tg = n.path[n.pathI]; }
  } else n.path = null;
  const dx = tg.x - n.pos.x, dz = tg.z - n.pos.z, d = Math.hypot(dx, dz);
  if (d < .05) return flat2(target, n.pos);
  const s = Math.min(speed * dt, d); n.pos.x += dx / d * s; n.pos.z += dz / d * s;
  n.yaw = lerpAngle(n.yaw, Math.atan2(dx, dz), Math.min(1, dt * 10)); n.walk += dt * speed * 2.6; n.moving = true;
  resolve(n.pos, n.r);
  return flat2(target, n.pos);
}

/* ---------- Perception ---------- */
const BUSY = new Set(['slip', 'fish', 'tired']);
/** Le PNJ voit-il le point p ? (cône de vue, portée réduite si le renard se faufile, obstacles) */
export function canSee(n, p, sneaking = false) {
  if (BUSY.has(n.state)) return false;
  const d = flat2(n.pos, p);
  if (d > (sneaking ? VIEW.sneakRange : VIEW.range)) return false;
  if (d < 1.1) return true;
  return angDiff(Math.atan2(p.x - n.pos.x, p.z - n.pos.z), n.yaw) < VIEW.half && sightLine(n.pos, p, n.nav || NAV);
}
export const seesFox = n => canSee(n, fox.pos, fox.sneaking);
/** Le PNJ entend-il le renard ? (course tout près ; jamais en mode discret) */
export function hearsFox(n) {
  if (fox.sneaking || BUSY.has(n.state)) return false;
  const v = Math.hypot(fox.vel.x, fox.vel.z), d = flat2(n.pos, fox.pos);
  return (v > 5.5 && d < 3) || (v > .5 && d < 1.4);
}

/* ---------- Objets perdus ---------- */
export function isLost(it) {
  if (it.gone || it.carrier || it.vel) return false;
  if (it.kind === 'prise') return !it.plugged; if (it.kind === 'chapeau') return !it.worn; if (it.kind === 'carotte') return !it.planted;
  return it.held || flat2(it.pos, it.home) > .6;
}
/** Objet que le PNJ sait perdu (il l'a vu, ou il a remarqué son absence). */
export function lostItem(n) { return items.find(it => it.owner === n && it.noticed && isLost(it)); }
/** Le PNJ découvre-t-il un objet disparu ? (vu, entendu, ou absence remarquée avec retard) */
function checkMissing(n) {
  for (const it of items) {
    if (it.owner !== n || it.noticed || !isLost(it)) continue;
    if (it.held && (canSee(n, fox.pos, fox.sneaking) || hearsFox(n))) { it.noticed = true; alertNPC(n, pick(lines(n).chase), { seen: true }); return true; }
    if (!it.held && !it.inWater && canSee(n, it.pos)) { it.noticed = true; alertNPC(n, t().search[it.kind] || t().shrug, { calm: true }); return true; }
    if (it.inWater && canSee(n, it.pos)) { it.noticed = true; alertNPC(n, pick(lines(n).hat || lines(n).chase), { calm: true }); return true; }
    if (it.missAt != null && S.time > it.missAt) { it.noticed = true; startSearch(n, it); return true; }
  }
  return false;
}
function startSearch(n, it) {
  setState(n, 'search'); n.searchItem = it; n.searchPos = it.home.clone().setY(0); n.lookT = 0;
  SFX.question(); say(n, '?', 'q', 1, 3.1, n.group.id + '!'); setTimeout(() => say(n, t().search[it.kind] || t().shrug, '', 2.2), 350);
}
/** Point du bord de la fontaine le plus proche du PNJ (pour repêcher le chapeau). */
function rimPoint(n) { const dx = n.pos.x - FOUNTAIN.x, dz = n.pos.z - FOUNTAIN.z, d = Math.hypot(dx, dz) || 1; return new THREE.Vector3(FOUNTAIN.x + dx / d * (FOUNTAIN.r + .75), 0, FOUNTAIN.z + dz / d * (FOUNTAIN.r + .75)); }

export function setState(n, s) { n.state = s; n.stateT = 0; if (s === 'chase') n.chaseT = 0; }

/* ---------- Machine à états ---------- */
export function updateNPC(n, dt) {
  n.t += dt; n.stateT += dt; n.moving = false; n.chatCd -= dt; n.cool -= dt; n.glanceCd -= dt;
  // Interdit (surpris, ou en train de secouer le poing) : il reste planté là un instant
  if (n.freezeT > 0) { n.freezeT -= dt; if (!n.seated) n.act = null; updateCone(n); animateNPC(n, dt); return; }
  const L = lines(n);
  if (n.seated) {
    n.act = Math.sin(n.t * .7 + n.pos.x) > .6 ? 'talk' : null;
    if (n.chatCd < 0 && flat2(n.pos, fox.pos) < 12) { n.chatCd = 9 + Math.random() * 8; say(n, pick(L.idle), '', 2.2); }
  }
  else if (n.state === 'idle') {
    const wp = n.route[n.routeI];
    if (n.wait > 0) { n.wait -= dt; n.act = wp.act; if (wp.yaw != null) n.yaw = lerpAngle(n.yaw, wp.yaw, Math.min(1, dt * 6)); if (n.wait <= 0) n.routeI = (n.routeI + 1) % n.route.length; }
    else { n.act = wp.act === 'phone' ? 'phone' : null; if (steer(n, wp.p, 1.3, dt) < .12) { n.wait = wp.wait; if (wp.line) say(n, t()[wp.line], '', 2.4); } }
    if (n.chatCd < 0 && flat2(n.pos, fox.pos) < 11) { n.chatCd = 10 + Math.random() * 9; say(n, pick(L.idle), '', 2.2); }
    if (n.cool <= 0) { if (lostItem(n)) setState(n, 'chase'); else if (!checkMissing(n)) glance(n); }
    if (n.idleUpdate) n.idleUpdate(n, dt);
  }
  else if (n.state === 'alert') { n.act = null; n.yaw = lerpAngle(n.yaw, Math.atan2(n.alertAt.x - n.pos.x, n.alertAt.z - n.pos.z), Math.min(1, dt * 8)); if (n.stateT > .55) setState(n, 'chase'); }
  else if (n.state === 'chase') {
    n.act = 'chase'; n.chaseT += dt;
    const it = lostItem(n);
    if (!it) setState(n, 'return');
    else if (n.chaseT > 14 && it.held) tire(n, t().giveUp);
    else if (it.inWater) {
      const rim = rimPoint(n);
      if (steer(n, rim, 3.1, dt) < .35) { setState(n, 'fish'); n.fishItem = it; }
    } else {
      const d = steer(n, it.held ? fox.pos : it.pos, (it.held ? 3.9 : 3.3) * (n.easeK || 1), dt);   // easeK : plus lent pendant la visite guidée
      if (it.held && d < 1.0) {
        fox.held = null; it.held = false; grabByNPC(n, it); SFX.drop(); say(n, t().caught, '', 1.4); run.caught++;
        fox.vel.addScaledVector(foxForward(), -7); fox.stunT = .8; SFX.stun(); say(fox, '💫', 'stun', .9, 1.7, 'stun');
      }
      else if (!it.held && d < .9) grabByNPC(n, it);
    }
  }
  else if (n.state === 'bring') {
    n.act = 'carry'; const it = n.carry;
    if (steer(n, it.bring, 2.6, dt) < .25) {
      n.carry = null; it.carrier = null; it.pos.copy(it.home); it.mesh.rotation.set(0, 0, 0); it.noticed = false; it.missAt = null;
      if (it.kind === 'carotte') it.planted = true;
      if (it.kind === 'prise') { it.plugged = true; say(n, t().replug, '', 1.6); }
      n.cool = .8; setState(n, lostItem(n) ? 'chase' : 'return');
    }
  }
  else if (n.state === 'search') {
    const it = n.searchItem;
    if (!isLost(it)) { setState(n, 'return'); }
    else if (it.held && canSee(n, fox.pos, fox.sneaking)) { alertNPC(n, pick(L.chase), { seen: true }); }
    else if (!it.held && (canSee(n, it.pos) || it.inWater)) { setState(n, 'chase'); }
    else if (steer(n, n.searchPos, 2, dt) < .4) {
      n.act = 'look'; n.lookT += dt;
      if (n.lookT > 2.6) { say(n, t().shrug, 'pant', 1.6); it.noticed = false; it.missAt = S.time + rnd(10, 16); setState(n, 'return'); n.cool = 2; }
    } else n.act = null;
  }
  else if (n.state === 'fish') {
    n.act = 'fish'; n.yaw = lerpAngle(n.yaw, Math.atan2(FOUNTAIN.x - n.pos.x, FOUNTAIN.z - n.pos.z), Math.min(1, dt * 6));
    if (Math.random() < dt * 6) emit(new THREE.Vector3(n.pos.x + Math.sin(n.yaw) * 1.1, .7, n.pos.z + Math.cos(n.yaw) * 1.1), '#bfe3f0', { n: 2, spd: 1, up: 2.5, life: .6 });
    if (n.stateT > 3.2) { const it = n.fishItem; it.inWater = false; n.fishItem = null; SFX.splashSmall(); grabByNPC(n, it); say(n, t().fishLine, '', 2); }
  }
  else if (n.state === 'slip') {
    n.act = 'slip';
    if (n.stateT > 2.6) { setState(n, 'return'); n.cool = 1.5; }
  }
  else if (n.state === 'shoo') {
    // Il chasse le renard en agitant les bras : un geste pour l'éloigner (sans l'attraper), ou il abandonne, essoufflé
    n.act = 'chase';
    if (lostItem(n)) setState(n, 'chase');
    else {
      const d = steer(n, fox.pos, 3.5, dt);
      if (d < 1.25) {
        const dx = fox.pos.x - n.pos.x, dz = fox.pos.z - n.pos.z, l = Math.hypot(dx, dz) || 1;
        fox.vel.x += dx / l * 8; fox.vel.z += dz / l * 8; fox.hopT = .3; SFX.shout();
        say(n, pick(t().shooHit), '', 1.6); n.cool = 3; setState(n, 'return');
      } else if (n.stateT > 3.2) { tire(n, pick(t().shooTired)); n.cool = 3; }
    }
  }
  else if (n.state === 'tired') { n.act = 'tired'; if (n.stateT > 2.4) { setState(n, 'return'); n.cool = 2; } }
  else if (n.state === 'investigate') { n.act = null; if (steer(n, n.inv, 3, dt) < .3) { n.act = 'check'; n.invWait -= dt; if (n.invWait <= 0) setState(n, 'return'); } }
  else if (n.state === 'return') {
    n.act = null;
    if (steer(n, n.route[n.routeI].p, 1.9, dt) < .15) { setState(n, 'idle'); n.cool = Math.max(n.cool, 1); n.diverted = false; }
    if (n.cool <= 0) { if (lostItem(n)) setState(n, 'chase'); else checkMissing(n); }
  }
  updateCone(n);
  animateNPC(n, dt);
}
/** Petit « ? » quand un PNJ aperçoit le renard qui se promène sans se cacher. */
function glance(n) {
  if (n.glanceCd > 0 || fox.sneaking || !seesFox(n) || flat2(n.pos, fox.pos) > 5) return;
  n.glanceCd = 14 + Math.random() * 8; say(n, t().suspicious, '', 1.2);
}
export function grabByNPC(n, it) {
  if (it.kind === 'chapeau') { it.worn = true; it.carrier = null; it.noticed = false; it.missAt = null; say(n, t().hatOk, '', 1.4); n.cool = .5; setState(n, lostItem(n) ? 'chase' : 'return'); return; }
  it.carrier = n; n.carry = it; setState(n, 'bring');
}
/** Le commercial glisse dans la boue (bêtise « boue »). */
export function slip(n) {
  setState(n, 'slip'); n.jump = 0; SFX.slip(); say(n, pick(t().slipLine), '', 2.2);
  const dx = MUD.x - n.pos.x, dz = MUD.z - n.pos.z, d = Math.hypot(dx, dz) || 1; n.pos.x += dx / d * Math.min(d, .9); n.pos.z += dz / d * Math.min(d, .9);
  emit(new THREE.Vector3(n.pos.x, .3, n.pos.z), '#5b3f29', { n: 22, spd: 2.4, up: 3.5 });
}

/* ---------- Cônes de vision (affichés quand le renard se faufile) ---------- */
function updateCone(n) {
  if (!n.cone) return;
  const show = fox.sneak > .5 && !BUSY.has(n.state) && flat2(n.pos, fox.pos) < 14;
  n.cone.visible = show; if (!show) return;
  n.cone.position.set(n.pos.x, .02, n.pos.z); n.cone.rotation.y = n.yaw;
  n.cone.material.color.set(seesFox(n) ? '#ff6a3d' : '#ffd23f');
}

/* ---------- Animation ---------- */
const _hp = new THREE.Vector3(), _lp = new THREE.Vector3(), _fw = new THREE.Vector3();
export function animateNPC(n, dt) {
  if (n.jump > 0) n.jump -= dt;
  if (n.flailT > 0) n.flailT -= dt; if (n.shakeT > 0) n.shakeT -= dt;
  // gestes passagers par-dessus l'activité : bras en l'air (surpris), poing levé qui tremble (agacé)
  const act = n.shakeT > 0 ? 'shake' : n.flailT > 0 && !n.seated ? 'startle' : n.act;
  const j = n.jump > 0 ? Math.sin((1 - n.jump / .5) * Math.PI) * .6 : 0;
  n.group.position.set(n.pos.x, j, n.pos.z); n.group.rotation.y = n.yaw;
  const w = n.walk, mv = n.moving, tt = n.t;
  const legA = mv ? Math.sin(w) * .6 : 0;
  // jambes et rebond lissés : à l'arrêt, le pas se termine au lieu de claquer d'un coup en position droite
  const kl = dt ? Math.min(1, dt * 14) : 1;
  n.legs[0].rotation.x += ((n.seated ? -1.4 : legA) - n.legs[0].rotation.x) * kl; n.legs[1].rotation.x += ((n.seated ? -1.4 : -legA) - n.legs[1].rotation.x) * kl;
  n.body.position.y += ((n.seated ? -.18 : (mv ? Math.abs(Math.sin(w)) * .07 : Math.sin(tt * 2) * .012)) - n.body.position.y) * kl;
  n.body.rotation.z = mv ? Math.sin(w) * .035 : 0;   // léger roulis en marchant
  let aL = mv ? -legA * .8 : 0, aR = mv ? legA * .8 : 0, zL = 0, zR = 0, lean = 0, hx = 0, hy = 0, bodyX = 0;
  switch (act) {
    case 'startle': aL = aR = -2.5; zL = -.7; zR = .7; hx = -.25; lean = -.1; break;
    case 'shake': aR = -2.9 + Math.sin(tt * 24) * .3; zR = .15; aL = -.6; zL = -.2; hx = -.08; lean = -.06; break;
    case 'chase': aL = -2.7 + Math.sin(tt * 16) * .35; aR = -2.7 - Math.sin(tt * 16) * .35; zL = -.25; zR = .25; lean = .12; break;
    case 'carry': aL = aR = -1.25; break;
    case 'phone': aL = -2.6; zL = -.5; hx = .05; break;
    case 'water': aR = -1.1 + Math.sin(tt * 3) * .08; hx = .2;
      if (dt && Math.random() < dt * 18 && n.tool) { n.tool.getWorldPosition(_hp); _hp.addScaledVector(_fw.set(Math.sin(n.yaw), 0, Math.cos(n.yaw)), .35); emit(_hp, '#9fd3ea', { n: 1, spd: .6, up: .5, life: .6, grav: 9 }); } break;
    case 'arrange': aL = aR = -1.15 + Math.sin(tt * 5) * .15; hx = .2; break;
    case 'type': aL = -1.2 + Math.sin(tt * 22) * .06; aR = -1.2 + Math.cos(tt * 25) * .06; lean = .1; hx = .1; break;
    case 'check': aR = -1.6; zR = .2; hx = .15; break;
    case 'tired': lean = .42; aL = aR = -.5; n.body.position.y = Math.sin(tt * 10) * .03; hx = -.2; break;
    case 'talk': aR = -1.3 + Math.sin(tt * 6) * .4; zR = .3; break;
    case 'look': hy = Math.sin(tt * 2.2) * .9; aL = aR = -.3; zL = -.35; zR = .35; break;
    case 'fish': lean = .55; aL = aR = -1.9 + Math.sin(tt * 4) * .25; hx = .3; break;
    case 'chop': aL = aR = -2.6 + Math.max(0, Math.sin(tt * 5)) * 1.9; hx = .25; break;
    case 'wave': aR = -2.8 + Math.sin(tt * 9) * .3; zR = .3; break;
    case 'photo': aL = aR = -1.5; zL = .25; zR = -.25; hx = -.05; break;
    case 'rod': aL = aR = -1; hx = .1; break;
    case 'sweep': aL = aR = -.8 + Math.sin(tt * 4) * .35; lean = .15; break;
    case 'cheer': aL = -2.7 + Math.sin(tt * 14) * .3; aR = -2.7 - Math.sin(tt * 14) * .3; zL = -.3; zR = .3; break;
    case 'point': aR = -1.6; hy = .3; break;
    case 'slip': bodyX = -1.35; aL = -2.8; aR = -2.4; zL = -.6; zR = .6; n.body.position.y = .05; break;
  }
  // Regard : quand le renard passe tout près, on tourne la tête vers lui (sauf occupé à autre chose)
  if (!hy && n.act !== 'slip' && n.act !== 'chase' && n.act !== 'look') {
    const dx = fox.pos.x - n.pos.x, dz = fox.pos.z - n.pos.z, d = Math.hypot(dx, dz);
    if (d < 6.5 && d > .6) { const rel = Math.atan2(Math.sin(Math.atan2(dx, dz) - n.yaw), Math.cos(Math.atan2(dx, dz) - n.yaw)); if (Math.abs(rel) < 2.1) hy = Math.max(-.9, Math.min(.9, rel)) * Math.min(1, (6.5 - d) / 2.5); }
  }
  // Respiration au repos
  n.torso.scale.y = mv ? 1 : 1 + Math.sin(tt * 2.1 + (n.pos.x % 3)) * .018;
  const k = dt ? Math.min(1, dt * 12) : 1;
  n.arms[0].rotation.x += (aL - n.arms[0].rotation.x) * k; n.arms[1].rotation.x += (aR - n.arms[1].rotation.x) * k;
  n.arms[0].rotation.z += (zL - n.arms[0].rotation.z) * k; n.arms[1].rotation.z += (zR - n.arms[1].rotation.z) * k;
  n.torso.rotation.x += (lean - n.torso.rotation.x) * k; n.head.rotation.x += (hx - n.head.rotation.x) * k; n.head.rotation.y += (hy - n.head.rotation.y) * k;
  n.body.rotation.x += (bodyX - n.body.rotation.x) * Math.min(1, (dt || .016) * 9);
  if (n.act === 'slip') { n.legs[0].rotation.x = n.legs[1].rotation.x = -1.2 + Math.sin(tt * 14) * .3; }
  _lp.set(fox.pos.x, .9, fox.pos.z); n.head.worldToLocal(_lp); _lp.normalize();
  n.eyes.position.x = Math.max(-.045, Math.min(.045, _lp.x * .06)); n.eyes.position.y = Math.max(-.035, Math.min(.035, _lp.y * .06));
  if (n.carry) { n.anchor.getWorldPosition(n.carry.pos); n.carry.mesh.rotation.y = n.yaw; }
  n.shadow.position.set(n.pos.x, .03, n.pos.z); const s = (1 - j * .5) * (n.act === 'slip' ? 1.4 : 1); n.shadow.scale.set(s, s, s);
}
