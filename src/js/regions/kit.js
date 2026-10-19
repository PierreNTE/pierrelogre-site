/* =====================================================================
   Kit de décor partagé par les régions (même style low-poly que le village).
   Tout ce qui est posé ici part dans le groupe de la région en construction
   et sera fusionné (bake) : ne l'utiliser que pour le décor immobile.
   ===================================================================== */
import * as THREE from 'three';
import { BUILD, GROUND, M, box, cone, cyl, mk, patch, solidBox, solidCircle, sph } from '../engine.js';
import { random, rnd } from '../state.js';
import { aoBlob, inside as insideV } from '../vegetation.js';
import { Q } from '../quality.js';
/** Qualité « Basse » choisie : on saute les micro-détails (tuiles une à une, cailloux, fleurs de haie…). */
const LITE = () => Q.tier === 2;

export const PINES = ['#4f7f45', '#5f8f4a', '#567f48', '#6b9c52'];
export function pine(x, z, s = 1, c = 0, solid = true) {
  c = Math.abs(c | 0); const h = k => hash(c * 3.7 + k + x * .131 + z * .071);
  cyl(.15 * s, .22 * s, 1.1 * s, '#7a5236', x, .55 * s, z, 6);
  // quatre étages légèrement décalés et tournés (silhouette moins « sapin de Noël »)
  [[1.32, 1.9, 1.75], [1.05, 1.6, 2.55], [.78, 1.3, 3.25], [.46, .95, 3.85]].forEach(([r, hh, y], k) => {
    const cn = cone(r * s * (.94 + h(k + 12) * .12), hh * s, PINES[(c + k) % 4], x + (h(k) - .5) * .16 * s, y * s, z + (h(k + 4) - .5) * .16 * s, 7); cn.rotation.y = h(k + 8) * 3;
  });
  if (solid) solidCircle(x, z, .4 * s); aoBlob(x, z, 1.6 * s);
}
export function snowPine(x, z, s = 1, c = 0) {
  const h = k => hash(c * 4.1 + k + x * .173 + z * .091);
  cyl(.15 * s, .22 * s, 1.1 * s, '#7a5236', x, .55 * s, z, 6);
  // quatre étages, chacun coiffé de neige (plus épaisse en haut)
  [[1.32, 1.9, 1.75], [1.05, 1.6, 2.55], [.78, 1.3, 3.25], [.46, .95, 3.85]].forEach(([r, hh, y], k) => {
    const ox = (h(k) - .5) * .16 * s, oz = (h(k + 4) - .5) * .16 * s, ry = h(k + 8) * 3;
    const cn = cone(r * s, hh * s, ['#4f7f45', '#567f48', '#4a7a44'][k % 3], x + ox, y * s, z + oz, 7); cn.rotation.y = ry;
    const sn = cone(r * s * (.72 - k * .06), hh * s * .42, '#f4f7fa', x + ox, (y + hh * .29) * s, z + oz, 7, undefined, false); sn.rotation.y = ry;
  });
  solidCircle(x, z, .4 * s); aoBlob(x, z, 1.6 * s);
}
/** Rocher coiffé de neige (montagne). */
export function snowRock(x, z, s = 1, solid = true) {
  const r = sph(s, '#9aa3ad', x, s * .25, z, undefined, 0); r.scale.set(1.15, .7, .95); r.rotation.y = hash(x * z) * 6;
  const sn = sph(s * .82, '#f4f7fa', x + s * .05, s * .62, z - s * .05, undefined, 1, false); sn.scale.set(1.15, .32, .95);
  if (solid) solidCircle(x, z, s * .9, s * .8); aoBlob(x, z, s * 1.3, s * 1.1);
}
/** Butte (colline, congère, talus de terre…) : demi-ellipsoïde aplati, sans collision. */
export function mound(x, z, w, d, h, c, rot = 0, detail = 2) {
  const m = sph(1, c, x, -h * .25, z, undefined, detail, false); m.scale.set(w / 2, h * 1.25, d / 2); m.rotation.y = rot; m.castShadow = false; return m;
}
/** Touffe d'ajonc (lande vendéenne) : boules vert sombre piquées de fleurs jaunes. */
export function gorse(x, z, s = 1, seed = 1) {
  const h = k => hash(seed * 3.1 + k + x * .07);
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + h(i) * 2, r = .32 * s; const b = sph((.42 + h(i + 3) * .15) * s, i % 2 ? '#5c7a3a' : '#66853f', x + Math.cos(a) * r, .3 * s, z + Math.sin(a) * r, undefined, 1, i === 0); b.scale.y = .78; }
  for (let i = 0; i < 9; i++) { const a = h(i + 9) * 6.28, r = (.18 + h(i + 20) * .45) * s; sph(.065 * s, i % 3 ? '#f2c434' : '#e8b42a', x + Math.cos(a) * r, (.42 + h(i + 30) * .28) * s, z + Math.sin(a) * r, undefined, 0, false); }
  solidCircle(x, z, .5 * s, .6); aoBlob(x, z, .9 * s);
}
export function bush(x, z, s = 1, c = '#6b9c52') { sph(.6 * s, c, x, .4 * s, z); sph(.45 * s, '#79a356', x + .35 * s, .55 * s, z + .1 * s, undefined, 1, false); aoBlob(x, z, .9 * s); }
export function rock(x, z, s = 1, c = '#9a958c', solid = true) {
  const r = sph(s, c, x, s * .25, z, undefined, 0); r.scale.set(1, .6 + random() * .3, .85); r.rotation.y = random() * 6;
  if (solid) solidCircle(x, z, s * .85, s * .7); aoBlob(x, z, s * 1.3, s * 1.1);
}
export function bench(x, z, rot = 0, c = '#8a5a3b') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  box(1.8, .1, .5, c, 0, .48, 0, g); box(1.8, .45, .08, c, 0, .78, -.24, g); [-.75, .75].forEach(dx => box(.08, .48, .45, '#3a3a3a', dx, .24, 0, g, false));
  const w = Math.abs(Math.cos(rot)) > .5; solidBox(x, z, w ? 1.8 : .5, w ? .5 : 1.8, .6); aoBlob(x, z, w ? 1.3 : .6, w ? .6 : 1.3, .8);
}
/** Chaise de bistrot : assise ronde, 4 pieds fins légèrement écartés, dossier cintré (face vers +z local). */
export function bistroChair(x, z, rot = 0, seat = '#c9894f', frame = '#2f2a24') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  cyl(.22, .21, .05, seat, 0, .46, 0, 12, g);
  for (const [dx, dz] of [[-.15, -.15], [.15, -.15], [-.15, .15], [.15, .15]]) { const l = cyl(.017, .02, .46, frame, dx * 1.08, .23, dz * 1.08, 5, g, false); l.rotation.set(dz * .5, 0, -dx * .5); }
  for (const dx of [-.15, .15]) { const b = cyl(.017, .017, .44, frame, dx, .68, -.17, 5, g, false); b.rotation.x = -.12; }
  const back = box(.38, .13, .035, seat, 0, .84, -.2, g, false); back.rotation.x = -.12;
  aoBlob(x, z, .32, .32, .5);
  return g;
}
/** Guéridon : plateau rond, pied central, socle en disque (ne « plante » plus dans le sol comme un clou). */
export function bistroTable(x, z, r = .48, top = '#f6efe0', frame = '#2f2a24') {
  cyl(r, r, .05, top, x, .78, z, 14); cyl(r * .96, r * .96, .03, shade(top, -.08), x, .745, z, 14, undefined, false);
  cyl(.035, .045, .74, frame, x, .39, z, 6, undefined, false); cyl(.2, .22, .04, frame, x, .02, z, 10, undefined, false);
  solidCircle(x, z, r, .9); aoBlob(x, z, r + .1, r + .1, .6);
}
/**
 * Manège de chevaux de bois (animé) : plancher et chapiteau tournent, les chevaux montent et descendent en
 * alternance. Renvoie { root, deck, horses: [groupe A, groupe B] } : à confier à W.rig(root, [deck, ...horses]).
 */
