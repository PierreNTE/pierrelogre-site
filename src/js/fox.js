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
  const g = fox.group, O = '#e8742a', O2 = '#dc6a22', OD = '#cf5f1d', W = '#fbf3e6', D = '#3a2a22', K = '#2a1e18', IN = '#f3e2c8';
  const ell = (r, c, x, y, z, sx, sy, sz, p, ol) => { const m = sph(r, c, x, y, z, p, 1, ol); m.scale.set(sx, sy, sz); return m; };
  const grp = (p, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); p.add(o); return o; };
  fox.body = grp(g, 0, 0, 0);
  ell(.34, O, 0, .66, -.03, .9, .82, 1.55, fox.body);                 // tronc
  ell(.25, O, 0, .78, .3, 1, .95, .95, fox.body, false);              // garrot et épaules
  ell(.28, OD, 0, .8, -.12, .64, .36, 1.3, fox.body, false);          // dos plus sombre
  ell(.25, W, 0, .54, .15, .8, .6, 1.2, fox.body, false);             // ventre
  ell(.19, W, 0, .72, .47, .92, 1.05, .66, fox.body, false);          // plastron
  // Tête : crâne rond, museau effilé (cône lissé), dessous blanc rentré, joues blanches en pointe vers l'arrière
  fox.head = grp(fox.body, 0, .98, .6);
  ell(.3, O, 0, 0, -.02, 1.12, .92, 1, fox.head);
  const snout = cone(.15, .4, O, 0, -.08, .33, 10, fox.head); snout.rotation.x = Math.PI / 2; snout.scale.set(1, 1, .78);
  ell(.105, W, 0, -.125, .29, .95, .5, 1.5, fox.head, false);         // dessous du museau
  sph(.055, D, 0, -.045, .54, fox.head, 1, false);                    // truffe
  [-1, 1].forEach(s => {
    ell(.16, W, s * .2, -.1, .1, 1.05, .8, 1, fox.head, false);       // joues
    const tuft = cone(.065, .18, W, s * .35, -.15, .0, 5, fox.head, false); tuft.rotation.set(0, s * .5, -s * 1.25);   // pointe des joues, vers l'arrière
  });
  fox.eyes = grp(fox.head, 0, .075, .26);                             // pièce à part : le renard cligne des yeux
  [-1, 1].forEach(s => { sph(.052, K, s * .135, 0, 0, fox.eyes, 1, false); sph(.016, '#ffffff', s * .15, .018, .045, fox.eyes, 0, false); });
  fox.jaw = grp(fox.head, 0, -.17, .2);
  ell(.1, W, 0, -.02, .12, .95, .42, 1.55, fox.jaw);
  fox.ears = [-1, 1].map(s => {
    const ep = grp(fox.head, s * .17, .21, -.06); ep.rotation.z = -s * .22;
    // oreille en feuille (cône aplati) : face orange, intérieur crème, pointe noire
    const e = cone(.15, .37, O, 0, .17, 0, 8, ep); e.scale.z = .55;
    const i = cone(.09, .23, IN, 0, .15, .045, 8, ep, false); i.scale.z = .4;
    const k = cone(.072, .14, K, 0, .3, -.004, 8, ep, false); k.scale.z = .6;
    return ep;
  });
  fox.mouth = new THREE.Object3D(); fox.mouth.position.set(0, -.14, .6); fox.head.add(fox.mouth);
  // Pattes avant : haut orangé, chaussette noire, patte ovale
  const front = [-1, 1].map(s => {
    const piv = grp(fox.body, s * .17, .445, .34);
    cyl(.085, .068, .22, O2, 0, -.08, 0, 10, piv); cyl(.068, .058, .2, K, 0, -.27, 0, 10, piv, false); ell(.07, K, 0, -.4, .04, 1, .6, 1.35, piv, false);
    return piv;
  });
  // Pattes arrière : cuisse ronde (au pivot de la hanche), jarret articulé, bas noir et patte ovale
  const hind = [-1, 1].map(s => {
    const piv = grp(fox.body, s * .19, .5, -.36);
    ell(.19, O, 0, .02, .03, .62, 1, 1.3, piv);                          // cuisse, fondue dans la croupe
    const knee = grp(piv, 0, -.2, -.07);
    cyl(.062, .055, .22, K, 0, -.11, 0, 10, knee); ell(.068, K, 0, -.255, .045, 1, .6, 1.35, knee, false);
    piv.knee = knee; return piv;
  });
  fox.legs = [front[0], front[1], hind[0], hind[1]];
  for (const l of fox.legs) l.userData.y0 = l.position.y;
  // Queue touffue en 3 segments allongés qui se recouvrent (pas de « perles ») : fine à la racine, épaisse au milieu, bout blanc
  fox.tail = grp(fox.body, 0, .74, -.55);
  const s1 = grp(fox.tail, 0, .05, -.24); s1.rotation.x = .1;
  const s2 = grp(s1, 0, .0, -.3); s2.rotation.x = .16;
  ell(.17, O, 0, .03, -.11, .85, .85, 1.55, fox.tail);
  ell(.23, O, 0, 0, -.14, .95, .92, 1.6, s1); ell(.18, OD, 0, .1, -.15, .75, .45, 1.35, s1, false);
  ell(.215, O, 0, 0, -.07, .95, .92, 1.35, s2); ell(.18, W, 0, 0, -.25, .9, .88, 1.2, s2);
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
