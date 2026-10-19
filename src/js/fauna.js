/* =====================================================================
   Faune : animaux en petits troupeaux dessinés en instances (coût fixe : 2 appels de dessin par
   pièce animée, quel que soit le nombre de bêtes). Chaque troupeau a son comportement et réagit
   au renard : poules qui s'enfuient en caquetant, canards qui filent vers l'autre rive, vaches
   qui le regardent passer, crabes qui rentrent dans la mer, hirondelles autour des toits,
   et un chat qui dort sur la margelle du puits.
   ===================================================================== */
import * as THREE from 'three';
import { RM, VC, blob, blockedAt, box, cam, cone, cyl, flat2, mergeRig, noShadowCast, outlineMat, partGeometry, resolve, scene, sph } from './engine.js';
import { fox } from './fox.js';
import { SFX } from './audio.js';
import { emit } from './fx.js';
import { say } from './hud.js';
import { pick, rnd, t } from './state.js';

const _m = new THREE.Matrix4(), _p = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const geo = build => { const g = new THREE.Group(); build(g); return partGeometry(g, new Set(), false); };

/**
 * Troupeau : pièces { geo, ol, pivot } (la première est le corps ; les suivantes s'articulent au pivot,
 * par exemple la tête qui picore). Chaque bête : { p, yaw, pitch, parts: [rotX…], y, s, tint }.
 */
function herd(parts, max) {
  const bound = new THREE.Sphere(new THREE.Vector3(), 1);   // découpage par la caméra, recalculé à chaque image
  const meshes = parts.map(pt => {
    const m = new THREE.InstancedMesh(pt.geo, VC, max); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
    const o = pt.ol ? new THREE.InstancedMesh(pt.ol, outlineMat, max) : null;
    for (const x of [m, o]) if (x) { x.boundingSphere = bound; x.count = 0; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(x); }
    m.receiveShadow = true; return { m, o, pivot: pt.pivot || [0, 0, 0] };
  });
  const H = { list: [], meshes, max, add(a) { const i = H.list.length; a.i = i; a.y ??= 0; a.s ??= 1; a.pitch ??= 0; a.roll ??= 0; a.rot ??= parts.map(() => 0); a.sh = blob(a.shadow ?? .3); H.list.push(a);
    _c.set(a.tint || '#ffffff'); for (const { m } of meshes) { m.setColorAt(i, _c); m.instanceColor.needsUpdate = true; } return a; } };
  H.draw = visible => {
    const n = visible ? H.list.length : 0;
    for (let k = 0; k < meshes.length; k++) {
      const { m, o, pivot } = meshes[k];
      for (let i = 0; i < n; i++) {
        const a = H.list[i];
        if (a.hidden) { m.setMatrixAt(i, ZERO); if (o) o.setMatrixAt(i, ZERO); continue; }
        _e.set(a.pitch, a.yaw, a.roll, 'YXZ'); _q.setFromEuler(_e); _v.set(a.p.x, a.y, a.p.z); _s.setScalar(a.s); _m.compose(_v, _q, _s);
        if (k > 0) { _p.makeTranslation(pivot[0], pivot[1], pivot[2]); _m.multiply(_p); _p.makeRotationX(a.rot[k] || 0); _m.multiply(_p); _p.makeTranslation(-pivot[0], -pivot[1], -pivot[2]); _m.multiply(_p); }
        m.setMatrixAt(i, _m); if (o) o.setMatrixAt(i, _m);
      }
      m.count = n; m.instanceMatrix.needsUpdate = true; if (o) { o.count = n; o.instanceMatrix.needsUpdate = true; }
    }
    for (const a of H.list) { a.sh.visible = visible && !a.hidden && a.y < (a.ground ?? 0) + .6; a.sh.position.set(a.p.x, (a.ground ?? 0) + .03, a.p.z); }
    let c = 0; _v.set(0, 0, 0);
    for (const a of H.list) if (!a.hidden) { _v.x += a.p.x; _v.y += a.y; _v.z += a.p.z; c++; }
    if (visible && c) { _v.divideScalar(c); let r = 0; for (const a of H.list) if (!a.hidden) r = Math.max(r, Math.hypot(a.p.x - _v.x, a.y - _v.y, a.p.z - _v.z) + 2.4 * a.s); bound.center.copy(_v); bound.radius = r; }
    else bound.radius = 0;
    // Contours masqués au loin (comme ceux des personnages)
    const olv = Math.hypot(bound.center.x - cam.target.x, bound.center.z - cam.target.z) - bound.radius < 18;
    for (const { o } of meshes) if (o) o.visible = olv;
  };
  return H;
}
/** Tous les troupeaux (exposé pour les tests via window.__fox.fauna). */
export const HERDS = [];
/** Proche de la caméra : on anime et on dessine ; sinon le troupeau disparaît (aucun coût). */
const near = (c, r = 34) => (c.x - cam.target.x) ** 2 + (c.z - cam.target.z) ** 2 < r * r;