export function carousel(c1 = '#d6402f', c2 = '#f6efe0', gold = '#c9a33d') {
  const root = new THREE.Group(), deck = new THREE.Group(); root.add(deck);
  cyl(3.4, 3.5, .3, '#8a5a3b', 0, .15, 0, 20, deck); cyl(3.42, 3.42, .08, gold, 0, .32, 0, 20, deck, false);
  cyl(.42, .42, 3.6, c2, 0, 2.1, 0, 10, deck); cyl(.5, .5, .25, gold, 0, 3.75, 0, 10, deck, false);
  cone(3.9, 1.5, c1, 0, 4.7, 0, 16, deck); sph(.25, gold, 0, 5.55, 0, deck, 1, false);
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, b = box(1.5, .4, .06, k % 2 ? c1 : c2, Math.cos(a) * 3.8, 3.85, Math.sin(a) * 3.8, deck, false); b.rotation.y = -a + Math.PI / 2; }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; cyl(.05, .05, 3.5, gold, Math.cos(a) * 2.6, 2, Math.sin(a) * 2.6, 5, deck, false); }
  const horses = [new THREE.Group(), new THREE.Group()]; horses.forEach(h => deck.add(h));
  const HC = ['#f6efe0', '#c9894f', '#2f2a24', '#d9b38c'];
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2, g = new THREE.Group(); g.position.set(Math.cos(a) * 2.6, 1.3, Math.sin(a) * 2.6); g.rotation.y = -a; horses[k % 2].add(g);
    const c = HC[k % 4];
    const b = sph(.32, c, 0, 0, 0, g, 1); b.scale.set(.75, .7, 1.45);
    const n = sph(.17, c, 0, .32, .36, g, 1, false); n.scale.set(.8, 1.3, .9); n.rotation.x = -.5;
    const hd = sph(.15, c, 0, .52, .55, g, 1, false); hd.scale.set(.75, .8, 1.3);
    box(.06, .22, .3, '#3a2f27', 0, .5, .38, g, false);   // crinière
    for (const [dx, dz, r] of [[-.13, .3, .6], [.13, .3, .9], [-.13, -.3, -.7], [.13, -.3, -.5]]) { const l = cyl(.045, .04, .45, c, dx, -.3, dz, 5, g, false); l.rotation.x = r; }
    box(.36, .06, .42, c1, 0, .2, -.02, g, false);   // selle
  }
  return { root, deck, horses };
}
/** Petite carriole de marchand (crêpes, glaces…) : caisse sur roues, auvent rayé, enseigne. */
export function standCart(x, z, rot = 0, c = '#2f6b4a', awn = '#d6402f') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  box(1.9, .9, 1, c, 0, .75, 0, g); box(2, .08, 1.1, shade(c, .15), 0, 1.23, 0, g, false);
  for (const sx of [-.7, .7]) { const w = cyl(.3, .3, .08, '#2f2a24', sx, .3, .55, 12, g); w.rotation.x = Math.PI / 2; }
  for (const sx of [-.9, .9]) cyl(.03, .03, 1.2, '#d9d4c8', sx, 1.85, -.45, 4, g, false);
  for (let i = 0; i < 5; i++) { const a = box(.42, .05, 1.1, i % 2 ? '#f6efe0' : awn, -.84 + i * .42, 2.45, -.05, g, false); a.rotation.x = .18; }
  box(.9, .3, .05, '#f6efe0', 0, 1.0, .53, g, false); cyl(.18, .18, .03, '#e2b26a', .55, 1.29, .1, 10, g, false);
  const sw = Math.abs(Math.sin(rot)) > .5; solidBox(x, z, sw ? 1.2 : 2.1, sw ? 2.1 : 1.2, 1.3); aoBlob(x, z, 1.4, .9);
  return g;
}
/** Lampes et fenêtres du monde : allumées le soir par daytime.js (positions dans le monde). */
export const LIGHTS = [], WINDOWS = [];
export function lamp(x, z, h = 3.2, c = '#2f3a33') {
  LIGHTS.push({ x, y: h + .1, z, s: 1 });
  // lanterne à vitres : on voit la lumière entre les montants (avant : une boîte noire fermée)
  cyl(.07, .1, h, c, x, h / 2, z, 6); box(.34, .05, .34, c, x, h - .1, z); box(.26, .32, .26, '#fff1b8', x, h + .1, z, undefined, false);
  for (const [dx, dz] of [[-.15, -.15], [.15, -.15], [-.15, .15], [.15, .15]]) box(.04, .36, .04, c, x + dx, h + .1, z + dz, undefined, false);
  box(.38, .05, .38, c, x, h + .29, z, undefined, false); const cp = cone(.3, .25, c, x, h + .42, z, 4); cp.rotation.y = Math.PI / 4;
  solidCircle(x, z, .14, 2);
}
export function fenceRow(x0, z0, x1, z1, c = '#c9a77a', solid = true) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.2)), ang = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) { const k = i / n; box(.12, .75, .12, c, x0 + (x1 - x0) * k, .37, z0 + (z1 - z0) * k); }
  [.3, .6].forEach(y => { const r = box(.06, .08, len, c, (x0 + x1) / 2, y, (z0 + z1) / 2); r.rotation.y = ang; });
  if (solid) { const s = Math.ceil(len / 2); for (let i = 0; i < s; i++) { const a = i / s, b = (i + 1) / s; const xa = x0 + (x1 - x0) * a, xb = x0 + (x1 - x0) * b, za = z0 + (z1 - z0) * a, zb = z0 + (z1 - z0) * b; solidBox((xa + xb) / 2, (za + zb) / 2, Math.abs(xb - xa) + .2, Math.abs(zb - za) + .2, .75); } }
}
/**
 * Bâtiment : socle, murs, toit (deux pans, croupe, plat ou mansardé), fenêtres encadrées sur la façade
 * (côté +z avant rotation) et porte à encadrement. Options : tuiles (tiles), ardoise (slate), volets
 * (shutter), cheminée (chimney : -1 | 1), neige (snow), balcons (balcony, pour les immeubles).
 */
export function building(x, z, w, d, h, wall, roof, { rot = 0, roofType = 'gable', win = '#4d6b80', door = '#7a5236', floors = 1, trim = null, solid = true, tiles = true, slate = false, shutter = null, chimney = 0, snow = false, balcony = null, seed = 1, plinth = '#c9bfae' } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  const hd = d / 2, hw = w / 2;
  if (plinth) box(w + .1, .3, d + .1, plinth, 0, .15, 0, g);
  box(w, h - (plinth ? .28 : 0), d, wall, 0, (plinth ? .28 : 0) + (h - (plinth ? .28 : 0)) / 2, 0, g);
  if (roofType === 'gable') gableRoof(g, w, d, h, roof, wall, { slate, tiles, seed, chimney, snow, x, z, rot });
  else if (roofType === 'hip') { const r = mk(new THREE.CylinderGeometry(0, w * .78, Math.min(1.6, w * .4), 4, 1), M(roof), 0, h + Math.min(1.6, w * .4) / 2, 0, g); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, d / w); }
  else if (roofType === 'mansard') {
    // Toit mansardé en zinc : brisis incliné, terrasson, lucarnes et souches de cheminée
    const mh = Math.min(1.8, h * .2), zinc = roof;
    const m = mk(new THREE.CylinderGeometry((w * .82) / Math.SQRT2, (w + .1) / Math.SQRT2, mh, 4, 1), M(zinc), 0, h + mh / 2, 0, g); m.rotation.y = Math.PI / 4; m.scale.set(1, 1, (d + .1) / (w + .1));
    box(w * .8, .1, d * .78, shade(zinc, .08), 0, h + mh + .05, 0, g, false);
    box(w + .3, .16, d + .3, trim || shade(wall, -.08), 0, h + .02, 0, g, false);   // corniche
    for (let k = 0, n = Math.max(1, Math.floor(w / 2.2)); k < n; k++) { const lx = -hw + (k + .5) * w / n; box(.6, .7, .5, shade(wall, .02), lx, h + mh * .5, hd - .12, g); box(.42, .44, .05, win, lx, h + mh * .48, hd + .14, g, false); const c = cone(.48, .34, zinc, lx, h + mh * .5 + .5, hd - .12, 4, g); c.rotation.y = Math.PI / 4; c.scale.set(1, 1, .7); }
    for (const sx of [-1, 1]) { box(.5, .9, .4, '#c9a982', sx * (hw - .6), h + mh + .4, 0, g); box(.54, .08, .44, '#9a8f80', sx * (hw - .6), h + mh + .88, 0, g, false); }
  } else box(w + .2, .18, d + .2, roof, 0, h + .09, 0, g, false);
  if (trim && roofType !== 'mansard') box(w + .06, .12, d + .06, trim, 0, h - .06, 0, g, false);
  // Façade : fenêtres encadrées, porte au centre du rez-de-chaussée, balcons
  const cols = Math.max(1, Math.floor(w / 1.6)), fh = h / floors, base = plinth ? .28 : 0;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const wx = -hw + (c + .5) * w / cols, wy = base + (f + .58) * (h - base) / floors;
      if (f === 0 && c === (cols >> 1) && door) {
        const dh = Math.min(1.5, fh * .78);
        box(1.0, dh + .14, .07, plinth || shade(wall, -.1), wx, base + dh / 2, hd + .035, g, false);
        box(.78, dh, .08, door, wx, base + dh / 2, hd + .05, g);
        sph(.045, '#d9b84a', wx + .26, base + dh * .48, hd + .1, g, 0, false);
        continue;
      }
      windowUnit(g, wx, wy, hd, 1, { w: Math.min(.6, w / cols * .4), h: Math.min(.8, fh * .42), glass: win, shutter });
    }
    if (balcony && f > 0 && (f === 1 || f === floors - 1)) { const by = base + f * (h - base) / floors + .08; box(w - .3, .07, .4, shade(wall, -.1), 0, by, hd + .2, g, false); box(w - .3, .34, .03, balcony, 0, by + .22, hd + .4, g, false); }
  }
  const sw = Math.abs(Math.sin(rot)) > .5; if (solid) solidBox(x, z, (sw ? d : w) + .1, (sw ? w : d) + .1, h); aoBlob(x, z, (sw ? d : w) * .72 + .5, (sw ? w : d) * .72 + .5);
  return g;
}
export function parasol(x, z, c1 = '#d9705a', c2 = '#f6efe0') {
  cyl(.04, .04, 2.2, '#e9e3d6', x, 1.1, z, 5);
  cone(1.2, .5, c1, x, 2.2, z, 8); sph(.1, c2, x, 2.48, z, undefined, 0, false);
  solidCircle(x, z, .1, 2);
}
export function boat(x, z, rot = 0, c = '#f6efe0', sail = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  // coque taillée (proue en pointe, poupe arrondie), liston de couleur, pont en bois, voile triangulaire
  const hull = (k, y0, dy, col, ol) => { const sh = new THREE.Shape(); sh.moveTo(-.7 * k, 1.55 * k); sh.quadraticCurveTo(-.72 * k, 1.75 * k, -.45 * k, 1.75 * k); sh.lineTo(.45 * k, 1.75 * k); sh.quadraticCurveTo(.72 * k, 1.75 * k, .7 * k, 1.55 * k); sh.lineTo(.72 * k, -.55 * k); sh.quadraticCurveTo(.6 * k, -1.45 * k, 0, -1.95 * k); sh.quadraticCurveTo(-.6 * k, -1.45 * k, -.72 * k, -.55 * k); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: dy, bevelEnabled: false, curveSegments: 6 }); geo.rotateX(-Math.PI / 2); return mk(geo, M(col), 0, y0, 0, g, ol); };
  hull(1, .02, .56, c); hull(1.015, .44, .09, '#2563c9', false); hull(.86, .58, .02, '#b8834a', false);
  box(1.2, .06, .3, '#9a6c3c', 0, .62, -.3, g, false);   // banc de nage
  if (sail) { cyl(.05, .05, 3.2, '#8a5a3b', 0, 2.1, .2, 5, g); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 2.6); sh.lineTo(1.3, 0); sh.closePath(); const sg = new THREE.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: false }); sg.rotateY(Math.PI / 2); mk(sg, M('#fbf6e6'), -.015, .85, .16, g); }
  return g;
}
export function flag(x, z, c = '#e8742a', h = 4) { cyl(.05, .06, h, '#d9d4c8', x, h / 2, z, 5); box(.9, .55, .03, c, x + .47, h - .35, z, undefined, false); solidCircle(x, z, .1, 1); }
/** Gradins : n rangées. Renvoie les places assises (pour la foule). */
export function stands(x, z, w, rows, rot = 0, c = '#c9cdd3') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  const seats = [];
  for (let r = 0; r < rows; r++) { box(w, .45 * (r + 1), .9, r % 2 ? c : '#b8bec6', 0, .225 * (r + 1), -r * .9, g); for (let s = -w / 2 + .7; s < w / 2 - .5; s += 1.1) seats.push(new THREE.Vector3(s, .45 * (r + 1), -r * .9).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(new THREE.Vector3(x, 0, z))); }
  const sw = Math.abs(Math.sin(rot)) > .5, dd = rows * .9; const cx = x - Math.sin(rot) * (dd / 2 - .45), cz = z - Math.cos(rot) * (dd / 2 - .45);
  solidBox(cx, cz, sw ? dd : w, sw ? w : dd, 1.4);
  return seats;
}
/** Disperse n objets dans un rectangle en évitant des zones (cercles {x,z,r}). */
export function scatter(rect, n, fn, avoid = [], seed = 0) {
  let k = 0;
  for (let i = 0; i < n * 8 && k < n; i++) {
    const x = rnd(rect.minX, rect.maxX), z = rnd(rect.minZ, rect.maxZ);
    if (avoid.some(a => a.seg || a.w != null ? insideV(x, z, a) : a.r ? Math.hypot(x - a.x, z - a.z) < a.r : (x > a.minX && x < a.maxX && z > a.minZ && z < a.maxZ))) continue;
    fn(x, z, k++, seed);
  }
}
/** Bande d'arbres serrés (lisière infranchissable). */
export function treeLine(x0, z0, x1, z1, step = 2.4, fn = (x, z, i) => pine(x, z, rnd(.9, 1.3), i)) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) { const k = i / n; fn(x0 + (x1 - x0) * k + rnd(-.5, .5), z0 + (z1 - z0) * k + rnd(-.5, .5), i); }
}
const group = () => BUILD;

