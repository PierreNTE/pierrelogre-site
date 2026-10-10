/* =====================================================================
   Végétation et petits détails du sol, en instances (quelques appels de dessin par zone).
   Chaque biome mélange plusieurs couches : herbes, fleurs, fougères, feuilles mortes, cailloux…
   Variations : position (par taches naturelles), rotation, taille, inclinaison, couleur.
   Herbes et fleurs ondulent au vent et se couchent au passage du renard (shader « grass »).
   ===================================================================== */
import * as THREE from 'three';
import { BUILD, blockedAt, box, boxCull, cone, cyl, partGeometry, patch, scene, sph } from './engine.js';
import { Q } from './quality.js';
import { random, rnd } from './state.js';

const MAT = {
  bend: patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { occ: false, grass: 2 }),
  flat: patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { occ: false }),
};
/** Géométrie (couleurs par sommet) d'un petit groupe, base à y = 0. */
const geo = build => { const g = new THREE.Group(); build(g); return partGeometry(g, new Set(), false).geo; };

/* ---------- Modèles de base (blanc = teinté par instance) ---------- */
const G = {
  tuft: geo(g => { [[0, 0, 0, 1], [.1, .45, .6, .8], [-.09, -.5, .5, .75], [.02, .15, -.7, .7]].forEach(([x, rz, rx, h]) => { const c = cone(.15, h, '#ffffff', x, h / 2, 0, 3, g, false); c.rotation.set(rx * .35, rz * 2, rz * .5); c.scale.set(1, 1, .45); }); }),
  stem: geo(g => { cyl(.015, .02, .9, '#5f8f4a', 0, .45, 0, 3, g, false); cone(.08, .22, '#6f9e4f', .07, .25, 0, 3, g, false).rotation.z = -.9; }),
  head: geo(g => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const p = sph(.13, '#ffffff', Math.cos(a) * .14, .92, Math.sin(a) * .14, g, 0, false); p.scale.set(1, .4, 1); } sph(.08, '#f6e7a8', 0, .96, 0, g, 0, false); }),
  fern: geo(g => { for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + (i % 2) * .2; const p = new THREE.Group(); p.rotation.y = -a; g.add(p); const l = sph(.5, '#ffffff', .42, .3, 0, p, 0, false); l.scale.set(1, .14, .26); l.rotation.z = .55 + (i % 3) * .12; } sph(.18, '#ffffff', 0, .12, 0, g, 0, false).scale.set(1, .6, 1); }),
  leaf: geo(g => { const l = box(.22, .015, .14, '#ffffff', 0, .01, 0, g, false); l.rotation.y = .4; }),
  pebble: geo(g => { const p = sph(.18, '#ffffff', 0, .05, 0, g, 0, false); p.scale.set(1, .45, .8); }),
  reed: geo(g => { [[0, 0], [.08, .25], [-.07, -.3], [.03, .5]].forEach(([x, rz]) => { const c = cone(.035, 1.4, '#ffffff', x, .7, 0, 3, g, false); c.rotation.z = rz * .35; }); }),
  mushroom: geo(g => { [[0, 0, 1], [.16, .1, .7], [-.12, .14, .55]].forEach(([x, z, s]) => { cyl(.035 * s, .045 * s, .2 * s, '#f3e6d2', x, .1 * s, z, 5, g, false); const c = sph(.12 * s, '#ffffff', x, .2 * s, z, g, 1, false); c.scale.set(1, .55, 1); }); }),
  twig: geo(g => { const t = cyl(.02, .025, .7, '#7a5236', 0, .03, 0, 4, g, false); t.rotation.z = Math.PI / 2; cyl(.012, .015, .25, '#7a5236', .1, .06, .06, 3, g, false).rotation.set(Math.PI / 2, 0, .8); }),
  snowtuft: geo(g => { const s = sph(.3, '#ffffff', 0, .05, 0, g, 1, false); s.scale.set(1.3, .4, 1); }),
  clover: geo(g => { for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const l = sph(.07, '#ffffff', Math.cos(a) * .07, .12, Math.sin(a) * .07, g, 0, false); l.scale.set(1, .3, 1); } cyl(.01, .01, .12, '#ffffff', 0, .06, 0, 3, g, false); }),
};

