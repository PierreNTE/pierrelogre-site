/* =====================================================================
   Actions du renard : glapir, attraper, lâcher, terrier ; oiseaux
   ===================================================================== */
import * as THREE from 'three';
import { SFX } from './audio.js';
import { HOOKS } from './hooks.js';
import { CONFIG, track } from './config.js';
import { blockedAt, canvas, flat2 } from './engine.js';
import { fox } from './fox.js';
import { dirt, emit, splash } from './fx.js';
import { $, addProgress, applyLang, completeGoal, say } from './hud.js';
import { keys } from './input.js';
import { hat, interacts, items } from './items.js';
import { birds, gardener, itguy, lines, meet1, meet2, npcs, sales } from './npc.js';
import { canSee, hearsFox, nearestFreePoint, setState, slip } from './npclogic.js';
import { saveRun } from './persist.js';
import { S, pick, rnd, run, saved, t } from './state.js';
import { BURROW, COFFEE, FOUNTAIN, MUD, PRINTER, SERVER } from './world.js';

const fwd = new THREE.Vector3();
export const foxForward = () => fwd.set(Math.sin(fox.yaw), 0, Math.cos(fox.yaw));
export const inBox = (p, b) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ;
export const MEETING = { minX: 16, maxX: 29, minZ: 3, maxZ: 15 };

export function yap() {
  SFX.yap(); fox.yapT = .4; fox.idle = 0; saved.stats.yaps = (saved.stats.yaps || 0) + 1;
  for (const h of HOOKS.yap) h();
  say(fox, pick(t().yaps), 'yap', .9, 1.9);
  for (const n of npcs) {
    if (flat2(n.pos, fox.pos) >= 4.2 || n.state === 'slip') continue;
    // Le commercial au téléphone près de la flaque : il sursaute… et glisse
    if (n === sales && flat2(n.pos, MUD) < MUD.r + .9) { slip(n); completeGoal('boue'); continue; }
    if (n.onYap) { n.onYap(n); continue; }
    n.jump = .5; SFX.shout();
    if (n === gardener) {
      say(n, t().gScared, '', 1.8); completeGoal('jardinier');
      if (hat.worn) { hat.worn = false; hat.noticed = true; hat.vel = new THREE.Vector3(rnd(-1.5, 1.5), 5, rnd(-1.5, 1.5)); setTimeout(() => alertNPC(gardener, pick(lines(gardener).hat), { calm: true }), 700); }
    } else if (!n.seated && n.state === 'idle') say(n, pick(t().scared), '', 1.4);
  }
  if (inBox(fox.pos, MEETING)) { meet1.jump = meet2.jump = .5; say(meet1, t().L.meet.hit[0], '', 2.2); setTimeout(() => say(meet2, t().L.meet.hit[1], '', 2), 500); completeGoal('reunion'); }
  for (const b of birds) if (b.state === 'peck' && flat2(b.g.position, fox.pos) < 7) scare(b);
}

