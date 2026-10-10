/* =====================================================================
   Boucle principale, démarrage (libre / défi du jour / reprise), fin de partie
   ===================================================================== */
import * as THREE from 'three';
import { updateAcorns, acorns } from './acorns.js';
import { checkBurrow, destinationFor, dropHeld, grabOrDrop, nearestTarget, openBurrow, startPrint, updateBirds, yap } from './actions.js';
import { MUSIC, ambience, audio, setMusic } from './audio.js';
import { CONFIG, OG, track } from './config.js';
import { pseudoOk } from './leaderboard.js';
import { dailyGoals } from './daily.js';
import { bakeAO, updateBlooms } from './vegetation.js';
import { updateHover } from './hover.js';
import { addRabbit, balloonDebug, updateAmbient } from './ambient.js';
import { HERDS, updateFauna } from './fauna.js';
import { grade, updateDaytime } from './daytime.js';
import { benchFrame, initBench } from './bench.js';
import { updateStory } from './story.js';
import { HOOKS } from './hooks.js';
import { CAM_OFF, RM, SUN_OFF, TX, U, WALK, bake, blobTex, blockedAt, cam, cullBaked, hemi, outlineLOD, camera, canvas, flat2, renderer, resolve, scene, setBuild, setZoom, sun, updateBlobs, world } from './engine.js';
import { fox, prints } from './fox.js';
import { updateFox, updateProps } from './foxupdate.js';
import { PMAX, _o, emit, leafCols, leafMesh, leaves, pMesh, parts } from './fx.js';
import { $, applyLang, autoHint, bubbles, completeGoal, fmt, hintEl, onFinish, onLang, posOf, renderGoals, say, showEndCard, showFact, toScreen, toast, toggleLang, toggleNotebook, updateDestArrow } from './hud.js';
import './input.js';
import { baguette, carrots, eggs, interacts, items, mug, plug, props } from './items.js';
import { drawBirds, gardener, npcs, sales } from './npc.js';
import { NAV, animateNPC, buildNav, canSee, findPath, los, updateNPC } from './npclogic.js';
import { clearRun, freshRun, loadRun, peekRun, saveRun, todayKey } from './persist.js';
import { Q, sampleQuality } from './quality.js';
import { REGIONS, RG, drawCrowds, endCine, ensureBuilt, isActive, openHidden, prebuild, regionAt, restoreRegions, teleport, tick as regionTick, travelTo, unlockRegion } from './regions.js';
import './regions/index.js';
import { ACHIEVEMENTS, checkAch, grant, markDay } from './achievements.js';
import { closeJournal, openJournal } from './journal.js';
import { MG, endMinigameNow, mgCamera, startMinigame, updateMinigame } from './minigame.js';
import { DAY, GOALS, MAIN_IDS, S, endBoot, pick, rnd, run, saved, store, t } from './state.js';
import * as KIT from './regions/kit.js';
import { BURROW, COFFEE, PRINTER, coffeeMachine, leds, printer, updateCable, water } from './world.js';