/* ---------- Biomes : couches (modèle, matériau, densité par 100 m², tailles, couleurs) ---------- */
const C = (...a) => a;
export const BIOMES = {
  meadow: [
    { g: 'tuft', bend: 1, d: 24, s: [.38, .66], col: C('#79a856', '#86b462', '#9cc06a', '#6f9e4f'), patchy: .5 },
    { g: 'tuft', bend: 1, d: 2.5, s: [.8, 1.15], col: C('#6f9e4f', '#7fae5c', '#8aa858'), patchy: .9 },
    { g: 'clover', d: 5, s: [.9, 1.4], col: C('#79a356', '#86b062'), patchy: .8 },
    { g: 'stem', head: 1, bend: 1, d: 3.2, s: [.42, .68], col: C('#f5f0e6', '#f2b8c6', '#f6d36b', '#b9a5e8', '#f6a07a'), patchy: .85, cluster: 1 },
    { g: 'pebble', d: .5, s: [.4, 1], col: C('#b5ad9e', '#a59d8e', '#c9c2b2') },
  ],
  forest: [
    { g: 'fern', bend: 1, d: 2.6, s: [.8, 1.4], col: C('#6b9c52', '#79a356', '#5f8f4a', '#86b062'), patchy: .7 },
    { g: 'tuft', bend: 1, d: 5, s: [.3, .55], col: C('#5f8f4a', '#6b9c52', '#7a9a50'), patchy: .6 },
    { g: 'leaf', d: 9, s: [.8, 1.3], col: C('#d98b3a', '#c9a33d', '#b9531a', '#e2a548', '#9a7a3a'), patchy: .4, tilt: .15 },
    { g: 'mushroom', d: .35, s: [.8, 1.4], col: C('#d6402f', '#c9894f', '#e2b26a'), patchy: .9 },
    { g: 'twig', d: .9, s: [.7, 1.3], col: C('#ffffff'), patchy: .4 },
    { g: 'stem', head: 1, bend: 1, d: .4, s: [.3, .45], col: C('#f5f0e6', '#b9a5e8'), patchy: .9, cluster: 1 },
    { g: 'pebble', d: .6, s: [.5, 1.2], col: C('#9a958c', '#8d877c') },
  ],
  beach: [
    { g: 'reed', bend: 1, d: 2.2, s: [.5, .9], col: C('#a3b56a', '#b8c27a', '#c9c08a'), patchy: .9, zMax: 46 },
    { g: 'pebble', d: .9, s: [.3, .8], col: C('#e8dcc6', '#d9cdb5', '#c9bfae', '#f6c9b8') },
    { g: 'twig', d: .15, s: [1.2, 2], col: C('#c9b49a') },
  ],
  reedbank: [
    { g: 'reed', bend: 1, d: 30, s: [.6, 1.1], col: C('#8fae5c', '#9cb866', '#a9b870', '#7f9f52'), patchy: .6 },
    { g: 'stem', head: 1, bend: 1, d: 2, s: [.4, .6], col: C('#f6d36b', '#b9a5e8'), patchy: .8, cluster: 1 },
  ],
  dry: [
    { g: 'tuft', bend: 1, d: 6, s: [.35, .6], col: C('#b8b06a', '#a9a95e', '#c4b878', '#8f9f58'), patchy: .6 },
    { g: 'pebble', d: 1.4, s: [.4, 1.2], col: C('#b59a78', '#a8906e', '#c9b08a') },
  ],
  mountain: [
    { g: 'snowtuft', d: 2.4, s: [.6, 1.6], col: C('#ffffff', '#eef3f6'), patchy: .6 },
    { g: 'tuft', bend: 1, d: 1.6, s: [.3, .45], col: C('#7f9a6a', '#8fa778'), patchy: .8 },
    { g: 'stem', head: 1, bend: 1, d: .3, s: [.22, .32], col: C('#ffffff'), patchy: .9, cluster: 1 },
    { g: 'pebble', d: 1, s: [.5, 1.4], col: C('#9aa3ad', '#b9c3cc') },
  ],
  city: [
    { g: 'tuft', bend: 1, d: .8, s: [.25, .4], col: C('#7fae5c', '#8cba66'), patchy: .95 },
    { g: 'leaf', d: 1.4, s: [.8, 1.2], col: C('#d98b3a', '#c9a33d', '#e2a548'), patchy: .8 },
  ],
  tropical: [
    { g: 'tuft', bend: 1, d: 8, s: [.4, .7], col: C('#6fae4c', '#7fbe5a', '#5f9b4a'), patchy: .5 },
    { g: 'fern', bend: 1, d: 1.6, s: [.8, 1.4], col: C('#4f9f55', '#5faf5f'), patchy: .7 },
    { g: 'stem', head: 1, bend: 1, d: 1.2, s: [.35, .55], col: C('#f2789a', '#f6a07a', '#f6d36b', '#e8742a'), patchy: .8, cluster: 1 },
  ],
};

