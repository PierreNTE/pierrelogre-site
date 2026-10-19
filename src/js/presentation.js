/* =====================================================================
   Présentation du renard : à la toute première visite, quand le jeu est prêt, la caméra descend face au renard,
   qui regarde le visiteur et se présente en trois bulles, puis remonte ; la carte d'accueil revient. 4,8 s en tout.
   - seulement si rien n'est encore gardé dans le navigateur (FIRST_VISIT), jamais avec « réduire les animations » ;
   - un clic, un toucher ou une touche passent à la bulle suivante (après la dernière : fin) ; Échap ou « Jouer » arrêtent tout ;
   - réglée sur l'horloge réelle, à partir de la première image : 4,8 s même sur un appareil lent (des images sautent) ;
   - pendant ce temps, les régions voisines attendent pour se construire (pas d'à-coup) et la vue est raccourcie.
   ===================================================================== */
import * as THREE from 'three';
import { CAM_OFF, RM, cam, camera, isTouch, scene } from './engine.js';
import { fox } from './fox.js';
import { gaitStep } from './foxupdate.js';
import { say } from './hud.js';
import { FIRST_VISIT, S, modalOpen, saved, store, t } from './state.js';

export const DUR = 4.8;
const P = { on: false, t0: 0, said: 0, from: null, fog: null };
/** Pour les tests : la présentation a-t-elle eu lieu, combien d'images, quelles bulles. */
export const presentInfo = { ran: 0, frames: 0, lines: [], near: 99, end: '', dur: DUR, steps: 0 };
const _close = new THREE.Vector3(), _closeLook = new THREE.Vector3(), _far = new THREE.Vector3(), _pos = new THREE.Vector3(), _look = new THREE.Vector3();
const ease = k => (k = Math.max(0, Math.min(1, k)), k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const INPUT = ['pointerdown', 'keydown'];
const STEPS = [.9, 2.3, 3.4, 3.9];   // bulle 1, bulle 2, bulle 3, puis la caméra remonte
let hint = null;
/** Clic, toucher ou touche : la bulle suivante (l'horloge saute à son début). Échap : fin. Après la dernière : fin. */
function onInput(e) {
  if (!P.on) return;
  if (e.type === 'keydown') {
    if (e.key === 'Escape') { endPresentation(e); return; }
    if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key) || e.repeat) return;
  }
  const now = performance.now(), k = P.t0 ? (now - P.t0) / 1000 : 0, to = STEPS.find(x => x > k + .05);
  if (to === undefined) { endPresentation(e); return; }
  P.t0 = (P.t0 || now) - (to - k) * 1000; presentInfo.steps++;
}

export const presenting = () => P.on;
/** Gros plan de trois quarts (la fontaine n'est pas pile derrière sa tête) ; plus proche et plus bas en portrait. */
const view = () => innerWidth < innerHeight ? { side: .9, dist: 4.7, y: 1.4, look: .72 } : { side: 1.5, dist: 4.4, y: 1.5, look: .85 };

/** À la fin du démarrage : le renard se présente si c'est la première visite (renvoie vrai s'il le fait).
 *  force : la rejouer (tests), même si elle a déjà été vue. */
export function maybePresent(force = false) {
  if (P.on || (!force && (!FIRST_VISIT || RM || saved.presented || window.__foxNoCine)) || S.started || window.__foxPending || modalOpen()
    || document.documentElement.classList.contains('og') || document.documentElement.classList.contains('nogame')) return false;
  // Onglet en arrière-plan : on attend que le visiteur le regarde
  if (document.hidden) {
    const later = () => { if (document.hidden) return; document.removeEventListener('visibilitychange', later); maybePresent(); };
    document.addEventListener('visibilitychange', later); return false;
  }
  P.on = true; P.t0 = 0; P.said = 0; S.presenting = true; presentInfo.ran++; presentInfo.frames = 0; presentInfo.lines = []; presentInfo.near = 99; presentInfo.end = ''; presentInfo.steps = 0;   // l'horloge part à la première image dessinée (la première peut être longue à venir)
  P.from = { pos: camera.position.clone(), look: cam.target.clone() };
  P.fog = { near: scene.fog.near, far: scene.fog.far, cam: camera.far };   // rendus à la fin
  const v = view(); fox.yaw = Math.atan2(v.side, v.dist); fox.idle = 0; fox.vel.set(0, 0, 0);   // trois quarts, face à la caméra
  document.documentElement.classList.add('presenting');
  for (const ev of INPUT) addEventListener(ev, onInput, { capture: true, passive: true });
  // Petit mode d'emploi en bas de l'écran : on passe à la suite, on ne saute pas tout par mégarde
  hint = document.createElement('p'); hint.className = 'pres-hint'; hint.textContent = isTouch ? t().presNextTouch : t().presNext;
  (document.getElementById('play') || document.body).append(hint);
  return true;
}