/* ---------- Matériau qui ondule au vent (fanions, linge, feuillages colorés) ---------- */
const swayCache = {};
export const MS = c => swayCache[c] ||= patch(new THREE.MeshLambertMaterial({ color: c, flatShading: true }), { sway: true });

/* ---------- Petits décors (regroupés naturellement par les régions) ---------- */
export function stump(x, z, s = 1) { cyl(.38 * s, .46 * s, .5 * s, '#8a5a3b', x, .25 * s, z, 8); cyl(.36 * s, .36 * s, .02, '#d9b98a', x, .51 * s, z, 8, undefined, false); cyl(.18 * s, .18 * s, .021, '#c9a77a', x, .515 * s, z, 8, undefined, false); solidCircle(x, z, .45 * s, .5 * s); aoBlob(x, z, .8 * s); }
export function log(x, z, rot = 0, s = 1) { const l = cyl(.32 * s, .36 * s, 3 * s, '#8a5a3b', x, .3 * s, z, 8); l.rotation.set(0, rot, Math.PI / 2); const e = cyl(.3 * s, .3 * s, .02, '#d9b98a', x + Math.cos(rot) * 1.51 * s, .3 * s, z - Math.sin(rot) * 1.51 * s, 8, undefined, false); e.rotation.set(0, rot, Math.PI / 2);
  sph(.3 * s, '#7fa35a', x - Math.cos(rot) * .4 * s, .55 * s, z + Math.sin(rot) * .4 * s, undefined, 0, false).scale.set(1, .4, 1); const sw = Math.abs(Math.cos(rot)) > .7; solidBox(x, z, sw ? 3 * s : .7 * s, sw ? .7 * s : 3 * s, .6 * s); aoBlob(x, z, sw ? 1.9 * s : .7 * s, sw ? .7 * s : 1.9 * s); }
export function rockCluster(x, z, s = 1, c = '#9a958c', moss = true) { rock(x, z, s, c); rock(x + .9 * s, z + .4 * s, s * .55, c); rock(x - .6 * s, z + .7 * s, s * .4, c); if (moss) sph(s * .55, '#7fa35a', x + .1 * s, s * .62, z - .1 * s, undefined, 0, false).scale.set(1, .3, .9); }
export function birch(x, z, s = 1) {
  // tronc blanc fin qui se divise, marques noires, feuillage léger en plusieurs touffes étagées
  const h = k => hash(x * .31 + z * .17 + k);
  cyl(.11 * s, .16 * s, 2.4 * s, '#efe9dc', x, 1.2 * s, z, 7);
  for (const [dx, dz, r] of [[.35, .1, -.35], [-.3, -.15, .4]]) { const b = cyl(.05 * s, .08 * s, 1.5 * s, '#efe9dc', x + dx * .5 * s, 2.75 * s, z + dz * s, 6, undefined, false); b.rotation.set(dz * 1.2, 0, r); }
  for (let i = 0; i < 5; i++) { const m = box(.18 * s, .04 * s, .05 * s, '#3a2f27', x + .08 * s, (.4 + i * .45) * s, z + .1 * s, undefined, false); m.rotation.y = i * 1.3; }
  [[0, 3.5, 0, .75, '#c9a33d'], [.55, 3.05, .2, .6, '#d9b84a'], [-.5, 3.15, -.25, .58, '#b9a03a'], [.1, 2.65, -.45, .48, '#d4ad40'], [-.2, 4, .2, .45, '#ddb955']].forEach(([dx, y, dz, r, c], i) => sph((r + h(i) * .1) * s, c, x + dx * s, y * s, z + dz * s, undefined, 1, i < 2));
  solidCircle(x, z, .25 * s); aoBlob(x, z, 1.2 * s); }
export function deadTree(x, z, s = 1) { cyl(.16 * s, .26 * s, 2.8 * s, '#7a6a5a', x, 1.4 * s, z, 6); [[.7, 2.2, .9], [-.6, 1.8, -.8], [.2, 2.7, .3]].forEach(([dx, y, r]) => { const b = cyl(.05 * s, .08 * s, 1.1 * s, '#7a6a5a', x + dx * .5 * s, y * s, z, 4); b.rotation.z = r; }); solidCircle(x, z, .3 * s); aoBlob(x, z, .9 * s); }
export function barrel(x, z, c = '#a8764a') { cyl(.36, .32, .9, c, x, .45, z, 10); [.15, .75].forEach(y => cyl(.37, .37, .06, '#5d6670', x, y, z, 10, undefined, false)); solidCircle(x, z, .38, .9); aoBlob(x, z, .6); }
export function crate(x, z, rot = 0, s = 1) { const b = box(.8 * s, .8 * s, .8 * s, '#c9a074', x, .4 * s, z); b.rotation.y = rot; const l = box(.82 * s, .1 * s, .82 * s, '#a8764a', x, .55 * s, z, undefined, false); l.rotation.y = rot; solidCircle(x, z, .5 * s, .8 * s); aoBlob(x, z, .7 * s); }
export function woodpile(x, z, rot = 0) { for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) { const l = cyl(.16, .16, 1.4, i % 2 ? '#a8764a' : '#8a5a3b', 0, 0, 0, 7); l.rotation.set(Math.PI / 2, rot, 0, 'YXZ'); const ox = (-1.5 + i + r * .5) * .34; l.position.set(x + Math.cos(rot) * ox, .17 + r * .29, z - Math.sin(rot) * ox); } solidCircle(x, z, .8, .9); aoBlob(x, z, 1.1, .9); }
/** Lanterne sur poteau : petite cage vitrée, toit pointu, chapeau et crochet. */
export function lantern(x, z, h = 2.2) {
  const D = '#2f3a33'; LIGHTS.push({ x, y: h + .19, z, s: .75 });
  cyl(.05, .08, h, D, x, h / 2, z, 6); cyl(.1, .12, .14, D, x, .07, z, 6, undefined, false);
  box(.24, .05, .24, D, x, h + .02, z, undefined, false);
  box(.19, .28, .19, '#ffe2a0', x, h + .19, z, undefined, false);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(.03, .3, .03, D, x + a * .1, h + .19, z + b * .1, undefined, false));
  const r = cone(.21, .2, D, x, h + .43, z, 4); r.rotation.y = Math.PI / 4; sph(.035, D, x, h + .55, z, undefined, 0, false);
  solidCircle(x, z, .1, 2);
}
export function mailbox(x, z, rot = 0, c = '#d9c24a') { cyl(.05, .05, 1, '#7a5236', x, .5, z, 4); const b = box(.32, .3, .5, c, x, 1.1, z); b.rotation.y = rot; solidCircle(x, z, .1, 1); }
/** Brouette : bac évasé, roue à rayons, pieds et brancards. */
export function wheelbarrow(x, z, rot = 0, c = '#5d8fb0') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  const tg = new THREE.CylinderGeometry(.5, .34, .36, 4, 1); tg.rotateY(Math.PI / 4); tg.scale(1, 1, 1.45);
  mk(tg, M(c), 0, .62, -.05, g); box(.62, .03, .9, '#6a5a48', 0, .45, -.05, g, false);
  // roue à l'avant, reliée aux brancards par son axe (elle ne flotte plus devant le bac)
  const wheel = cyl(.25, .25, .08, '#3a3a3a', 0, .25, .6, 12, g); wheel.rotation.z = Math.PI / 2;
  [0, Math.PI / 2].forEach(a => { const sp = box(.03, .42, .03, '#8a7a68', 0, .25, .6, g, false); sp.rotation.x = a; });
  cyl(.025, .025, .58, '#5a4a3a', 0, .25, .6, 5, g, false).rotation.z = Math.PI / 2;
  [-.26, .26].forEach(dx => {
    const arm = box(.05, .05, 1.62, '#8a5a3b', dx, .44, -.16, g, false); arm.rotation.x = .15;
    const fork = box(.04, .2, .04, '#8a5a3b', dx * .95, .31, .58, g, false); fork.rotation.x = .2;
    box(.05, .34, .05, '#8a5a3b', dx, .17, -.42, g, false);
    cyl(.035, .035, .2, '#5a4a3a', dx, .54, -.98, 5, g, false).rotation.x = Math.PI / 2;
  });
  sph(.18, '#7a5236', .1, .82, -.15, g, 0, false).scale.set(1.3, .5, 1.1);   // un peu de terre dans le bac
  solidCircle(x, z, .55, .7); aoBlob(x, z, .7);
  return g;
}
/** Guirlande de fanions entre deux points (ondule au vent). */
export function bunting(x0, z0, x1, z1, h = 3.2, cols = ['#d6402f', '#f6d36b', '#2563c9', '#7fb05c', '#f2b8c6', '#e8742a']) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(3, Math.round(len / .7)), ang = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 1; i < n; i++) { const k = i / n, sag = Math.sin(k * Math.PI) * .6; const f = mk(new THREE.ConeGeometry(.2, .42, 3), MS(cols[i % cols.length]), x0 + (x1 - x0) * k, h - sag - .22, z0 + (z1 - z0) * k, undefined, false); f.rotation.set(Math.PI, ang + Math.PI / 2, 0); f.scale.set(1, 1, .2); }
  const rope = cyl(.015, .015, len, '#5a4a3a', (x0 + x1) / 2, h - .3, (z0 + z1) / 2, 3, undefined, false); rope.rotation.set(Math.PI / 2, ang, 0, 'YXZ');
}

