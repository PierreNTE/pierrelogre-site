/* =====================================================================
   Heure du jour et météo.
   Un cycle d'environ 9 minutes de jeu : matin doux → journée → fin d'après-midi dorée (ombres longues)
   → soir bleu (lanternes, fenêtres allumées, lucioles) → aube. De temps en temps, une petite averse.
   Tout est additif et léger : 1 appel de dessin par couche, et rien n'est dessiné quand la couche est éteinte.
   ===================================================================== */
import * as THREE from 'three';
import { RM, SUN_OFF, U, cam, scene } from './engine.js';
import { Q } from './quality.js';
import { LIGHTS, WINDOWS } from './regions/kit.js';
import { DAY, S, rnd } from './state.js';

const PERIOD = 540;                        // secondes de jeu pour un cycle complet
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const SUN0 = SUN_OFF.clone();

/* ---------- Textures douces (dégradé radial) ---------- */
function radial(inner = .0, soft = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 32 * inner, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(soft * .45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = radial(0, 1), POOL = radial(.05, .8);
const add = (o, color, map, opts = {}) => Object.assign(o, { color: new THREE.Color(color), map, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, ...opts });

/* ---------- Couches ---------- */
let lamps = null, pools = null, wins = null, nL = -1, nW = -1;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
function buildLights() {
  if (lamps) { scene.remove(lamps, pools); for (const o of [lamps, pools]) { o.geometry.dispose(); o.material.dispose(); } pools.dispose(); }   // libère aussi la géométrie et le matériau
  const pos = new Float32Array(LIGHTS.length * 3), sz = new Float32Array(LIGHTS.length);
  LIGHTS.forEach((l, i) => { pos.set([l.x, l.y, l.z], i * 3); sz[i] = l.s; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  lamps = new THREE.Points(g, add(new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: true }), '#ffd38a', GLOW)); lamps.frustumCulled = false; lamps.renderOrder = 3;
  pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), add(new THREE.MeshBasicMaterial(), '#ffc56e', POOL), Math.max(1, LIGHTS.length));
  LIGHTS.forEach((l, i) => { const r = 4.2 * l.s; pools.setMatrixAt(i, _m.compose(_p.set(l.x, .07, l.z), _q.identity(), _s.set(r, 1, r))); });
  pools.count = LIGHTS.length; pools.frustumCulled = false; pools.renderOrder = 2;
  lamps.visible = pools.visible = false; scene.add(lamps, pools); nL = LIGHTS.length;
}
function buildWindows() {
  if (wins) { scene.remove(wins); wins.geometry.dispose(); wins.material.dispose(); wins.dispose(); }
  wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), add(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), '#ffcc78', null), Math.max(1, WINDOWS.length));
  WINDOWS.forEach((w, i) => { _e.set(0, w.a, 0); wins.setMatrixAt(i, _m.compose(_p.set(w.x, w.y, w.z), _q.setFromEuler(_e), _s.set(w.w, w.h, 1))); });
  wins.count = WINDOWS.length; wins.frustumCulled = false; wins.visible = false; scene.add(wins); nW = WINDOWS.length;
}

/* Lucioles : quelques points qui flottent autour du renard le soir (prés, forêt, rivière) */
const FF = 40, ffPos = new Float32Array(FF * 3), ff = [];
const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
const flies = new THREE.Points(ffGeo, add(new THREE.PointsMaterial({ size: .45, sizeAttenuation: true }), '#e9ff8f', GLOW)); flies.frustumCulled = false; flies.visible = false; scene.add(flies);
for (let i = 0; i < FF; i++) ff.push({ x: rnd(-14, 14), y: rnd(.4, 2.2), z: rnd(-10, 10), ph: rnd(0, 6), sp: rnd(.3, .8) });
const FIREFLY_REGIONS = new Set(['village', 'foret', 'riviere', 'gare', 'sport', 'ile']);

