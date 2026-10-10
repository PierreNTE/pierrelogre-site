/* =====================================================================
   Foules : personnages simples dessinés en instances.
   Une foule = ~10 appels de dessin, quel que soit le nombre de personnages
   (joueurs de handball, touristes, vacanciers, spectateurs, pilotes…).
   Chaque personnage est un petit objet de données { pos, yaw, pose… } que le code
   de la région anime ; draw() recopie tout dans les instances.
   ===================================================================== */
import * as THREE from 'three';
import { M, VC, blob, box, cam, cyl, mk, outlineMat, partGeometry, scene, sph } from './engine.js';
import { armParts, legParts, torsoGeo } from './npc.js';

// Géométries de base (blanc = teinté par la couleur de l'instance)
const G = (() => {
  const torso = new THREE.Group(); mk(torsoGeo(.72, .7, .72, .46), M('#ffffff'), 0, -.02, 0, torso);
  const head = new THREE.Group(); sph(.42, '#f2c7a5', 0, 0, 0, head, 2);
  [-1, 1].forEach(s => { const e = sph(.1, '#ffffff', s * .15, .05, .36, head, 1, false); e.scale.z = .5; sph(.055, '#2f2a24', s * .15, .05, .41, head, 1, false); });
  sph(.06, '#eaa98a', 0, -.06, .42, head, 1, false);
  const hair = new THREE.Group(); const h = sph(.43, '#ffffff', 0, .1, -.06, hair, 2, false); h.scale.set(1, .72, .95);
  const leg = new THREE.Group(); legParts(.62, '#ffffff', '#5a5048', leg);
  const arm = new THREE.Group(); armParts('#ffffff', '#f2d6c0', arm);
  const cap = new THREE.Group(); const c = sph(.44, '#ffffff', 0, .16, 0, cap, 1, false); c.scale.set(1, .5, 1); box(.36, .04, .3, '#ffffff', 0, .14, .38, cap, false);
  const beret = new THREE.Group(); const b = cyl(.36, .4, .12, '#ffffff', -.04, .36, -.02, 10, beret, false); b.rotation.z = .25;
  const helmet = new THREE.Group(); const hm = sph(.5, '#ffffff', 0, .06, 0, helmet, 1); hm.scale.set(1, .95, 1.05); box(.5, .14, .2, '#2f3640', 0, -.02, .42, helmet, false);
  return Object.fromEntries(Object.entries({ torso, head, hair, leg, arm, cap, beret, helmet }).map(([k, g]) => [k, partGeometry(g)]));
})();

const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _b = new THREE.Matrix4(), _t = new THREE.Matrix4(), _h = new THREE.Matrix4();
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
const C = new THREE.Color();
const HIDE1 = ['torso', 'torsoOl', 'head', 'headOl', 'hair', 'cap', 'beret', 'helmet', 'helmetOl'], HIDE2 = ['leg', 'legOl', 'arm', 'armOl'];
function trs(out, x, y, z, rx, ry, rz, s = 1) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(s, s, s); return out.compose(_v, _q, _s); }

/**
 * Crée une foule de `max` personnages. Renvoie { add(opts) → personnage, draw(), list, setVisible(b) }.
 * Personnage : pos, yaw, scale, walk (phase), moving, seated, lean, jump, headYaw,
 * armL/armR (rotation x), armLz/armRz (rotation z), legL/legR (si non nulles, remplacent la marche), visible.
 */