/* ---------- Kit d'ambiance par lieu ---------- */
/** Platane (avenues de ville) : tronc clair tacheté, houppier arrondi. */
export function planeTree(x, z, s = 1) {
  // platane : tronc clair à plaques d'écorce, deux maîtresses branches, houppier large en touffes
  const h = k => hash(x * .23 + z * .19 + k);
  cyl(.19 * s, .27 * s, 2.5 * s, '#b9ad94', x, 1.25 * s, z, 8);
  for (let i = 0; i < 3; i++) { const a = h(i) * 6.28, b = box(.22 * s, .34 * s, .04 * s, i % 2 ? '#8f8470' : '#d2c8b0', x + Math.cos(a) * .21 * s, (.7 + i * .55) * s, z + Math.sin(a) * .21 * s, undefined, false); b.rotation.y = -a + Math.PI / 2; }
  for (const [dx, r] of [[.45, -.5], [-.45, .5]]) { const b = cyl(.08 * s, .13 * s, 1.4 * s, '#b0a48a', x + dx * s, 2.85 * s, z, 6, undefined, false); b.rotation.z = r; }
  [[0, 3.75, 0, 1.25, '#7fa35a'], [.95, 3.3, .3, .95, '#8cb064'], [-.9, 3.35, -.35, .95, '#729a50'], [.2, 3.25, -.85, .85, '#86ab5e'], [-.25, 3.3, .85, .85, '#789f55'], [.15, 4.35, .1, .8, '#93b86a']].forEach(([dx, y, dz, r, c], i) => sph((r + h(i + 5) * .12) * s, c, x + dx * s, y * s, z + dz * s, undefined, 1, i < 3));
  solidCircle(x, z, .3 * s); aoBlob(x, z, 1.8 * s); }
/** Saule pleureur (bord de l'eau). */
export function willow(x, z, s = 1) { cyl(.25 * s, .35 * s, 2.4 * s, '#7a6a52', x, 1.2 * s, z, 7); sph(1.6 * s, '#8fb06a', x, 3 * s, z); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const c = cone(.45 * s, 2.4 * s, '#9cbc74', x + Math.cos(a) * 1.3 * s, 1.9 * s, z + Math.sin(a) * 1.3 * s, 5); c.rotation.x = Math.PI; } solidCircle(x, z, .4 * s); aoBlob(x, z, 2 * s); }
/** Cabine de plage rayée. */
export function beachHut(x, z, c = '#2563c9', rot = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g); box(1.6, 2, 1.4, '#f6efe0', 0, 1, 0, g); for (let i = 0; i < 4; i++) box(.22, 2.02, 1.42, c, -.6 + i * .4, 1, 0, g, false); const r = mk(new THREE.CylinderGeometry(0, 1.3, .8, 4), M(c), 0, 2.4, 0, g); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, .9); box(.7, 1.3, .05, '#c9a074', 0, .75, .72, g, false); solidBox(x, z, 1.6, 1.4, 2); aoBlob(x, z, 1.3, 1.1); }
/** Paravent de plage (toile tendue entre des piquets). */
export function windbreak(x, z, rot = 0, c = '#d9705a') { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g); for (let i = 0; i < 4; i++) cyl(.03, .03, 1.2, '#c9a074', -1.5 + i, .6, 0, 4, g); for (let i = 0; i < 3; i++) box(1, .9, .03, i % 2 ? '#f6efe0' : c, -1 + i, .65, 0, g); }
/** Colonne Morris (affiches de Paris). */
export function morris(x, z) { cyl(.6, .65, 2.6, '#2f6b4a', x, 1.3, z, 10); cyl(.62, .62, 1.8, '#efe6cf', x, 1.4, z, 10, undefined, false); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; box(.5, .7, .02, ['#d6402f', '#2563c9', '#f6d36b', '#7fb05c'][i], x + Math.cos(a) * .63, 1.5, z + Math.sin(a) * .63, undefined, false).rotation.y = -a + Math.PI / 2; } const d = sph(.75, '#2f6b4a', x, 2.7, z, undefined, 1); d.scale.y = .5; solidCircle(x, z, .7, 2.6); aoBlob(x, z, .9); }
/** Camionnette (paddock, quai). */
export function van(x, z, rot = 0, c = '#f6efe0') { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g); box(4.2, 1.8, 1.9, c, 0, 1.15, 0, g); box(1.2, 1.2, 1.9, c, 2.5, .95, 0, g); box(.9, .6, 1.92, '#8fc9df', 2.6, 1.3, 0, g, false); [-1.3, 1.3, 2.4].forEach(dx => [-1, 1].forEach(s => { const w = cyl(.38, .38, .25, '#2f2a24', dx, .38, s * .9, 10, g); w.rotation.x = Math.PI / 2; })); box(4.22, .3, 1.92, '#e8742a', 0, 1.2, 0, g, false); const sw = Math.abs(Math.sin(rot)) > .5; solidBox(x, z, sw ? 2 : 5.4, sw ? 5.4 : 2, 2); aoBlob(x, z, sw ? 1.4 : 3.3, sw ? 3.3 : 1.4); }
/** Panneau publicitaire bas (bord de terrain). */
export function adBoard(x, z, w, rot = 0, c = '#2563c9') { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g); box(w, .8, .12, c, 0, .5, 0, g); box(w * .6, .3, .13, '#f6efe0', 0, .55, 0, g, false); [-w / 2 + .2, w / 2 - .2].forEach(dx => box(.08, .5, .3, '#5d6670', dx, .25, -.15, g, false)); }
/** Cône de chantier / d'entraînement. */
export function trafficCone(x, z) { cone(.18, .5, '#e8742a', x, .25, z, 8); cyl(.16, .14, .06, '#f6efe0', x, .28, z, 8, undefined, false); box(.4, .04, .4, '#e8742a', x, .02, z, undefined, false); }
/** Jardinière fleurie. */
export function planter(x, z, w = 1.6, rot = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g); box(w, .5, .6, '#c9714a', 0, .25, 0, g); for (let i = 0; i < Math.round(w * 3); i++) sph(.16, ['#f2b8c6', '#f6d36b', '#f5f0e6', '#d6402f'][i % 4], -w / 2 + .2 + i * .33, .6, (i % 2 - .5) * .2, g, 0, false); sph(w * .32, '#6f9e4f', 0, .5, 0, g, 1, false).scale.set(1.4, .5, .5); const sw = Math.abs(Math.sin(rot)) > .5; solidBox(x, z, sw ? .6 : w, sw ? w : .6, .6); }
/** Chalet de montagne (toit enneigé). */
export function chalet(x, z, rot = 0) { const g = building(x, z, 4.4, 3.6, 2.4, '#a8764a', '#7a5236', { rot, win: '#ffe2a0', snow: true, chimney: 1, plinth: '#9aa3ad', shutter: '#d6402f' }); for (let i = 0; i < 5; i++) box(4.42, .06, .06, '#7a5236', 0, .5 + i * .42, 1.82, g, false); return g; }

/* =====================================================================
   Kit v2 : le standard de qualité du village (maisons, arbres, haies, talus, chemins)
   ===================================================================== */
/** Cheminées (la fumée est animée par ambient.js). */
export const CHIMNEYS = [];
const _Y = new THREE.Vector3(0, 1, 0);
/** Point local d'un objet posé en (x, z) et tourné de rot → coordonnées du monde. */
const toWorld = (lx, ly, lz, x, z, rot) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(_Y, rot).add(new THREE.Vector3(x, 0, z));
/** Pseudo-hasard stable (même résultat à chaque chargement pour un même n). */
export const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const _sc = new THREE.Color(), _hsl = { h: 0, s: 0, l: 0 };
/** Teinte voisine : dl / ds décalent la luminosité / la saturation (HSL). */
export const shade = (c, dl = 0, ds = 0) => { _sc.set(c).getHSL(_hsl); _sc.setHSL(_hsl.h, Math.min(1, Math.max(0, _hsl.s + ds)), Math.min(1, Math.max(0, _hsl.l + dl))); return '#' + _sc.getHexString(); };

/**
 * Maison vendéenne : murs chaulés sur socle de pierre, chaînes d'angle, toit de tuiles canal
 * à faible pente avec génoise, volets peints, jardinières, porte à encadrement de pierre,
 * cheminée en pignon. Façade côté +z avant rotation ; le faîtage suit l'axe x.
 */
