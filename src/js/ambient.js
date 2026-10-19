/* =====================================================================
   Vie ambiante : ce qui bouge même quand le joueur ne fait rien.
   - papillons (plus nombreux à mesure que le monde avance), qui fuient le renard pressé ;
   - vols d'oiseaux en V qui traversent le ciel de temps en temps ;
   - fumée des cheminées, poussières et pollens dans l'air ;
   - petites bêtes : lapin, hérisson (qui se roule en boule), grenouille de l'étang ;
   - un événement rare : une montgolfière passe au-dessus du monde.
   Tout est dessiné en instances ou en quelques maillages : coût fixe et faible.
   ===================================================================== */
import * as THREE from 'three';
import { SFX } from './audio.js';
import { RM, VC, blob, box, cam, cone, cyl, flat2, mergeRig, noShadowCast, partGeometry, scene, sph } from './engine.js';
import { fox } from './fox.js';
import { emit } from './fx.js';
import { say } from './hud.js';
import { Q } from './quality.js';
import { GOALS, S, pick, rnd, run, t } from './state.js';
import { CHIMNEYS } from './world.js';

const _o = new THREE.Object3D(), _c = new THREE.Color(), _tv = new THREE.Vector3(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
const done = () => GOALS.filter(g => run.done[g.id]).length;

/* ---------- Papillons ---------- */
const BF_MAX = 28;
const wingGeo = new THREE.PlaneGeometry(.22, .17).translate(.11, 0, 0).rotateX(-Math.PI / 2);
const wings = new THREE.InstancedMesh(wingGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), BF_MAX * 2);
wings.instanceMatrix.setUsage(THREE.DynamicDrawUsage); wings.frustumCulled = false; wings.count = 0; scene.add(wings);
const BF_COL = ['#f6d36b', '#f5f0e6', '#f2b8c6', '#e8742a', '#b9a5e8', '#8fc9df'];
const flies = [...Array(BF_MAX)].map((_, i) => { const c = _c.set(BF_COL[i % BF_COL.length]); wings.setColorAt(i * 2, c); wings.setColorAt(i * 2 + 1, c); return { p: new THREE.Vector3(), v: new THREE.Vector3(), goal: new THREE.Vector3(), ph: rnd(0, 6), t: 0, alive: false }; });
wings.instanceColor.needsUpdate = true;
function respawn(b) { b.p.set(cam.target.x + rnd(-18, 18), rnd(.6, 1.6), cam.target.z + rnd(-14, 12)); b.goal.copy(b.p); b.alive = true; b.t = 0; }
function updateFlies(dt, now) {
  const mood = S.mood || {}, k = mood.life ?? 1;
  const want = Math.min(BF_MAX, Math.round((5 + done() / 3) * k * (Q.tier === 2 ? .4 : Q.tier === 1 ? .7 : 1)));
  let n = 0;
  for (let i = 0; i < BF_MAX; i++) {
    const b = flies[i];
    if (i >= want) { b.alive = false; continue; }
    if (!b.alive || flat2(b.p, cam.target) > 26) respawn(b);
    b.t -= dt;
    // Le renard pressé les fait s'envoler
    const d = flat2(b.p, fox.pos), fast = Math.hypot(fox.vel.x, fox.vel.z) > 3;
    if (d < 2.4 && fast) { b.goal.set(b.p.x + (b.p.x - fox.pos.x) * 2, rnd(1.8, 3), b.p.z + (b.p.z - fox.pos.z) * 2); b.t = 2; }
    else if (b.t <= 0) { b.goal.set(b.p.x + rnd(-3, 3), rnd(.5, 1.6), b.p.z + rnd(-3, 3)); b.t = rnd(1.5, 4); }
    b.v.lerp(_tv.copy(b.goal).sub(b.p).clampLength(0, 1.4), Math.min(1, dt * 2));
    b.p.addScaledVector(b.v, dt); b.p.y += Math.sin(now * 3 + b.ph) * dt * .3;
    const flap = Math.sin(now * 18 + b.ph) * 1.1, yaw = Math.atan2(b.v.x, b.v.z);
    for (const s of [1, -1]) {
      _o.position.copy(b.p); _o.rotation.set(0, yaw, 0); _o.rotateZ(s * flap); _o.scale.set(s, 1, 1); _o.updateMatrix();
      wings.setMatrixAt(n++, _o.matrix);
    }
  }
  wings.count = n; wings.instanceMatrix.needsUpdate = true;
}

