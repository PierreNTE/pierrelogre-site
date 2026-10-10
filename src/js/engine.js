/* =====================================================================
   Moteur : rendu, matériaux (shaders maison), primitives, ombres, collisions
   ===================================================================== */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rnd } from './state.js';

export const canvas = document.getElementById('game');
export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
/** Préférence « réduire les animations » du système. */
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

export let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch (e) { window.__showProfile && window.__showProfile(); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.75 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Tone mapping neutre : garde les teintes pastel, adoucit les blancs trop durs
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.04;

export const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfe3cf');
scene.fog = new THREE.Fog('#d3e3c9', 40, 75);
export const camera = new THREE.PerspectiveCamera(40, 1, 1, 200);   // plan proche à 1 m : bien meilleure précision de profondeur (pas de scintillement entre sols proches)
export const CAM_OFF = new THREE.Vector3(0, 19, 15);
export const cam = { zoom: 1, zoomT: 1, target: new THREE.Vector3(), lookAhead: new THREE.Vector3() };
export const setZoom = z => { cam.zoomT = Math.max(.7, Math.min(2.2, z)); };

// Lumière de fin d'après-midi : ciel chaud, soleil bas, ombres longues
export const hemi = new THREE.HemisphereLight('#fff1d6', '#7c9a6a', 1.5); scene.add(hemi);
export const sun = new THREE.DirectionalLight('#ffdcab', 2.35);
export const SUN_OFF = new THREE.Vector3(-18, 19, 13);
sun.castShadow = true;
export const SM = isTouch ? 1024 : 2048; sun.shadow.mapSize.set(SM, SM);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 22, bottom: -22, near: 1, far: 80 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = .03;
scene.add(sun); scene.add(sun.target);

/* ---------- Shaders maison (vent, herbe qui se couche, décor transparent devant le renard) ---------- */
export const U = {
  uTime: { value: 0 },
  uFox: { value: new THREE.Vector3() },
  uCam: { value: new THREE.Vector3() },
  uOcc: { value: new THREE.Vector2(1, 1.8) },   // x : actif, y : rayon autour de la ligne caméra → renard
  uWind: { value: RM ? .3 : 1 },
  uCloud: { value: .2 },   // force des ombres de nuages qui glissent sur le sol
};
const projectChunk = (sway, grass, wake) => `
  vec4 lp = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    lp = instanceMatrix * lp;
  #endif
  vec4 wp = modelMatrix * lp;
  ${sway ? `
  float swayH = max( 0.0, wp.y - 1.1 );
  wp.xz += vec2( sin( uTime * 1.7 + wp.x * .45 + wp.z * .3 ), cos( uTime * 1.3 + wp.z * .5 + wp.x * .2 ) ) * .05 * swayH * uWind;` : ''}
  ${grass ? `
  ${grass === 2 ? 'float gy = aBend; vec3 io = aOrigin;' : 'float gy = clamp( position.y, 0.0, 1.0 ); vec3 io = ( modelMatrix * instanceMatrix * vec4( 0., 0., 0., 1. ) ).xyz;'}
  vec2 dv = io.xz - uFox.xz; float dd = length( dv );
  float bend = 1.0 - smoothstep( .3, 1.25, dd );
  wp.xz += ( dd > .001 ? dv / dd : vec2( 0. ) ) * bend * .38 * gy;
  wp.y -= bend * .14 * gy;
  wp.xz += vec2( sin( uTime * 1.6 + io.x * .35 + io.z * .2 ), cos( uTime * 1.3 + io.z * .3 ) ) * .07 * gy * gy * uWind * ( .7 + .3 * sin( uTime * .4 + io.x * .05 ) );` : ''}
  ${wake ? `{ float wd = length( wp.xz - uWake.xy ); float band = exp( -pow( ( wd - uWake.z ) / 2.6, 2.0 ) ) * uWake.w; wp.y += max( wp.y, 0.0 ) * .22 * band + .3 * band; }` : ''}
  vOccW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
`;
// Ombres de nuages : de grandes taches douces qui dérivent lentement sur tout ce qui est éclairé par le soleil
const CLOUD_FRAG = `
  #include <lights_fragment_end>
  {
    vec2 cp = vOccW.xz * .028 + vec2( uTime * .018, uTime * .011 );
    float c = sin( cp.x * 1.7 + sin( cp.y * 1.3 ) ) * sin( cp.y * 1.9 + sin( cp.x * .9 + 1.7 ) ) + .45 * sin( ( cp.x - cp.y ) * 2.6 + 4.0 );
    reflectedLight.directDiffuse *= 1.0 - uCloud * smoothstep( .25, .85, c );
  }`;
const OCC_FRAG = `
  if ( uOcc.x > .5 && vOccW.y > .32 ) {
    vec3 ab = uFox - uCam; float L2 = dot( ab, ab ); vec3 ap = vOccW - uCam;
    float tt = dot( ap, ab ) / L2;
    if ( tt > 0.0 && tt < 1.0 - 1.25 / sqrt( L2 ) ) {
      float a = 1.0 - smoothstep( uOcc.y * .5, uOcc.y, length( ap - ab * tt ) );
      if ( a > 0.0 ) {
        const float B[16] = float[16]( 0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5. );
        int ix = int( mod( gl_FragCoord.x, 4.0 ) ), iy = int( mod( gl_FragCoord.y, 4.0 ) );
        if ( ( B[ iy * 4 + ix ] + .5 ) / 16.0 < a * .78 ) discard;
      }
    }
  }`;
// Zone endormie (pas encore ouverte) : couleurs éteintes ; à l'ouverture, une vague chaude la réveille
const WAKE_FRAG = `
  {
    float wd = length( vOccW.xz - uWake.xy ); float awake = smoothstep( uWake.z + 1.0, uWake.z - 6.0, wd );
    vec3 gr = vec3( dot( gl_FragColor.rgb, vec3( .299, .587, .114 ) ) );
    gl_FragColor.rgb = mix( mix( gr, gl_FragColor.rgb, .22 ) * vec3( .84, .88, .94 ) + .05, gl_FragColor.rgb, awake );
    gl_FragColor.rgb += vec3( 1.0, .8, .42 ) * .38 * exp( -pow( ( wd - uWake.z ) / 1.8, 2.0 ) ) * uWake.w;
  }
  #include <fog_fragment>`;
/** Ajoute vent / herbe / transparence d'occlusion à un matériau Three (Lambert ou Basic). wake : uniforme de réveil d'une zone. */
export function patch(mat, { occ = true, sway = false, grass = false, wake = null } = {}) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U); if (wake) sh.uniforms.uWake = wake;
    const wk = wake ? 'uniform vec4 uWake;\n' : '';
    sh.vertexShader = 'uniform float uTime; uniform vec3 uFox; uniform float uWind; varying vec3 vOccW;\n' + wk + (grass === 2 ? 'attribute vec3 aOrigin; attribute float aBend;\n' : '')
      + sh.vertexShader.replace('#include <project_vertex>', projectChunk(sway, grass, !!wake));
    sh.fragmentShader = 'uniform vec3 uFox; uniform vec3 uCam; uniform vec2 uOcc; uniform float uTime; uniform float uCloud; varying vec3 vOccW;\n'
      + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + (occ ? OCC_FRAG : '')).replace('#include <lights_fragment_end>', CLOUD_FRAG).replace('#include <fog_fragment>', wake ? WAKE_FRAG : '#include <fog_fragment>');
    if (wake) sh.fragmentShader = wk + sh.fragmentShader;
  };
  const key = `fx${+occ}${+sway}${+grass}${wake ? 'w' : ''}`;
  mat.customProgramCacheKey = () => key;
  mat.userData.sway = sway;
  return mat;
}