const _o = new THREE.Object3D(), _c = new THREE.Color(), _h = { h: 0, s: 0, l: 0 }, _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
/** Champ de densité doux (taches naturelles) entre 0 et 1. */
const field = (x, z, seed) => .5 + .5 * Math.sin(x * .13 + seed) * Math.sin(z * .11 - seed * .7) * .7 + .15 * Math.sin((x + z) * .37 + seed * 3);
export const inside = (x, z, a) => {
  if (a.seg) { const [x0, z0, x1, z1] = a.seg, dx = x1 - x0, dz = z1 - z0, L = dx * dx + dz * dz; let k = L ? ((x - x0) * dx + (z - z0) * dz) / L : 0; k = k < 0 ? 0 : k > 1 ? 1 : k; return Math.hypot(x - x0 - dx * k, z - z0 - dz * k) < a.r; }
  if (a.r != null) return Math.hypot(x - a.x, z - a.z) < a.r;
  if (a.rot) { const c = Math.cos(-a.rot), s = Math.sin(-a.rot), dx = x - a.x, dz = z - a.z, lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < a.w / 2 && Math.abs(lz) < a.d / 2; }
  if (a.w != null) return Math.abs(x - a.x) < a.w / 2 && Math.abs(z - a.z) < a.d / 2;
  return x > a.minX && x < a.maxX && z > a.minZ && z < a.maxZ;
};
/** Accumulateur de géométrie fusionnée (une par tuile et par matériau). */
function bucket() { return { pos: [], nor: [], col: [], org: [], bend: [] }; }
/** bendK : 1 pour ce qui ondule et se couche (herbes, fleurs), 0 pour ce qui reste immobile (cailloux, feuilles). */
function pushGeo(b, g, m, col, bendK) {
  const P = g.attributes.position, N = g.attributes.normal, Cc = g.attributes.color; _nm.getNormalMatrix(m);
  const ox = m.elements[12], oy = m.elements[13], oz = m.elements[14];
  for (let i = 0; i < P.count; i++) {
    _v.fromBufferAttribute(P, i); const ly = _v.y; _v.applyMatrix4(m); b.pos.push(_v.x, _v.y, _v.z);
    _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize(); b.nor.push(_n.x, _n.y, _n.z);
    b.col.push(Cc.getX(i) * col.r, Cc.getY(i) * col.g, Cc.getZ(i) * col.b);
    b.org.push(ox, oy, oz); b.bend.push(bendK * Math.max(0, Math.min(1, ly)));
  }
}
function finish(b, bendable, mats = MAT) {
  if (!b.pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  if (bendable) { g.setAttribute('aOrigin', new THREE.Float32BufferAttribute(b.org, 3)); g.setAttribute('aBend', new THREE.Float32BufferAttribute(b.bend, 1)); }
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, bendable ? mats.bend : mats.flat); m.receiveShadow = true; m.castShadow = false; scene.add(m); boxCull(m, 2); return m;
}