/* ---------- Poules (et un coq) ---------- */
const HEN = (() => {
  const body = geo(g => { const b = sph(.22, '#ffffff', 0, .32, 0, g, 1); b.scale.set(1, .85, 1.25); const tl = cone(.13, .26, '#ffffff', 0, .5, -.26, 5, g); tl.rotation.x = -.7;
    [-1, 1].forEach(s => { cyl(.015, .015, .18, '#e8902a', s * .07, .09, 0, 4, g, false); const w = sph(.12, '#f0ece4', s * .2, .34, -.02, g, 0, false); w.scale.set(.35, .7, 1.1); }); });
  const head = geo(g => { sph(.11, '#ffffff', 0, .55, .2, g, 1); box(.03, .09, .11, '#d6402f', 0, .68, .2, g, false); const bk = cone(.035, .09, '#f2b13a', 0, .54, .33, 4, g, false); bk.rotation.x = Math.PI / 2;
    sph(.03, '#d6402f', 0, .47, .28, g, 0, false); [-1, 1].forEach(s => sph(.018, '#2f2a24', s * .08, .58, .27, g, 0, false)); });
  return [{ ...body }, { geo: head.geo, ol: null, pivot: [0, .45, .12] }];   // petite tête : pas de contour (un appel de dessin de moins)
})();
/** Basse-cour : n poules + un coq dans un rectangle, poulailler en (cx, cz). */
export function addHens(area, n = 5, o = {}) {
  const H = herd(HEN, n + 1);
  H.crow = () => { const r = H.list[H.list.length - 1]; r.flee = 0; r.goal = null; r.peck = 0; r.crowT = 1.6; SFX.at(r.p, 'crow'); say({ anchor: r.p.clone().setY(1.3) }, t().amb.rooster, 'note', 1.6, 0, 'rooster'); };
  for (let i = 0; i <= n; i++) {
    const rooster = i === n;
    H.add({ p: new THREE.Vector3(rnd(area.minX, area.maxX), 0, rnd(area.minZ, area.maxZ)), yaw: rnd(0, 6), s: rooster ? 1.3 : rnd(.92, 1.05), tint: rooster ? '#c86a3a' : pick(['#ffffff', '#ffffff', '#d9925e', '#b8743e']), rooster,
      goal: null, t: rnd(0, 5), peck: 0, flee: 0, shadow: rooster ? .36 : .28 });
  }
  HERDS.push({ H, area, center: new THREE.Vector3((area.minX + area.maxX) / 2, 0, (area.minZ + area.maxZ) / 2), update(dt, now) {
    for (const a of H.list) {
      a.t -= dt; const d = flat2(a.p, fox.pos), fast = Math.hypot(fox.vel.x, fox.vel.z) > 2.5;
      if (d < (fast ? 3.6 : 1.8) && a.flee <= 0) {
        a.flee = 1.6; const ang = Math.atan2(a.p.x - fox.pos.x, a.p.z - fox.pos.z) + rnd(-.6, .6); a.goal = new THREE.Vector3(a.p.x + Math.sin(ang) * 5, 0, a.p.z + Math.cos(ang) * 5);
        if (!RM) emit(a.p.clone().setY(.45), pick(['#ffffff', '#f0ece4', '#d9925e']), { n: 3, spd: 1.4, up: 2.2, life: .7, grav: 3, size: .55 });
        if (Math.random() < .5) say({ anchor: a.p.clone().setY(1.1) }, a.rooster ? t().amb.rooster : pick(t().amb.hen), 'note', 1, 0, 'hen' + a.i);
        if (Math.random() < .6) SFX.at(a.p, 'cluck');
      }
      if (a.flee > 0) a.flee -= dt;
      if (a.crowT > 0) { a.crowT -= dt; a.rot[1] = -.5; a.pitch = -.25; continue; }   // le coq chante, tête levée
      if (!a.goal && a.t <= 0) { a.t = rnd(1.5, 4); if (Math.random() < .55) { const g = new THREE.Vector3(a.p.x + rnd(-2.5, 2.5), 0, a.p.z + rnd(-2.5, 2.5)); if (!blockedAt(g.x, g.z, .3)) a.goal = g; } else a.peck = rnd(1, 2.4); }
      let moving = false;
      if (a.goal) {
        const dx = a.goal.x - a.p.x, dz = a.goal.z - a.p.z, l = Math.hypot(dx, dz), sp = a.flee > 0 ? 4.2 : .9;
        if (l < .15) a.goal = null; else { a.p.x += dx / l * Math.min(l, sp * dt); a.p.z += dz / l * Math.min(l, sp * dt); a.yaw += wrap(Math.atan2(dx, dz) - a.yaw) * Math.min(1, dt * 10); moving = true; }
        a.p.x = Math.max(this.area.minX, Math.min(this.area.maxX, a.p.x)); a.p.z = Math.max(this.area.minZ, Math.min(this.area.maxZ, a.p.z)); resolve(a.p, .22);
      }
      a.peck -= dt; const pecking = !moving && a.peck > 0;
      a.rot[1] = pecking ? (Math.sin(now * 14 + a.i) > .2 ? .9 : .2) : (moving ? Math.sin(now * 16 + a.i) * .15 : Math.sin(now * 2 + a.i) * .05);
      a.y = moving ? Math.abs(Math.sin(now * (a.flee > 0 ? 22 : 12) + a.i)) * (a.flee > 0 ? .12 : .04) : 0;
      a.pitch = pecking ? .15 : 0; a.roll = moving ? Math.sin(now * 12 + a.i) * .08 : 0;
    }
    // Panique générale : quatre poules qui fuient en même temps
    if (H.list.filter(a => a.flee > 0).length >= 4) o.onPanic?.();
    // Le coq chante de temps en temps
    const r = H.list[H.list.length - 1]; if ((this.crow = (this.crow ?? rnd(20, 40)) - dt) < 0) { this.crow = rnd(35, 70); if (flat2(r.p, fox.pos) < 16) H.crow(); }
  } });
  return H;
}