export function cottage(x, z, { w = 4.6, d = 3.4, h = 2.3, rot = 0, wall = '#f4efe4', roof = '#c8643c', shutter = '#5b87a8', door = null, doorX = 0, wins = null, back = true, chimney = 1, flowers = '#d6402f', slate = false, solid = true, seed = 1 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  const STONE = '#c9bfae', QUOIN = '#ddd5c6', hw = w / 2, hd = d / 2;
  door ||= shade(shutter, -.06);
  // Socle, murs, chaînes d'angle
  box(w + .12, .34, d + .12, STONE, 0, .17, 0, g);
  box(w, h - .32, d, wall, 0, .32 + (h - .32) / 2, 0, g);
  if (!LITE()) for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0, y = .55; y < h - .15; i++, y += .38) {
    const bx = i % 2 ? .44 : .26, bz = i % 2 ? .26 : .44;
    box(bx, .3, bz, QUOIN, sx * (hw - bx / 2 + .025), y, sz * (hd - bz / 2 + .025), g, false);
  }
  // Génoise (rangs de tuiles sous l'avant-toit) sur les deux longs pans
  for (const sz of [-1, 1]) { box(w + .02, .1, .14, '#e3d6c2', 0, h - .05, sz * (hd + .05), g, false); box(w + .02, .08, .1, '#c98a62', 0, h - .16, sz * (hd + .03), g, false); }
  gableRoof(g, w, d, h, roof, wall, { slate, seed, chimney, x, z, rot });
  const win = (wx, wy, f, fl) => windowUnit(g, wx, wy, f * hd, f, { shutter, flowers: fl });
  const wy = .32 + (h - .32) * .55;
  (wins || [-(hw - 1.1), hw - 1.1]).forEach((wx, i) => win(wx, wy, 1, flowers && (i + seed) % 3 !== 2 ? flowers : null));
  if (back) win(hash(seed) > .5 ? hw * .4 : -hw * .4, wy, -1, null);
  // Porte : encadrement de pierre, planches, poignée, marche, petite lanterne
  box(1.02, 1.66, .07, QUOIN, doorX, .32 + .8, hd + .035, g, false);
  box(.8, 1.5, .08, door, doorX, .32 + .75, hd + .05, g);
  for (const dx of [-.2, 0, .2]) box(.015, 1.42, .01, shade(door, -.1), doorX + dx, .32 + .74, hd + .095, g, false);
  sph(.045, '#d9b84a', doorX + .27, 1.05, hd + .1, g, 0, false);
  box(1.2, .3, .46, STONE, doorX, .15, hd + .29, g);
  box(.14, .2, .14, '#2f3a33', doorX + .74, 1.72, hd + .12, g, false); box(.1, .14, .1, '#ffe2a0', doorX + .74, 1.7, hd + .13, g, false); box(.04, .04, .1, '#2f3a33', doorX + .74, 1.84, hd + .05, g, false);   // potence fixée au mur
  { const lp = toWorld(doorX + .74, 1.7, hd + .2, x, z, rot); LIGHTS.push({ x: lp.x, y: lp.y, z: lp.z, s: .45 }); }
  const sw = Math.abs(Math.sin(rot)) > .5;
  if (solid) solidBox(x, z, (sw ? d : w) + .14, (sw ? w : d) + .14, h);
  aoBlob(x, z, (sw ? d : w) * .72 + .7, (sw ? w : d) * .72 + .7);
  return g;
}

/**
 * Toit à deux pans (faîtage selon x) posé sur des murs w × d de hauteur h dans le groupe g :
 * pans avec débord, tuiles canal (ou ardoises, ou rien), faîtière, pignons pleins, cheminée de pignon
 * facultative (chimney = -1 ou 1 : côté), neige facultative. Renvoie la hauteur du faîtage.
 */
export function gableRoof(g, w, d, h, roof, wall, { slate = false, tiles = true, pitch = null, seed = 1, chimney = 0, snow = false, x = 0, z = 0, rot = 0 } = {}) {
  const hd = d / 2, hw = w / 2;
  pitch ??= slate ? .52 : .36;
  const oh = .34, run = hd + oh, rise = hd * Math.tan(pitch), sl = run / Math.cos(pitch), th = .12, RX = w + .42;
  const tones = slate ? [roof, shade(roof, .04), shade(roof, -.03)] : [roof, shade(roof, .05, -.04), shade(roof, -.05, .03), shade(roof, .02, .05)];
  for (const s of [1, -1]) {
    const pn = box(RX, th, sl, tiles ? (slate ? shade(roof, -.06) : shade(roof, -.1)) : roof, 0, h + rise - run / 2 * Math.tan(pitch) + th / 2 * Math.cos(pitch), s * (run / 2 + th / 2 * Math.sin(pitch)), g);
    pn.rotation.x = s * pitch;
    if (snow) box(RX + .08, .16, sl * .92, '#f4f7fa', 0, th / 2 + .07, -sl * .04, pn, false);
    else if (tiles && slate && !LITE()) { for (let r = 0, k = 0; r < sl - .1; r += .22, k++) box(RX - .02, .03, .2, tones[k % 3], 0, th / 2 + .012, -sl / 2 + .12 + r, pn, false); }
    else if (tiles && !LITE()) for (let tx = -RX / 2 + .13, k = 0; tx < RX / 2 - .05; tx += .25, k++) { const c = cyl(.085, .085, sl + .02, tones[(hash(seed * 31 + k + s * 7) * tones.length) | 0], tx, th / 2 + .01, .01, 5, pn, false); c.rotation.x = Math.PI / 2; }
  }
  cyl(.12, .12, RX + .06, snow ? '#f4f7fa' : shade(roof, -.12), 0, h + rise + .07, 0, 6, g).rotation.z = Math.PI / 2;
  const tri = new THREE.Shape(); tri.moveTo(-hd, 0); tri.lineTo(hd, 0); tri.lineTo(0, rise); tri.closePath();
  const gg = new THREE.ExtrudeGeometry(tri, { depth: w, bevelEnabled: false }); gg.translate(0, 0, -hw);
  mk(gg, M(wall), 0, h, 0, g).rotation.y = Math.PI / 2;
  if (chimney) {
    const cx = chimney * (hw - .45), ch = rise + .95;
    box(.62, ch, .52, wall, cx, h + ch / 2, 0, g); box(.74, .1, .64, '#c9bfae', cx, h + ch + .05, 0, g, false);
    for (const s of [-1, 1]) { const t = box(.34, .06, .5, snow ? '#f4f7fa' : roof, cx + s * .12, h + ch + .17, 0, g, false); t.rotation.z = -s * .5; }
    CHIMNEYS.push(toWorld(cx, h + ch + .25, 0, x, z, rot));
  }
  return h + rise;
}
/**
 * Fenêtre sur une façade (plan z = fz, f = ±1 vers l'extérieur) : encadrement, vitre et reflet,
 * petits-bois, appui, volets ouverts (facultatifs) et jardinière (facultative).
 */
export function windowUnit(g, wx, wy, fz, f, { w = .54, h = .7, shutter = null, flowers = null, frame = '#ece6da', glass = '#4d6b80', sill = '#c9bfae' } = {}) {
  { const p = toWorld(wx, wy, fz + f * .078, g.position.x, g.position.z, g.rotation.y); WINDOWS.push({ x: p.x, y: p.y, z: p.z, a: g.rotation.y + (f < 0 ? Math.PI : 0), w: w * .9, h: h * .9 }); }
  box(w + .2, h + .2, .06, frame, wx, wy, fz + f * .03, g, false);
  box(w, h, .05, glass, wx, wy, fz + f * .05, g, false);
  box(.04, h, .02, frame, wx, wy, fz + f * .08, g, false); box(w, .04, .02, frame, wx, wy + h * .11, fz + f * .08, g, false);
  box(w * .18, h * .37, .01, '#a9cfe0', wx - w * .26, wy + h * .28, fz + f * .085, g, false);
  box(w + .36, .07, .2, sill, wx, wy - h / 2 - .13, fz + f * .09, g, false);
  if (shutter) for (const s of [-1, 1]) {
    const sx = wx + s * (w / 2 + .28);
    box(w * .63, h + .04, .05, shutter, sx, wy, fz + f * .04, g);
    for (const yy of [-.31, .31]) box(w * .55, .05, .015, shade(shutter, -.12), sx, wy + yy * h, fz + f * .07, g, false);
    box(.012, h, .012, shade(shutter, -.12), sx, wy, fz + f * .07, g, false);
  }
  if (flowers && !LITE()) {
    box(w + .12, .16, .2, '#8a5a3b', wx, wy - h / 2 - .25, fz + f * .15, g, false); sph(.16, '#5f8f45', wx, wy - h / 2 - .15, fz + f * .16, g, 0, false).scale.set(2, .6, .7);
    for (let i = 0; i < 5; i++) sph(.075, i % 2 ? flowers : '#f2b8c6', wx - .24 + i * .12, wy - h / 2 - .09 + (i % 2) * .04, fz + f * (.17 + (i % 3) * .02), g, 0, false);
  }
}