/**
 * Pose la végétation d'un biome dans un rectangle. avoid : zones interdites (rectangles, cercles,
 * rectangles tournés {x,z,w,d,rot}) ; les obstacles (murs, arbres…) sont évités automatiquement.
 * Tout est fusionné par tuiles de 64 unités : 1 appel de dessin par tuile visible, quelle que soit la densité ;
 * les tuiles hors champ (ou noyées dans le brouillard) ne sont pas dessinées.
 */
export function vegetate(rect, biome, { avoid = [], density = 1, seed = 1, tile = 64, mats = MAT } = {}) {
  const layers = BIOMES[biome]; if (!layers) return [];
  const k = density * (Q.tier === 2 ? .35 : Q.tier === 1 ? .6 : 1) * (matchMedia('(pointer: coarse)').matches ? .7 : 1);
  const area = (rect.maxX - rect.minX) * (rect.maxZ - rect.minZ) / 100;
  const tiles = new Map();
  // Un seul maillage par tuile : ce qui ne bouge pas y est simplement « non pliable » (aBend = 0)
  const tileOf = (x, z) => { const key = `${Math.floor((x - rect.minX) / tile)},${Math.floor((z - rect.minZ) / tile)}`; if (!tiles.has(key)) tiles.set(key, bucket()); return tiles.get(key); };
  layers.forEach((L, li) => {
    const n = Math.round(L.d * area * k); if (!n) return;
    let placed = 0;
    for (let i = 0; i < n * 6 && placed < n; i++) {
      const x = rnd(rect.minX, rect.maxX), z = rnd(rect.minZ, rect.maxZ);
      if (L.zMax && z > L.zMax) continue;
      if (L.patchy && random() > Math.pow(field(x, z, seed + li * 1.7), 1 + L.patchy * 1.5) * 2) continue;
      if (avoid.some(a => inside(x, z, a)) || blockedAt(x, z, .25)) continue;
      const pts = L.cluster ? [[x, z], [x + rnd(-.5, .5), z + rnd(-.5, .5)], [x + rnd(-.6, .6), z + rnd(-.6, .6)]] : [[x, z]];
      const b = tileOf(x, z), bk = L.bend ? 1 : 0;
      for (const [px, pz] of pts) {
        const sc = rnd(L.s[0], L.s[1]);
        _o.position.set(px, 0, pz); _o.rotation.set(rnd(-1, 1) * (L.tilt ?? .08), rnd(0, Math.PI * 2), rnd(-1, 1) * (L.tilt ?? .08)); _o.scale.set(sc * rnd(.85, 1.15), sc * rnd(.85, 1.2), sc * rnd(.85, 1.15)); _o.updateMatrix();
        _c.set(L.col[(random() * L.col.length) | 0]).getHSL(_h); _c.setHSL(_h.h + rnd(-.015, .015), _h.s * rnd(.85, 1.05), _h.l * rnd(.92, 1.06));
        if (L.head) { pushGeo(b, G[L.g], _o.matrix, WHITE, bk); pushGeo(b, G.head, _o.matrix, _c, bk); }
        else pushGeo(b, G[L.g], _o.matrix, _c, bk);
        placed++;
      }
    }
  });
  const out = [];
  for (const b of tiles.values()) { const m = finish(b, true, mats); if (m) out.push(m); }
  return out;
}
const WHITE = new THREE.Color('#ffffff');

/* ---------- Ombres de contact (occlusion douce au pied des arbres, rochers, maisons) ---------- */
/** Note une tache d'ombre douce au sol ; elle sera dessinée par bakeAO() avec le reste du décor. */
export function aoBlob(x, z, rx, rz = rx, k = 1) { const list = BUILD.userData.ao || (BUILD.userData.ao = []); list.push([x, z, rx, rz, k]); }
let aoMat = null;
/** Dessine toutes les taches d'ombre d'un groupe en une seule instance. */
export function bakeAO(group, tex) {
  const list = group.userData.ao; if (!list || !list.length) return null;
  aoMat ||= new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .55, polygonOffset: true, polygonOffsetFactor: -2 });
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), aoMat, list.length);
  list.forEach(([x, z, rx, rz, k], i) => { _o.position.set(x, .045, z); _o.rotation.set(0, 0, 0); _o.scale.set(rx * k, 1, rz * k); _o.updateMatrix(); m.setMatrixAt(i, _o.matrix); });
  m.renderOrder = 1; m.computeBoundingSphere(); scene.add(m); group.userData.ao = [];
  return m;
}

