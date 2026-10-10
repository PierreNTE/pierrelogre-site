/* =====================================================================
   PNJ : modèles, routines, cônes de vision ; oiseaux
   ===================================================================== */
import * as THREE from 'three';
import { M, VC, blob, box, cone, cyl, mergeRig, mk, noShadowCast, outlineMat, partGeometry, scene, setRigDetail, sph } from './engine.js';
import { shade } from './regions/kit.js';
import { rnd, t } from './state.js';

export const npcs = [];
/** Portée et demi-angle du champ de vision (le renard discret n'est vu qu'à SNEAK_RANGE). */
export const VIEW = { range: 7, sneakRange: 4.5, half: 35 * Math.PI / 180 };

const coneMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .3, depthWrite: false });
function viewConeGeo(R, half) {
  const seg = 14, pos = [0, .04, 0];
  for (let i = 0; i <= seg; i++) { const a = -half + 2 * half * i / seg; pos.push(Math.sin(a) * R, .04, Math.cos(a) * R); }
  const idx = []; for (let i = 1; i <= seg; i++) idx.push(0, i, i + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
const coneGeo = viewConeGeo(VIEW.sneakRange, VIEW.half);

/** Pseudo-hasard stable par personnage (même silhouette à chaque visite). */
const hid = (id, k) => { let h = 2166136261; for (const c of String(id) + k) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 1000) / 1000; };
/** Silhouettes : épaules, hanches, hauteur du buste, longueur des jambes. */
const BUILDS = { slim: [.64, .56, .74, .62], stocky: [.8, .78, .66, .56], round: [.7, .86, .7, .58], broad: [.86, .62, .74, .62], tall: [.7, .62, .78, .7] };
const HAIRS = ['short', 'bun', 'pony', 'curly', 'bald', 'long', 'spiky'];
/* ---------- Corps des personnages (communs aux PNJ et aux foules) ----------
   Buste en poire tourné (hanches, taille, épaules arrondies, départ du cou), membres ronds et chaussures ovales :
   des volumes simples, lisses et lisibles de loin, au lieu de boîtes. */
/** Profil du buste (rayon, hauteur) : sw = largeur d'épaules, hw = largeur de hanches, th = hauteur. */
export function torsoProfile(sw, hw, th) {
  const S = sw / 2, H = hw / 2;
  return [[0, 0], [H * .82, 0], [H, .05], [H * 1.02, th * .22], [H * .92 + S * .04, th * .5], [S * .96, th * .78], [S, th * .86], [S * .9, th * .95], [S * .62, th * 1.01], [.12, th * 1.04], [0, th * 1.04]]
    .map(([r, y]) => new THREE.Vector2(r, y));
}
/** Buste (géométrie) : profil tourné sur 14 côtés, aplati en profondeur (d). */
export function torsoGeo(sw, hw, th, d, grow = 1, y0 = 0, y1 = 9, phi0 = 0, phiL = Math.PI * 2) {
  let pts = torsoProfile(sw, hw, th);
  if (y0 > 0 || y1 < th) {   // morceau (tablier, salopette) : on recoupe le profil entre y0 et y1
    const at = y => { for (let i = 1; i < pts.length; i++) if (pts[i].y >= y) { const a = pts[i - 1], b = pts[i], k = (y - a.y) / Math.max(1e-6, b.y - a.y); return new THREE.Vector2(a.x + (b.x - a.x) * k, y); } return pts[pts.length - 1].clone(); };
    pts = [at(y0), ...pts.filter(p => p.y > y0 && p.y < y1), at(y1)];
  }
  const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p.x * grow, p.y)), 14, phi0, phiL);
  const avg = (sw + hw) / 2; g.scale(1, 1, d / avg); return g;
}
/** Jambe ronde (du bassin au sol) avec chaussure ovale. */
export function legParts(LL, pants, shoe, p) {
  const l = mk(new THREE.CylinderGeometry(.115, .1, LL - .06, 9), M(pants), 0, -(LL - .06) / 2, 0, p);
  const sh = sph(.13, shoe, 0, -LL + .07, .06, p, 1, false); sh.scale.set(.95, .55, 1.4);
  return l;
}
/** Bras rond (de l'épaule à la main). */
export function armParts(shirt, skin, p) { mk(new THREE.CylinderGeometry(.095, .08, .5, 9), M(shirt), 0, -.24, 0, p); sph(.1, skin, 0, -.55, 0, p, 1); }