/* ---------- Anneau de destination (objet porté) ---------- */
const ring = new THREE.Mesh(new THREE.RingGeometry(.82, 1, 40), new THREE.MeshBasicMaterial({ color: '#e8742a', transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 2; scene.add(ring);

const JET_COL = new THREE.Color('#bfe3f0');
const LED = { on: new THREE.Color('#58e07a'), dim: new THREE.Color('#2f8a45'), alarm: new THREE.Color('#ff4433'), off: new THREE.Color('#5a1a14') };
const clock = new THREE.Clock(); let jetAcc = 0, saveAcc = 0, lastClock = '';
const _p = new THREE.Vector3(), lead = new THREE.Vector3(); let lodAcc = 0;
const moodBg = new THREE.Color('#cfe3cf'), moodFog = new THREE.Color('#d3e3c9'), moodSun = new THREE.Color('#ffdcab'), moodSky = new THREE.Color('#fff1d6'), moodGround = new THREE.Color('#7c9a6a'); let lastMood = null, fogDirty = true;
const _gc = new THREE.Color(), SUN_I = sun.intensity, HEMI_I = hemi.intensity, EXPO = renderer.toneMappingExposure;
/** Densité des feuilles qui tombent selon la zone (pas de feuilles sous terre, peu en ville ou à la plage ; flocons en montagne). */
const LEAF_K = { terrier: 0, plage: .2, ile: .15, gare: .35, nantes: .4, paris: .4, moto: .6, sport: .7 };
const SNOW = new THREE.Color('#f3f7fa'), _lc = new THREE.Color();
function respawnLeaf(l, i) {
  const R = regionAt(l), snow = R.id === 'montagne', was = l.snow;
  l.off = Math.random() > (snow ? .8 : LEAF_K[R.id] ?? 1); l.snow = snow;
  if (snow === !!was) return false;
  leafMesh.setColorAt(i, snow ? SNOW : _lc.set(pick(leafCols))); return true;
}

function frame() {
  const dt = Math.min(clock.getDelta(), .05);
  const now = performance.now() / 1000;
  U.uTime.value = now;
  regionTick(dt); updateStory(dt, now);
  updateMinigame(dt, now);
  if (!S.paused) {
    S.time += dt; if (S.started && (!run.tEnd || run.mode === 'libre')) run.elapsed += dt;
    if (!S.mg) updateFox(dt); updateProps(dt);
    for (const n of npcs) if (!n.region || isActive(n.region)) updateNPC(n, dt);
    updateBirds(dt); checkBurrow(); ambience(dt); updateAmbient(dt, now); updateFauna(dt, now); updateBlooms(dt);
    // Le terrier scintille quand on s'en approche, tant qu'il n'est pas trouvé
    if (!run.done.terrier && flat2(fox.pos, BURROW) < 9 && Math.random() < dt * 10) emit(new THREE.Vector3(BURROW.x + rnd(-.6, .6), .7, BURROW.z + rnd(-.2, .3)), pick(['#ffe9a8', '#fff6d6', '#f6d36b']), { n: 1, spd: .25, up: 1.2, life: 1.8, grav: -.6, size: .7 });
    for (const e of eggs) { const d = flat2(fox.pos, e.pos); if (d < e.r && !e.inside) { e.inside = true; say(e, t().eggs[e.key], 'note', 3.4, 0, 'egg'); } else if (d > e.r + 1.2) e.inside = false; }
    updateAcorns(dt, now, i => { S.paused = true; showFact(i, () => { S.paused = false; canvas.focus(); }); });
    if (S.started) { autoHint(); saveAcc += dt; if (saveAcc > 5) { saveAcc = 0; run.foxPos = [+fox.pos.x.toFixed(2), +fox.pos.z.toFixed(2)]; saveRun(); } }
  } else {
    fox.group.position.set(fox.pos.x, fox.lift || 0, fox.pos.z); fox.group.rotation.y = fox.yaw; fox.shadow.position.set(fox.pos.x, .03, fox.pos.z);
    for (const n of npcs) if (!n.region || isActive(n.region)) animateNPC(n, 0);
    if (!S.started) { updateAmbient(dt, now); updateFauna(dt, now); }   // derrière la carte d'accueil, papillons et bêtes vivent déjà
  }
  // Objets
  for (const it of items) {
    if (it.sinking > 0) { it.sinking -= dt * .6; it.pos.y = .6 - (1 - it.sinking) * .5; it.mesh.rotation.z += dt * 2; if (it.sinking <= 0) it.mesh.visible = false; }
    if (it.kind === 'chapeau' && it.worn) { gardener.hatAnchor.getWorldPosition(it.pos); it.mesh.rotation.set(0, gardener.yaw, 0); }
    if (it.inWater && !it.carrier) { it.pos.copy(it.floatPos); it.pos.y = .6 + Math.sin(now * 2.2) * .03; it.mesh.rotation.y += dt * .5; it.mesh.rotation.z = Math.sin(now * 1.7) * .08; }
    if (it.vel) { it.vel.y -= 14 * dt; it.pos.addScaledVector(it.vel, dt); it.mesh.rotation.x += dt * 6; if (it.pos.y <= .03) { it.pos.y = .03; it.vel = null; it.mesh.rotation.set(0, rnd(0, 6), 0); resolve(it.pos, .3); } }
    if (it.kind === 'carotte' && it.planted && !it.held && !it.carrier) it.pos.y = -.12;
    it.mesh.position.copy(it.pos);
    const showSh = !it.gone && it.mesh.visible && !it.inWater && !(it.kind === 'chapeau' && it.worn) && !(it.kind === 'carotte' && it.planted) && !it.carrier && !it.held;
    it.shadow.visible = showSh; if (showSh) { it.shadow.position.set(it.pos.x, .035, it.pos.z); const k = Math.max(.3, 1 - it.pos.y * .35); it.shadow.scale.set(k, k, k); }
  }
  if (plug.held || plug.carrier || !plug._last || !plug._last.equals(plug.pos)) { updateCable(plug.pos.clone()); plug._last = plug.pos.clone(); }
  for (let i = 0; i < 15; i++) leds.setColorAt(i, plug.plugged ? (Math.sin(now * 6 + i * 1.7) > -.6 ? LED.on : LED.dim) : (Math.sin(now * 10) > 0 ? LED.alarm : LED.off));
  leds.instanceColor.needsUpdate = true;
  if (S.coffeeShake > 0) { S.coffeeShake -= dt; if (!RM) { coffeeMachine.position.x = COFFEE.x - .4 + Math.sin(now * 60) * .04 * S.coffeeShake; coffeeMachine.rotation.z = Math.sin(now * 50) * .03 * S.coffeeShake; } }
  if (S.printing > 0) { S.printing -= dt; if (!RM) printer.position.y = Math.abs(Math.sin(now * 40)) * .02; if (Math.random() < dt * 14) emit(new THREE.Vector3(PRINTER.x + .4, 1.1, PRINTER.z), '#ffffff', { n: 1, spd: 2.2, up: 4, life: 1.6, grav: 5, size: 2.2, shape: 1 }); }
  // Eau et jet de la fontaine
  TX.water.offset.x = now * .03; TX.water.offset.y = Math.sin(now * .5) * .05; water.position.y = .53 + Math.sin(now * 2) * .01;
  // jet de la fontaine : seulement quand la place est à l'écran (inutile depuis la plage ou Paris)
  if (Math.abs(cam.target.x + 4) < 40 && Math.abs(cam.target.z) < 40) { jetAcc += dt; while (jetAcc > .045) { jetAcc -= .045; const a = Math.random() * Math.PI * 2; if (parts.length >= PMAX) parts.shift();
    parts.push({ p: new THREE.Vector3(-4, 2.25, 0), v: new THREE.Vector3(Math.cos(a) * .9, 3.2 + Math.random() * .6, Math.sin(a) * .9), t: 1.2, life: 1.2, col: JET_COL, size: .8, grav: 9, shape: 0, rot: 0, water: true }); } }
  // Particules
  let ni = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t -= dt; p.v.y -= p.grav * dt; p.p.addScaledVector(p.v, dt);
    if (p.water && p.v.y < 0 && p.p.y < (Math.hypot(p.p.x + 4, p.p.z) < .65 ? 2.05 : .58)) { parts.splice(i, 1); continue; }
    if (p.p.y < .05) { p.p.y = .05; p.v.multiplyScalar(.4); }
    if (p.shape === 1) { p.v.x *= .97; p.v.z *= .97; p.rot += dt * 4; }
    if (p.t <= 0) { parts.splice(i, 1); continue; }
    const sc = p.size * Math.min(1, p.t / p.life * 3);
    _o.position.copy(p.p); _o.rotation.set(p.rot, p.rot * .7, 0); _o.scale.set(sc * (p.shape ? 1.6 : 1), sc * (p.shape ? .15 : 1), sc * (p.shape ? 2 : 1)); _o.updateMatrix();
    pMesh.setMatrixAt(ni, _o.matrix); pMesh.setColorAt(ni, p.col); ni++;
  }
  pMesh.count = ni; pMesh.instanceMatrix.needsUpdate = true; if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;
  // Feuilles qui tombent (autour de la caméra)
  const cx = cam.target.x || camera.position.x, cz = OG ? camera.position.z - CAM_OFF.z : cam.target.z;
  leafMesh.count = Q.leafCount;
  let leafCol = false;
  for (let i = 0; i < Q.leafCount; i++) {
    const l = leaves[i];
    let spawn = false;
    if (l.y > 0) { l.y -= dt * l.sp * (l.snow ? .55 : 1); l.x += Math.sin(now * 1.3 + l.ph) * dt * .8 + dt * .3; } else { l.rest += dt; if (l.rest > (l.off ? 1.5 : 4)) { l.rest = 0; l.y = rnd(7, 10); l.x = cx + rnd(-20, 20); l.z = cz + rnd(-16, 12); spawn = true; } }
    if (Math.abs(l.x - cx) > 24 || Math.abs(l.z - cz) > 20) { l.x = cx + rnd(-20, 20); l.z = cz + rnd(-16, 12); l.y = rnd(4, 10); spawn = true; }
    if (spawn) leafCol = respawnLeaf(l, i) || leafCol;
    _o.position.set(l.x, Math.max(.045, l.y), l.z); if (l.y > 0) _o.rotation.set(Math.sin(now * 2 + l.ph) * 1.2, now * .8 + l.ph, Math.cos(now * 1.7 + l.ph)); else _o.rotation.set(-Math.PI / 2, 0, l.ph);
    _o.scale.setScalar(l.off ? 0 : l.snow ? .7 : 1); _o.updateMatrix(); leafMesh.setMatrixAt(i, _o.matrix);
  }
  leafMesh.instanceMatrix.needsUpdate = true; if (leafCol) leafMesh.instanceColor.needsUpdate = true;
  for (const p of prints) { if (p.t > 0) { p.t -= dt; p.m.material.opacity = Math.min(.55, p.t * .3); if (p.t <= 0) p.m.visible = false; } }
  // Destination de l'objet porté : anneau au sol + flèche au bord de l'écran
  const dest = !S.paused ? destinationFor(fox.held) : null;
  ring.visible = !!dest;
  if (dest) { const pulse = 1 + Math.sin(now * 5) * .06; ring.position.set(dest.pos.x, .06, dest.pos.z); ring.scale.setScalar(dest.r * pulse); ring.material.opacity = .45 + Math.sin(now * 5) * .15; if (Math.random() < dt * 6) emit(new THREE.Vector3(dest.pos.x + rnd(-1, 1) * dest.r, .3, dest.pos.z + rnd(-1, 1) * dest.r), '#ffd08a', { n: 1, spd: .2, up: 1.4, life: 1, grav: -.3, size: .6 }); }
  // Caméra (en portrait, on regarde un peu plus au sud pour dégager le bas de l'écran)
  if (S.mg) mgCamera();
  else if (!OG) {
    const zPrev = cam.zoom, zT = S.cine ? S.cine.zoom : cam.zoomT; cam.zoom += (zT - cam.zoom) * Math.min(1, dt * (S.cine ? 2.5 : 6));
    const port = innerWidth < innerHeight;
    _p.copy(S.cine ? S.cine.pos : fox.pos); if (port) _p.z += 2.6;
    // Caméra vivante : elle anticipe légèrement la direction de course, et respire à peine quand le renard ne bouge pas
    // Derrière la carte d'accueil : la caméra flâne lentement autour de la place (le village vit déjà)
    if (!S.started && !RM) { _p.x += Math.sin(now * .09) * 4.5 - 2; _p.z += Math.sin(now * .07 + 1) * 3 - 1.5; }
    if (!S.cine && !RM) {
      lead.x += (fox.vel.x * .32 - lead.x) * Math.min(1, dt * 1.5); lead.z += (fox.vel.z * .26 - lead.z) * Math.min(1, dt * 1.5);
      const idleK = Math.min(1, Math.max(0, fox.idle - 3) / 4); _p.x += lead.x + Math.sin(now * .21) * .35 * idleK; _p.z += lead.z + Math.sin(now * .16 + 1) * .25 * idleK;
    }
    if (S.cine) { cam.target.lerp(_p, 1 - Math.pow(.15, dt)); if (performance.now() > S.cine.end) endCine(); }
    else if (RM) cam.target.copy(_p); else cam.target.lerp(_p, 1 - Math.pow(.002, dt));
    camera.position.copy(cam.target).addScaledVector(CAM_OFF, cam.zoom); camera.position.y += (fox.lift || 0) * .8; camera.lookAt(cam.target.x, (fox.lift || 0) * .8, cam.target.z);
    if (Math.abs(cam.zoom - zPrev) > 1e-4 || fogDirty) { fogDirty = false; const md = S.mood || {}; scene.fog.near = (md.near || 40) * cam.zoom; scene.fog.far = (md.far || 75) * cam.zoom; if (!OG) { camera.far = scene.fog.far + 14; camera.updateProjectionMatrix(); } const sc = sun.shadow.camera, k = Math.max(1, cam.zoom); sc.left = -24 * k; sc.right = 24 * k; sc.top = 22 * k; sc.bottom = -22 * k; sc.updateProjectionMatrix(); }
  }
  // Couleurs du ciel et du brouillard selon la région
  if (S.mood && !OG) { const md = S.mood; if (md !== lastMood) { lastMood = md; moodBg.set(md.bg || '#cfe3cf'); moodFog.set(md.fog || '#d3e3c9'); moodSun.set(md.sun || '#ffdcab'); moodSky.set(md.sky || '#fff1d6'); moodGround.set(md.ground || '#7c9a6a'); fogDirty = true; }
    // … teintées par l'heure du jour et la météo (daytime.js)
    updateDaytime(dt, now);
    const kk = S.moodSnap ? 1 : Math.min(1, dt * 1.5); S.moodSnap = false; scene.background.lerp(grade('bg', _gc.copy(moodBg)), kk); scene.fog.color.lerp(grade('fog', _gc.copy(moodFog)), kk);
    sun.color.lerp(grade('sun', _gc.copy(moodSun)), kk); hemi.color.lerp(grade('sky', _gc.copy(moodSky)), kk); hemi.groundColor.lerp(grade('ground', _gc.copy(moodGround)), kk);
    sun.intensity = SUN_I * DAY.sunK * (S.sunPulse || 1); hemi.intensity = HEMI_I * DAY.hemiK; renderer.toneMappingExposure = EXPO * DAY.exposure; }
  drawCrowds(); updateHover(dt, now);
  if ((lodAcc += dt) > .25) { lodAcc = 0; outlineLOD(cam.target, 17 * Math.max(1, cam.zoom)); }
  sun.position.set(cx + SUN_OFF.x, SUN_OFF.y, cz + SUN_OFF.z); sun.target.position.set(cx, 0, cz);
  if (window.__foxCam) window.__foxCam(camera, now);   // outil de contrôle visuel (captures rapprochées des tests) ; jamais défini en jeu
  U.uFox.value.set(fox.pos.x, .6, fox.pos.z); U.uCam.value.copy(camera.position);
  updateBlobs(); drawBirds(); cullBaked();
  renderer.render(scene, camera);
  sampleQuality(); benchFrame();
  if (!window.__foxReady) { window.__foxReady = true; performance.mark('fox:first-frame'); const l = $('#loader'); if (l) l.hidden = true; }
  // Bulles, indice « E », flèche, chrono
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.t -= dt;
    if (b.t <= 0) { b.el.remove(); bubbles.splice(i, 1); continue; }
    const p = posOf(b.target).clone(); p.y += b.yOff;
    const [x, y, vis] = toScreen(p); b.el.style.left = x + 'px'; b.el.style.top = y + 'px'; b.el.style.opacity = vis ? Math.min(1, b.t * 4) : 0;
  }
  const nt = !S.paused && !S.mg && !fox.held ? nearestTarget() : null;
  if (nt) { const p = nt.kind === 'printer' ? new THREE.Vector3(PRINTER.x, 1.9, PRINTER.z) : nt.pos.clone().setY(Math.max(nt.pos.y, 0) + .9); const [x, y] = toScreen(p); hintEl.style.left = x + 'px'; hintEl.style.top = y + 'px'; hintEl.hidden = false; } else hintEl.hidden = true;
  updateDestArrow(dest);
  if (S.started && (!run.tEnd || run.mode === 'libre')) { const ct = fmt(run.elapsed); if (ct !== lastClock) { lastClock = ct; $('#clock').textContent = ct; } }   // texte réécrit seulement s'il change
  requestAnimationFrame(frame);
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
  const port = innerWidth < innerHeight; camera.fov = port ? 52 : 38; CAM_OFF.set(0, port ? 21 : 16.5, port ? 18.5 : 17); camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
camera.position.copy(fox.pos).add(CAM_OFF); cam.target.copy(fox.pos);

/* ---------- Reprise d'une partie : état du monde ---------- */
function restoreWorld() {
  if (run.done.mug) { mug.gone = true; mug.mesh.visible = false; }
  if (run.done.baguette) { baguette.gone = true; baguette.mesh.visible = false; }
  for (const id of run.eatenCarrots) { const c = carrots.find(c => c.id === id); if (c) { c.gone = true; c.mesh.visible = false; } }
  for (const id of run.knockedPots) { const p = props.find(p => p.id === id); if (p && !p.knocked) { p.knocked = true; p.fall = 1; p.axis.set(1, 0, 0); p.g.quaternion.setFromAxisAngle(p.axis, Math.PI / 2); } }
}

/* ---------- Démarrage ---------- */
function start(mode, resume) {
  if (mode === 'defi') {
    const s = peekRun('defi');
    if (s) { loadRun(s); restoreWorld(); } else freshRun('defi', dailyGoals(), todayKey());
  } else {
    const s = resume ? peekRun('libre') : null;
    if (s) { loadRun(s); restoreWorld(); } else freshRun('libre', MAIN_IDS);
  }
  track('Partie lancée', { mode: run.mode, reprise: !!resume });
  if (run.mode === 'libre') {
    restoreRegions();
    if (run.foxPos) { const [x, z] = run.foxPos; const R = regionAt({ x, z }); if (R.always) openHidden(R.id); else ensureBuilt(R); /* reprise dans le terrier : la salle s'ouvre */ S.moodSnap = true; fox.pos.set(x, 0, z); resolve(fox.pos, fox.r); cam.target.copy(fox.pos); camera.position.copy(fox.pos).add(CAM_OFF); }
    markDay();
  }
  $('#intro').hidden = true; S.started = true; S.paused = false; audio(); canvas.focus();
  renderGoals(); saveRun(); checkAch();
  if (!run.done.terrier && run.mode === 'libre' && !run.villageDone) setTimeout(() => toast(t().rumor), 2500);
}
function renderIntro() {
  const s = peekRun('libre');
  const n = s ? Object.keys(s.done).length : 0;
  $('#startBtn').textContent = s ? t().resume(n, GOALS.length) : t().start;
  $('#newBtn').hidden = !s;
  const best = saved.daily[todayKey()];
  $('#dailyBest').textContent = best != null ? t().dailyBest(fmt(best)) : '';
}
onLang(() => { renderIntro(); renderQual(); });
$('#startBtn').addEventListener('click', () => start('libre', !!peekRun('libre')));
$('#newBtn').addEventListener('click', () => { clearRun('libre'); start('libre', false); });
$('#dailyBtn').addEventListener('click', () => start('defi'));
initBench(start);
HOOKS.achCheck = checkAch;
$('#introWho').addEventListener('click', () => { audio(); openBurrow(); });

/* ---------- Fin de partie ---------- */
onFinish(() => {
  run.tEnd = Date.now(); const secs = run.elapsed; let unlocked = [], newBest = false;
  if (run.mode === 'libre') {
    if (saved.best == null || secs < saved.best) { saved.best = secs; newBest = true; }
    const earned = ['fleau']; if (run.caught === 0) earned.push('insaisissable'); if (secs < CONFIG.expressSeconds) earned.push('express'); if (run.alerts === 0) earned.push('ombre');
    unlocked = earned.filter(a => !saved.ach[a]); earned.forEach(a => saved.ach[a] = true);
    run.villageDone = true;
  } else {
    const prev = saved.daily[run.day]; if (prev == null || secs < prev) { saved.daily[run.day] = secs; newBest = true; }
    const days = Object.keys(saved.daily).sort(); while (days.length > 7) delete saved.daily[days.shift()];
  }
  store.set(saved); saveRun(); renderGoals(); $('#clock').textContent = fmt(secs);
  track('Partie terminée', { mode: run.mode, secondes: Math.round(secs) });
  setTimeout(() => { if (MG.active) return; S.paused = true; showEndCard({ secs, unlocked, newBest }); }, 1400);
});
$('#contBtn').addEventListener('click', () => { $('#endCard').hidden = true; S.paused = false; canvas.focus(); checkAch(); });
function replay() { clearRun(run.mode); try { sessionStorage.setItem('fox-autostart', run.mode); } catch (e) { /* facultatif */ } location.reload(); }
$('#replayBtn').addEventListener('click', replay);
$('#endWho').addEventListener('click', openBurrow);

/* ---------- Boutons d'interface ---------- */
if (innerWidth < 640 || innerHeight < 500) toggleNotebook();   // petit écran (ou téléphone à l'horizontale) : carnet replié au départ
$('#muteBtn').addEventListener('click', () => { S.muted = !S.muted; saved.muted = S.muted; store.set(saved); $('#muteBtn').textContent = S.muted ? t().muted : t().sound; $('#muteBtn').setAttribute('aria-pressed', String(S.muted)); });
$('#langBtn').addEventListener('click', toggleLang); $('#langBtn2').addEventListener('click', toggleLang);
function renderMusic() { $('#musicBtn').classList.toggle('off', !MUSIC.on); $('#musicBtn').setAttribute('aria-pressed', String(MUSIC.on)); }
$('#musicBtn').addEventListener('click', () => { audio(); setMusic(!MUSIC.on); renderMusic(); }); renderMusic();
// Qualité graphique : Auto → Haute → Basse (rechargement en gardant la partie)
const renderQual = () => { $('#qualBtn').textContent = t().quality[Q.mode]; };
$('#qualBtn').addEventListener('click', () => {
  saved.quality = { auto: 'high', high: 'low', low: 'auto' }[Q.mode]; store.set(saved);
  if (S.started) { run.foxPos = [+fox.pos.x.toFixed(2), +fox.pos.z.toFixed(2)]; saveRun(); try { sessionStorage.setItem('fox-autostart', run.mode + '-resume'); } catch (e) { /* facultatif */ } }
  location.reload();
});
let resetArmed = false;
$('#resetBtn').addEventListener('click', () => {
  if (!resetArmed) { resetArmed = true; $('#resetBtn').textContent = t().resetSure; setTimeout(() => { resetArmed = false; $('#resetBtn').textContent = t().reset; }, 2500); return; }
  replay();
});

$('#mapBtn').addEventListener('click', () => openJournal('map'));
$('#nbAch').addEventListener('click', e => { if (e.target.closest('#nbMap')) openJournal('map'); });

/* ---------- Initialisation ---------- */
performance.mark('fox:built'); if (window.__foxAudit) window.__foxAudit('world', world); bake(world); bakeAO(world, blobTex); performance.mark('fox:baked');
ensureBuilt(RG.village);
addRabbit({ minX: -31, maxX: -20, minZ: 9, maxZ: 20 }); addRabbit({ minX: -2, maxX: 3, minZ: -20, maxZ: -6 });
buildNav();
// Les régions voisines du village sont construites en tâche de fond (une par image)
prebuild(RG.village.adj);
applyLang();
let autostart = null; try { autostart = sessionStorage.getItem('fox-autostart'); sessionStorage.removeItem('fox-autostart'); } catch (e) { /* facultatif */ }
// Démarrage automatique (après « Rejouer » ou un changement de qualité) : une erreur ici ne doit jamais bloquer la page
try {
  if (autostart === 'libre' || autostart === 'defi') start(autostart, false);
  else if (autostart === 'libre-resume' || autostart === 'defi-resume') start(autostart.split('-')[0], true);
} catch (e) { console.error(e); }
if (OG) {
  // Vue figée pour l'image d'aperçu LinkedIn
  document.documentElement.classList.add('og'); $('#intro').hidden = true;
  fox.pos.set(-.6, 0, 6.2); fox.yaw = -2.5; fox.yapT = 99; fox.jaw.rotation.x = .5; fox.head.rotation.x = -.4;
  gardener.pos.set(1.6, 0, 5.4); gardener.yaw = -1.9; gardener.jump = .25; gardener.act = 'chase';
  sales.pos.set(-7.4, 0, 3.6); sales.yaw = .9;
  camera.fov = 34; camera.updateProjectionMatrix(); camera.position.set(-2.5, 13.5, 15.5); camera.lookAt(-4.5, 0, 2.2);
}
window.__fox = { scene, camera, THREE, pseudoOk,
  renderer, findPath, NAV, los, cam, setZoom, fox, items, npcs, props, acorns, completeGoal, yap, grabOrDrop, dropHeld,
  run, saved, S, Q, startPrint, openBurrow, start, canSee, gardener, sales,
  REGIONS, RG, unlockRegion, fauna: HERDS, DAY, WALK, blockedAt, endMinigameNow, balloonDebug, GOALS, interacts, travelTo, teleport, ensureBuilt, startMinigame, MG, checkAch, grant, ACHIEVEMENTS, openJournal, closeJournal,
  dev: { KIT, setBuild },   // galerie d'objets des contrôles visuels
  screenOf: obj => toScreen(posOf(obj).clone().setY((posOf(obj).y || 0) + 2.6)), get paused() { return S.paused; },
};
endBoot();   // le village est construit : le jeu reprend le hasard ordinaire
frame();
