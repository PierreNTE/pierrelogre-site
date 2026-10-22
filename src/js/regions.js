/* =====================================================================
   Régions : un seul grand monde découpé en zones qui s'ouvrent au fil des bêtises.
   Chaque région se déclare avec defineRegion({ id, walk, unlock, build(W), goals, i18n… }).
   Le village est la première région ; les autres sont construites à la demande
   (quand une région voisine est ouverte) puis fusionnées en quelques maillages.

   Ajouter une région : créer src/js/regions/ma-region.js (voir README), l'importer dans
   src/js/regions/index.js. Le reste (carte, carnet, sauvegarde, succès) suit tout seul.
   ===================================================================== */
import * as THREE from 'three';
import { HOOKS } from './hooks.js';
import { SFX, setMood } from './audio.js';
import { track } from './config.js';
import { M, TM, TX, WALK, addBox, addWalk, bake, blob, blobTex, blockedAt, regionMats, box, cam, cone, cyl, flat, flat2, mergeRig, mk, noShadowCast, scene, setBuild, solidBox, solidCircle, sph, textTex } from './engine.js';
import { T } from './i18n.js';
import { fox } from './fox.js';
import { emit } from './fx.js';
import { $, addProgress, bubbles, completeGoal, onProgress, renderGoals, say, showCard, toast } from './hud.js';
const clearBubbles = () => { for (const b of bubbles) b.el.remove(); bubbles.length = 0; };
import { eggs, interacts, items, makeItem, props } from './items.js';
import { flock, makeNPC, npcs } from './npc.js';
import { makeNav } from './npclogic.js';
import { makeCrowd } from './crowd.js';
import { aoBlob, bakeAO, bloomAt, inside, restoreBlooms, vegetate } from './vegetation.js';
import { saveRun } from './persist.js';
import { GOALS, S, addGoals, modalOpen, pick, rnd, run, saved, seeded, store, t } from './state.js';
import { groundMesh, tree } from './world.js';
import { path as kitPath } from './regions/kit.js';

export const REGIONS = [];
export const RG = {};
/** Ordre des régions sur la carte et dans les listes (les régions chargées après le démarrage s'y rangent). */
export const ORDER = ['village', 'foret', 'sport', 'moto', 'riviere', 'plage', 'gare', 'nantes', 'paris', 'montagne', 'ile', 'terrier'];
export const sortRegions = () => REGIONS.sort((a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99));

/** Fusion profonde (un niveau) des textes d'une région dans T. */
function mergeT(lang, obj) {
  const dst = T[lang];
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof dst[k] === 'object' && !Array.isArray(dst[k])) Object.assign(dst[k], v);
    else dst[k] = v;
  }
}

/**
 * Déclare une région.
 *  id         identifiant (aussi utilisé pour les textes : T.regions[id])
 *  walk       rectangles praticables ajoutés à l'ouverture (région + chemin d'accès)
 *  bounds     rectangle de la région (détection « je suis dans… », grille de navigation)
 *  adj        régions voisines (construites dès que celle-ci est ouverte, pour qu'on les voie)
 *  unlock()   vrai quand la région doit s'ouvrir
 *  need()     texte « comment l'ouvrir » pour la carte
 *  spawn      point d'arrivée (voyage par les terriers)
 *  gatePos    point montré par la caméra à l'ouverture
 *  mood       { bg, fog, near, far, music }
 *  goals      bêtises de la région ({ id, need, secret })
 *  i18n       { fr: {…}, en: {…} } fusionnés dans T
 *  build(W)   construit le décor et la logique (W : boîte à outils ci-dessous)
 */
let layer = 0;
export function defineRegion(def) {
  def = Object.assign({ noVeg: [], adj: [], walk: [], goals: [], built: false, active: false, crowds: [], dyn: [], npcs: [], zones: [], pickups: [], updates: [], yaps: [] }, def);
  addGoals(def.id, def.goals);
  if (def.i18n) for (const lang of ['fr', 'en']) if (def.i18n[lang]) mergeT(lang, def.i18n[lang]);
  REGIONS.push(def); RG[def.id] = def;
  return def;
}