/* ---------- Oiseaux en V au loin ---------- */
const birdGeo = (() => { const g = new THREE.Group(); const l = box(.9, .05, .22, '#4a4a52', -.4, 0, 0, g, false); l.rotation.y = .5; const r = box(.9, .05, .22, '#4a4a52', .4, 0, 0, g, false); r.rotation.y = -.5; return partGeometry(g, new Set(), false).geo; })();
const vBirds = new THREE.InstancedMesh(birdGeo, VC, 7); vBirds.frustumCulled = false; vBirds.count = 0; scene.add(vBirds);
const flight = { on: false, t: 0, cd: rnd(15, 30), p: new THREE.Vector3(), dir: new THREE.Vector3() };
function updateFlight(dt, now) {
  if (!flight.on) { flight.cd -= dt; if (flight.cd <= 0 && (S.mood?.life ?? 1) > .3) { flight.on = true; flight.t = 0; const a = rnd(0, Math.PI * 2); flight.dir.set(Math.cos(a), 0, Math.sin(a)); flight.p.set(cam.target.x - flight.dir.x * 45, rnd(11, 15), cam.target.z - flight.dir.z * 45); } vBirds.count = 0; return; }
  flight.t += dt; flight.p.addScaledVector(flight.dir, dt * 6);
  const yaw = Math.atan2(flight.dir.x, flight.dir.z);
  for (let i = 0; i < 7; i++) { const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; _o.position.set(flight.p.x, flight.p.y + Math.sin(now * 2 + i) * .2, flight.p.z); _o.rotation.set(0, yaw, 0); _o.translateX(row * side * 1.3); _o.translateZ(-row * 1.4); _o.scale.set(1, 1 + Math.sin(now * 8 + i) * .6, 1); _o.updateMatrix(); vBirds.setMatrixAt(i, _o.matrix); }
  vBirds.count = 7; vBirds.instanceMatrix.needsUpdate = true;
  if (flight.t > 16) { flight.on = false; flight.cd = rnd(35, 70); }
}

/* ---------- Poussières / pollens dans l'air (près de la caméra) ---------- */
const MOTES = 36;
const motes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.035, 0), new THREE.MeshBasicMaterial({ color: '#fff6d6', transparent: true, opacity: .75 }), MOTES);
motes.frustumCulled = false; scene.add(motes);
const M = [...Array(MOTES)].map(() => ({ p: new THREE.Vector3(rnd(-15, 15), rnd(.4, 4), rnd(-12, 12)), ph: rnd(0, 6) }));
function updateMotes(dt, now) {
  const on = (S.mood?.motes ?? 1) > 0 && Q.tier < 2 && !RM; motes.visible = on; if (!on) return;
  for (let i = 0; i < MOTES; i++) {
    const m = M[i]; m.p.x += Math.sin(now * .3 + m.ph) * dt * .25 + dt * .12; m.p.y += Math.sin(now * .5 + m.ph * 2) * dt * .08; m.p.z += Math.cos(now * .25 + m.ph) * dt * .2;
    const wx = cam.target.x + ((m.p.x % 30) + 45) % 30 - 15, wz = cam.target.z + ((m.p.z % 24) + 36) % 24 - 12;
    _o.position.set(wx, m.p.y, wz); _o.rotation.set(0, 0, 0); _o.scale.setScalar(.7 + .5 * Math.sin(now * 2 + m.ph)); _o.updateMatrix(); motes.setMatrixAt(i, _o.matrix);
  }
  motes.instanceMatrix.needsUpdate = true;
}

/* ---------- Fumée des cheminées ---------- */
let smokeAcc = 0;
function updateSmoke(dt) {
  smokeAcc += dt; if (smokeAcc < .35) return; smokeAcc = 0;
  for (const c of CHIMNEYS) if (flat2(c, cam.target) < 30) emit(c.clone().add(new THREE.Vector3(rnd(-.08, .08), 0, rnd(-.08, .08))), pick(['#ece8e2', '#f6f4ef', '#dedad3']), { n: 1, spd: .25, up: .9, life: 3.4, grav: -.15, size: 1.8 });
}