/* ---------- Arbres v2 ---------- */
/** Trois tons par feuillage (ombre, masse, lumière) : tous ondulent au vent. */
export const LEAVES = { green: ['#5f8f45', '#6f9e4f', '#86b062'], orange: ['#c4772f', '#d98b3a', '#e9a552'], gold: ['#b8922f', '#c9a33d', '#ddb955'], lime: ['#6d9d4d', '#7fb05c', '#95c06e'], amber: ['#cf8f38', '#e2a548', '#efbd66'] };
const LEAF_ORDER = ['green', 'orange', 'lime', 'gold', 'green', 'amber', 'lime'];
const TRUNK = '#7a5236';
/** Branche : un cylindre incliné qui part de (x, y, z) dans la direction (dx, dy, dz). */
function branch(x, y, z, dx, dy, dz, len, r0, r1, c = TRUNK) {
  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  const b = cyl(r1, r0, len, c, x + dir.x * len / 2, y + dir.y * len / 2, z + dir.z * len / 2, 5, undefined, false);
  b.quaternion.setFromUnitVectors(_Y, dir); return b;
}
/** Feuillu (chêne d'automne) : tronc effilé à empattement, branches, houppier de 5 à 6 masses. */
export function oak(x, z, s = 1, ci = 0, y0 = 0) {
  const pal = LEAVES[LEAF_ORDER[Math.abs(ci | 0) % LEAF_ORDER.length]], h = k => hash(ci * 13.7 + k), a0 = h(1) * 6.28;
  cyl(.16 * s, .28 * s, 1.9 * s, TRUNK, x, y0 + .95 * s, z, 7);
  cone(.44 * s, .55 * s, TRUNK, x, y0 + .27 * s, z, 7, undefined, false);
  for (let k = 0; k < 3; k++) { const a = a0 + k * 2.1; branch(x, y0 + 1.45 * s, z, Math.cos(a) * .7, 1, Math.sin(a) * .7, 1.1 * s, .1 * s, .05 * s); }
  const B = [[0, 2.85, 0, 1.15, 1], [.85, 2.5, .2, .82, 0], [-.8, 2.55, -.1, .86, 0], [.1, 3.45, -.15, .78, 2], [-.25, 2.35, .75, .74, 0], [.35, 2.4, -.75, .72, 1]];
  B.forEach(([bx, by, bz, r, tone], k) => {
    if (k > 3 && LITE()) return;
    const c = Math.cos(a0), sn = Math.sin(a0), j = .85 + h(k + 3) * .3;
    const px = (bx * c - bz * sn) * s, pz = (bx * sn + bz * c) * s;
    // un feuillage sur six garde une touche de la saison voisine (automne en cours)
    const col = k === 4 && ci % 3 === 0 ? LEAVES.orange[1] : pal[tone];
    sph(r * s * j, col, x + px, y0 + by * s * (.95 + h(k + 9) * .1), z + pz, undefined, 1, k < 4);   // contour (et ombre) pour les grandes masses
  });
  if (!y0) { solidCircle(x, z, .38 * s); aoBlob(x, z, 1.7 * s); }
}
/** Conifère : quatre étages légèrement décalés et tournés. */
export function fir(x, z, s = 1, ci = 0) {
  const h = k => hash(ci * 7.3 + k), C = ['#5a8a3c', '#5f8f4a', '#6d9d55', '#6b9c52'];
  cyl(.13 * s, .2 * s, 1.2 * s, TRUNK, x, .6 * s, z, 6);
  [[1.3, 1.7, 1.45], [1.05, 1.5, 2.25], [.78, 1.3, 2.95], [.48, 1, 3.6]].forEach(([r, hh, y], k) => {
    const c = cone(r * s, hh * s, C[(k + ci) % 4], x + (h(k) - .5) * .12 * s, y * s, z + (h(k + 5) - .5) * .12 * s, 8); c.rotation.y = h(k + 2) * 3;
  });
  solidCircle(x, z, .38 * s); aoBlob(x, z, 1.6 * s);
}
/** Arbre du village (même signature qu'avant) : kind 0 feuillu, 1 conifère. */
export function tree(x, z, s = 1, kind = 0, ci = 0) { if (kind === 1) fir(x, z, s, ci); else oak(x, z, s, ci); }
/** Chêne têtard (bocage vendéen) : tronc court et noueux, tête renflée, couronne de rejets. */
export function pollard(x, z, s = 1, ci = 0, y0 = 0) {
  const h = k => hash(ci * 5.1 + k), pal = LEAVES[h(0) > .6 ? 'lime' : 'green'], TK = '#6b5440';
  cyl(.3 * s, .42 * s, 1.8 * s, TK, x, y0 + .9 * s, z, 7);
  const hd = sph(.52 * s, TK, x, y0 + 1.9 * s, z, undefined, 0); hd.scale.set(1, .75, 1);
  sph(.14 * s, TK, x + .3 * s, y0 + 1.2 * s, z + .2 * s, undefined, 0, false);
  for (let k = 0; k < 5; k++) { const a = k * 1.26 + h(k) * .5; branch(x + Math.cos(a) * .2 * s, y0 + 2 * s, z + Math.sin(a) * .2 * s, Math.cos(a) * .35, 1, Math.sin(a) * .35, 1 * s, .07 * s, .035 * s, TK); }
  [[0, 3.05, 0, .95, 1], [.6, 2.8, .25, .66, 0], [-.55, 2.85, -.2, .7, 0], [.1, 3.55, -.1, .6, 2], [-.2, 2.7, .55, .58, 2]].forEach(([bx, by, bz, r, tone], k) => sph(r * s * (.9 + h(k + 4) * .2), pal[tone], x + bx * s, y0 + by * s, z + bz * s, undefined, 1, k < 3));
  solidCircle(x, z, .45 * s); aoBlob(x, z, 1.4 * s);
}

/* ---------- Haies et talus de bocage ---------- */
const HEDGE = ['#4f7f3f', '#5f8f45', '#6b9c52', '#79a356'], HEDGE_AUTUMN = ['#b8922f', '#c4772f', '#9aa04a'];
/**
 * Haie vive : masses rondes de tailles et de hauteurs irrégulières, quelques arbustes plus hauts,
 * des touches d'automne et des fleurs d'aubépine. y0 : hauteur du pied (sur un talus). solid : collision.
 */
export function hedgeRow(x0, z0, x1, z1, { h = 1, y0 = 0, solid = true, solidH = 2, flowers = .25, autumn = .12, seed = 3 } = {}) {
  const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
  // âme sombre (évite de voir à travers entre deux masses)
  const core = box(len, .62 * h, .55, HEDGE[0], (x0 + x1) / 2, y0 + .31 * h, (z0 + z1) / 2, undefined, false); core.rotation.y = Math.atan2(-uz, ux);
  for (let d = .1, i = 0; d < len - .05; i++) {
    const big = hash(seed + i * 4.1) < .14, r = (big ? .62 + hash(seed + i) * .2 : .34 + hash(seed + i * 1.7) * .24) * h;
    const side = (hash(seed + i * 3.1) - .5) * .34, px = x0 + ux * d - uz * side, pz = z0 + uz * d + ux * side;
    const col = hash(seed + i * 6.7) < autumn ? HEDGE_AUTUMN[(hash(i + seed) * 3) | 0] : HEDGE[1 + ((hash(seed + i) * 3) | 0)];
    const y = y0 + (big ? .75 + hash(seed + i * 2.3) * .35 : .45 + hash(seed + i * 2.3) * .3) * h;
    sph(r, col, px, y, pz, undefined, 1, big || i % 3 === 0);
    if (!LITE() && hash(seed + i * 5.9) < flowers) for (let f = 0; f < 3; f++) sph(.05, f ? '#f5f0e6' : '#f2b8c6', px + (hash(i + f) - .5) * r, y + r * .78, pz + (hash(i * 2 + f) - .5) * r * .8 + .05, undefined, 0, false);
    d += r * (1.05 + hash(seed + i * 8.3) * .5);
  }
  if (solid) {
    if (Math.abs(uz) < .02) solidBox((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) + .2, .9, solidH);
    else if (Math.abs(ux) < .02) solidBox((x0 + x1) / 2, (z0 + z1) / 2, .9, Math.abs(z1 - z0) + .2, solidH);
    else for (let i = 0; i <= len; i += .8) solidCircle(x0 + ux * i, z0 + uz * i, .45, solidH);
  }
  aoBlob((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) * .55 + .5, Math.abs(z1 - z0) * .55 + .5, .9);
}
/**
 * Talus de bocage : levée de terre herbeuse plantée d'une haie et de chênes têtards
 * (le paysage de Vendée). Limite de zone : le relief ferme l'horizon sans mur.
 */
export function bocageBank(x0, z0, x1, z1, { oaks = 7, seed = 5, hedge = true } = {}) {
  const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len, ang = Math.atan2(ux, uz);
  const g = new THREE.Group(); g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); g.rotation.y = ang; group().add(g);
  const BANK = '#8bb064';
  const bank = mk(new THREE.CylinderGeometry(1, 1, len, 12, 1), M(BANK), 0, -.42, 0, g, false); bank.rotation.x = Math.PI / 2; bank.scale.set(1.35, 1, .95);
  for (const e of [-1, 1]) sph(1, BANK, 0, -.42, e * len / 2, g, 1, false).scale.set(1.35, .95, 1.35);
  // touffes plus sombres et terre nue sur les flancs
  if (!LITE()) for (let i = 0; i < len / 2.2; i++) {
    const t = -len / 2 + (i + hash(seed + i)) * 2.2, s = hash(seed * 3 + i) > .5 ? 1 : -1, xo = .75 + hash(i * 2 + seed) * .35, yo = -.42 + .95 * Math.sqrt(1 - (xo / 1.35) ** 2);
    sph(.38 + hash(i + seed) * .2, hash(i * 7 + seed) > .6 ? '#a08259' : '#7ea558', s * xo, yo - .06, t, g, 0, false).scale.set(1, .32, 1.6);
  }
  if (hedge) hedgeRow(x0, z0, x1, z1, { y0: .32, h: 1.05, solid: false, seed: seed * 11 });
  for (let i = 0; i < oaks; i++) { const k = (i + .5 + (hash(seed + i * 9) - .5) * .5) / oaks; pollard(x0 + (x1 - x0) * k, z0 + (z1 - z0) * k, .95 + hash(seed + i) * .3, seed * 10 + i, .3); }
  if (Math.abs(ux) < .02 || Math.abs(uz) < .02) solidBox((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) + 2, Math.abs(z1 - z0) + 2, 1.5);
  else for (let i = 0; i <= len; i += 1.5) solidCircle(x0 + ux * i, z0 + uz * i, 1, 1.5);
}