export function makeNPC(o) {
  setRigDetail(2);
  const g = new THREE.Group(); scene.add(g);
  const body = new THREE.Group(); g.add(body);
  const [SW, HW, TH, LL] = BUILDS[o.build || Object.keys(BUILDS)[(hid(o.id, 'b') * 5) | 0]];
  const skin = o.skin || ['#f2c7a5', '#e9b48f', '#d9a07a', '#f6d2b4', '#c98d68'][(hid(o.id, 's') * 5) | 0];
  const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * HW * .23, LL, 0); body.add(p); legParts(LL, o.pants, o.shoes || '#3a2f27', p); return p; });
  const torso = new THREE.Group(); torso.position.y = LL; body.add(torso);
  mk(torsoGeo(SW, HW, TH, .46), M(o.shirt), 0, -.02, 0, torso);
  const D = .46;
  if (o.apron) mk(torsoGeo(SW, HW, TH, D, 1.04, .02, TH * .82, -1, 2), M('#ffffff'), 0, -.02, 0, torso, false);
  if (o.overalls) { mk(torsoGeo(SW, HW, TH, D, 1.04, .02, TH * .55, -1.05, 2.1), M('#4a6d9a'), 0, -.02, 0, torso, false); [-1, 1].forEach(s => { const b = box(.07, TH * .42, .03, '#4a6d9a', s * SW * .22, TH * .72, D / 2 + .005, torso, false); b.rotation.x = -.12; }); }
  if (o.tie) { const k = box(.1, TH * .58, .03, o.tie, 0, TH * .6, D / 2 + .01, torso, false); k.rotation.x = -.1; }
  const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * (SW / 2 + .07), TH - .1, 0); torso.add(p); armParts(o.shirt, skin, p); return p; });
  const head = new THREE.Group(); head.position.y = TH + .42; torso.add(head);
  sph(.42, skin, 0, 0, 0, head, 2);
  // Coiffure (variée par personnage) ; sous un couvre-chef, la coiffure reste discrète
  const style = o.hairStyle || (o.hair ? HAIRS[(hid(o.id, 'h') * HAIRS.length) | 0] : 'none'), hc = o.hair;
  if (hc && style !== 'bald') { const h = sph(.43, hc, 0, .1, -.06, head, 2, false); h.scale.set(1, .72, .95); }
  if (hc && !o.hat) {
    if (style === 'bun') sph(.17, hc, 0, .4, -.26, head, 1, false);
    if (style === 'pony') { const t = sph(.13, hc, 0, .05, -.47, head, 1, false); t.scale.set(.9, 1.7, .9); }
    if (style === 'curly') for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; sph(.14, hc, Math.cos(a) * .3, .24 + Math.sin(i * 2.1) * .04, Math.sin(a) * .26 - .06, head, 1, false); }
    if (style === 'long') box(.66, .52, .16, hc, 0, -.14, -.3, head, false);
    if (style === 'spiky') for (let i = 0; i < 5; i++) { const c = cone(.08, .2, hc, -.2 + i * .1, .4 - Math.abs(i - 2) * .04, -.08, 4, head, false); c.rotation.z = (2 - i) * .25; }
  }
  if (hc && style === 'bald') [-1, 1].forEach(s => { const t = sph(.12, hc, s * .37, .02, -.12, head, 1, false); t.scale.set(.6, 1, 1.2); });
  if (o.hat === 'toque') { cyl(.3, .27, .42, '#ffffff', 0, .5, 0, 10, head); sph(.36, '#ffffff', 0, .78, 0, head, 1); }
  if (o.hat === 'kepi') { cyl(.36, .38, .24, o.hatColor || '#24427a', 0, .42, 0, 10, head); box(.4, .05, .26, '#1f2328', 0, .32, .34, head, false); box(.42, .06, .06, '#f6d36b', 0, .48, .32, head, false); }
  if (o.hat === 'beret') { const b = cyl(.38, .42, .14, o.hatColor || '#2f2a24', -.04, .4, -.02, 10, head); b.rotation.z = .25; }
  if (o.hat === 'cap') { const c = sph(.44, o.hatColor || '#d6402f', 0, .16, 0, head, 1, false); c.scale.set(1, .5, 1); box(.36, .04, .3, o.hatColor || '#d6402f', 0, .14, .38, head, false); }
  if (o.hat === 'helmet') { const h = sph(.5, o.hatColor || '#f6d36b', 0, .06, 0, head, 1); h.scale.set(1, .95, 1.05); }
  [-1, 1].forEach(s => { const e = sph(.1, '#ffffff', s * .15, .05, .36, head, 1, false); e.scale.z = .5; });
  const eyes = new THREE.Group(); head.add(eyes);                    // les deux pupilles bougent ensemble
  [-1, 1].forEach(s => sph(.055, '#2f2a24', s * .15, .05, .41, eyes, 1, false));
  // Sourcils (donnent l'expression), nez, joues, et quelques signes distinctifs
  const brow = o.hair || '#5a4a3a';
  [-1, 1].forEach(s => { const b = box(.13, .03, .03, brow, s * .15, .17, .39, head, false); b.rotation.z = s * (o.grumpy ? .25 : -.08); });
  sph(.06, shade(skin, -.06), 0, -.06, .42, head, 1, false);
  [-1, 1].forEach(s => { const c = sph(.07, '#f0a9a0', s * .25, -.1, .33, head, 0, false); c.scale.z = .4; });
  if (o.mustache) { const m = box(.2, .05, .04, o.mustache === true ? brow : o.mustache, 0, -.14, .41, head, false); m.rotation.x = -.2; }
  if (o.beard) { const b = sph(.3, o.beard === true ? brow : o.beard, 0, -.22, .16, head, 1, false); b.scale.set(1.1, .7, .8); }
  if (o.glasses) [-1, 1].forEach(s => { const r = new THREE.Mesh(new THREE.TorusGeometry(.085, .015, 4, 10), M('#2f2a24')); r.position.set(s * .15, .05, .43); head.add(r); box(.07, .015, .015, '#2f2a24', 0, .06, .44, head, false); });
  const n = Object.assign({
    group: g, body, torso, legs, arms, head, eyes, pos: new THREE.Vector3(o.x, 0, o.z), yaw: o.yaw || 0,
    state: 'idle', t: Math.random() * 5, carry: null, jump: 0, cool: 0, r: .45, walk: 0, routeI: 0, wait: 0, act: null,
    chaseT: 0, chatCd: 4 + Math.random() * 8, stateT: 0, glanceCd: 0,
  }, o);
  n.anchor = new THREE.Object3D(); n.anchor.position.set(0, .55, .55); torso.add(n.anchor);
  n.hatAnchor = new THREE.Object3D(); n.hatAnchor.position.set(0, .4, 0); head.add(n.hatAnchor);
  if (o.tool) { n.tool = o.tool(); n.tool.position.set(0, -.62, .12); arms[1].add(n.tool); }
  if (o.phone) box(.08, .22, .05, '#2f3640', 0, -.62, .1, arms[0], false);
  if (!n.route) n.route = [{ p: n.pos.clone(), wait: 99, act: null }];
  g.position.copy(n.pos); noShadowCast(g);
  mergeRig(g, [body, ...legs, torso, ...arms, head, eyes]);
  n.shadow = blob(.6);
  if (!o.seated) { n.cone = new THREE.Mesh(coneGeo, coneMat.clone()); n.cone.visible = false; n.cone.renderOrder = 2; scene.add(n.cone); }
  setRigDetail(0); npcs.push(n); return n;
}
const can = () => { const g = new THREE.Group(); cyl(.13, .15, .26, '#7aa2c8', 0, 0, 0, 8, g); cyl(.025, .035, .3, '#7aa2c8', 0, .05, .2, 6, g, false).rotation.x = 1.1; return g; };
const route = a => a.map(([x, z, wait, act, yaw, line]) => ({ p: new THREE.Vector3(x, 0, z), wait, act, yaw, line }));