/* ---------- Petites bêtes ---------- */
const critters = [];
function rig(build) { const g = new THREE.Group(); build(g); noShadowCast(g); scene.add(g); mergeRig(g, [g]); return g; }
/** Lapin : broute, puis détale en bondissant si le renard approche, et se cache. */
export function addRabbit(area) {
  const g = rig(g => { const b = sph(.26, '#c9b49a', 0, .28, 0, g, 1); b.scale.set(.85, .8, 1.15); sph(.17, '#c9b49a', 0, .46, .25, g, 1); [-1, 1].forEach(s => { const e = cone(.06, .38, '#c9b49a', s * .07, .72, .2, 4, g); e.rotation.z = s * .15; }); sph(.08, '#f6efe0', 0, .3, -.3, g, 0, false); sph(.025, '#2f2a24', .08, .5, .38, g, 0, false); sph(.025, '#2f2a24', -.08, .5, .38, g, 0, false); });
  const c = { kind: 'rabbit', g, area, p: new THREE.Vector3(rnd(area.minX, area.maxX), 0, rnd(area.minZ, area.maxZ)), goal: null, flee: 0, hop: 0, yaw: 0, hidden: 0, sh: blob(.32) };
  critters.push(c); return c;
}
/** Hérisson : trottine, se roule en boule quand le renard est tout près. */
export function addHedgehog(area) {
  const g = rig(g => { const b = sph(.3, '#6b5440', 0, .25, 0, g, 1); b.scale.set(1, .8, 1.25); for (let i = 0; i < 14; i++) { const a = rnd(0, Math.PI * 2), y = rnd(.25, .5); const sp = cone(.05, .2, '#4a3a2a', Math.cos(a) * .22, y, Math.sin(a) * .28 - .05, 3, g, false); sp.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9); } sph(.12, '#c9a982', 0, .2, .34, g, 1); sph(.03, '#2f2a24', 0, .2, .47, g, 0, false); });
  const c = { kind: 'hedgehog', g, area, p: new THREE.Vector3(rnd(area.minX, area.maxX), 0, rnd(area.minZ, area.maxZ)), goal: null, curl: 0, yaw: 0, sh: blob(.32) };
  critters.push(c); return c;
}
/** Grenouille : saute dans l'étang quand on approche (plouf). */
export function addFrog(x, z, pond) {
  const g = rig(g => { const b = sph(.16, '#6fa045', 0, .14, 0, g, 1); b.scale.set(1, .7, 1.1); [-1, 1].forEach(s => { sph(.06, '#f6efe0', s * .08, .26, .1, g, 0, false); sph(.03, '#2f2a24', s * .08, .28, .14, g, 0, false); }); });
  const c = { kind: 'frog', g, home: new THREE.Vector3(x, 0, z), p: new THREE.Vector3(x, 0, z), pond, state: 'sit', t: 0, sh: blob(.2) };
  critters.push(c); return c;
}
function updateCritters(dt, now) {
  for (const c of critters) {
    const far = flat2(c.p, cam.target) > 40; c.g.visible = !far && !c.hidden; c.sh.visible = c.g.visible;
    if (far) continue;
    const d = flat2(c.p, fox.pos);
    if (c.kind === 'rabbit') {
      if (c.hidden > 0) { c.hidden -= dt; if (c.hidden <= 0) { c.p.set(rnd(c.area.minX, c.area.maxX), 0, rnd(c.area.minZ, c.area.maxZ)); } continue; }
      if (d < 5 && !fox.sneaking && c.flee <= 0) { c.flee = 2.4; const a = Math.atan2(c.p.x - fox.pos.x, c.p.z - fox.pos.z); c.goal = new THREE.Vector3(c.p.x + Math.sin(a) * 9, 0, c.p.z + Math.cos(a) * 9); if (d < 3) say({ anchor: c.p.clone().setY(1.2) }, '!', 'excl', .6, 0, 'rab' + critters.indexOf(c)); }
      if (!c.goal || flat2(c.p, c.goal) < .3) { c.goal = Math.random() < .5 ? null : new THREE.Vector3(c.p.x + rnd(-3, 3), 0, c.p.z + rnd(-3, 3)); }
      const speed = c.flee > 0 ? 6 : 1.4;
      if (c.flee > 0) { c.flee -= dt; if (c.flee <= 0) c.hidden = rnd(6, 12); }
      if (c.goal) { const dx = c.goal.x - c.p.x, dz = c.goal.z - c.p.z, l = Math.hypot(dx, dz); c.hop += dt * (c.flee > 0 ? 9 : 5); if (l > .05) { c.p.x += dx / l * Math.min(l, speed * dt); c.p.z += dz / l * Math.min(l, speed * dt); c.yaw = Math.atan2(dx, dz); } }
      c.p.x = Math.max(c.area.minX, Math.min(c.area.maxX, c.p.x)); c.p.z = Math.max(c.area.minZ, Math.min(c.area.maxZ, c.p.z));
      const hop = c.goal ? Math.abs(Math.sin(c.hop)) * (c.flee > 0 ? .5 : .2) : 0;
      c.g.position.set(c.p.x, hop, c.p.z); c.g.rotation.set(c.goal ? 0 : Math.sin(now * 3) * .05, c.yaw, 0);
    } else if (c.kind === 'hedgehog') {
      const scared = d < 2.2; c.curl += ((scared ? 1 : 0) - c.curl) * Math.min(1, dt * 6);
      if (!scared) { if (!c.goal || flat2(c.p, c.goal) < .2) c.goal = new THREE.Vector3(Math.max(c.area.minX, Math.min(c.area.maxX, c.p.x + rnd(-4, 4))), 0, Math.max(c.area.minZ, Math.min(c.area.maxZ, c.p.z + rnd(-4, 4)))); const dx = c.goal.x - c.p.x, dz = c.goal.z - c.p.z, l = Math.hypot(dx, dz); c.p.x += dx / l * dt * .7; c.p.z += dz / l * dt * .7; c.yaw = Math.atan2(dx, dz); }
      if (scared && !c.said) { c.said = true; say({ anchor: c.p.clone().setY(1) }, t().amb?.hedgehog || '…', 'note', 1.6, 0, 'hh'); } if (!scared) c.said = false;
      c.g.position.set(c.p.x, Math.sin(now * 12) * .02 * (1 - c.curl), c.p.z); c.g.rotation.set(c.curl * 1.2, c.yaw, 0); c.g.scale.set(1, 1 - c.curl * .25, 1 - c.curl * .3);
    } else if (c.kind === 'frog') {
      c.t -= dt;
      if (c.state === 'sit' && d < 3.2) { c.state = 'jump'; c.t = .6; c.from = c.p.clone(); }
      if (c.state === 'jump') { const k = 1 - c.t / .6; c.p.lerpVectors(c.from, c.pond, Math.min(1, k)); c.g.position.set(c.p.x, Math.sin(Math.min(1, k) * Math.PI) * .9, c.p.z); if (c.t <= 0) { c.state = 'gone'; c.t = rnd(8, 14); c.g.visible = false; c.hidden = 1; SFX.splashSmall(); emit(c.pond.clone().setY(.3), '#bfe3f0', { n: 8, spd: 1.2, up: 2 }); } }
      else if (c.state === 'gone') { if (c.t <= 0 && d > 6) { c.state = 'sit'; c.hidden = 0; c.p.copy(c.home); } }
      else c.g.position.set(c.p.x, Math.abs(Math.sin(now * 1.3)) < .05 ? .05 : 0, c.p.z);
      c.g.rotation.y = Math.atan2(c.pond.x - c.home.x, c.pond.z - c.home.z) + Math.PI;
    }
    c.sh.position.set(c.p.x, .03, c.p.z);
  }
}