/* ---------- Le monde fleurit là où le renard fait ses bêtises ---------- */
const BLOOM_MAX = 420;
const bloomMat = patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { occ: false, grass: true });
const bStem = new THREE.InstancedMesh(G.stem, bloomMat, BLOOM_MAX), bHead = new THREE.InstancedMesh(G.head, bloomMat, BLOOM_MAX);
for (const m of [bStem, bHead]) { m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.receiveShadow = true; scene.add(m); }
bHead.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(BLOOM_MAX * 3).fill(1), 3);
const BLOOM_COL = ['#f5f0e6', '#f2b8c6', '#f6d36b', '#b9a5e8', '#f6a07a', '#8fc9df'];
const blooms = [];   // { x, z, c, s, t }
function drawBloom(i) {
  const b = blooms[i], k = Math.max(0, Math.min(1, b.t)), e = k < 1 ? k + Math.sin(k * Math.PI) * .35 : 1;   // pousse avec un petit rebond
  _o.position.set(b.x, 0, b.z); _o.rotation.set(0, b.r, 0); _o.scale.setScalar(Math.max(.001, b.s * e)); _o.updateMatrix();
  bStem.setMatrixAt(i, _o.matrix); bHead.setMatrixAt(i, _o.matrix);
}
/** Fait éclore quelques fleurs autour d'un point (onFree(x, z) dit si l'endroit est libre). */
export function bloomAt(x, z, n, onFree, store) {
  for (let i = 0, k = 0; i < n * 4 && k < n && blooms.length < BLOOM_MAX; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(.7, 2.4), px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (!onFree(px, pz)) continue;
    const b = { x: +px.toFixed(2), z: +pz.toFixed(2), c: (random() * BLOOM_COL.length) | 0, s: +rnd(.45, .7).toFixed(2), r: rnd(0, 6), t: store ? -k * .18 : 1 };
    blooms.push(b); bHead.setColorAt(blooms.length - 1, _c.set(BLOOM_COL[b.c])); k++;
    if (store) store.push([b.x, b.z, b.c, b.s]);
  }
  bStem.count = bHead.count = blooms.length; bHead.instanceColor.needsUpdate = true;
  for (let i = 0; i < blooms.length; i++) drawBloom(i);
  bStem.instanceMatrix.needsUpdate = bHead.instanceMatrix.needsUpdate = true;
}
/** Recrée les fleurs sauvegardées. */
export function restoreBlooms(list) {
  blooms.length = 0;
  for (const [x, z, c, s] of list || []) { if (blooms.length >= BLOOM_MAX) break; blooms.push({ x, z, c, s, r: rnd(0, 6), t: 1 }); bHead.setColorAt(blooms.length - 1, _c.set(BLOOM_COL[c] || '#f5f0e6')); }
  bStem.count = bHead.count = blooms.length; bHead.instanceColor.needsUpdate = true;
  for (let i = 0; i < blooms.length; i++) drawBloom(i);
  bStem.instanceMatrix.needsUpdate = bHead.instanceMatrix.needsUpdate = true;
}
/** Animation de pousse (à appeler à chaque image). */
export function updateBlooms(dt) {
  let dirty = false;
  for (let i = 0; i < blooms.length; i++) { const b = blooms[i]; if (b.t < 1) { b.t = Math.min(1, b.t + dt * 1.6); if (b.t > 0) drawBloom(i); dirty = true; } }
  if (dirty) bStem.instanceMatrix.needsUpdate = bHead.instanceMatrix.needsUpdate = true;
}