/* ---------- Petits décors de jardin v2 ---------- */
/** Hortensia (massif rond, têtes de fleurs bleues, roses ou mauves). */
export function hydrangea(x, z, s = 1, c = '#8fa8e0', seed = 1) {
  const L = sph(.55 * s, '#5f8f45', x, .4 * s, z); L.scale.set(1.25, .8, 1.1);
  for (let i = 0; i < 7; i++) { const a = i * .9 + seed, r = (i ? .45 : 0) * s; sph((.2 + hash(seed + i) * .06) * s, shade(c, (hash(i + seed * 3) - .5) * .1), x + Math.cos(a) * r, (.68 + (i ? 0 : .12)) * s, z + Math.sin(a) * r * .9, undefined, 1, false); }
  solidCircle(x, z, .55 * s, .8); aoBlob(x, z, .9 * s);
}
/** Puits de ferme : margelle en pierre, petit toit de tuiles, seau. */
export function well(x, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  cyl(.78, .82, .78, '#c9bfae', 0, .39, 0, 12, g); const rim = mk(new THREE.TorusGeometry(.76, .1, 5, 14), M('#ddd5c6'), 0, .8, 0, g, false); rim.rotation.x = Math.PI / 2;
  const wtr = new THREE.Mesh(new THREE.CircleGeometry(.7, 12), M('#2a3c44')); wtr.rotation.x = -Math.PI / 2; wtr.position.y = .795; g.add(wtr);   // l'ouverture, sombre
  for (const s of [-1, 1]) box(.12, 1.5, .12, '#8a5a3b', s * .7, 1.5, 0, g);
  const ax = cyl(.06, .06, 1.5, '#7a5236', 0, 1.85, 0, 6, g, false); ax.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) { const r = box(1.9, .08, .78, '#b85a36', 0, 2.45, s * .3, g); r.rotation.x = s * .62; for (let k = 0; k < 6; k++) { const t = cyl(.06, .06, .8, ['#c8643c', '#d9774a', '#bd5f38'][k % 3], -.8 + k * .32, .05, 0, 5, r, false); t.rotation.x = Math.PI / 2; } }
  box(.04, .5, .04, '#5a4a3a', .1, 1.55, 0, g, false); cyl(.13, .1, .2, '#9aa3ad', .1, 1.2, 0, 7, g, false);
  solidCircle(x, z, .85, 1); aoBlob(x, z, 1.1);
}
/** Fil à linge entre deux poteaux (le linge ondule au vent). */
export function laundry(x0, z0, x1, z1, h = 1.75, cols = ['#f6efe0', '#8fc9df', '#f2b8c6', '#f6efe0', '#e8c46a']) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
  for (const [x, z] of [[x0, z0], [x1, z1]]) { cyl(.05, .06, h + .1, '#8a7a68', x, (h + .1) / 2, z, 5); solidCircle(x, z, .08, 1.6); }
  const rope = cyl(.012, .012, len, '#d9d0c0', (x0 + x1) / 2, h - .05, (z0 + z1) / 2, 3, undefined, false); rope.rotation.set(Math.PI / 2, ang, 0, 'YXZ');
  const n = cols.length;
  for (let i = 0; i < n; i++) { const k = (i + .7) / (n + .4), sag = 0, ww = .34 + hash(i) * .2, hh = .38 + hash(i + 4) * .22;
    const c = mk(new THREE.BoxGeometry(ww, hh, .02), MS(cols[i]), x0 + (x1 - x0) * k, h - .062 - sag - hh / 2, z0 + (z1 - z0) * k, undefined, false); c.rotation.y = ang - Math.PI / 2;
    for (const d of [-.32, .32]) box(.03, .07, .03, '#c9a074', x0 + (x1 - x0) * k + Math.sin(ang) * ww * d, h - .06, z0 + (z1 - z0) * k + Math.cos(ang) * ww * d, undefined, false); }   // pinces à linge
}
/** Muret de pierres sèches (couronnement irrégulier). */
export function stoneWall(x0, z0, x1, z1, h = .6) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(-(z1 - z0), x1 - x0);
  const w = box(len, h, .42, '#b8ad9a', (x0 + x1) / 2, h / 2, (z0 + z1) / 2); w.rotation.y = ang;
  const n = Math.round(len / .42), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
  for (let i = 0; i < n; i++) { const k = (i + .5) / n; const s = box(.4, .1 + hash(i * 3.3) * .08, .46, shade('#c9bfae', (hash(i) - .5) * .08), x0 + (x1 - x0) * k, h + .04, z0 + (z1 - z0) * k, undefined, false); s.rotation.y = ang + (hash(i * 7) - .5) * .2; }
  if (Math.abs(ux) < .02 || Math.abs(uz) < .02) solidBox((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) + .42, Math.abs(z1 - z0) + .42, h);
  else for (let i = 0; i <= len; i += .6) solidCircle(x0 + ux * i, z0 + uz * i, .26, h);
  aoBlob((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) * .55 + .35, Math.abs(z1 - z0) * .55 + .35, .7);
}

/* ---------- Chemins sinueux ---------- */
/** Styles de chemin : teintes du cœur, du bord, et de la bande centrale (ornières). */
export const PATH_STYLES = {
  lane: { core: ['#dccb9f', '#d3c194', '#e2d3ab'], rim: '#c4b285', a: 1 },
  foot: { core: ['#d6c79c', '#cdbd90'], rim: '#bcb184', a: .78 },
  track: { core: ['#d2be92', '#c8b485'], rim: '#b9a87c', mid: '#a9c486', a: 1 },
  forest: { core: ['#b99a6c', '#ad8f62'], rim: '#9a8258', a: 1 },
  sand: { core: ['#efe2c0', '#e8d9b4'], rim: '#e0cfa6', a: 1 },
  stone: { core: ['#cbc3b2', '#bfb6a4', '#d5cebf'], rim: '#b5ad9e', a: 1 },
  mx: { core: ['#b98d5e', '#ae8254', '#c29665'], rim: '#a48c62', lines: '#94683f', a: 1 },
  snow: { core: ['#e6ecf0', '#dfe6eb', '#eaf0f3'], rim: '#d3dce2', lines: '#d2dae0', a: 1 },
  brook: { core: ['#6fa8bb', '#7cb4c6', '#679fb3'], rim: '#7d6d4c', lines: '#a6d2df', a: .96 },
};
/** Tous les chemins posés (pour le bruit des pas). */
export const PATHS = [];
/** Vrai si (x, z) est sur un chemin (style renvoyé). */
export function onPath(x, z) {
  for (const P of PATHS) {
    if (x < P.minX || x > P.maxX || z < P.minZ || z > P.maxZ) continue;
    for (let i = 0; i < P.pts.length; i++) { const [px, pz, hw] = P.pts[i]; if ((x - px) ** 2 + (z - pz) ** 2 < hw * hw) return P.style; }
  }
  return null;
}
/**
 * Chemin qui serpente : ruban lissé (Catmull-Rom) passant par les points [x, z], largeur et teinte
 * légèrement irrégulières, bords fondus dans l'herbe, cailloux sur les bords.
 * Renvoie les segments à garder sans végétation (à ajouter à l'« avoid » du biome).
 */