/** Bêtises (faites) d'une région, et total. */
export const regionGoals = id => GOALS.filter(g => g.region === id);
export const regionDone = id => regionGoals(id).filter(g => run.done[g.id]).length;
export const regionMain = id => regionGoals(id).filter(g => !g.secret);
export const totalDone = () => GOALS.filter(g => run.done[g.id]).length;
export const isOpen = id => id === 'village' || run.unlocked.includes(id) || !!RG[id]?.always;
/** Texte « comment ouvrir » : il manque n bêtises au total. */
export const needTotal = n => () => t().needTasks(Math.max(1, n - totalDone()));
export const needIn = (id, n) => () => t().needIn(Math.max(1, n - regionDone(id)), t().regions[id]);
export const inRect = (p, b, m = 0) => p.x >= b.minX - m && p.x <= b.maxX + m && p.z >= b.minZ - m && p.z <= b.maxZ + m;

/* ---------- Boîte à outils de construction ---------- */
function toolkit(R) {
  // Sols superposés (taches, sols, disques) : hauteurs rangées à la fin de la construction (voir rankFlats)
  const flatRank = (m, y, cls) => { if (y >= 0 && y < .045) (R.flats ||= []).push({ m, y, cls, i: (R.flats || []).length }); };
  const W = {
    R, box, cyl, sph, cone, flat, mk, M, TM, TX, textTex, solidBox, solidCircle, addBox, tree, rnd, pick,
    /** Sol coloré (rectangle net : chemin, terrain, quai…). Aucune végétation n'y pousse. */
    ground(w, d, c, x, z, y = .025, rot = 0) { const mat = typeof c === 'string' ? M(c) : c; const m = flat(w, d, mat, x, z, y + (layer++ % 48) * .0006, rot); m.castShadow = false; flatRank(m, y, 2); R.noVeg.push({ x, z, w, d, rot }); return m; },
    /** Sol organique : rectangle aux coins arrondis et aux bords irréguliers (mousse, sable, neige…). */
    patch(w, d, c, x, z, { y = .014, rot = 0, round = .45, jitter = 1, noVeg = false } = {}) {
      const r = Math.min(w, d) * round / 2, hw = w / 2, hd = d / 2, pts = [], amp = Math.min(2.2, Math.min(w, d) * .05) * jitter, seed = rnd(0, 9);
      const corners = [[hw - r, hd - r, 0], [-hw + r, hd - r, Math.PI / 2], [-hw + r, -hd + r, Math.PI], [hw - r, -hd + r, Math.PI * 1.5]];
      for (const [cx, cz, a0] of corners) for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
      const shape = new THREE.Shape(); const N = pts.length, dense = [];
      for (let i = 0; i < N; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % N], L = Math.hypot(bx - ax, bz - az), k = Math.max(1, Math.round(L / 2.5)); for (let j = 0; j < k; j++) dense.push([ax + (bx - ax) * j / k, az + (bz - az) * j / k]); }
      dense.forEach(([px, pz], i) => { const l = Math.hypot(px, pz) || 1, n = Math.sin(i * 1.7 + seed) * .6 + Math.sin(i * .53 + seed * 2) * .4; const qx = px + px / l * n * amp, qz = pz + pz / l * n * amp; if (i) shape.lineTo(qx, qz); else shape.moveTo(qx, qz); });
      const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2);
      // UV ramenés à [0, 1] (comme un plan) : la répétition de texture garde la même échelle qu'avec W.ground
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + hw) / w, (uv.getY(i) + hd) / d);
      const m = new THREE.Mesh(g, typeof c === 'string' ? M(c) : c); m.position.set(x, y + (layer++ % 48) * .0006, z); m.rotation.y = rot; m.receiveShadow = true; m.castShadow = false;
      R.group.add(m); if (noVeg) R.noVeg.push({ x, z, w, d, rot }); flatRank(m, y, y < .012 ? 1 : y <= .014 ? 0 : 2); return m;
    },
    /** Chemin qui serpente (ruban aux bords fondus) ; aucune végétation n'y pousse. */
    path(pts, w = 2, o = {}) { const segs = kitPath(pts, w, o); R.noVeg.push(...segs); return segs; },
    /** Taches de couleur organiques sur le sol (variation de teinte, aucun coût en appels de dessin). */
    mottle(rect, colors, n) { for (let i = 0; i < n; i++) { const w = rnd(5, 15); W.patch(w, w * rnd(.6, 1.2), colors[i % colors.length], rnd(rect.minX + 3, rect.maxX - 3), rnd(rect.minZ + 3, rect.maxZ - 3), { y: .006, rot: rnd(0, 3) }); } },
    /** Ombre douce au sol (pied d'un objet). */
    ao: (x, z, rx, rz, k) => aoBlob(x, z, rx, rz, k),
    /** Disque coloré au sol. */
    disc(r, c, x, z, y = .03, sx = 1, sz = 1) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 22), M(c)); m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1); m.position.set(x, y, z); m.receiveShadow = true; R.group.add(m); flatRank(m, y, 2); return m; },
    /** Objet animé (non fusionné) : visible seulement quand la région est active. */
    dyn(o, merge = true) { noShadowCast(o); scene.add(o); if (merge) mergeRig(o, [o]); R.dyn.push(o); return o; },
    /** Groupe animé fait de pièces (fusion pièce par pièce). */
    rig(root, parts) { noShadowCast(root); scene.add(root); mergeRig(root, parts); R.dyn.push(root); return root; },
    npc(o) { const n = makeNPC(o); n.region = R.id; R.npcs.push(n); return n; },
    crowd(max) { const c = makeCrowd(max); c.setVisible(false); R.crowds.push(c); return c; },
    item(o) { const it = makeItem(o); it.region = R.id; return it; },
    /** Action « E » à un endroit. */
    interact(pos, r, action, when) { const ia = { kind: 'act', pos: new THREE.Vector3(pos.x, 0, pos.z), r, action, when, hintY: pos.y }; interacts.push(ia); return ia; },
    /** Moyen de transport (train, bateau) : « E » marche aussi en portant un objet (sinon E pose l'objet). */
    transport(pos, r, action, when) { const ia = W.interact(pos, r, action, when); ia.carry = true; return ia; },
    /** Zone : fn() quand le renard y entre (cond() facultative, stay : secondes immobile). */
    zone(pos, r, fn, { cond, stay = 0, rect } = {}) { const z = { pos, r, rect, fn, cond, stay, inside: false, t: 0 }; R.zones.push(z); return z; },
    /** Glapir près d'un point. */
    yap(pos, r, fn) { R.yaps.push({ pos, r, fn }); },
    /** Objets à ramasser en passant dessus (champignons, coquillages…). */
    pickups(goal, pts, build, { y = .3, spin = true, r = .8, onPick } = {}) {
      return pts.map(([x, z], i) => {
        const key = goal + i, got = run.progress[goal]?.has(key) || run.done[goal];
        const g = build(); noShadowCast(g); scene.add(g); mergeRig(g, [g]); g.position.set(x, y, z); g.visible = !got;
        const p = { g, pos: new THREE.Vector3(x, 0, z), key, goal, got, spin, y, r, onPick, sh: blob(.25) }; p.sh.position.set(x, .03, z); p.sh.visible = !got;
        R.pickups.push(p); return p;
      });
    },
    /** Objet qu'on renverse en courant (comme les pots). */
    pushable(x, z, build, { goal, r = .38, onKnock } = {}) {
      const g = build(); noShadowCast(g); g.position.set(x, 0, z); scene.add(g); mergeRig(g, [g]);
      const p = { kind: 'pot', id: R.id + '-' + (R.pushN = (R.pushN || 0) + 1), g, pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(), r, knocked: false, fall: 0, axis: new THREE.Vector3(), sh: blob(r + .1), goal, onKnock, region: R.id };
      props.push(p); return p;
    },
    /** Bulle d'information quand on s'approche (texte dans T.eggs[key]). */
    egg(key, x, z, ay = 2.4, r = 1.8) { const e = { key, pos: new THREE.Vector3(x, 0, z), anchor: new THREE.Vector3(x, ay, z), r, inside: false }; eggs.push(e); return e; },
    /** Carte postale cachée (une par région). */
    postcard(x, z) {
      const got = run.cards.includes(R.id);
      const g = new THREE.Group(); box(.5, .34, .03, '#fff7e6', 0, 0, 0, g); box(.16, .2, .035, '#e8742a', .14, .02, 0, g, false); box(.22, .03, .035, '#8fc9df', -.1, .06, 0, g, false); box(.22, .03, .035, '#8fc9df', -.1, -.04, 0, g, false);
      noShadowCast(g); scene.add(g); mergeRig(g, [g]); g.position.set(x, .7, z); g.visible = !got;
      R.card = { g, pos: new THREE.Vector3(x, 0, z), got }; if (got) g.userData.gone = true; R.dyn.push(g);
    },
    place: fn => HOOKS.place.push(fn),
    dest: fn => HOOKS.dest.push(fn),
    update: fn => R.updates.push(fn),
    flock: (x, z, n, tint, o) => flock(x, z, n, tint, Object.assign({ region: R.id }, o)),
    /** Panneau en bois avec texte (FR/EN). */
    sign(x, z, key, rot = 0, w = 2.6) {
      const tx = textTex(512, 200, (g, cw, ch) => { g.fillStyle = '#b8834a'; g.fillRect(0, 0, cw, ch); for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#ad7a43' : '#c08d55'; g.fillRect(0, i * ch / 5, cw, ch / 5 - 3); }
        g.fillStyle = '#3a2a1f'; g.textAlign = 'center'; g.textBaseline = 'middle'; const txt = t().signs?.[key] || key; let fs = 84; do { g.font = `bold ${fs}px "Patrick Hand",cursive`; fs -= 4; } while (g.measureText(txt).width > cw - 40 && fs > 26); g.fillText(txt, cw / 2, ch / 2 + 4); });
      const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rot; R.group.add(grp);
      cyl(.09, .11, 2, '#7a5236', 0, 1, 0, 6, grp); box(w, w * .38, .12, '#9b6a3a', 0, 1.8, 0, grp);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w - .08, w * .38 - .06), new THREE.MeshLambertMaterial({ map: tx })); face.position.set(0, 1.8, .065); grp.add(face);
      const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -.065; grp.add(back);
      solidCircle(x, z, .2, .5);
    },
    /** Compteur « parler plusieurs fois » (gardé dans la sauvegarde). */
    talk(key) { run.talks[key] = (run.talks[key] || 0) + 1; saveRun(); return run.talks[key]; },
    /** Barrière qui s'efface à l'ouverture de la région. kind : sink | slide | swing | fall. */
    gate(obj, kind = 'sink', amount = 3) {
      obj.userData.gate = true; if (!R.dyn.includes(obj)) { noShadowCast(obj); scene.add(obj); R.dyn.push(obj); }
      const p0 = obj.position.clone(), r0 = obj.rotation.clone();
      const apply = k => {
        const e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1;
        if (kind === 'sink') { obj.position.y = p0.y - e * amount; if (e >= 1) { obj.userData.gone = true; obj.visible = false; } }
        else if (kind === 'slide') obj.position.x = p0.x + e * amount;
        else if (kind === 'slideZ') obj.position.z = p0.z + e * amount;
        else if (kind === 'swing') obj.rotation.y = r0.y + e * amount;
        else if (kind === 'fall') { obj.rotation.z = r0.z + e * amount; obj.position.y = p0.y + Math.sin(e * Math.PI) * .4; }
      };
      (R.gates ||= []).push(show => { if (!show) apply(1); else anims.push({ t: 0, dur: 1.8, delay: .6, fn: apply }); });
      return obj;
    },
    flag(key, v) { if (v !== undefined) { run.flags[key] = v; saveRun(); } return run.flags[key]; },
    done: id => !!run.done[id],
    complete: completeGoal, progress: addProgress, say, toast, emit, SFX, fox, run, t,
  };
  return W;
}