/* ---------- Textures générées ---------- */
export function canvasTex(size, draw, rep = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rep, rep); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
}
export const TX = {
  grass: canvasTex(256, (g, s) => { g.fillStyle = '#a9cc86'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(120,165,90,.35)' : 'rgba(205,230,165,.35)'; g.fillRect(Math.random() * s, Math.random() * s, 2, rnd(3, 7)); } }, 30),
  cobble: canvasTex(256, (g, s) => { g.fillStyle = '#bfb092'; g.fillRect(0, 0, s, s); const n = 8, w = s / n;
    for (let r = 0; r < n; r++) for (let c = -1; c < n; c++) { const off = (r % 2) * w / 2, l = rnd(-14, 14);
      g.fillStyle = `hsl(${rnd(36, 44)},${rnd(25, 35)}%,${78 + l * .5}%)`; g.beginPath(); g.roundRect(c * w + off + 2, r * w + 2, w - 4, w - 4, 7); g.fill(); } }, 3),
  dirt: canvasTex(128, (g, s) => { g.fillStyle = '#eadcb4'; g.fillRect(0, 0, s, s); for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(190,165,120,.4)' : 'rgba(255,248,225,.5)'; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, rnd(.6, 1.8), 0, 7); g.fill(); } }, 1),
  tile: canvasTex(128, (g, s) => { g.fillStyle = '#d6d0c3'; g.fillRect(0, 0, s, s); const w = s / 2;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { g.fillStyle = (r + c) % 2 ? '#ebe6dc' : '#e4ded2'; g.fillRect(c * w + 1.5, r * w + 1.5, w - 3, w - 3); } }, 1),
  soil: canvasTex(128, (g, s) => { g.fillStyle = '#7a5236'; g.fillRect(0, 0, s, s); for (let y = 0; y < s; y += 16) { g.fillStyle = '#664229'; g.fillRect(0, y, s, 5); } for (let i = 0; i < 200; i++) { g.fillStyle = 'rgba(160,115,80,.5)'; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); } }, 2),
  water: canvasTex(128, (g, s) => { g.fillStyle = '#8fc9df'; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { g.beginPath(); const x = Math.random() * s, y = Math.random() * s, w = rnd(10, 26); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 4, x + w, y); g.stroke(); } }, 2),
};
/** Textures de texte, redessinées au changement de langue (redraws). */
export const redraws = [];
export function textTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  const r = () => { g.clearRect(0, 0, w, h); draw(g, w, h); tx.needsUpdate = true; }; r(); redraws.push(r); tx.userData.redraw = r; return tx;
}

/* ---------- Matériaux & primitives ---------- */
/** Couleurs de feuillage : ces matériaux ondulent au vent. */
export const FOLIAGE = new Set(['#6f9e4f', '#d98b3a', '#c9a33d', '#7fb05c', '#e2a548', '#5f8f4a', '#6d9d55', '#6b9c52', '#79a356', '#86b062',
  // feuillages v2 (trois tons par arbre : ombre, masse, lumière)
  '#5f8f45', '#c4772f', '#e9a552', '#b8922f', '#ddb955', '#6d9d4d', '#95c06e', '#cf8f38', '#efbd66', '#4f7f3f', '#5a8a3c']);
export const matCache = {};
/* Ombrage lisse (version 5.6, dans l'esprit de Goose Game) : les formes rondes (créatures, feuillages, troncs, haies)
   sont lissées ; les boîtes (bâtiments, mobilier) et les rochers taillés gardent des faces nettes, qui viennent de
   leur géométrie (une face = une normale), pas du matériau. */
const FLAT = false;
/** Finesse minimale des grandes sphères pendant la construction d'un personnage (silhouette ronde de près). */
export let RIG_DETAIL = 0; export const setRigDetail = d => { RIG_DETAIL = d; };
export function M(c) { return matCache[c] ||= patch(new THREE.MeshLambertMaterial({ color: c, flatShading: FLAT }), { sway: FOLIAGE.has(c) }); }
export function TM(tex, rx = 1, ry = rx) { const m = tex.clone(); m.repeat.set(rx, ry); m.needsUpdate = true; return patch(new THREE.MeshLambertMaterial({ color: '#ffffff', map: m }), { occ: false }); }
/** Sols en ruban (chemins) : couleurs par sommet avec transparence, bords fondus dans l'herbe. */
export function groundMat(wake = null) {
  const m = patch(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -2 }), { occ: false, wake });
  m.userData.ground = true; return m;
}
export const GROUND = groundMat();
export const outlineMat = patch(new THREE.MeshBasicMaterial({ color: '#3a2f27', side: THREE.BackSide }));
export const outlineSway = patch(new THREE.MeshBasicMaterial({ color: '#3a2f27', side: THREE.BackSide }), { sway: true });
/** Matériau unique des personnages fusionnés (couleurs par sommet). */
export const VC = patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: FLAT }));
export const VC_RIG = VC;
export const VC_SWAY = patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: FLAT }), { sway: true });
export function addOutline(m, tk = .032) {
  const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); const s = new THREE.Vector3(); g.boundingBox.getSize(s);
  if (Math.min(s.x, s.y, s.z) < .05) return m;
  const o = new THREE.Mesh(g, m.material.userData && m.material.userData.sway ? outlineSway : outlineMat);
  o.scale.set((s.x + 2 * tk) / s.x, (s.y + 2 * tk) / s.y, (s.z + 2 * tk) / s.z); o.userData.outline = true; o.castShadow = false; m.add(o); return m;
}
export const world = new THREE.Group();   // décor statique, fusionné en quelques maillages par bake()
/** Groupe qui reçoit le décor en cours de construction (le village, puis chaque région). */
export let BUILD = world;
export const setBuild = g => { BUILD = g || world; };
export function mk(geo, mat, x, y, z, parent, ol) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (parent || BUILD).add(m); if (ol !== false) addOutline(m); return m; }
export const box = (w, h, d, c, x = 0, y = 0, z = 0, p, ol) => mk(new THREE.BoxGeometry(w, h, d), M(c), x, y, z, p, ol);
export const cyl = (rt, rb, h, c, x = 0, y = 0, z = 0, seg = 8, p, ol) => mk(new THREE.CylinderGeometry(rt, rb, h, seg), M(c), x, y, z, p, ol);
export const sph = (r, c, x = 0, y = 0, z = 0, p, detail = 1, ol) => mk(new THREE.IcosahedronGeometry(r, detail && (r >= .12 ? Math.max(detail, RIG_DETAIL) : detail)), M(c), x, y, z, p, ol);
export const cone = (r, h, c, x = 0, y = 0, z = 0, seg = 6, p, ol) => mk(new THREE.ConeGeometry(r, h, seg), M(c), x, y, z, p, ol);
export function flat(w, d, mat, x, z, y = .02, rot = 0, parent) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, y, z); m.receiveShadow = true; (parent || BUILD).add(m); return m; }
export const noShadowCast = o => o.traverse(c => { if (c.isMesh) c.castShadow = false; });