/* ---------- Événement rare : la montgolfière ---------- */
const balloon = rig(g => { const e = sph(2.2, '#e8742a', 0, 3.4, 0, g, 1); e.scale.set(1, 1.15, 1); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; box(.25, 4.2, .05, '#f6efe0', Math.cos(a) * 2.05, 3.4, Math.sin(a) * 2.05, g, false).rotation.y = -a; } [-1, 1].forEach(s => cone(.5, .9, '#e8742a', s * 1, 6.1, .2, 4, g)); box(.9, .6, .9, '#a8764a', 0, .3, 0, g); [-1, 1].forEach(s => cyl(.02, .02, 1.4, '#5a4a3a', s * .4, 1.1, 0, 3, g, false)); });
balloon.visible = false;
const BAL = { on: false, cd: rnd(150, 260), p: new THREE.Vector3(), dir: new THREE.Vector3() };
function updateBalloon(dt, now) {
  if (BAL.on && (S.mood?.life ?? 1) === 0) { BAL.on = false; balloon.visible = false; BAL.cd = rnd(60, 120); }   // pas de montgolfière sous terre
  if (!BAL.on) { BAL.cd -= dt; if (BAL.cd <= 0 && S.started && (S.mood?.life ?? 1) > 0) { BAL.on = true; const a = rnd(0, Math.PI * 2); BAL.dir.set(Math.cos(a), 0, Math.sin(a)); BAL.p.set(cam.target.x - BAL.dir.x * 40, 13, cam.target.z - BAL.dir.z * 40 - 8); balloon.visible = true; } return; }
  BAL.p.addScaledVector(BAL.dir, dt * 1.6); balloon.position.set(BAL.p.x, BAL.p.y + Math.sin(now * .6) * .4, BAL.p.z); balloon.rotation.y = now * .05;
  if (Math.random() < dt * .4) emit(new THREE.Vector3(BAL.p.x, BAL.p.y + 1.2, BAL.p.z), '#ffb36b', { n: 2, spd: .3, up: 1.2, life: .5, grav: -1 });
  if (flat2(BAL.p, cam.target) > 60) { BAL.on = false; balloon.visible = false; BAL.cd = rnd(240, 420); }
}

/** À appeler à chaque image. */
export function updateAmbient(dt, now) {
  if (!dt) return;
  updateFlies(dt, now); updateFlight(dt, now); updateMotes(dt, now); updateSmoke(dt); updateCritters(dt, now); updateBalloon(dt, now);
}
export const balloonDebug = () => { BAL.cd = 0; };