/* ---------- Construction (à la demande) ---------- */
export function ensureBuilt(R) {
  if (R.built || !R.build) return; R.built = true; S.lastBuild = performance.now();   // la mesure de fluidité ignore ces à-coups (quality.js)
  R.group = new THREE.Group(); setBuild(R.group);
  // Réveil : une zone pas encore ouverte « dort » (couleurs éteintes, personne dehors)
  if (R.id !== 'village') { const g = R.gatePos || R.spawn; R.wake = { value: new THREE.Vector4(g.x, g.z, isOpen(R.id) ? 1e5 : 0, 0) }; R.mats = regionMats(R.wake); R.sleeping = !isOpen(R.id); }
  const W = toolkit(R);
  // Hasard rejouable propre au lieu : la même forêt, la même plage à chaque visite (et à chaque capture de contrôle)
  seeded('region:' + R.id, () => {
    try { R.api = R.build(W) || {}; } finally { setBuild(null); }
    rankFlats(R);
    if (window.__foxAudit) window.__foxAudit(R.id, R.group);   // contrôle de la géométrie (tests) ; jamais défini en jeu
    R.meshes = bake(R.group, 56, { mats: R.mats });
    R.aoMesh = bakeAO(R.group, blobTex);
    // Végétation du biome (herbes, fleurs, fougères, feuilles…), hors chemins et obstacles
    if (R.veg) for (const v of [].concat(R.veg)) R.vegMeshes = (R.vegMeshes || []).concat(vegetate(v.rect || R.vegRect || R.bounds, v.biome, { avoid: [...R.noVeg, ...(v.avoid || [])], density: v.density ?? 1, seed: R.id.length + (v.seed || 0), ...(R.mats ? { mats: R.mats } : {}) }));
  });
  // La grille de déplacement doit exister avant la reprise de l'état sauvegardé (une porte déjà ouverte la recalcule)
  R.nav = R.id === 'village' ? null : makeNav(R.navBounds || R.bounds);
  for (const n of R.npcs) n.nav = R.nav;
  syncRegion(R);
  setActive(R, false); refreshActive(true);
}
/**
 * Ordre des sols d'une région, indépendant de l'ordre de construction des régions (avant : un compteur global
 * modulo 48 décidait, et un sol pouvait passer sous une tache d'herbe selon le chemin du joueur).
 * Classe 0 : grandes taches de base · 1 : taches de variation (au-dessus) · 2 : sols et disques, rangés par
 * hauteur demandée puis par ordre de création. Les chemins restent à 12 mm, entre les taches et les sols
 * (la caméra a un plan proche à 1 m : la précision de profondeur suffit largement).
 */