/* ---------- Canards sur la rivière ---------- */
const DUCK = (() => {
  const body = geo(g => { const b = sph(.22, '#d8d2c4', 0, .08, 0, g, 1); b.scale.set(.85, .6, 1.35); const tl = cone(.1, .18, '#5d5a52', 0, .16, -.3, 4, g, false); tl.rotation.x = -1.1; const ch = sph(.14, '#8a5a3b', 0, .12, .2, g, 0, false); ch.scale.set(.9, .8, .7); });
  const head = geo(g => { sph(.11, '#2f7a4a', 0, .36, .25, g, 1); box(.12, .03, .03, '#f6efe0', 0, .27, .25, g, false); const bk = box(.07, .03, .12, '#f2b13a', 0, .34, .38, g, false); bk.rotation.x = .2; [-1, 1].forEach(s => sph(.018, '#1f1f1f', s * .07, .39, .31, g, 0, false)); });
  return [body, { geo: head.geo, ol: null, pivot: [0, .2, .2] }];
})();
/** Famille de canards qui suit une meneuse sur l'eau (y = niveau de l'eau), entre z0 et z1. */
export function addDucks(x0, x1, z0, z1, y, n = 5, o = {}) {
  const H = herd(DUCK, n);
  const lead = { p: new THREE.Vector3(rnd(x0, x1), 0, (z0 + z1) / 2), goal: null, t: 0, flee: 0 };
  for (let i = 0; i < n; i++) H.add({ p: lead.p.clone().add(new THREE.Vector3(-i * .7, 0, 0)), yaw: Math.PI / 2, s: i ? rnd(.75, .9) : 1, tint: i ? '#b89a78' : '#ffffff', y, ground: y, shadow: .25 });
  // Hauteur selon la rive : sur l'herbe (0) puis l'eau (y) ; bank = z du haut de la berge, wet = z où commence l'eau
  const bank = o.bank ?? z0 - 1.1, wet = o.wet ?? z0 - .4, yAt = z => z <= bank ? 0 : z >= wet ? y : y * (z - bank) / (wet - bank);
  // Canetons « adoptés » : si le renard s'approche en se faufilant, ils sortent de l'eau et le suivent en file
  const F = { on: false, calm: 0, t: 0, trail: [], walked: 0, done: false };
  HERDS.push({ H, center: lead.p, update(dt, now) {
    const babies = H.list.slice(1), close = babies.some(a => flat2(a.p, fox.pos) < 3.2);
    if (!F.on) { if (fox.sneaking && close) { F.calm += dt; if (F.calm > 1.1) { F.on = true; F.t = 18; F.trail = [fox.pos.clone()]; F.walked = 0; F.calm = 0; SFX.at(fox.pos, 'peep'); say({ anchor: babies[0].p.clone().setY(.9) }, t().amb.duckling, 'note', 1.4, 0, 'duckling'); } } else F.calm = Math.max(0, F.calm - dt); }
    else {
      const last = F.trail[F.trail.length - 1]; const step = flat2(fox.pos, last);
      if (step > .3) { F.trail.push(fox.pos.clone()); F.walked += step; if (F.trail.length > 80) F.trail.shift(); }
      F.t -= dt; if (F.walked > 9 && !F.done) { F.done = true; o.onImprint?.(); }
      if (Math.random() < dt * .7) SFX.at(babies[0].p, 'peep');
      if (F.t <= 0 || Math.hypot(fox.vel.x, fox.vel.z) > 6.5) { F.on = false; F.done = false; }
    }
    const near_ = !fox.sneaking && !F.on && Math.abs(fox.pos.z - z0) < 2.2 && Math.abs(fox.pos.x - lead.p.x) < 5;
    if (near_ && lead.flee <= 0) { SFX.at(lead.p, 'quack'); lead.flee = 3; lead.goal = new THREE.Vector3(Math.max(x0, Math.min(x1, lead.p.x + rnd(-6, 6))), 0, z1 - .2); say({ anchor: lead.p.clone().setY(1) }, t().amb.duck, 'note', 1.2, 0, 'duck'); }
    lead.flee -= dt; lead.t -= dt;
    if (!lead.goal || flat2(lead.p, lead.goal) < .3) { if (lead.t <= 0) { lead.goal = new THREE.Vector3(rnd(x0, x1), 0, rnd(z0 + .6, z1 - .6)); lead.t = rnd(4, 9); } }
    if (lead.goal) { const dx = lead.goal.x - lead.p.x, dz = lead.goal.z - lead.p.z, l = Math.hypot(dx, dz), sp = lead.flee > 0 ? 2.6 : .55; if (l > .05) { lead.p.x += dx / l * Math.min(l, sp * dt); lead.p.z += dz / l * Math.min(l, sp * dt); } }
    if (F.on) lead.goal = new THREE.Vector3(Math.max(x0, Math.min(x1, fox.pos.x)), 0, z0 + .2);   // la cane suit depuis l'eau, inquiète
    H.list.forEach((a, i) => {
      let tgt = i ? H.list[i - 1].p : lead.p, gap = i ? .75 : 0;
      if (F.on && i) { tgt = F.trail[Math.max(0, F.trail.length - 1 - i * 3)]; gap = .35; }
      const dx = tgt.x - a.p.x, dz = tgt.z - a.p.z, l = Math.hypot(dx, dz);
      if (l > gap + .02) { const k = Math.min(1, dt * (i ? (F.on ? 3.2 : 2.5) : 4)); a.p.x += dx * (1 - gap / l) * k; a.p.z += dz * (1 - gap / l) * k; a.yaw += wrap(Math.atan2(dx, dz) - a.yaw) * Math.min(1, dt * 5); }
      const wy = yAt(a.p.z), onLand = wy > y + .01, walking = onLand && l > gap + .05; if (onLand && a.p.z < bank) resolve(a.p, .15);
      a.ground = wy; a.y = wy + (onLand ? (walking ? Math.abs(Math.sin(now * 14 + i)) * .05 : 0) : Math.sin(now * 2 + i) * .02);
      a.roll = onLand ? (walking ? Math.sin(now * 14 + i) * .15 : 0) : Math.sin(now * 1.6 + i) * .06; a.rot[1] = Math.sin(now * 1.2 + i * 1.7) > .85 ? .6 : 0;
      if (!RM && !onLand && Math.random() < dt * (lead.flee > 0 ? 6 : .6)) emit(new THREE.Vector3(a.p.x - Math.sin(a.yaw) * .3, y + .05, a.p.z - Math.cos(a.yaw) * .3), '#e6f4f8', { n: 1, spd: .2, up: .2, life: .6, grav: 0, size: .5 });
    });
  } });
  return H;
}