/* ---------- Fusion d'un personnage articulé (une pièce animée = 1 maillage + 1 contour) ---------- */
const _inv = new THREE.Matrix4(), _m = new THREE.Matrix4();
function prepGeo(mesh, matrix, color) {
  const g = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone());
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
  g.clearGroups(); g.applyMatrix4(matrix);
  if (color) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = color.r; a[i * 3 + 1] = color.g; a[i * 3 + 2] = color.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
  return g;
}
/**
 * Fusionne les maillages de chaque pièce (pivot animé) en un maillage à couleurs par sommet
 * et un contour. Les pièces restent des Object3D : les animations existantes fonctionnent.
 */
/**
 * Géométrie fusionnée d'une pièce (repère local de la pièce), sans descendre dans les pièces
 * listées dans `stop`. remove : retire les maillages fusionnés de la scène.
 */
export function partGeometry(part, stop = new Set(), remove = true) {
  part.updateMatrixWorld(true);
  _inv.copy(part.matrixWorld).invert();
  const geos = [], ols = [], drop = [];
  const walk = node => {
    for (const ch of node.children) {
      if (stop.has(ch)) continue;
      if (ch.isMesh) {
        const mat = ch.material;
        const plain = mat && !mat.map && (mat.isMeshLambertMaterial || ch.userData.outline);
        if (!plain) continue;
        _m.multiplyMatrices(_inv, ch.matrixWorld);
        if (ch.userData.outline) ols.push(prepGeo(ch, _m, null));
        else { geos.push(prepGeo(ch, _m, mat.color)); walk(ch); }
        drop.push(ch);
      } else walk(ch);
    }
  };
  walk(part);
  if (remove) for (const d of drop) if (!d.userData.outline) d.parent && d.parent.remove(d);
  return { geo: geos.length ? mergeGeometries(geos) : null, ol: ols.length ? mergeGeometries(ols) : null };
}
/** Matériau du renard : jamais rendu transparent par l'effet « voir à travers » (sa propre queue entre lui et la caméra). */
export const VC_HERO = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { occ: false });
export function mergeRig(root, parts, mat = VC_RIG) {
  root.updateMatrixWorld(true);
  const set = new Set(parts);
  for (const part of parts) {
    const { geo, ol } = partGeometry(part, set);
    if (geo) { const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = true; part.add(m); }
    if (ol) { const m = new THREE.Mesh(ol, outlineMat); m.castShadow = false; part.add(m); RIG_OUTLINES.push({ m, root }); }
  }
}
/** Contours des personnages et objets : masqués au loin (ils ne se voient plus, mais coûtent un appel de dessin). */
export const RIG_OUTLINES = [];
const _rp = new THREE.Vector3();
export function outlineLOD(center, far = 24) {
  for (const o of RIG_OUTLINES) { o.root.getWorldPosition(_rp); o.m.visible = (_rp.x - center.x) ** 2 + (_rp.z - center.z) ** 2 < far * far; }
}