export function nearestTarget() {
  let best = null, bd = 1.9;
  const mouth = fox.pos.clone().addScaledVector(foxForward(), .7);
  for (const it of items) { if (it.gone || it.held || it.vel || it.inWater || (it.kind === 'chapeau' && it.worn)) continue; const d = flat2(it.pos, mouth); if (d < bd) { bd = d; best = it; } }
  for (const ia of interacts) { if (ia.when && !ia.when()) continue; const d = flat2(ia.pos, fox.pos); if (d < ia.r && d < bd + .3) { bd = d; best = ia; } }
  return best;
}
export function grabOrDrop() {
  fox.idle = 0;
  if (fox.stunT > 0) return;
  if (fox.held) { dropHeld(); return; }
  const it = nearestTarget(); if (!it) return;
  if (it.kind === 'printer') { startPrint(); return; }
  if (it.action) { it.action(it); return; }
  if (it.carrier) { const n = it.carrier; n.carry = null; it.carrier = null; it.noticed = true; setState(n, 'chase'); say(n, t().steal, '', 1.4); }
  it.held = true; fox.held = it; SFX.grab(); fox.hopT = .3; fox.grabT = .35;
  if (it.kind === 'carotte' && it.planted) { it.planted = false; SFX.pull(); dirt(it.pos); addProgress('carottes', it.id); }
  if (it.kind === 'prise' && it.plugged) { it.plugged = false; serverDown(); }
  if (it.kind === 'chapeau') completeGoal('chapeau');
  if (it.onGrab) it.onGrab(it);
  if (it.kind === 'mug' && !it.seen) { it.seen = true; say({ anchor: new THREE.Vector3(fox.pos.x, 2.4, fox.pos.z) }, t().eggs.mug, 'note', 3.2, 0, 'egg'); }
  noticeTheft(it);
}
/** Vol vu ou entendu → poursuite. Sinon le propriétaire remarquera l'absence plus tard. */
function noticeTheft(it) {
  const n = it.owner; if (!n || it.gone || it.noticed) { if (n && it.noticed && !['chase', 'alert', 'bring'].includes(n.state)) alertNPC(n, pick(lines(n).chase), { seen: true }); return; }
  if (canSee(n, fox.pos, fox.sneaking) || hearsFox(n)) { it.noticed = true; alertNPC(n, it.kind === 'chapeau' ? pick(lines(n).hat) : pick(lines(n).chase), { seen: true }); }
  else { it.noticed = false; it.missAt = S.time + (it.kind === 'prise' ? rnd(2.5, 4) : rnd(4, 8)); }
}
/**
 * Le PNJ réagit. seen : il a vu le renard faire une bêtise (compte pour le succès « Ombre »).
 * calm : il a juste remarqué un objet déplacé (« ? » au lieu de « ! »).
 */
export function alertNPC(n, line, { seen = false, calm = false } = {}) {
  if (n.state === 'alert' || n.state === 'chase' || n.state === 'slip' || n.state === 'fish') return;
  setState(n, 'alert'); n.alertAt = (seen ? fox.pos : (lostTarget(n) || fox.pos)).clone();
  n.jump = calm ? 0 : .35;
  if (calm) { SFX.question(); say(n, '?', 'q', .9, 3.1, n.group.id + '!'); }
  else { SFX.pop(); say(n, '!', 'excl', .8, 3.1, n.group.id + '!'); }
  if (seen) { run.alerts++; saveRun(); }
  if (line) setTimeout(() => say(n, line, '', 1.8), 350);
}
const lostTarget = n => { const it = items.find(i => i.owner === n && i.noticed && !i.gone); return it && it.pos; };

