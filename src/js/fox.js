/* =====================================================================
   Renard : modèle arrondi, articulé, puis fusionné (1 maillage + 1 contour par pièce animée)
   Points d'attache utilisés par le jeu : body, head, jaw, eyes, ears[], legs[] (pattes arrière : .knee),
   tail, tailSegs[], mouth
   ===================================================================== */
import * as THREE from 'three';
import { VC_HERO, blob, cone, cyl, mergeRig, noShadowCast, scene, setRigDetail, sph } from './engine.js';
import { PATCH } from './world.js';

export const fox = {
  group: new THREE.Group(), pos: new THREE.Vector3(-4, 0, 5.5), vel: new THREE.Vector3(), yaw: Math.PI, phase: 0, held: null, r: .5,
  yapT: 0, hopT: 0, wagT: 0, idle: 0, sit: 0, muddy: 0, stepAcc: 0, stepSide: 1, earT: 2, sneak: 0, sneaking: false, stunT: 0,
};
{
  // Lisible vu d'en haut : grosse tête aux joues blanches, grandes oreilles à pointe noire, dos plus sombre,
  // plastron blanc, « chaussettes » noires, cuisses rondes, queue touffue d'un seul tenant au bout blanc.
  setRigDetail(2);
  const g = fox.group, O = '#e8742a', O2 = '#dc6a22', OD = '#cf5f1d', W = '#fbf3e6', D = '#3a2a22', K = '#2a1e18', IN = '#f7e8d4';
  const ell = (r, c, x, y, z, sx, sy, sz, p, ol) => { const m = sph(r, c, x, y, z, p, 1, ol); m.scale.set(sx, sy, sz); return m; };
  const grp = (p, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); p.add(o); return o; };
  fox.body = grp(g, 0, 0, 0);
  ell(.34, O, 0, .66, -.03, .9, .82, 1.48, fox.body);                 // tronc (un peu plus court : silhouette plus ronde)
  ell(.25, O, 0, .78, .3, 1, .95, .95, fox.body, false);              // garrot et épaules
  ell(.28, OD, 0, .8, -.12, .64, .36, 1.25, fox.body, false);         // dos plus sombre
  ell(.25, W, 0, .54, .15, .8, .6, 1.15, fox.body, false);            // ventre
  ell(.19, W, 0, .72, .47, .95, 1.08, .7, fox.body, false);           // plastron
  ell(.13, W, 0, .58, .5, .9, .95, .62, fox.body, false);             // plastron en pointe, duveteux
  // Tête (un peu plus grosse : plus mignon) : crâne rond, museau court et fin, lèvre et menton blancs,
  // joues blanches basses qui finissent en pointe vers l'arrière, grands yeux brillants
  fox.head = grp(fox.body, 0, .98, .6); fox.head.scale.setScalar(1.08);
  ell(.3, O, 0, 0, -.02, 1.12, .94, 1, fox.head);
  const snout = cone(.135, .34, O, 0, -.085, .31, 12, fox.head); snout.rotation.x = Math.PI / 2; snout.scale.set(1, 1, .8);
  ell(.1, W, 0, -.13, .28, 1, .52, 1.4, fox.head, false);             // lèvre et dessous du museau
  sph(.062, D, 0, -.06, .485, fox.head, 1, false);                    // truffe ronde
  [-1, 1].forEach(s => {
    ell(.125, W, s * .155, -.14, .14, .9, .66, .95, fox.head, false); // joues, basses et rentrées
    const tuft = cone(.058, .16, W, s * .3, -.13, -.03, 5, fox.head, false); tuft.rotation.set(0, s * .55, -s * 1.2);   // pointe des joues, vers l'arrière
  });
  fox.eyes = grp(fox.head, 0, .06, .265);                             // pièce à part : le renard cligne des yeux
  [-1, 1].forEach(s => {
    ell(.064, K, s * .128, 0, 0, 1, 1.12, .55, fox.eyes, false);      // grands yeux ovales
    sph(.021, '#ffffff', s * .143, .026, .03, fox.eyes, 0, false);     // reflet
    sph(.009, '#ffffff', s * .113, -.024, .033, fox.eyes, 0, false);   // petit reflet
  });
  fox.jaw = grp(fox.head, 0, -.17, .2);
  ell(.095, W, 0, -.02, .1, .95, .42, 1.45, fox.jaw, false);          // menton (sans contour : pas d'anneau noir de face)
  fox.ears = [-1, 1].map(s => {
    const ep = grp(fox.head, s * .17, .21, -.06); ep.rotation.z = -s * .24;
    // oreille en feuille (cône aplati) : face orange, intérieur crème, pointe noire
    const e = cone(.155, .37, O, 0, .17, 0, 8, ep); e.scale.z = .55;
    const i = cone(.1, .25, IN, 0, .15, .045, 8, ep, false); i.scale.z = .4;
    const k = cone(.072, .14, K, 0, .3, -.004, 8, ep, false); k.scale.z = .6;
    return ep;
  });
  fox.mouth = new THREE.Object3D(); fox.mouth.position.set(0, -.14, .56); fox.head.add(fox.mouth);
  // Pattes avant : fines, noires presque jusqu'au coude comme un vrai renard roux, petite patte ovale
  const front = [-1, 1].map(s => {
    const piv = grp(fox.body, s * .16, .445, .34);
    cyl(.07, .058, .12, O2, 0, -.02, 0, 10, piv, false); cyl(.056, .043, .3, K, 0, -.24, 0, 10, piv, false); ell(.062, K, 0, -.408, .045, 1, .55, 1.45, piv, false);   // noir jusqu'au coude
    return piv;
  });
  // Pattes arrière : cuisse ronde (au pivot de la hanche), jarret articulé fin, bas noir et petite patte ovale
  const hind = [-1, 1].map(s => {
    const piv = grp(fox.body, s * .19, .5, -.36);
    ell(.19, O, 0, .02, .03, .62, 1, 1.3, piv);                          // cuisse, fondue dans la croupe
    const knee = grp(piv, 0, -.2, -.07);
    cyl(.05, .042, .22, K, 0, -.11, 0, 10, knee); ell(.06, K, 0, -.263, .05, 1, .55, 1.45, knee, false);
    piv.knee = knee; return piv;
  });
  fox.legs = [front[0], front[1], hind[0], hind[1]];
  for (const l of fox.legs) l.userData.y0 = l.position.y;
  // Queue touffue en 3 segments allongés qui se recouvrent (pas de « perles ») : fine à la racine, épaisse au milieu, grand bout blanc
  fox.tail = grp(fox.body, 0, .74, -.55);
  const s1 = grp(fox.tail, 0, .05, -.24); s1.rotation.x = .1;
  const s2 = grp(s1, 0, .0, -.31); s2.rotation.x = .16;
  ell(.17, O, 0, .03, -.11, .85, .85, 1.55, fox.tail);
  ell(.25, O, 0, 0, -.14, .95, .92, 1.6, s1); ell(.19, OD, 0, .11, -.15, .75, .45, 1.35, s1, false);
  ell(.235, O, 0, 0, -.07, .95, .92, 1.35, s2); ell(.2, W, 0, 0, -.27, .9, .88, 1.3, s2);
  fox.tailSegs = [fox.tail, s1, s2];
  g.scale.setScalar(1.1);
  scene.add(g); noShadowCast(g);
  mergeRig(g, [fox.body, fox.head, fox.eyes, fox.jaw, ...fox.ears, ...fox.legs, hind[0].knee, hind[1].knee, ...fox.tailSegs], VC_HERO);
  fox.shadow = blob(.8); setRigDetail(0);
}

/* ---------- Traces de pas ---------- */
export const prints = []; const printGeo = new THREE.CircleGeometry(.075, 8);
for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(printGeo, new THREE.MeshBasicMaterial({ color: '#4f3523', transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.scale.set(1, 1.4, 1); m.visible = false; scene.add(m); prints.push({ m, t: 0 }); }
let printIdx = 0;
export function stamp(x, z, y, yaw, mud) { const p = prints[printIdx++ % prints.length]; p.m.position.set(x, y, z); p.m.rotation.z = yaw; p.t = mud ? 5 : 8; p.m.material.color.set(mud ? '#3f2a1c' : '#4f3523'); p.m.visible = true; }
export const inPatch = p => p.x > PATCH.minX && p.x < PATCH.maxX && p.z > PATCH.minZ && p.z < PATCH.maxZ;