/* ---------- Découpage par boîte : les tuiles fusionnées (décor, végétation) ----------
   Une tuile de 56 m a une sphère englobante énorme : elle « touche » l'écran même quand tout son contenu est
   sous le bord du cadre (la caméra regarde le sol). On la teste plutôt avec sa boîte, bien plus serrée. */
export const BOXCULL = [];
const _fr = new THREE.Frustum(), _pv = new THREE.Matrix4();
/** Inscrit un maillage statique (géométrie en coordonnées du monde) au découpage par boîte. */
export function boxCull(m, margin = 1.5) {
  m.updateMatrixWorld(true); m.geometry.computeBoundingBox(); const b = m.userData.wbox = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld).expandByScalar(margin);
  b.min.y = Math.max(b.min.y, -.9);   // ce qui est enterré (bas des buttes) ne se voit pas : la boîte s'arrête juste sous le sol (lit de la rivière compris)
  m.frustumCulled = false; BOXCULL.push(m);
}
/** À appeler juste avant le rendu. */
export function cullBaked() {
  camera.updateMatrixWorld(); _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pv);
  for (const m of BOXCULL) m.visible = _fr.intersectsBox(m.userData.wbox);
}

/* ---------- Fusion du décor statique (peu d'appels de dessin) ---------- */
/**
 * Fusionne un groupe de décor : les matériaux unis deviennent des couleurs par sommet
 * (1 maillage + 1 pour le feuillage qui ondule), les matériaux texturés gardent un maillage chacun.
 * Le décor est découpé en tuiles de `tile` unités pour que la caméra ignore ce qui est hors champ.
 * Les ombres sont projetées par un maillage invisible par tuile.
 */