/* ---------- Vaches maraîchines (robe froment, tête plus sombre, cornes en lyre) ---------- */
const COW = (() => {
  const body = geo(g => { const b = sph(.5, '#cdb48a', 0, 1.08, 0, g, 1); b.scale.set(1, .9, 2); sph(.42, '#d6bf96', 0, 1.3, -.55, g, 1, false).scale.set(1.05, .6, 1.2); sph(.36, '#c2a87e', 0, 1.1, .7, g, 1, false).scale.set(1.1, 1, 1);
    for (const [x, z] of [[-.32, .7], [.32, .7], [-.32, -.7], [.32, -.7]]) { cyl(.11, .1, .7, '#9a8a6e', x, .35, z, 6, g); cyl(.11, .11, .1, '#3a3530', x, .04, z, 6, g, false); }
    const tl = cyl(.03, .03, .8, '#9a8a6e', 0, .95, -1.0, 4, g, false); tl.rotation.x = .3; sph(.07, '#3a3530', 0, .58, -1.12, g, 0, false); sph(.16, '#e9c9b8', 0, .62, -.3, g, 0, false); });
  const head = geo(g => { const h = box(.48, .5, .62, '#b49a72', 0, 1.25, 1.2, g); h.rotation.x = .25; box(.42, .3, .26, '#3f3a34', 0, 1.06, 1.5, g, false);
    [-1, 1].forEach(s => { const hn = cone(.05, .42, '#efe6cf', s * .3, 1.6, 1.08, 5, g, false); hn.rotation.z = -s * .9; const tip = cone(.035, .2, '#4a443c', s * .52, 1.82, 1.08, 5, g, false); tip.rotation.z = s * .3;
      const ear = box(.22, .06, .12, '#b49a72', s * .32, 1.4, 1.02, g, false); ear.rotation.z = s * .3; sph(.04, '#1f1f1f', s * .2, 1.38, 1.38, g, 0, false); }); });
  return [body, { ...head, pivot: [0, 1.25, .85] }];
})();
/** Vaches dans un pré (rectangle) : broutent, lèvent la tête et regardent le renard passer. */
export function addCows(area, n = 3) {
  const H = herd(COW, n);
  /** Tout le troupeau meugle (en canon), tête levée vers le renard. */
  H.chorus = () => H.list.forEach((a, k) => setTimeout(() => { a.mooT = 1.4; SFX.at(a.p, 'moo'); say({ anchor: a.p.clone().setY(2.3) }, pick(t().amb.cow), 'note', 1.5, 0, 'cow' + a.i); }, k * 420));
  for (let i = 0; i < n; i++) H.add({ p: new THREE.Vector3(rnd(area.minX + 1.5, area.maxX - 1.5), 0, rnd(area.minZ + 1.5, area.maxZ - 1.5)), yaw: rnd(0, 6), s: rnd(.9, 1.05), tint: pick(['#ffffff', '#f2e6d6', '#e6dccf']), goal: null, t: rnd(0, 6), graze: 0, shadow: .9 });
  HERDS.push({ H, center: new THREE.Vector3((area.minX + area.maxX) / 2, 0, (area.minZ + area.maxZ) / 2), update(dt, now) {
    for (const a of H.list) {
      a.t -= dt; const d = flat2(a.p, fox.pos), watch = d < 7;
      if (a.t <= 0) { a.t = rnd(5, 10); if (Math.random() < .4 && !watch) a.goal = new THREE.Vector3(rnd(area.minX + 1.5, area.maxX - 1.5), 0, rnd(area.minZ + 1.5, area.maxZ - 1.5)); a.graze = rnd(3, 7); }
      let moving = false;
      if (a.goal && !watch) { const dx = a.goal.x - a.p.x, dz = a.goal.z - a.p.z, l = Math.hypot(dx, dz); if (l < .2) a.goal = null; else { a.p.x += dx / l * .45 * dt; a.p.z += dz / l * .45 * dt; a.yaw += wrap(Math.atan2(dx, dz) - a.yaw) * Math.min(1, dt * 1.5); moving = true; } }
      if (watch) { a.yaw += wrap(Math.atan2(fox.pos.x - a.p.x, fox.pos.z - a.p.z) - a.yaw) * Math.min(1, dt * .8); if (d < 3 && (a.moo = (a.moo ?? 0) - dt) < 0) { a.moo = rnd(5, 9); SFX.at(a.p, 'moo'); say({ anchor: a.p.clone().setY(2.3) }, pick(t().amb.cow), 'note', 1.4, 0, 'cow' + a.i); } }
      a.graze -= dt; if (a.mooT > 0) a.mooT -= dt; const head = a.mooT > 0 ? -.35 : watch ? -.05 : !moving && a.graze > 0 ? .75 : .1;
      a.rot[1] += (head - a.rot[1]) * Math.min(1, dt * 3); a.y = moving ? Math.abs(Math.sin(now * 3 + a.i)) * .02 : 0; a.roll = Math.sin(now * .8 + a.i) * .015;
    }
  } });
  return H;
}