function rankFlats(R) {
  const L = R.flats; if (!L || !L.length) return;
  L.sort((a, b) => a.cls - b.cls || (a.cls === 2 ? a.y - b.y : 0) || a.i - b.i);
  // taches : 2 à 11 mm · chemins (ruban transparent) : 12 mm · sols et disques : 13 à 32 mm (sous les ombres portées)
  const lo = L.filter(f => f.cls < 2), hi = L.filter(f => f.cls === 2);
  lo.forEach((f, k) => { f.m.position.y = .002 + k * Math.min(.0006, .009 / lo.length); });
  hi.forEach((f, k) => { f.m.position.y = .013 + k * Math.min(.0006, .019 / hi.length); });
  R.flats = null;
}
/** Construit petit à petit (une région par image) pour ne pas figer le jeu. */
const queue = [];
export function prebuild(ids) { for (const id of ids) { const R = RG[id]; if (R && !R.built && !queue.includes(R)) queue.push(R); } }
function buildStep() { const R = queue.shift(); if (R) ensureBuilt(R); }

/* ---------- Activation : on n'anime que les régions proches du renard ---------- */
function setActive(R, on) {
  R.active = on; const awake = on && !R.sleeping;
  if (!awake) { for (const c of R.crowds) c.setVisible(false); R.crowdShown = false; }
  for (const o of R.dyn) o.visible = (o.userData.gate ? on : awake) && !o.userData.gone;
  for (const n of R.npcs) { n.group.visible = awake; n.shadow.visible = awake; if (n.cone && !awake) n.cone.visible = false; }
  for (const it of items) if (it.region === R.id && !it.gone) { it.mesh.visible = !R.sleeping; it.shadow.visible = !R.sleeping; }
  for (const p of R.pickups) { p.g.visible = !p.got && !R.sleeping; p.sh.visible = p.g.visible; }
}
const ACTIVE_MARGIN = 26;
let curRegion = null;
function refreshActive(force) {
  for (const R of REGIONS) {
    if (!R.built || !R.bounds) continue;
    const on = inRect(fox.pos, R.bounds, ACTIVE_MARGIN) || inRect(cam.target, R.bounds, ACTIVE_MARGIN);
    if (on !== R.active || force) setActive(R, on);
  }
}
/** Région où se trouve le renard. */
export function regionAt(p) {
  for (const R of REGIONS) if (R.id !== 'village' && R.bounds && isOpen(R.id) && inRect(p, R.bounds)) return R;
  return RG.village;
}
export const isActive = id => !RG[id] || RG[id].active;