export function bake(group, tile = 0, { mats = null } = {}) {
  const RM_ = mats;
  group.updateMatrixWorld(true);
  const buckets = new Map(), casters = new Map(), out = [], _c = new THREE.Vector3();
  group.traverse(o => {
    if (!o.isMesh) return;
    const mat = o.material, ol = !!o.userData.outline;
    // Chemins (rubans à couleurs par sommet et bords transparents) : un maillage par tuile
    const gnd = !ol && !!mat.userData.ground;
    const plain = !ol && !gnd && mat.isMeshLambertMaterial && !mat.map && mat.vertexColors !== true;
    // Sols texturés opaques : même texture → un seul maillage (la répétition est reportée dans les UV)
    const texd = !ol && !plain && !gnd && mat.isMeshLambertMaterial && mat.map && !mat.transparent && mat.map.source;
    o.getWorldPosition(_c); const tk = tile ? `${Math.floor(_c.x / tile)},${Math.floor(_c.z / tile)}` : '0';
    const key = tk + '|' + (ol ? mat.uuid : (plain ? (mat.userData.sway ? 'vc-sway' : 'vc') : gnd ? 'gnd' : texd ? 'tx' + mat.map.source.uuid : mat.uuid));
    if (!buckets.has(key)) buckets.set(key, { mat: plain ? (RM_ ? (mat.userData.sway ? RM_.vcSway : RM_.vc) : (mat.userData.sway ? VC_SWAY : VC)) : gnd ? (RM_ ? RM_.ground : mat) : texd ? (RM_ ? RM_.tex(mat.map) : sharedTexMat(mat.map)) : mat, geos: [], recv: !ol, gnd });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (texd && g.attributes.uv) { const uv = g.attributes.uv, r = mat.map.repeat, of = mat.map.offset; for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * r.x + of.x, uv.getY(q) * r.y + of.y); }
    const keep = plain ? ['position', 'normal'] : gnd ? ['position', 'normal', 'color'] : ['position', 'normal', 'uv'];
    for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k);
    if (!plain && !gnd && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (plain) { const n = g.attributes.position.count, a = new Float32Array(n * 3), c = mat.color; for (let q = 0; q < n; q++) { a[q * 3] = c.r; a[q * 3 + 1] = c.g; a[q * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    g.clearGroups(); g.applyMatrix4(o.matrixWorld); buckets.get(key).geos.push(g);
    // Ombres portées : seulement les volumes principaux (ceux qui ont un contour) ; les petits détails n'en projettent pas
    if (o.castShadow && !ol && o.children.some(c => c.userData.outline)) { const sg = new THREE.BufferGeometry(); sg.setAttribute('position', g.attributes.position); if (!casters.has(tk)) casters.set(tk, []); casters.get(tk).push(sg); }
  });
  for (const b of buckets.values()) { const merged = mergeGeometries(b.geos, false); if (!merged) continue; const m = new THREE.Mesh(merged, b.mat); m.castShadow = false; m.receiveShadow = b.recv; boxCull(m); if (b.gnd) m.renderOrder = -1; scene.add(m); out.push(m); }
  // Invisible à l'écran (n'écrit ni couleur ni profondeur) mais rendu dans la carte d'ombre
  for (const list of casters.values()) {
    const shadow = new THREE.Mesh(mergeGeometries(list, false), SHADOW_MAT);
    shadow.castShadow = true; shadow.receiveShadow = false; shadow.frustumCulled = true; scene.add(shadow); out.push(shadow);
  }
  group.clear();
  return out;
}
const SHADOW_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
const texMats = new Map();
/** Matériaux propres à une zone (pour son effet de réveil). */
export function regionMats(wake) {
  const tex = new Map();
  return {
    vc: patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: FLAT }), { wake }),
    vcSway: patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: FLAT }), { sway: true, wake }),
    bend: patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { occ: false, grass: 2, wake }),
    flat: patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { occ: false, wake }),
    ground: groundMat(wake),
    tex(map) { let m = tex.get(map.source.uuid); if (!m) { const tx = map.clone(); tx.repeat.set(1, 1); tx.offset.set(0, 0); tx.needsUpdate = true; m = patch(new THREE.MeshLambertMaterial({ color: '#ffffff', map: tx }), { occ: false, wake }); tex.set(map.source.uuid, m); } return m; },
  };
}
function sharedTexMat(map) {
  let m = texMats.get(map.source.uuid);
  if (!m) { const tx = map.clone(); tx.repeat.set(1, 1); tx.offset.set(0, 0); tx.needsUpdate = true; m = patch(new THREE.MeshLambertMaterial({ color: '#ffffff', map: tx }), { occ: false }); texMats.set(map.source.uuid, m); }
  return m;
}