/* ---------- Crabes sur le sable de l'île ---------- */
const CRAB = [{ ...geo(g => { const b = sph(.18, '#d9533a', 0, .1, 0, g, 1); b.scale.set(1.3, .5, .9); [-1, 1].forEach(s => { const cl = sph(.08, '#e0663f', s * .26, .12, .12, g, 0, false); cl.scale.set(1, .7, 1.3);
  for (let k = 0; k < 3; k++) { const lg = cyl(.012, .012, .2, '#c24a32', s * (.18 + k * .02), .06, -.06 + k * .07, 3, g, false); lg.rotation.z = s * 1.1; } cyl(.012, .012, .1, '#c24a32', s * .06, .2, .1, 3, g, false); sph(.025, '#1f1f1f', s * .06, .26, .1, g, 0, false); }); }), ol: null }];
/** Crabes qui se promènent de côté ; ils filent vers la mer si le renard approche, puis reviennent. */
export function addCrabs(cx, cz, rx, rz, n = 6, o = {}) {
  const H = herd(CRAB, n);
  const onRing = k => { const a = rnd(0, Math.PI * 2), r = rnd(.82, .95); return new THREE.Vector3(cx + Math.cos(a) * rx * r, 0, cz + Math.sin(a) * rz * r); };
  for (let i = 0; i < n; i++) H.add({ p: onRing(i), yaw: rnd(0, 6), goal: null, t: rnd(0, 3), away: 0, s: rnd(.8, 1.1), y: .09, ground: .09, shadow: .18 });
  HERDS.push({ H, center: new THREE.Vector3(cx, 0, cz), r: Math.max(rx, rz) + 30, update(dt, now) {
    for (const a of H.list) {
      if (a.away > 0) { a.away -= dt; if (a.away <= 0) { a.p.copy(onRing()); a.hidden = false; } continue; }
      const d = flat2(a.p, fox.pos);
      if (d < 2.6 && !a.flee) { a.flee = true; const ang = Math.atan2(a.p.z - cz, a.p.x - cx); a.goal = new THREE.Vector3(cx + Math.cos(ang) * rx * 1.12, 0, cz + Math.sin(ang) * rz * 1.12); say({ anchor: a.p.clone().setY(.8) }, t().amb.crab, 'note', .9, 0, 'crab' + a.i); SFX.at(a.p, 'clack'); }
      a.t -= dt; if (!a.goal && a.t <= 0) { a.t = rnd(1, 3); const r = onRing(); a.goal = new THREE.Vector3(a.p.x + (r.x - a.p.x) * .2, 0, a.p.z + (r.z - a.p.z) * .2); }
      if (a.goal) { const dx = a.goal.x - a.p.x, dz = a.goal.z - a.p.z, l = Math.hypot(dx, dz), sp = a.flee ? 3.4 : .8;
        if (l < .1) { a.goal = null; if (a.flee) { a.flee = false; a.hidden = true; a.away = rnd(6, 12); emit(a.p.clone().setY(.15), '#e6f4f8', { n: 4, spd: 1, up: 1.2, life: .5 }); SFX.at(a.p, 'plop'); o.onSea?.(a.i); } }
        else { a.p.x += dx / l * Math.min(l, sp * dt); a.p.z += dz / l * Math.min(l, sp * dt); a.yaw = Math.atan2(dx, dz) + Math.PI / 2; } }
      a.y = .09 + (a.goal ? Math.abs(Math.sin(now * 20 + a.i)) * .02 : 0); a.roll = a.goal ? Math.sin(now * 25 + a.i) * .1 : 0;
    }
  } });
  return H;
}