/* ---------- Ouverture des régions ---------- */
let cineQueue = [];
export function unlockRegion(R, show = true) {
  if (isOpen(R.id)) return;
  run.unlocked.push(R.id); saveRun();
  openRegion(R, show);
  track('Région ouverte', { region: R.id });
}
function openRegion(R, show) {
  ensureBuilt(R);
  R.sleeping = false; setActive(R, R.active);
  if (R.wake) { if (show) wakeUp(R); else { R.wake.value.z = 1e5; R.wake.value.w = 0; } }
  for (const w of R.walk) addWalk(w, R.id);
  for (const p of props) if (p.region === R.id) p.live = true;   // ses objets à renverser peuvent bouger (zone praticable connue)
  R.api?.open?.(show);
  for (const g of R.gates || []) g(show);
  prebuild(R.adj);
  if (show && !window.__foxNoCine) cineQueue.push(R);
  else if (show) { toast(t().unlockToast(t().regions[R.id])); }
}
/** Ouvre une région cachée « toujours ouverte » (le terrier) la première fois qu'on y va. */
export function openHidden(id) { const R = RG[id]; if (!R || R.opened) return; R.opened = true; openRegion(R, false); }
export function checkUnlocks(show = true) {
  if (run.mode === 'defi') return;
  for (const R of REGIONS) if (R.id !== 'village' && !isOpen(R.id) && R.unlock && R.unlock()) unlockRegion(R, show);
}
/** La vague de réveil : part du passage, colore la zone, fait onduler le sol, lumière chaude. */
function wakeUp(R) {
  const w = R.wake.value, b = R.bounds; const maxD = Math.max(...[[b.minX, b.minZ], [b.maxX, b.minZ], [b.minX, b.maxZ], [b.maxX, b.maxZ]].map(([x, z]) => Math.hypot(x - w.x, z - w.y))) + 12;
  w.z = 0; w.w = 1; let acc = 0;
  anims.push({ t: 0, dur: 4.2, delay: .9, fn: k => {
    const e = 1 - Math.pow(1 - k, 2.2); w.z = e * maxD; w.w = k < 1 ? 1 : 0;
    S.sunPulse = 1 + .25 * Math.sin(Math.min(1, k * 1.6) * Math.PI);
    if ((acc += 1) % 3 === 0 && k < 1) for (let i = 0; i < 10; i++) { const a = rnd(0, Math.PI * 2), x = w.x + Math.cos(a) * w.z, z = w.y + Math.sin(a) * w.z; if (Math.hypot(x - cam.target.x, z - cam.target.z) < 30) emit(new THREE.Vector3(x, .3, z), pick(['#ffe9a8', '#fff6d6', '#f6d36b', '#c9e6a0']), { n: 1, spd: .5, up: 2.2, life: 1.2, grav: -.5, size: .8 }); }
    if (k >= 1) { w.z = 1e5; S.sunPulse = 1; }
  } });
}
/** Plan de caméra sur la zone qui vient de s'ouvrir. */
function playCine() {
  if (S.cine || !cineQueue.length || S.paused || !S.started || curRegion?.hidden) return;   // sous terre : le plan attendra la sortie
  const R = cineQueue.shift();
  S.cine = { pos: (R.gatePos || R.spawn).clone().lerp(R.spawn, .35), t: 4.6, end: performance.now() + 4600, zoom: 1.7 }; S.paused = true;
  SFX.fanfare();
  setTimeout(() => { banner(t().unlockTitle, t().regions[R.id]); }, 500);
}
export function endCine() { if (!S.cine) return; S.cine = null; S.paused = modalOpen(); }   // une carte ouverte pendant le plan garde le jeu en pause