/* ---------- Ombres rondes (un seul InstancedMesh pour toutes) ---------- */
export const blobTex = textTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(40,40,20,.55)'); gr.addColorStop(.6, 'rgba(40,40,20,.28)'); gr.addColorStop(1, 'rgba(40,40,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const BLOBS = []; let blobMesh = null;
/** Ombre ronde : un petit objet { position, scale, visible } dessiné par updateBlobs(). */
export function blob(r) { const b = { position: new THREE.Vector3(0, -9, 0), scale: new THREE.Vector3(1, 1, 1), visible: true, r }; BLOBS.push(b); return b; }
const _bq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), _bs = new THREE.Vector3(), _bm = new THREE.Matrix4();
export function updateBlobs() {
  // (re)création quand des ombres ont été ajoutées depuis (régions construites après le démarrage)
  if (!blobMesh || blobMesh.userData.cap < BLOBS.length) {
    if (blobMesh) { scene.remove(blobMesh); blobMesh.geometry.dispose(); blobMesh.material.dispose(); blobMesh.dispose(); }
    const cap = BLOBS.length + 32;
    blobMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }), cap);
    blobMesh.userData.cap = cap; blobMesh.count = BLOBS.length;
    blobMesh.renderOrder = 1; blobMesh.frustumCulled = false; blobMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(blobMesh);
  }
  blobMesh.count = BLOBS.length;
  for (let i = 0; i < BLOBS.length; i++) {
    const b = BLOBS[i]; const k = b.visible ? b.r : 0;
    _bs.set(b.scale.x * k, b.scale.z * k, 1); _bm.compose(b.position, _bq, _bs); blobMesh.setMatrixAt(i, _bm);
  }
  blobMesh.instanceMatrix.needsUpdate = true;
}