export const gardener = makeNPC({ id: 'gardener', x: -22.4, z: -6.5, yaw: Math.PI, shirt: '#e9dfc8', pants: '#4a6d9a', overalls: true, hair: '#8a6a4a', build: 'stocky', hairStyle: 'short', mustache: true, tool: can,
  route: route([[-22.4, -6.5, 2.6, 'water', Math.PI], [-17.6, -6.5, 2.6, 'water', Math.PI], [-20, -5.2, 1.6, null, 0]]) });
export const baker = makeNPC({ id: 'baker', x: -20.6, z: 9.5, yaw: Math.PI, shirt: '#f4f1ea', pants: '#6b6155', hat: 'toque', apron: true, hair: '#5a3b2a', build: 'round', mustache: true,
  route: route([[-20.6, 9.5, 2.2, 'arrange', Math.PI], [-17.4, 9.5, 2.2, 'arrange', Math.PI]]) });
// Le commercial fait des allers-retours au téléphone, puis sort appeler près de la flaque de boue
export const sales = makeNPC({ id: 'sales', x: 10.4, z: -11, yaw: Math.PI, shirt: '#3e5677', pants: '#2b3448', tie: '#e8742a', hair: '#2f2a24', build: 'broad', hairStyle: 'short', office: true, phone: true,
  route: route([[10.4, -11, 1.4, 'phone'], [12, -3.3, 1.4, 'phone'], [7.5, -7.5, 1.2, 'phone', null, 'callOut'], [-9.7, 4.3, 6, 'phone', -0.9], [7.5, -5, 1, 'phone']]) });