/* ---------- Bandeau « Nouvelle région » ---------- */
let bannerT = 0;
export function banner(small, big) {
  const el = $('#regionBanner'); if (!el) return;
  el.querySelector('small').textContent = small; el.querySelector('b').textContent = big;
  el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(bannerT); bannerT = setTimeout(() => { el.hidden = true; }, 3600);
}

/* ---------- Voyage (terriers, train, bateau) ---------- */
export function teleport(x, z, yaw = Math.PI, after) {
  const fade = $('#fade'); fade.hidden = false; fade.classList.add('on'); S.paused = true;
  // L'objet porté reste où il était (sinon son propriétaire le poursuivrait sans fin, ou un câble s'étirerait d'un lieu à
  // l'autre), sauf s'il est fait pour voyager (travels : la baguette de Paris, à rapporter au terrier du village)
  if (fox.held && !fox.held.travels) { HOOKS.dropHeld?.(); toast(t().leftBehind); }
  setTimeout(() => {
    HOOKS.leaveDen?.();
    fox.pos.set(x, 0, z); fox.vel.set(0, 0, 0); fox.yaw = yaw; fox.lift = 0; fox.ground = 0;
    cam.target.set(x, 0, z);
    const R = regionAt(fox.pos); if (R.always) openHidden(R.id); else ensureBuilt(R); refreshActive(true); tick(0, true);
    clearBubbles();   // les bulles accrochées au renard ne le suivent pas d'une zone à l'autre
    S.moodSnap = true;   // ciel et lumière de la zone d'arrivée tout de suite (pas de fondu depuis l'ancienne zone)
    fade.classList.remove('on'); S.paused = modalOpen();
    run.foxPos = [+x.toFixed(2), +z.toFixed(2)]; saveRun();
    setTimeout(() => { fade.hidden = true; }, 450);
    after?.();
  }, 450);
}
export function travelTo(id) { const R = RG[id]; if (!R || !isOpen(id)) return; teleport(R.spawn.x, R.spawn.z, R.spawnYaw ?? Math.PI); }