/* ---------- Hirondelles autour des toits ---------- */
const SWALLOW = [geo(g => { const b = sph(.09, '#24324a', 0, 0, 0, g, 0); b.scale.set(.8, .7, 1.8); sph(.06, '#f6efe0', 0, -.04, .05, g, 0, false);
  [-1, 1].forEach(s => { const w = box(.34, .02, .1, '#24324a', s * .2, 0, 0, g, false); w.rotation.y = -s * .35; }); const tl = box(.12, .02, .2, '#24324a', 0, 0, -.22, g, false); tl.scale.x = .8; })];
/** Hirondelles qui tournent autour de quelques points (les maisons), en boucles rapides. */
export function addSwallows(centers, n = 6) {
  const H = herd(SWALLOW.map(p => ({ geo: p.geo, ol: null })), n);
  for (let i = 0; i < n; i++) { const c = centers[i % centers.length]; H.add({ p: new THREE.Vector3(c[0], 0, c[1]), yaw: 0, c, ph: rnd(0, 6), r: rnd(3.5, 6.5), sp: rnd(.9, 1.4) * (i % 2 ? 1 : -1), h: rnd(4, 6.5), shadow: 0 }); }
  HERDS.push({ H, center: new THREE.Vector3(centers[0][0], 0, centers[0][1]), r: 50, update(dt, now) {
    for (const a of H.list) {
      a.ph += dt * a.sp; const x = a.c[0] + Math.cos(a.ph) * a.r + Math.sin(a.ph * 2.3) * 1.2, z = a.c[1] + Math.sin(a.ph) * a.r * .7;
      a.yaw = Math.atan2(x - a.p.x, z - a.p.z); a.p.set(x, 0, z); a.y = a.h + Math.sin(a.ph * 3) * .8; a.roll = -Math.sign(a.sp) * .6; a.pitch = Math.sin(a.ph * 3) * .3;
      a.sh.visible = false;
    }
  } });
  return H;
}