export function makeCrowd(max) {
  // Découpage par la caméra : une sphère englobante commune, recalculée à chaque image autour des personnages
  const bound = new THREE.Sphere(new THREE.Vector3(), 1);
  const mk = (geo, mat, n, tint) => { const m = new THREE.InstancedMesh(geo, mat, n); m.boundingSphere = bound; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); if (tint) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); scene.add(m); return m; };
  const M = {
    torso: mk(G.torso.geo, VC, max, true), torsoOl: mk(G.torso.ol, outlineMat, max),
    head: mk(G.head.geo, VC, max), headOl: mk(G.head.ol, outlineMat, max),
    hair: mk(G.hair.geo, VC, max, true),
    leg: mk(G.leg.geo, VC, max * 2, true), legOl: mk(G.leg.ol, outlineMat, max * 2),
    arm: mk(G.arm.geo, VC, max * 2, true), armOl: mk(G.arm.ol, outlineMat, max * 2),
    cap: mk(G.cap.geo, VC, max, true), beret: mk(G.beret.geo, VC, max, true), helmet: mk(G.helmet.geo, VC, max, true), helmetOl: mk(G.helmet.ol, outlineMat, max),
  };
  const list = [];
  const crowd = {
    list, meshes: M,
    add(o = {}) {
      if (list.length >= max) throw new Error('foule pleine');
      const a = Object.assign({ pos: new THREE.Vector3(), yaw: 0, scale: 1, walk: Math.random() * 6, moving: false, seated: false, lean: 0, jump: 0, headYaw: 0,
        armL: 0, armR: 0, armLz: 0, armRz: 0, legL: null, legR: null, visible: true, shirt: '#3e5677', pants: '#2b3448', hair: '#5a3b2a', hat: null, hatColor: '#d9705a', t: Math.random() * 10 }, o);
      if (!(a.pos instanceof THREE.Vector3)) a.pos = new THREE.Vector3(a.pos.x, 0, a.pos.z);
      a.i = list.length; list.push(a); a.shadow = blob(.55 * a.scale);
      const i = a.i;
      M.torso.setColorAt(i, C.set(a.shirt)); M.arm.setColorAt(i * 2, C); M.arm.setColorAt(i * 2 + 1, C);
      M.leg.setColorAt(i * 2, C.set(a.pants)); M.leg.setColorAt(i * 2 + 1, C);
      M.hair.setColorAt(i, C.set(a.hair));
      for (const k of ['cap', 'beret', 'helmet']) M[k].setColorAt(i, C.set(a.hatColor));
      // Chapeaux : une pièce que personne ne porte n'est pas dessinée (un appel de dessin de moins)
      const worn = { cap: 'cap', beret: 'beret', helmet: 'helmet', helmetOl: 'helmet' };
      for (const k in M) { M[k].count = worn[k] ? (list.some(p => p.hat === worn[k]) ? list.length : 0) : (k === 'leg' || k === 'legOl' || k === 'arm' || k === 'armOl') ? list.length * 2 : list.length; if (M[k].instanceColor) M[k].instanceColor.needsUpdate = true; }
      return a;
    },
    /** Recolorer un personnage (ex. boue). */
    recolor(a, key, color) { C.set(color); if (key === 'shirt') { M.torso.setColorAt(a.i, C); M.arm.setColorAt(a.i * 2, C); M.arm.setColorAt(a.i * 2 + 1, C); M.torso.instanceColor.needsUpdate = M.arm.instanceColor.needsUpdate = true; } },
    setVisible(v) { for (const k in M) M[k].visible = v; for (const a of list) a.shadow.visible = v && a.visible; },   // les ombres suivent la foule
    draw() {
      for (const a of list) {
        const i = a.i;
        if (!a.visible) { for (const k of HIDE1) M[k].setMatrixAt(i, _zero); for (const k of HIDE2) { M[k].setMatrixAt(i * 2, _zero); M[k].setMatrixAt(i * 2 + 1, _zero); } a.shadow.visible = false; continue; }
        const j = a.jump > 0 ? Math.sin(Math.min(1, a.jump) * Math.PI) * .6 : 0;
        const bob = a.seated ? -.18 : (a.moving ? Math.abs(Math.sin(a.walk)) * .07 : 0);
        trs(_r, a.pos.x, a.pos.y + j, a.pos.z, 0, a.yaw, 0, a.scale);
        _b.multiplyMatrices(_r, trs(_m, 0, bob, 0, a.bodyX || 0, 0, 0));
        _t.multiplyMatrices(_b, trs(_m, 0, .62, 0, a.lean, 0, 0));
        M.torso.setMatrixAt(i, _t); M.torsoOl.setMatrixAt(i, _t);
        _h.multiplyMatrices(_t, trs(_m, 0, 1.14, 0, 0, a.headYaw, 0));
        M.head.setMatrixAt(i, _h); M.headOl.setMatrixAt(i, _h);
        const hat = a.hat;
        M.hair.setMatrixAt(i, hat === 'helmet' ? _zero : _h);
        M.cap.setMatrixAt(i, hat === 'cap' ? _h : _zero); M.beret.setMatrixAt(i, hat === 'beret' ? _h : _zero);
        M.helmet.setMatrixAt(i, hat === 'helmet' ? _h : _zero); M.helmetOl.setMatrixAt(i, hat === 'helmet' ? _h : _zero);
        const swing = a.moving ? Math.sin(a.walk) * .6 : 0;
        const lL = a.seated ? -1.4 : (a.legL ?? swing), lR = a.seated ? -1.4 : (a.legR ?? -swing);
        _m.multiplyMatrices(_b, trs(_t, -.16, .62, 0, lL, 0, 0)); M.leg.setMatrixAt(i * 2, _m); M.legOl.setMatrixAt(i * 2, _m);
        _m.multiplyMatrices(_b, trs(_t, .16, .62, 0, lR, 0, 0)); M.leg.setMatrixAt(i * 2 + 1, _m); M.legOl.setMatrixAt(i * 2 + 1, _m);
        _t.multiplyMatrices(_b, trs(_m, 0, .62, 0, a.lean, 0, 0));
        _m.multiplyMatrices(_t, trs(_h, -.47, .64, 0, a.armL + (a.moving ? -swing * .8 : 0), 0, a.armLz)); M.arm.setMatrixAt(i * 2, _m); M.armOl.setMatrixAt(i * 2, _m);
        _m.multiplyMatrices(_t, trs(_h, .47, .64, 0, a.armR + (a.moving ? swing * .8 : 0), 0, a.armRz)); M.arm.setMatrixAt(i * 2 + 1, _m); M.armOl.setMatrixAt(i * 2 + 1, _m);
        a.shadow.visible = M.torso.visible; a.shadow.position.set(a.pos.x, a.pos.y + .03, a.pos.z); const k = 1 - j * .5; a.shadow.scale.set(k, k, k);
      }
      for (const k in M) M[k].instanceMatrix.needsUpdate = true;
      // Sphère englobante : centre des personnages visibles, rayon jusqu'au plus éloigné (+ la taille d'un personnage)
      let n = 0; _v.set(0, 0, 0);
      for (const a of list) if (a.visible) { _v.add(a.pos); n++; }
      if (n) { _v.divideScalar(n); let r = 0; for (const a of list) if (a.visible) r = Math.max(r, _v.distanceTo(a.pos) + 2.6 * a.scale); bound.center.copy(_v).setY(_v.y + 1); bound.radius = r; }
      else bound.radius = 0;
      // Contours masqués au loin, comme ceux des personnages (voir outlineLOD)
      const olv = Math.hypot(bound.center.x - cam.target.x, bound.center.z - cam.target.z) - bound.radius < 18;
      for (const k of ['torsoOl', 'headOl', 'legOl', 'armOl', 'helmetOl']) M[k].visible = olv;
    },
  };
  return crowd;
}