/* ---------- Mise à jour à chaque image ---------- */
let acc = 0;
const anims = [];
export function tick(dt, force) {
  if (!S.presenting) buildStep();   // pas pendant la présentation du renard : elle reste fluide
  // Animations d'ouverture au temps réel (fluides même si l'image ralentit)
  const nowMs = performance.now();
  for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i]; a.t0 ??= nowMs + (a.delay || 0) * 1000; if (nowMs < a.t0) continue; a.t = (nowMs - a.t0) / (a.dur * 1000); a.fn(Math.min(1, a.t)); if (a.t >= 1) anims.splice(i, 1); }
  acc += dt;
  if (acc > .25 || force) { acc = 0; refreshActive(); }
  const R = regionAt(fox.pos);
  if (R !== curRegion) {
    curRegion = R; S.region = run.mode === 'defi' ? 'village' : R.id; S.goalRegion = R.notebook || null;
    setMood(R.mood || RG.village.mood);
    if (!run.discovered.includes(R.id) && run.mode !== 'defi') { run.discovered.push(R.id); saveRun(); if (R.id !== 'village') { banner(t().newRegion, t().regions[R.id]); SFX.fanfare(); } achHook(); }
    renderGoals();
  }
  playCine();
  if (S.paused) return;
  for (const Rg of REGIONS) {
    if (!Rg.active) continue;
    for (const u of Rg.updates) u(dt);
    for (const z of Rg.zones) {
      const inside = z.rect ? inRect(fox.pos, z.rect) : flat2(fox.pos, z.pos) < z.r;
      if (!inside) { z.inside = false; z.t = 0; continue; }
      if (z.cond && !z.cond()) { z.t = 0; continue; }
      z.t += dt;
      if (!z.inside && z.t >= z.stay) { z.inside = true; z.fn(); }
    }
    for (const p of Rg.pickups) {
      if (p.got) continue;
      if (p.spin) { p.g.rotation.y += dt * 1.6; p.g.position.y = p.y + Math.sin(S.time * 2.4 + p.pos.x) * .06; }
      if (flat2(fox.pos, p.pos) < p.r) {
        p.got = true; p.g.visible = false; p.sh.visible = false; SFX.acorn();
        emit(new THREE.Vector3(p.pos.x, .6, p.pos.z), '#f6d36b', { n: 12, spd: 1.6, up: 3, life: .8 });
        p.onPick?.(p); addProgress(p.goal, p.key);
      }
    }
    const c = Rg.card;
    if (c && !c.got) {
      c.g.rotation.y += dt * 1.2; c.g.position.y = .75 + Math.sin(S.time * 2) * .08;
      if (Math.random() < dt * 3) emit(new THREE.Vector3(c.pos.x + rnd(-.3, .3), .9, c.pos.z), '#ffe9a8', { n: 1, spd: .2, up: .8, life: 1, grav: -.4, size: .5 });
      if (flat2(fox.pos, c.pos) < .9) {
        c.got = true; c.g.visible = false; c.g.userData.gone = true; if (!run.cards.includes(Rg.id)) run.cards.push(Rg.id); saveRun(); SFX.acorn();
        S.paused = true; showCard({ icon: '💌', title: t().cardTitle(t().regions[Rg.id], run.cards.length, REGIONS.filter(r => r.hasCard !== false).length), text: t().cards[Rg.id] || '' }, () => { S.paused = modalOpen() || !!S.cine; achHook(); });
      }
    }
  }
}
/** Crochet glapir : zones de glapissement des régions actives. */
HOOKS.yap.push(() => { for (const R of REGIONS) if (R.active) for (const y of R.yaps) if (flat2(fox.pos, y.pos) < y.r) y.fn(); });