export function dropHeld() {
  const it = fox.held; if (!it) return; fox.held = null; it.held = false; SFX.drop(); fox.grabT = .3;   // la tête plonge pour poser l'objet
  const raw = fox.pos.clone().addScaledVector(foxForward(), .85).setY(0);
  const intoFountain = (it.kind === 'mug' || it.kind === 'chapeau') && flat2(raw, FOUNTAIN) < FOUNTAIN.r + .7;
  const intoCoffee = it.kind === 'carotte' && flat2(raw, COFFEE.mouth) < 1.7;
  let p = raw;
  if (!intoFountain && !intoCoffee && blockedAt(raw.x, raw.z, .22)) {
    // Objet lâché contre un meuble : on le pose à l'endroit libre le plus proche, côté renard
    p = null;
    for (let k = .7; k >= 0; k -= .15) { const q = fox.pos.clone().addScaledVector(foxForward(), k).setY(0); if (!blockedAt(q.x, q.z, .22)) { p = q; break; } }
    if (!p) p = nearestFreePoint(fox.pos) || fox.pos.clone().setY(0);
  }
  it.pos.copy(p); it.mesh.rotation.set(0, fox.yaw, 0);
  onItemPlaced(it);
}
export function onItemPlaced(it) {
  for (const h of HOOKS.place) if (h(it)) return;
  if (it.kind === 'mug' && flat2(it.pos, FOUNTAIN) < FOUNTAIN.r + .7) {
    it.gone = true; it.sinking = 1; it.pos.set(FOUNTAIN.x + (it.pos.x - FOUNTAIN.x) * .6, .6, FOUNTAIN.z + (it.pos.z - FOUNTAIN.z) * .6); SFX.splash(); splash(it.pos);
    say({ anchor: new THREE.Vector3(FOUNTAIN.x, 2.8, FOUNTAIN.z) }, t().plouf, '', 1.4, 0, 'fountain'); completeGoal('mug'); giveUp(it, t().mugGone);
    return;
  }
  if (it.kind === 'chapeau' && flat2(it.pos, FOUNTAIN) < FOUNTAIN.r + .7) {
    // Le chapeau flotte : le jardinier devra venir le repêcher
    const dx = it.pos.x - FOUNTAIN.x, dz = it.pos.z - FOUNTAIN.z, d = Math.hypot(dx, dz) || 1;
    it.inWater = true; it.floatPos = new THREE.Vector3(FOUNTAIN.x + dx / d * 1.25, .64, FOUNTAIN.z + dz / d * 1.25); it.pos.copy(it.floatPos);
    SFX.splash(); splash(it.pos); completeGoal('chapeauEau');
    if (!it.noticed) it.missAt = Math.min(it.missAt ?? Infinity, S.time + rnd(2, 4));
    return;
  }
  if (it.kind === 'carotte' && flat2(it.pos, COFFEE.mouth) < 1.7) {
    it.gone = true; it.mesh.visible = false; SFX.slurp(); S.coffeeShake = 1; emit(new THREE.Vector3(COFFEE.x - .4, 1.3, COFFEE.z + .4), '#6b4429', { n: 16, spd: 1.2, up: 3 });
    run.eatenCarrots.push(it.id);
    setTimeout(() => say(sales, t().L.sales.cafe, '', 2.4), 400); completeGoal('cafe'); giveUp(it);
    return;
  }
  if (it.kind === 'prise' && flat2(it.pos, { x: SERVER.socket.x, z: SERVER.socket.z + .12 }) < .9) plugBack(it);
  if (it.kind === 'carotte') it.pos.y = .08;
  if (it.kind === 'chapeau') it.pos.y = .03;
}
export function giveUp(it, line) { const n = it.owner; if (n && ['chase', 'alert'].includes(n.state)) tire(n, line); }
export function tire(n, line) { setState(n, 'tired'); say(n, line || t().pant, line ? '' : 'pant', 2, 2.5); if (line) setTimeout(() => say(n, t().pant, 'pant', 1.6), 2000); }
function serverDown() {
  SFX.alarm(); say({ anchor: new THREE.Vector3(SERVER.x, 3.4, SERVER.z) }, t().alarm, 'alarm', 2.6, 0, 'server'); completeGoal('serveur');
  // Bêtise en chaîne : l'informaticien est parti voir l'imprimante et ne voit rien
  if (itguy.diverted && !canSee(itguy, fox.pos, fox.sneaking)) completeGoal('diversion');
}
export function plugBack(it) { it.plugged = true; it.noticed = false; it.missAt = null; it.pos.set(SERVER.socket.x, SERVER.socket.y, SERVER.socket.z + .12); it.mesh.rotation.set(0, 0, 0); }
export function startPrint() {
  if (S.printing > 0) return; S.printing = 3.2; SFX.printer(); completeGoal('imprimante');
  setTimeout(() => {
    if (!['idle', 'return'].includes(itguy.state)) return; itguy.jump = .4; say(itguy, '!', 'excl', .8, 3.1, 'it!'); setTimeout(() => say(itguy, t().L.it.print, '', 2.2), 300);
    setState(itguy, 'investigate'); itguy.diverted = true; itguy.inv = new THREE.Vector3(PRINTER.x + 1.3, 0, PRINTER.z - 1.1); itguy.invWait = 5;
  }, 600);
}

/** Destination utile de l'objet porté (anneau au sol + flèche), ou null. */
export function destinationFor(it) {
  if (!it) return null;
  for (const h of HOOKS.dest) { const d = h(it); if (d) return d; }
  if ((it.kind === 'mug' && !run.done.mug) || (it.kind === 'chapeau' && !run.done.chapeauEau)) return { key: 'fontaine', pos: new THREE.Vector3(FOUNTAIN.x, 0, FOUNTAIN.z), r: FOUNTAIN.r + .35 };
  if (it.kind === 'carotte' && !run.done.cafe) return { key: 'cafe', pos: COFFEE.mouth.clone(), r: .9 };
  if (it.kind === 'baguette' && !run.done.baguette) return { key: 'terrier', pos: new THREE.Vector3(BURROW.x, 0, BURROW.z - .2), r: .9 };
  return null;
}