/** Petits comportements prêts à l'emploi. */
export const behave = {
  /** Marche vers un point ; renvoie la distance restante. */
  walkTo(a, x, z, speed, dt) {
    const dx = x - a.pos.x, dz = z - a.pos.z, d = Math.hypot(dx, dz);
    if (d < .05) { a.moving = false; return 0; }
    const s = Math.min(speed * dt, d); a.pos.x += dx / d * s; a.pos.z += dz / d * s;
    const ty = Math.atan2(dx, dz); let df = ((ty - a.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; a.yaw += df * Math.min(1, dt * 10);
    a.walk += dt * speed * 2.6; a.moving = true; return d - s;
  },
  /** Flâne au hasard dans un rectangle. */
  wander(a, rect, dt, speed = 1.1) {
    if (!a.goal || a.t > a.next) { a.goal = { x: rect.minX + Math.random() * (rect.maxX - rect.minX), z: rect.minZ + Math.random() * (rect.maxZ - rect.minZ) }; a.next = a.t + 3 + Math.random() * 5; }
    if (a.pause > 0) { a.pause -= dt; a.moving = false; return; }
    if (behave.walkTo(a, a.goal.x, a.goal.z, speed, dt) < .1) { a.pause = 1 + Math.random() * 3; a.goal = null; }
  },
  /** Suit une boucle de points. */
  loop(a, pts, dt, speed) {
    a.k = a.k || 0; const p = pts[a.k % pts.length];
    if (behave.walkTo(a, p[0], p[1], speed, dt) < .2) a.k++;
  },
  face(a, x, z, dt, k = 6) { const ty = Math.atan2(x - a.pos.x, z - a.pos.z); let df = ((ty - a.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; a.yaw += df * Math.min(1, dt * k); },
  cheer(a, t) { a.armL = -2.7 + Math.sin(t * 14) * .3; a.armR = -2.7 - Math.sin(t * 14) * .3; a.armLz = -.3; a.armRz = .3; },
  rest(a) { a.armL = a.armR = 0; a.armLz = a.armRz = 0; a.lean = 0; },
};