export const itguy = makeNPC({ id: 'it', x: 21, z: -10.9, yaw: Math.PI, shirt: '#5d8a8a', pants: '#2b3448', hair: '#6b4a2a', build: 'slim', hairStyle: 'curly', glasses: true, office: true,
  route: route([[21, -10.9, 5, 'type', Math.PI], [24.6, -11.6, 2.5, 'check', Math.PI * .85]]) });
export const meet1 = makeNPC({ id: 'meet', x: 21.4, z: 7.25, yaw: 0, shirt: '#c9894f', pants: '#3d4a5c', hair: '#a8764a', hairStyle: 'bun', seated: true, office: true });
export const meet2 = makeNPC({ id: 'meet', x: 23.8, z: 10.75, yaw: Math.PI, shirt: '#8a7cc2', pants: '#3d4a5c', hair: '#2f2a24', hairStyle: 'long', build: 'slim', seated: true, office: true });
export const lines = n => t().L[n.id];

/* ---------- Oiseaux (dessinés en instances : 5 appels de dessin pour tout le vol) ---------- */
export const birds = [];
const BIRD_N = 64;
const birdParts = (() => {
  const body = new THREE.Group(), hd = new THREE.Group(), wing = new THREE.Group();
  sph(.17, '#f2f4f6', 0, .2, 0, body, 1);
  sph(.1, '#e3e7ea', 0, .36, .13, hd, 1); cone(.035, .1, '#e8a12a', 0, .36, .25, 4, hd, false).rotation.x = Math.PI / 2;
  box(.28, .03, .16, '#d5dade', .14, 0, 0, wing, false);
  return [body, hd, wing].map(g => partGeometry(g));
})();
const inst = (geo, mat, n, tint) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); if (tint) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); scene.add(m); return m; };
const BI = {
  body: inst(birdParts[0].geo, VC, BIRD_N, true), bodyOl: inst(birdParts[0].ol, outlineMat, BIRD_N),
  head: inst(birdParts[1].geo, VC, BIRD_N, true), headOl: inst(birdParts[1].ol, outlineMat, BIRD_N),
  wing: inst(birdParts[2].geo, VC, BIRD_N * 2, true),
};
const _bc = new THREE.Color();
/** Petit groupe d'oiseaux posés. tint : couleur (gris pour le village, blanc pour les mouettes). */
export function flock(x, z, n = 3, tint = '#a9aeb5', o = {}) {
  const out = [];
  for (let i = 0; i < n && birds.length < BIRD_N; i++) {
    // Objets 3D « fantômes » (hors scène) : ils portent les transformations, les instances les dessinent
    const g = new THREE.Object3D(); const bx = x + rnd(-1, 1), bz = z + rnd(-.8, .8); g.position.set(bx, 0, bz);
    const hd = new THREE.Object3D(); g.add(hd);
    const wings = [-1, 1].map(s => { const p = new THREE.Object3D(); p.position.set(s * .12, .25, 0); if (s < 0) p.scale.x = -1; g.add(p); return p; });
    g.rotation.y = rnd(0, 6);
    const b = Object.assign({ g, hd, wings, home: new THREE.Vector3(bx, 0, bz), state: 'peck', t: rnd(0, 3), vel: new THREE.Vector3(), sh: blob(.25) }, o);
    const k = birds.length; birds.push(b); out.push(b);
    _bc.set(tint); BI.body.setColorAt(k, _bc); BI.head.setColorAt(k, _bc); BI.wing.setColorAt(k * 2, _bc); BI.wing.setColorAt(k * 2 + 1, _bc);
    for (const key in BI) { BI[key].count = key === 'wing' ? birds.length * 2 : birds.length; if (BI[key].instanceColor) BI[key].instanceColor.needsUpdate = true; }
  }
  return out;
}
flock(1.2, -6.8); flock(-14.5, 6.6); flock(-25, 3.4);
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);
/** Recopie la position des oiseaux dans les instances (à appeler à chaque image). */
export function drawBirds() {
  birds.forEach((b, i) => {
    if (!b.g.visible) { for (const k of ['body', 'bodyOl', 'head', 'headOl']) BI[k].setMatrixAt(i, _zero); BI.wing.setMatrixAt(i * 2, _zero); BI.wing.setMatrixAt(i * 2 + 1, _zero); return; }
    b.g.updateMatrixWorld(true);
    BI.body.setMatrixAt(i, b.g.matrixWorld); BI.bodyOl.setMatrixAt(i, b.g.matrixWorld);
    BI.head.setMatrixAt(i, b.hd.matrixWorld); BI.headOl.setMatrixAt(i, b.hd.matrixWorld);
    BI.wing.setMatrixAt(i * 2, b.wings[0].matrixWorld); BI.wing.setMatrixAt(i * 2 + 1, b.wings[1].matrixWorld);
  });
  for (const k in BI) BI[k].instanceMatrix.needsUpdate = true;
}