/* Pluie : des traits qui tombent autour de la caméra (un seul maillage de segments) */
const RN = 520, rPos = new Float32Array(RN * 6), drops = [];
const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
const rain = new THREE.LineSegments(rGeo, new THREE.LineBasicMaterial({ color: '#dfeaf0', transparent: true, opacity: 0, depthWrite: false })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
for (let i = 0; i < RN; i++) drops.push({ x: rnd(-22, 22), y: rnd(0, 16), z: rnd(-18, 14), v: rnd(17, 23) });
const NO_RAIN = new Set(['cloud', 'montagne', 'terrier']);   // pas de pluie dans le centre de données, ni sur la neige

/* ---------- Couleurs du moment (appliquées aux couleurs de la région par main.js) ---------- */
const GOLD = { bg: '#f3c98f', fog: '#f0c48c', sun: '#ff9548', sky: '#ffc98a', ground: '#8a7a50' }, EVE = { bg: '#55648f', fog: '#5d6c96', sun: '#8ea2ff', sky: '#7484c8', ground: '#36405a' }, WET = { bg: '#a3aeb5', fog: '#aab4ba', sun: '#d2d9de', sky: '#c3ccd2', ground: '#5f6a62' };
const CG = {}, CE = {}, CW = {}; for (const k in GOLD) { CG[k] = new THREE.Color(GOLD[k]); CE[k] = new THREE.Color(EVE[k]); CW[k] = new THREE.Color(WET[k]); }
/** Teinte une couleur de la région (clé : bg, fog, sun, sky, ground) selon l'heure et la météo. */
export function grade(key, c) {
  if (DAY.golden > 0) c.lerp(CG[key], DAY.golden * (key === 'sun' ? .8 : key === 'ground' ? .3 : key === 'sky' ? .5 : .45));
  if (DAY.eve > 0) c.lerp(CE[key], DAY.eve * (key === 'sun' ? .85 : key === 'ground' ? .6 : .7));
  if (DAY.rain > 0) c.lerp(CW[key], DAY.rain * (key === 'sun' ? .65 : .55));
  return c;
}

let enabled = true;
/** Coupe le cycle (aperçus, tests visuels) : lumière de journée fixe. */
export function setDaytime(on) { enabled = on; if (!on) { DAY.golden = DAY.eve = DAY.rain = DAY.lamp = 0; DAY.sunK = DAY.hemiK = 1; SUN_OFF.copy(SUN0); } }

/** À appeler à chaque image (dt en secondes). */
export function updateDaytime(dt, now) {
  if (!enabled) return;
  const playing = S.started && !S.paused;
  if (playing) DAY.t = (DAY.t + dt / PERIOD) % 1;
  const t = DAY.t;
  const dawn = (1 - sm(0, .1, t)) + sm(.93, 1, t);
  DAY.golden = Math.max(sm(.38, .5, t) * (1 - sm(.56, .66, t)), dawn * .45);
  DAY.eve = sm(.58, .7, t) * (1 - sm(.85, .96, t));
  DAY.lamp = sm(.6, .68, t) * (1 - sm(.88, .95, t));
  // Averse : rare, jamais au tout début, jamais en montagne ; elle monte et descend doucement
  if (playing && !RM) {
    DAY.nextRain -= dt;
    if (DAY.rainT <= 0 && DAY.nextRain <= 0 && !NO_RAIN.has(S.region)) { DAY.rainT = rnd(40, 60); DAY.nextRain = rnd(260, 420); }
    if (DAY.rainT > 0) DAY.rainT -= dt;
  }
  const wantRain = DAY.rainT > 0 && !NO_RAIN.has(S.region) ? 1 : 0;
  DAY.rain += (wantRain - DAY.rain) * Math.min(1, dt * .35);
  // Lumières : soleil plus bas et plus à l'ouest en fin de journée (ombres longues), lune bleutée le soir
  DAY.sunK = (1 - .1 * DAY.golden) * (1 - .62 * DAY.eve) * (1 - .45 * DAY.rain);
  DAY.hemiK = (1 - .32 * DAY.eve) * (1 - .12 * DAY.rain);
  DAY.exposure = (1 - .12 * DAY.eve) * (1 - .06 * DAY.rain);
  const low = DAY.golden * (1 - DAY.eve);
  SUN_OFF.set(SUN0.x - 9 * low, SUN0.y - 9 * low, SUN0.z - 3 * low);
  U.uCloud.value = .2 + .35 * DAY.rain; U.uWind.value = (RM ? .3 : 1) * (1 + .8 * DAY.rain);

  // Lanternes et flaques de lumière (reconstruites si de nouvelles régions ont ajouté des lampes)
  if (LIGHTS.length !== nL) buildLights();
  const lk = DAY.lamp; lamps.visible = pools.visible = lk > .01;
  if (lk > .01) { lamps.material.opacity = .85 * lk * (1 + Math.sin(now * 7) * .03); pools.material.opacity = .28 * lk; }
  if (WINDOWS.length !== nW) buildWindows();
  const wk = sm(.55, .66, t) * (1 - sm(.9, .97, t)); wins.visible = wk > .01; if (wins.visible) wins.material.opacity = .62 * wk;
  // Lucioles
  const fk = DAY.eve * (FIREFLY_REGIONS.has(S.region) ? 1 : 0) * (1 - DAY.rain); flies.visible = fk > .05;
  if (flies.visible) {
    flies.material.opacity = fk * (.75 + Math.sin(now * 3) * .2);
    for (let i = 0; i < FF; i++) { const f = ff[i]; f.x += Math.sin(now * f.sp + f.ph) * dt * .6; f.z += Math.cos(now * f.sp * .8 + f.ph) * dt * .6; f.y = 1.1 + Math.sin(now * f.sp * 1.7 + f.ph) * .7;
      if (Math.abs(f.x) > 16) f.x *= -.9; if (Math.abs(f.z) > 12) f.z *= -.9; ffPos[i * 3] = cam.target.x + f.x; ffPos[i * 3 + 1] = f.y; ffPos[i * 3 + 2] = cam.target.z + f.z; }
    ffGeo.attributes.position.needsUpdate = true;
  }
  // Pluie
  rain.visible = DAY.rain > .02;
  if (rain.visible) {
    const n = Q.tier === 2 ? RN * .4 | 0 : RN; rGeo.setDrawRange(0, n * 2); rain.material.opacity = .6 * DAY.rain;
    for (let i = 0; i < n; i++) { const d = drops[i]; d.y -= d.v * dt; if (d.y < 0) { d.y += 16; d.x = rnd(-22, 22); d.z = rnd(-18, 14); }
      const x = cam.target.x + d.x, z = cam.target.z + d.z, o = i * 6; rPos[o] = x; rPos[o + 1] = d.y; rPos[o + 2] = z; rPos[o + 3] = x + .14; rPos[o + 4] = d.y + .95; rPos[o + 5] = z + .06; }
    rGeo.attributes.position.needsUpdate = true;
  }
}