/* ---------- Écureuils roux de la forêt ---------- */
const SQUIRREL = (() => {
  const C = '#b5562a', L = '#d8875a';
  const body = geo(g => { const b = sph(.13, C, 0, .17, 0, g, 1); b.scale.set(.8, .85, 1.3); sph(.09, '#f2dcc0', 0, .15, .1, g, 0, false).scale.set(.8, .9, .7); sph(.1, C, 0, .3, .17, g, 1);
    [-1, 1].forEach(s => { cone(.03, .08, C, s * .05, .41, .15, 4, g, false); sph(.018, '#1f1f1f', s * .05, .33, .25, g, 0, false); cyl(.025, .025, .1, L, s * .07, .05, .1, 4, g, false); cyl(.03, .03, .1, L, s * .08, .05, -.08, 4, g, false); }); });
  const tail = geo(g => { const t1 = sph(.1, C, 0, .26, -.2, g, 1, false); t1.scale.set(.75, 1.5, .8); const t2 = sph(.11, L, 0, .45, -.27, g, 1, false); t2.scale.set(.8, 1, .9); });
  return [body, { geo: tail.geo, ol: null, pivot: [0, .14, -.14] }];
})();
/** Écureuils : gambadent au pied des arbres et grimpent au tronc le plus proche si le renard approche. */
export function addSquirrels(trees, n = 3, o = {}) {
  const H = herd(SQUIRREL, n), T = trees.map(([x, z]) => new THREE.Vector3(x, 0, z));
  for (let i = 0; i < n; i++) { const h = T[i % T.length]; H.add({ p: h.clone().add(new THREE.Vector3(rnd(-2, 2), 0, rnd(1, 2.5))), home: h, yaw: rnd(0, 6), state: 'ground', goal: null, t: rnd(0, 2), y: 0, h: 0, calm: 0, shadow: .16 }); }
  const cx = T.reduce((a, v) => a + v.x, 0) / T.length, cz = T.reduce((a, v) => a + v.z, 0) / T.length;
  HERDS.push({ H, center: new THREE.Vector3(cx, 0, cz), r: 40, update(dt, now) {
    for (const a of H.list) {
      const d = flat2(a.p, fox.pos), fast = Math.hypot(fox.vel.x, fox.vel.z) > 2.5;
      if (a.state === 'ground') {
        if (d < (fast ? 5.5 : 3.2) && !fox.sneaking) {
          let best = null, bd = 1e9; for (const tr of T) { const dd = flat2(tr, a.p); if (dd < bd && dd < 10) { bd = dd; best = tr; } }
          if (best) { a.state = 'flee'; a.tree = best; a.goal = best.clone().add(new THREE.Vector3(0, 0, .3)); }
        }
        a.t -= dt; if (!a.goal && a.t <= 0) { a.t = rnd(.6, 2.2); a.goal = a.home.clone().add(new THREE.Vector3(rnd(-3, 3), 0, rnd(.6, 3))); }
      }
      if ((a.state === 'ground' || a.state === 'flee') && a.goal) {
        const dx = a.goal.x - a.p.x, dz = a.goal.z - a.p.z, l = Math.hypot(dx, dz), sp = a.state === 'flee' ? 5 : 1.6;
        if (l < .1) { a.goal = null; if (a.state === 'flee') { a.state = 'climb'; a.calm = 0; SFX.at(a.p, 'chatter'); o.onClimb?.(a.i); if (Math.random() < .7) say({ anchor: a.p.clone().setY(1.6) }, t().amb.squirrel, 'note', 1, 0, 'sq' + a.i); } }
        else { a.p.x += dx / l * Math.min(l, sp * dt); a.p.z += dz / l * Math.min(l, sp * dt); a.yaw = Math.atan2(dx, dz); }
        a.y = a.goal ? Math.abs(Math.sin(now * (a.state === 'flee' ? 16 : 9) + a.i)) * .12 : 0; a.pitch = 0;
      }
      if (a.state === 'climb') { a.h = Math.min(2.4 + a.i * .25, a.h + dt * 3); if (d > 7) a.calm += dt; else a.calm = 0; if (a.calm > 3) a.state = 'down'; }
      if (a.state === 'down') { a.h -= dt * 2; if (a.h <= 0) { a.h = 0; a.state = 'ground'; a.goal = null; } }
      if (a.state === 'climb' || a.state === 'down') { a.y = a.h; const up = a.state === 'climb'; a.pitch = up ? -1.45 : 1.35; a.yaw = up ? Math.PI : 0; }   // ventre contre le tronc
      a.rot[1] = Math.sin(now * (a.state === 'ground' ? 3 : 9) + a.i) * .25;
    }
  } });
  return H;
}