/* ---------- Progression : régions, chapitres ---------- */
let achHook = () => {};
export const onAch = fn => { achHook = fn; };
/** Endroit où une fleur peut pousser : praticable, libre, pas sur un chemin ni dans un bâtiment. */
function freeForBloom(x, z) {
  if (!WALK.some(w => x > w.minX + .3 && x < w.maxX - .3 && z > w.minZ + .3 && z < w.maxZ - .3) || blockedAt(x, z, .3)) return false;
  const R = regionAt({ x, z }); const av = [...(R.noVeg || []), ...[].concat(R.veg || []).flatMap(v => v.avoid || [])];
  return !av.some(a => inside(x, z, a));
}
onProgress(id => {
  // Le monde réagit : une gerbe de lumière, et des fleurs poussent là où la bêtise a été faite
  emit(new THREE.Vector3(fox.pos.x, .6, fox.pos.z), '#f6d36b', { n: 22, spd: 2.6, up: 3.2, life: 1, size: .9 });
  if (run.mode === 'libre') { run.flags.bloom ||= []; bloomAt(fox.pos.x, fox.pos.z, 7, freeForBloom, run.flags.bloom); if (run.flags.bloom.length > 420) run.flags.bloom.splice(0, run.flags.bloom.length - 420); }
  checkUnlocks(true);
  const g = GOALS.find(x => x.id === id);
  if (g && g.region !== 'village' && run.mode === 'libre') {
    const R = RG[g.region], main = regionMain(g.region);
    if (main.length && main.every(x => run.done[x.id]) && !run.flags['chap_' + g.region]) {
      run.flags['chap_' + g.region] = true; saveRun();
      // la carte attend que le jeu reprenne (fin du mini-jeu, autre carte, plan de caméra) au lieu d'être perdue
      const chap = () => { if (S.paused || modalOpen()) { setTimeout(chap, 700); return; } S.paused = true; showCard({ icon: '🏆', title: t().chapterDone(t().regions[R.id]), text: t().chapterText(regionDone(R.id), regionGoals(R.id).length) }, () => { S.paused = modalOpen(); }); };
      setTimeout(chap, 1600);
    }
  }
  achHook();
});

/** Remet une région construite en accord avec la partie (objets ramassés, bêtises faites…). */
function syncRegion(R) {
  for (const p of R.pickups) { p.got = !!(run.progress[p.goal]?.has(p.key) || run.done[p.goal]); p.g.visible = !p.got; p.sh.visible = !p.got; }
  if (R.card) { R.card.got = run.cards.includes(R.id); R.card.g.userData.gone = R.card.got; R.card.g.visible = !R.card.got && R.active; }
  // objets renversés lors d'une partie précédente (les lieux sont construits après la reprise de la partie)
  for (const p of props) if (p.region === R.id && run.knockedPots.includes(p.id) && !p.knocked) { p.knocked = true; p.fall = 1; p.axis.set(1, 0, 0); p.g.quaternion.setFromAxisAngle(p.axis, Math.PI / 2); }
  R.api?.restore?.();
}
/** Après chargement d'une partie : rouvre ce qui l'était (sans plan de caméra). */
export function restoreRegions() {
  restoreBlooms(run.flags.bloom);
  for (const id of run.unlocked) { const R = RG[id]; if (R) openRegion(R, false); }
  for (const R of REGIONS) if (R.built) syncRegion(R);
  checkUnlocks(false);
}

/* ---------- Sol commun : une seule grande prairie sous tout le monde ---------- */
export const WORLD = { minX: -360, maxX: 190, minZ: -165, maxZ: 180 };
/** Lit de la rivière : la prairie est percée à cet endroit (berges en pente, eau plus basse). */
export const RIVER_BED = { minX: -66, maxX: 76, minZ: 27.45, maxZ: 32.55 };
{
  // Forme dans le plan (x, -z) : grand rectangle, avec un trou pour le lit de la rivière ; UV en unités du monde
  const sh = new THREE.Shape(); sh.moveTo(WORLD.minX, -WORLD.maxZ); sh.lineTo(WORLD.maxX, -WORLD.maxZ); sh.lineTo(WORLD.maxX, -WORLD.minZ); sh.lineTo(WORLD.minX, -WORLD.minZ); sh.closePath();
  const hole = new THREE.Path(); const b = RIVER_BED; hole.moveTo(b.minX, -b.maxZ); hole.lineTo(b.minX, -b.minZ); hole.lineTo(b.maxX, -b.minZ); hole.lineTo(b.maxX, -b.maxZ); hole.closePath(); sh.holes.push(hole);
  groundMesh.geometry.dispose(); groundMesh.geometry = new THREE.ShapeGeometry(sh);
  groundMesh.position.set(0, 0, 0);
  groundMesh.material.map.repeat.set(30 / 140, 30 / 110);
}

export { saved, store, pick, items, npcs };

/** Dessine les foules des régions actives (à appeler avant le rendu). */
export function drawCrowds() {
  for (const R of REGIONS) {
    if (!R.crowds.length) continue;
    // Les foules ne sont pas découpées par la caméra : on ne les dessine que si la région est à l'écran
    const show = R.active && !R.sleeping && inRect(cam.target, R.bounds, 14);
    if (show !== R.crowdShown) { R.crowdShown = show; for (const c of R.crowds) c.setVisible(show); }
    if (show) for (const c of R.crowds) c.draw();
  }
}