/* ---------- Oiseaux ---------- */
export function scare(b) { if (b.onScare) b.onScare(b); b.state = 'fly'; b.t = 0; const a = Math.atan2(b.g.position.x - fox.pos.x, b.g.position.z - fox.pos.z) + rnd(-.5, .5); b.vel.set(Math.sin(a) * 4, 3.2, Math.cos(a) * 4); b.g.rotation.y = a; SFX.flutter(); }
export function updateBirds(dt) {
  const v = Math.hypot(fox.vel.x, fox.vel.z);
  for (const b of birds) {
    b.t += dt;
    if (b.state === 'peck') {
      b.hd.position.y = -Math.max(0, Math.sin(b.t * 4 + b.home.x)) * .12; b.wings.forEach(w => w.rotation.z = 0);
      if (Math.random() < dt * .3) b.g.rotation.y += rnd(-1, 1);
      if (flat2(b.g.position, fox.pos) < (v > 5 ? 5 : 2.6) && v > .5 && !fox.sneaking) scare(b);
    } else if (b.state === 'fly') {
      b.g.position.addScaledVector(b.vel, dt); b.vel.y += dt * .6; b.wings.forEach((w, i) => w.rotation.z = (i ? 1 : -1) * Math.sin(b.t * 30) * .9);
      if (b.t > 5) { b.state = 'gone'; b.g.visible = false; b.t = 0; }
    } else if (b.state === 'gone' && b.t > 10 && flat2(b.home, fox.pos) > 8 && !b.noReturn) { b.state = 'peck'; b.g.visible = true; b.g.position.copy(b.home); }
    b.sh.visible = b.g.visible; b.sh.position.set(b.g.position.x, .03, b.g.position.z); const s = Math.max(.2, 1 - b.g.position.y * .12); b.sh.scale.set(s, s, s);
  }
}

/* ---------- Terrier ---------- */
let inBurrowZone = false;
export function checkBurrow() {
  const d = flat2(fox.pos, BURROW);
  if (d < .85 && !inBurrowZone) {
    inBurrowZone = true;
    if (fox.held && fox.held.kind === 'baguette') { const b = fox.held; fox.held = null; b.held = false; b.gone = true; b.mesh.visible = false; run.loot = true; completeGoal('baguette'); giveUp(b); }
    completeGoal('terrier'); if (HOOKS.enterDen) HOOKS.enterDen(); else openBurrow();   // la salle souterraine (regions/terrier.js)
  } else if (d > 1.6) inBurrowZone = false;
}
export function openBurrow() { if (S.mg) return; track('Terrier ouvert'); S.paused = true; for (const k in keys) keys[k] = false; applyLang(false); $('#burrow').hidden = false; $('#burrow').scrollTop = 0; $('#outBtn').focus({ preventScroll: true }); }
export function closeBurrow() {
  $('#burrow').hidden = true; canvas.focus();
  if (!$('#intro').hidden || !$('#endCard').hidden) return;
  S.paused = false;
  if (flat2(fox.pos, BURROW) < 1.6) { fox.pos.set(BURROW.x, 0, BURROW.z - 1.9); fox.yaw = Math.PI; }
}
$('#liBtn').href = CONFIG.linkedin; $('#liChip').href = CONFIG.linkedin; $('#ghBtn').href = CONFIG.github;
if (CONFIG.cvPdf) { $('#cvBtn').href = CONFIG.cvPdf; $('#cvBtn').hidden = false; }
$('#outBtn').addEventListener('click', closeBurrow); $('#bClose').addEventListener('click', closeBurrow);
$('#whoBtn').addEventListener('click', openBurrow);
HOOKS.openProfile = openBurrow;
HOOKS.dropHeld = () => dropHeld();
['#liChip', '#liBtn'].forEach(s => $(s).addEventListener('click', () => track('Clic LinkedIn', { depuis: s === '#liChip' ? 'bouton' : 'terrier' })));
$('#ghBtn').addEventListener('click', () => track('Clic GitHub'));