/* ---------- Le chat du puits ---------- */
/** Un chat roux qui dort sur la margelle du puits ; le renard le réveille, il file dormir sur un banc… et revient. */
export function addCat(spots) {
  const g = new THREE.Group(), C = '#e0a050', D = '#b8743e';
  const b = sph(.26, C, 0, .26, 0, g, 1); b.scale.set(.8, .75, 1.35); sph(.17, C, 0, .42, .32, g, 1);
  [-1, 1].forEach(s => { const e = cone(.07, .14, D, s * .09, .58, .3, 4, g); e.rotation.z = -s * .25; sph(.022, '#2f2a24', s * .07, .45, .46, g, 0, false); });
  const tl = cyl(.04, .03, .55, D, 0, .3, -.5, 5, g); tl.rotation.x = -1.1;
  for (const z of [-.18, .2]) for (const s of [-1, 1]) cyl(.035, .035, .16, D, s * .12, .08, z, 4, g, false);
  noShadowCast(g); scene.add(g); mergeRig(g, [g]);
  const cat = { g, k: 0, state: 'sleep', p: new THREE.Vector3(...spots[0]), from: null, t: 0, sh: blob(.35) };
  HERDS.push({ H: null, center: cat.p, update(dt, now) {
    const s = spots[cat.k];
    if (cat.state === 'sleep') {
      cat.p.set(s[0], s[1], s[2]); g.position.copy(cat.p); g.rotation.set(0, s[3] || 0, 0); g.scale.set(1.05 + Math.sin(now * 1.5) * .03, .72, 1); // roulé en boule, il respire
      if (flat2(cat.p, fox.pos) < 2.4) { cat.onWake?.(cat.k); cat.state = 'run'; cat.t = 0; cat.from = cat.p.clone(); cat.k = (cat.k + 1) % spots.length; SFX.at(cat.p, 'hiss'); say({ anchor: cat.p.clone().setY(s[1] + 1) }, t().amb.cat, 'note', 1.1, 0, 'cat'); }
    } else {
      const to = spots[cat.k], tv = new THREE.Vector3(to[0], to[1], to[2]); cat.t += dt; const L = cat.from.distanceTo(tv), k = Math.min(1, cat.t * 6 / Math.max(1, L));
      cat.p.lerpVectors(cat.from, tv, k); const hop = Math.sin(k * Math.PI) * Math.max(.5, Math.abs(to[1] - cat.from.y) + .6);
      g.position.set(cat.p.x, cat.p.y + hop, cat.p.z); g.rotation.set(0, Math.atan2(tv.x - cat.from.x, tv.z - cat.from.z), 0); g.scale.set(1, 1, 1);
      if (k >= 1) cat.state = 'sleep';
    }
    cat.sh.position.set(cat.p.x, .03, cat.p.z); const vis = near(cat.p); g.visible = vis; cat.sh.visible = vis && cat.p.y < .2;
  } });
  return cat;
}

/** À appeler à chaque image : anime et dessine les troupeaux proches de la caméra. */
export function updateFauna(dt, now) {
  if (!dt) return;
  for (const h of HERDS) { const vis = near(h.center, h.r || 34); if (vis) h.update(dt, now); if (h.H) h.H.draw(vis); }
}