/* ---------- Collisions : grille de hachage spatiale + zones praticables ---------- */
// Les obstacles sont rangés par cases de HC unités : on ne teste que ceux autour du point.
const HC = 6, HASH = new Map();
const hkey = (ix, iz) => ix * 73856093 ^ iz * 19349663;
function hashAdd(o, minX, maxX, minZ, maxZ) {
  for (let ix = Math.floor(minX / HC); ix <= Math.floor(maxX / HC); ix++) for (let iz = Math.floor(minZ / HC); iz <= Math.floor(maxZ / HC); iz++) {
    const k = hkey(ix, iz); let b = HASH.get(k); if (!b) HASH.set(k, b = []); b.push(o);
  }
  return o;
}
const near = [], seen = new Set();
function nearby(x, z, r) {
  near.length = 0; seen.clear();
  for (let ix = Math.floor((x - r) / HC); ix <= Math.floor((x + r) / HC); ix++) for (let iz = Math.floor((z - r) / HC); iz <= Math.floor((z + r) / HC); iz++) {
    const b = HASH.get(hkey(ix, iz)); if (!b) continue; for (const o of b) if (!o.off && !seen.has(o)) { seen.add(o); near.push(o); }
  }
  return near;
}
/** Listes (lecture seule) gardées pour compatibilité ; ajouter via solidBox / solidCircle / addBox. */
export const circles = [], boxes = [];
/** Rectangle praticable du village (les autres régions ajoutent les leurs). */
export const BOUNDS = { minX: -32, maxX: 32, minZ: -21, maxZ: 22 };
export const WALK = [{ ...BOUNDS, id: 'village' }];
/** Ajoute une zone praticable (région débloquée, chemin, pont…). */
export function addWalk(r, id) { WALK.push({ minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, id }); }
/** h : hauteur de l'obstacle. Seuls les obstacles hauts (h ≥ 1.2) cachent le renard aux PNJ. */
export function addBox(minX, maxX, minZ, maxZ, h = 2) { const o = { box: true, minX, maxX, minZ, maxZ, h }; boxes.push(o); return hashAdd(o, minX, maxX, minZ, maxZ); }
export const solidBox = (cx, cz, w, d, h = 2) => addBox(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, h);
export function solidCircle(x, z, r, h = 2) { const o = { x, z, r, h }; circles.push(o); return hashAdd(o, x - r, x + r, z - r, z + r); }
/** Retire un obstacle (porte qui s'ouvre, tronc dégagé…). */
export const removeObstacle = o => { if (o) o.off = true; };
function clampWalk(p) {
  let best = null, bd = Infinity;
  for (const w of WALK) {
    const cx = Math.max(w.minX, Math.min(p.x, w.maxX)), cz = Math.max(w.minZ, Math.min(p.z, w.maxZ));
    const d = (cx - p.x) ** 2 + (cz - p.z) ** 2; if (d === 0) return; if (d < bd) { bd = d; best = [cx, cz]; }
  }
  if (best) { p.x = best[0]; p.z = best[1]; }
}
export function resolve(p, r) {
  for (const o of nearby(p.x, p.z, r + 3)) {
    if (o.box) {
      const cx = Math.max(o.minX, Math.min(p.x, o.maxX)), cz = Math.max(o.minZ, Math.min(p.z, o.maxZ));
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d < r) {
        if (d > 1e-4) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
        else { const q = [[p.x - o.minX + r, -1, 0], [o.maxX - p.x + r, 1, 0], [p.z - o.minZ + r, 0, -1], [o.maxZ - p.z + r, 0, 1]].sort((a, b) => a[0] - b[0])[0]; p.x += q[1] * q[0]; p.z += q[2] * q[0]; }
      }
    } else { const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = o.r + r; if (d < m && d > 1e-4) { p.x = o.x + dx / d * m; p.z = o.z + dz / d * m; } }
  }
  clampWalk(p);
}
/** Vrai si un disque de rayon r posé en (x, z) touche un obstacle (de hauteur ≥ minH). */
export function blockedAt(x, z, r, minH = 0) {
  for (const o of nearby(x, z, r + 3)) {
    if ((o.h ?? 2) < minH) continue;
    if (o.box) { const cx = Math.max(o.minX, Math.min(x, o.maxX)), cz = Math.max(o.minZ, Math.min(z, o.maxZ)); if (Math.hypot(x - cx, z - cz) < r) return true; }
    else if (Math.hypot(x - o.x, z - o.z) < o.r + r) return true;
  }
  return false;
}
export const flat2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