export function path(pts, w = 2.2, { style = 'lane', pebbles = true, fade = [true, true], seed = 1, closed = false } = {}) {
  const S = PATH_STYLES[style] || PATH_STYLES.lane;
  if (closed) fade = [false, false];
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
  const L = curve.getLength(), n = Math.max(2, Math.ceil(L / .35)), P = curve.getSpacedPoints(n);
  // colonnes en travers : décalage (× demi-largeur, + frange), opacité, couleur
  const ruts = !!S.mid;
  const cols = ruts
    ? [[-1, .22, 0, 'rim'], [-1, 0, .95, 'rim'], [-.62, 0, 1, 'core'], [-.3, 0, .55, 'mid'], [0, 0, .1, 'mid'], [.3, 0, .55, 'mid'], [.62, 0, 1, 'core'], [1, 0, .95, 'rim'], [1, .22, 0, 'rim']]
    : [[-1, .2, 0, 'rim'], [-1, 0, .95, 'rim'], [-.6, 0, 1, 'core'], [0, 0, 1, 'core'], [.6, 0, 1, 'core'], [1, 0, .95, 'rim'], [1, .2, 0, 'rim']];
  const C = cols.length, pos = [], col = [], nor = [], idx = [], c = new THREE.Color(), seg = [], samples = [];
  const cores = S.core.map(h => new THREE.Color(h)), rim = new THREE.Color(S.rim), mid = S.mid ? new THREE.Color(S.mid) : null, lines = S.lines ? new THREE.Color(S.lines) : null;
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  // Courbure locale (signée) : dans les virages serrés, le bord intérieur est ramené vers le centre
  // du virage au lieu de le dépasser (sinon le ruban se replie sur lui-même et fait des dents de scie).
  const TG = P.map((_, i) => curve.getTangentAt(Math.min(1, Math.max(0, i / n)))), ds = L / n;
  const K = TG.map((tg, i) => { const a = TG[Math.max(0, i - 1)], b = TG[Math.min(n, i + 1)]; return ((b.x - a.x) * -tg.z + (b.z - a.z) * tg.x) / (ds * (Math.min(n, i + 1) - Math.max(0, i - 1)) || 1); });
  const KM = K.map((k, i) => { let m = 0; for (let j = Math.max(0, i - 4); j <= Math.min(n, i + 4); j++) m = Math.max(m, Math.abs(K[j])); return Math.sign(k) * m; });
  for (let i = 0; i <= n; i++) {
    const p = P[i], tg = TG[i], nx = -tg.z, nz = tg.x, sd = i * .35, inner = KM[i] ? .8 / Math.abs(KM[i]) : 1e9;
    const hw = w / 2 * (1 + .09 * Math.sin(sd * .8 + seed) + .05 * Math.sin(sd * 2.3 + seed * 3));
    const endA = Math.min(fade[0] ? Math.min(1, sd / 1.1) : 1, fade[1] ? Math.min(1, (L - sd) / 1.1) : 1);
    const jl = (hash(seed * 17 + i) - .5) * .22, jr = (hash(seed * 23 + i) - .5) * .22;
    for (let j = 0; j < C; j++) {
      const [f, fr, a, kind] = cols[j], side = f < 0 ? -1 : f > 0 ? 1 : 0, jit = j === 1 ? jl : j === C - 2 ? jr : 0;
      let o = f * hw + side * fr + jit;
      if (side && side === Math.sign(KM[i]) && Math.abs(o) > inner * Math.abs(f)) o = side * inner * Math.abs(f) + (fr ? side * fr * .5 : 0);
      pos.push(p.x + nx * o, 0, p.z + nz * o); nor.push(0, 1, 0);
      if (kind === 'rim') c.copy(rim); else if (kind === 'mid') c.copy(mid); else if (lines && Math.abs(f) > .3 && Math.abs(f) < .9) c.copy(lines); else { const m = .5 + .5 * Math.sin(sd * .45 + j + seed); c.copy(cores[0]).lerp(cores[(1 + (i >> 3)) % cores.length], m); }
      const l = (hash(seed * 7 + i * C + j) - .5) * .05; c.r += l; c.g += l; c.b += l;
      col.push(c.r, c.g, c.b, a * endA * S.a);
    }
    samples.push([+p.x.toFixed(2), +p.z.toFixed(2), hw + .1]);
    minX = Math.min(minX, p.x - hw); maxX = Math.max(maxX, p.x + hw); minZ = Math.min(minZ, p.z - hw); maxZ = Math.max(maxZ, p.z + hw);
    if (i && i % 3 === 0 || i === n) { const q = P[Math.max(0, i - 3)]; seg.push({ seg: [q.x, q.z, p.x, p.z], r: hw + .3 }); }
    if (i < n) for (let j = 0; j < C - 1; j++) { const a = i * C + j, b = a + C; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    // cailloux au bord
    if (pebbles && !LITE() && i % 2 === 0 && hash(seed * 3 + i) < .55 && endA > .5) {
      const s = hash(seed + i * 1.3) > .5 ? 1 : -1, o = s * (hw + (hash(i * 9 + seed) - .3) * .35), r = .05 + hash(i * 4 + seed) * .08;
      const pb = sph(r, ['#b5ad9e', '#c9c2b2', '#a59d8e'][i % 3], p.x + nx * o, r * .25, p.z + nz * o, undefined, 0, false); pb.scale.set(1, .5, .8); pb.castShadow = false;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, GROUND); m.position.y = .012; m.receiveShadow = true; m.castShadow = false; group().add(m);
  PATHS.push({ pts: samples, style, minX, maxX, minZ, maxZ });
  return seg;
}

/* ---------- Mobilier urbain (Paris, Nantes) ---------- */
/** Fontaine Wallace (fonte vert sombre : socle, quatre colonnettes, dôme). */
export function wallace(x, z) {
  const G = '#2f5a45';
  cyl(.42, .5, .5, G, x, .25, z, 8); cyl(.3, .36, .3, G, x, .62, z, 8);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .785; cyl(.05, .06, 1.1, G, x + Math.cos(a) * .22, 1.3, z + Math.sin(a) * .22, 5, undefined, false); }
  cyl(.4, .32, .14, G, x, 1.9, z, 8); const d = sph(.32, G, x, 2.02, z, undefined, 1); d.scale.y = .7; sph(.07, G, x, 2.28, z, undefined, 0, false);
  cyl(.03, .03, .5, '#bfe3f0', x, 1.15, z, 4, undefined, false);
  solidCircle(x, z, .45, 2); aoBlob(x, z, .7);
}
/** Kiosque à journaux (hexagonal, toit en dôme, affiches). */
export function newsKiosk(x, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g); const G = '#2f5a45';
  cyl(1, 1.05, 2.2, G, 0, 1.1, 0, 6, g); cyl(1.02, 1.02, 1.2, '#efe6cf', 0, 1.3, 0, 6, g, false);
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 1.047; const p = box(.6, .8, .02, ['#d6402f', '#2563c9', '#f6d36b'][i], Math.cos(a) * 1.03, 1.35, Math.sin(a) * -1.03, g, false); p.rotation.y = a + Math.PI / 2; }
  box(1.2, .4, .5, '#efe6cf', 0, .9, 1, g); cone(1.3, .9, G, 0, 2.65, 0, 6, g); sph(.12, '#c9a33d', 0, 3.15, 0, g, 0, false);
  solidCircle(x, z, 1.1, 2.5); aoBlob(x, z, 1.4);
}
/** Station de vélos en libre-service (n vélos alignés). */
export function bikeRack(x, z, n = 5, rot = 0, c = '#9aa3ad') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  box(n * .7 + .4, .06, .5, '#6d7880', 0, .03, 0, g, false);
  for (let i = 0; i < n; i++) {
    const bx = -(n - 1) * .35 + i * .7, b = new THREE.Group(); b.position.set(bx, 0, 0); g.add(b);
    for (const zz of [-.42, .42]) { const w = cyl(.26, .26, .04, '#2f2a24', 0, .27, zz, 10, b, false); w.rotation.z = Math.PI / 2; }
    box(.05, .05, .8, c, 0, .52, 0, b, false); box(.05, .36, .05, c, 0, .62, -.2, b, false); box(.24, .05, .1, '#2f2a24', 0, .82, -.22, b, false); box(.36, .04, .04, '#2f2a24', 0, .82, .34, b, false);
    box(.12, .12, .14, '#7fb05c', 0, .66, .36, b, false);
  }
  const sw = Math.abs(Math.sin(rot)) > .5; solidBox(x, z, sw ? 1 : n * .7, sw ? n * .7 : 1, .8);
}
/** Abri de tram (toit de verre, banc, plan du réseau). */
export function tramShelter(x, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  for (const sx of [-1.5, 1.5]) box(.1, 2.4, .1, '#5d6670', sx, 1.2, -.5, g, false);
  box(3.4, .1, 1.4, '#9fc4d6', 0, 2.42, 0, g, false); box(3.4, .12, .1, '#5d6670', 0, 2.45, .7, g, false);
  box(3, 1.6, .05, '#cfe6f0', 0, 1.3, -.55, g, false); box(.9, 1.3, .06, '#2563c9', -1, 1.3, -.52, g, false);
  box(2, .08, .4, '#8a5a3b', .4, .5, -.25, g, false);
  for (const bx of [-.4, 1.2]) { box(.06, .46, .06, '#5d6670', bx, .23, -.12, g, false); box(.06, .06, .38, '#5d6670', bx, .44, -.3, g, false); }   // pieds et consoles du banc (il ne flotte plus)
  solidBox(x, z - .5, 3.2, .3, 2);
}
/** Parterre à la française : bordure de buis taillé, fleurs en rangs. */
export function flowerBed(x0, z0, x1, z1, cols = ['#d6402f', '#f6d36b', '#f2b8c6']) {
  const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  box(w, .1, d, '#7a5236', cx, .05, cz, undefined, false);
  for (const s of [-1, 1]) { box(w, .32, .22, '#4f7f3f', cx, .16, cz + s * (d / 2 - .11)); box(.22, .32, d, '#4f7f3f', cx + s * (w / 2 - .11), .16, cz); }
  const along = w > d, L = along ? w : d, n = Math.floor((L - .6) / .32);
  for (let r = 0; r < 2; r++) for (let i = 0; i < n; i++) { const t = -L / 2 + .45 + i * .32, o = (r - .5) * Math.min(along ? d : w, 1.2) * .45; sph(.11, cols[(i + r) % cols.length], cx + (along ? t : o), .22, cz + (along ? o : t), undefined, 0, false); }
  solidBox(cx, cz, w, d, .4);
}

/* ---------- Gare, île ---------- */
/** Château d'eau de gare (alimentait les locomotives à vapeur) : tour de pierre, cuve, toit, bras verseur. */
export function waterTower(x, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; group().add(g);
  cyl(1.05, 1.2, 3.2, '#b5ad9e', 0, 1.6, 0, 10, g); cyl(1.25, 1.25, .2, '#9a958c', 0, 3.25, 0, 10, g, false);
  box(.5, 1, .08, '#6b4630', 0, .6, 1.13, g, false);
  cyl(1.6, 1.6, 1.8, '#8a4b3a', 0, 4.25, 0, 12, g); for (const y of [3.6, 4.25, 4.9]) cyl(1.63, 1.63, .07, '#5d4036', 0, y, 0, 12, g, false);
  cone(1.85, 1, '#5d6670', 0, 5.65, 0, 12, g); sph(.12, '#5d6670', 0, 6.2, 0, g, 0, false);
  const arm = cyl(.12, .12, 1.8, '#3a3a3a', 0, 4, -1.9, 6, g, false); arm.rotation.x = Math.PI / 2 - .25; cyl(.16, .1, .5, '#3a3a3a', 0, 3.6, -2.7, 6, g, false);
  for (let i = 0; i < 6; i++) box(.4, .04, .04, '#3a3a3a', .9, .5 + i * .45, .75, g, false);
  solidCircle(x, z, 1.3, 6); aoBlob(x, z, 1.8);
  return g;
}
/** Cocotier : tronc annelé légèrement courbé, palmes retombantes, noix de coco. */
export function palm(x, z, s = 1, lean = .2, seed = 1) {
  const h = k => hash(seed * 9.7 + k), dir = h(0) * 6.28, TRUNK2 = ['#a8764a', '#97693f'];
  let px = x, py = 0, pz = z;
  for (let i = 0; i < 7; i++) {
    const k = i / 7, bend = lean * (.4 + k * 1.2), dx = Math.sin(bend) * Math.cos(dir), dz = Math.sin(bend) * Math.sin(dir), L = .82 * s;
    const seg = cyl((.2 - k * .05) * s, (.24 - k * .05) * s, L, TRUNK2[i % 2], px + dx * L / 2, py + Math.cos(bend) * L / 2, pz + dz * L / 2, 6);
    seg.quaternion.setFromUnitVectors(_Y, new THREE.Vector3(dx, Math.cos(bend), dz).normalize());
    px += dx * L; py += Math.cos(bend) * L; pz += dz * L;
  }
  const LEAF = ['#4f9b45', '#5faf55', '#468a3e'];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * 6.28 + h(i) * .4, len = (1.9 + h(i + 3) * .5) * s;
    let fx = px, fy = py, fz = pz;
    for (let k = 0; k < 3; k++) {
      const droop = .15 + k * .55 + h(i + k) * .2, l = len / 3, dx = Math.cos(a) * Math.cos(droop), dz = Math.sin(a) * Math.cos(droop), dy = -Math.sin(droop) + (k === 0 ? .35 : 0);
      const fr = box((.62 - k * .14) * s, .05, l * 1.05, LEAF[(i + k) % 3], fx + dx * l / 2, fy + dy * l / 2, fz + dz * l / 2, undefined, k === 0);
      fr.rotation.set(-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0, 'YXZ');
      fx += dx * l; fy += dy * l; fz += dz * l;
    }
  }
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + dir; sph(.15 * s, '#6b4429', px + Math.cos(a) * .22 * s, py - .2 * s, pz + Math.sin(a) * .22 * s, undefined, 1, false); }
  solidCircle(x, z, .35 * s); aoBlob(x, z, 1.2 * s);
  return { x: px, y: py, z: pz };
}