/** Fin (ou présentation passée) : la carte d'accueil revient, la caméra reprend sa flânerie d'où elle est. */
export function endPresentation(e) {
  if (!P.on) return;
  presentInfo.end = e === 'time' ? 'temps' : e && e.type ? e.type : 'jeu';
  P.on = false; S.presenting = false;
  for (const ev of INPUT) removeEventListener(ev, onInput, { capture: true });
  if (hint) { hint.remove(); hint = null; }
  document.documentElement.classList.remove('presenting');
  if (P.fog) { scene.fog.near = P.fog.near; scene.fog.far = P.fog.far; camera.far = P.fog.cam; camera.updateProjectionMatrix(); }
  saved.presented = 1; store.set(saved);   // vue une fois : elle ne revient pas
  fox.head.rotation.z = 0;
}

/** Chaque image pendant la présentation : caméra et renard. Renvoie faux quand elle est finie (caméra normale). */
export function presentFrame(dt, idleTarget) {
  if (!P.on) return false;
  if (!P.t0) P.t0 = performance.now();
  const k = (performance.now() - P.t0) / 1000;
  if (k >= DUR) { cam.target.copy(idleTarget); endPresentation('time'); return false; }
  const v = view(), fx = fox.pos.x, fz = fox.pos.z;
  // Gros plan face au renard, qui se rapproche lentement
  const dolly = Math.min(1, Math.max(0, (k - .9) / 3)) * .4;
  _close.set(fx + v.side * (1 - dolly / v.dist), v.y, fz + v.dist - dolly);
  _closeLook.set(fx + v.side * .12, v.look, fz);
  // Vue habituelle derrière la carte d'accueil
  _far.copy(idleTarget).addScaledVector(CAM_OFF, cam.zoom);
  if (k < .9) { const e = ease(k / .9); _pos.lerpVectors(P.from.pos, _close, e); _look.lerpVectors(P.from.look, _closeLook, e); }
  else if (k < 3.9) { _pos.copy(_close); _look.copy(_closeLook); }
  else { const e = ease((k - 3.9) / .9); _pos.lerpVectors(_close, _far, e); _look.lerpVectors(_closeLook, idleTarget, e); }
  camera.position.copy(_pos); camera.lookAt(_look); cam.target.copy(_look);
  presentInfo.near = Math.min(presentInfo.near, +_pos.distanceTo(fox.group.position).toFixed(1));
  // Caméra presque à l'horizontale : elle verrait tout le monde jusqu'à l'horizon. Brume plus proche et vue raccourcie
  // le temps du gros plan (un téléphone n'a pas à dessiner la forêt et la plage derrière le village)
  const near = k < .9 ? ease(k / .9) : k < 3.9 ? 1 : 1 - ease((k - 3.9) / .9);
  scene.fog.near = P.fog.near + (16 - P.fog.near) * near; scene.fog.far = P.fog.far + (36 - P.fog.far) * near;
  camera.far = P.fog.cam + (40 - P.fog.cam) * near; camera.updateProjectionMatrix();
  // Le renard : il respire, cligne des yeux, regarde la caméra et « parle » (la mâchoire bat sur chaque bulle)
  gaitStep(dt, 0);
  const once = (i, at, fn) => { if (k >= at && !(P.said & 1 << i)) { P.said |= 1 << i; fn(); } };
  presentInfo.frames++;
  const line = (key, dur) => () => { say(fox, t()[key], 'talk', dur, 1.95, 'presentation'); fox.earT = -.1; presentInfo.lines.push(t()[key]); };   // une oreille frémit à chaque bulle
  once(0, .9, line('presHi', 1.35)); once(1, 2.3, line('presMischief', 1.1)); once(2, 3.4, line('presJoin', 1.4));
  once(3, 3.4, () => { fox.wagT = 1.6; fox.hopT = .3; });   // petit bond, la queue frétille
  const talk = [[.9, 1.6], [2.3, 2.9], [3.4, 3.9]].some(([a, b]) => k >= a && k < b);
  if (talk) fox.jaw.rotation.x = Math.abs(Math.sin((k - .9) * 17)) * .32;
  const tilt = k > .6 && k < 2.2 ? .22 : k > 3.4 && k < 4.2 ? -.14 : 0;   // tête penchée, curieuse
  fox.head.rotation.z += (tilt - fox.head.rotation.z) * Math.min(1, dt * 6);
  fox.head.rotation.y += (0 - fox.head.rotation.y) * Math.min(1, dt * 8);   // il regarde le visiteur, pas les passants
  fox.head.rotation.x += ((talk ? -.1 : -.06) - fox.head.rotation.x) * Math.min(1, dt * 6);   // tête à peine relevée vers le visiteur
  return true;
}
