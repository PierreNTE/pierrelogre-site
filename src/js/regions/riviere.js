/* =====================================================================
   La rivière (au sud du village) : pêcheur, héron, linge qui sèche, barrage du castor.
   S'ouvre après 16 bêtises : le portillon de la clôture sud s'ouvre.
   Le pont vers la plage est cassé : il sera réparé quand la plage s'ouvrira.
   ===================================================================== */
import * as THREE from 'three';
import { giveUp } from '../actions.js';
import { GROUND, TX, flat2 } from '../engine.js';
import { fox } from '../fox.js';
import { RIVER_BED, defineRegion, isOpen, needTotal, totalDone } from '../regions.js';
import { rnd, t } from '../state.js';
import { boat, building, bush, fenceRow, hash, rock, willow } from './kit.js';
import { addDucks } from '../fauna.js';

export const RIVER = { z0: 27.6, z1: 32.4 };
/** Niveau de l'eau (sous la prairie : la rivière coule entre deux berges). */
const WY = -.28;
const B = { minX: -33, maxX: 32, minZ: 22.4, maxZ: 33 };
const DAM = { x: -26, z: 27.2 };
const HERON = { x: -6, z: 28.6 };

defineRegion({
  id: 'riviere', bounds: B,
  veg: [{ biome: 'meadow', density: .9, rect: { minX: -33, maxX: 32, minZ: 22.9, maxZ: 26.4 } }, { biome: 'reedbank', density: 1, rect: { minX: -33, maxX: 32, minZ: 26.4, maxZ: 27.4 }, avoid: [{ minX: 7.5, maxX: 12.5, minZ: 20, maxZ: 34 }, { minX: -6, maxX: -2, minZ: 26, maxZ: 30 }], seed: 4 }], navBounds: { minX: -33, maxX: 32, minZ: 22.4, maxZ: 28 }, mapColor: '#9cc7d9',
  walk: [{ minX: 8.8, maxX: 11.2, minZ: 21, maxZ: 23.8 }, { minX: -32, maxX: 31.5, minZ: 23.2, maxZ: 27.4 }],
  adj: ['plage'], unlock: () => totalDone() >= 16, need: needTotal(16),
  spawn: new THREE.Vector3(10, 0, 25), spawnYaw: 0, gatePos: new THREE.Vector3(10, 0, 23.5),
  mood: { bg: '#cde2dc', fog: '#c8ddd6', near: 36, far: 80, sun: '#ffe8c0', sky: '#f0f8ea', ground: '#6f9a7a', music: 'riviere' },
  goals: [{ id: 'poisson' }, { id: 'heron' }, { id: 'chaussette' }, { id: 'castor', need: 3 }, { id: 'canetons' }, { id: 'bouteille', secret: true }, { id: 'ricochet', secret: true }],
  i18n: {
    fr: {
      goals: { canetons: "Se faire suivre par les canetons", poisson: "Voler le poisson du pêcheur", heron: "Faire s'envoler le héron", chaussette: "Envoyer une chaussette de l'étendoir à la rivière", castor: "Rapporter 3 bâtons au barrage du castor",
        bouteille: "Jeter une bouteille à la mer (enfin, à la rivière)", ricochet: "Faire des ricochets" },
      hints: { canetons: "La cane et ses petits nagent près de la rive. Approche-toi en te faufilant (C), sans bruit… puis promène-les.", poisson: "Le seau du pêcheur est posé à côté de lui, sur la berge.", heron: "Le héron guette dans l'eau, au milieu. Un glapissement suffit.", chaussette: "L'étendoir est près de la maisonnette, à l'est. Lâche la chaussette au bord de l'eau.",
        castor: "Des bâtons traînent sur la berge. Le barrage est à l'ouest." },
      L: { pecheur: { chase: ["Mon poisson !", "Reviens, sale bête !"], idle: ["Ça mord pas aujourd'hui.", "Chut… ça bouge !", "Une truite, au moins ?"] },
        lavandiere: { chase: ["Ma chaussette !", "Rends-moi ça !"], idle: ["Ça sèche bien aujourd'hui.", "Encore une chaussette orpheline…", "Belle journée pour la lessive."] } },
      search: { poisson: "Mon poisson a disparu…", chaussette: "Il manque une chaussette…" },
      dest: { riviere: "Rivière", barrage: "Barrage" },
      eggs: { bridge: "Le pont est cassé. Panneau : « Travaux : réouverture prochaine. »", dam: "Le castor travaille dur. Il lui manque des bâtons.", stone: "Un galet bien plat. Parfait pour les ricochets…" },
      signs: { riviere: "Rivière ↓", plage: "Plage →" },
      cards: { riviere: "Bons baisers de la rivière ! Le héron a déménagé, le pêcheur a fini aux sardines en boîte, et le castor dit merci." },
      ricochet: "Plic… plic… plic… plouf !", bottle: "La bouteille s'en va doucement vers l'océan…", sockAway: "La chaussette part en vacances.", castorThanks: "Le castor tape de la queue : merci !",
    },
    en: {
      goals: { canetons: "Get the ducklings to follow you", poisson: "Steal the angler's fish", heron: "Make the heron fly away", chaussette: "Send a sock from the washing line into the river", castor: "Bring 3 sticks to the beaver's dam",
        bouteille: "Throw a message in a bottle (into the river)", ricochet: "Skip stones" },
      hints: { canetons: "The duck and her ducklings swim near the bank. Sneak up (C), quietly… then take them for a walk.", poisson: "The angler's bucket sits beside him on the bank.", heron: "The heron stands in the water, mid-river. One yap will do.", chaussette: "The washing line is by the little cottage to the east. Drop the sock at the water's edge.",
        castor: "Sticks lie around on the bank. The dam is to the west." },
      L: { pecheur: { chase: ["My fish!", "Come back, you pest!"], idle: ["Nothing's biting today.", "Shh… something moved!", "A trout, at least?"] },
        lavandiere: { chase: ["My sock!", "Give that back!"], idle: ["Things dry nicely today.", "Another lonely sock…", "Lovely day for laundry."] } },
      search: { poisson: "My fish is gone…", chaussette: "A sock is missing…" },
      dest: { riviere: "River", barrage: "Dam" },
      eggs: { bridge: "The bridge is broken. Sign: \"Works in progress: reopening soon.\"", dam: "The beaver works hard. It needs more sticks.", stone: "A nice flat pebble. Perfect for skipping…" },
      signs: { riviere: "River ↓", plage: "Beach →" },
      cards: { riviere: "Greetings from the river! The heron moved out, the angler ended up with tinned sardines, and the beaver says thanks." },
      ricochet: "Plip… plip… plip… splash!", bottle: "The bottle drifts slowly towards the ocean…", sockAway: "The sock is off on holiday.", castorThanks: "The beaver slaps its tail: thanks!",
    },
  },
  build(W) {
    const { box, cyl, sph, cone, solidCircle } = W;
    // Berge, clôture sud du village avec portillon
    W.patch(68, 6, '#a9c98a', 0, 25.2, { round: .2, jitter: .5 });
    const fx = [-32, 8.8], fx2 = [11.2, 32];
    fenceRow(fx[0], 22.7, fx[1], 22.7, '#c9a77a', false); fenceRow(fx2[0], 22.7, fx2[1], 22.7, '#c9a77a', false);
    W.ground(2.4, 4, W.TM(TX.dirt, 1, 2), 10, 24.4, .02);
    // Rivière (eau animée) + rives
    const wmat = new THREE.MeshLambertMaterial({ color: '#ffffff', map: TX.water.clone(), transparent: true, opacity: .9 }); wmat.map.repeat.set(30, 2); wmat.map.needsUpdate = true;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_BED.maxX - RIVER_BED.minX, RIVER_BED.maxZ - RIVER_BED.minZ), wmat); water.rotation.x = -Math.PI / 2; water.position.set((RIVER_BED.minX + RIVER_BED.maxX) / 2, WY, (RIVER_BED.minZ + RIVER_BED.maxZ) / 2); W.dyn(water, false);
    // Lit de la rivière : berges en pente (terre, puis vase), fond sombre, sous le niveau de la prairie
    {
      const Z0 = RIVER_BED.minZ, Z1 = RIVER_BED.maxZ, prof = [[-.3, -.005, '#8f7b55'], [.05, -.06, '#8f7b55'], [.45, -.3, '#7d6a4a'], [.85, -.52, '#5f5a48'], [1.3, -.64, '#4f5446']];
      const cols = [...prof.map(([d, y, c]) => [Z0 + d, y, c, d > 0 && d < 1 ? 1 : 0]), ...prof.slice().reverse().map(([d, y, c]) => [Z1 - d, y, c, d > 0 && d < 1 ? -1 : 0])];
      const pos = [], col = [], idx = [], C = cols.length, cc = new THREE.Color(); let n = 0;
      for (let x = RIVER_BED.minX - 1, i = 0; x <= RIVER_BED.maxX + 1; x += 2, i++) {
        cols.forEach(([z, y, c, jit], j) => { const jz = jit ? jit * (hash(i * 7 + j) - .5) * .3 : 0; pos.push(x, y + (jit ? (hash(i * 3 + j) - .5) * .06 : 0), z + jz); cc.set(c); const l = (hash(i * 11 + j) - .5) * .05; col.push(cc.r + l, cc.g + l, cc.b + l, 1); });
        if (i) for (let j = 0; j < C - 1; j++) { const a = (n - 1) * C + j, b2 = n * C + j; idx.push(a, a + 1, b2, a + 1, b2 + 1, b2); }
        n++;
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); geo.setIndex(idx); geo.computeVertexNormals();
      const bed = new THREE.Mesh(geo, GROUND); bed.receiveShadow = true; W.R.group.add(bed);
      // Pierres à fleur d'eau, roseaux et massettes au pied des berges
      for (let x = -32; x < 31; x += 1.3) {
        if (Math.abs(x - 10) < 2.2 || Math.abs(x + 4) < 1.6) continue;
        for (const side of [1, -1]) {
          const zb = side > 0 ? Z0 + .5 : Z1 - .5, hh = hash(x * 3.1 + side);
          if (hh < .32) { const st = sph(.14 + hash(x + side * 5) * .16, ['#9a958c', '#a59d8e', '#8d877c'][(hh * 9 | 0) % 3], x + rnd(-.3, .3), WY + .02, zb + side * rnd(-.1, .15), undefined, 0, hh < .12); st.scale.set(1.3, .5, 1); }
          else if (hh < .62) for (let k = 0; k < 5; k++) { const r = cone(.03, rnd(.8, 1.3), ['#7f9f52', '#8fae5c', '#6f8f48'][k % 3], x + rnd(-.25, .25), WY + .5, zb + side * rnd(.05, .3), 3, undefined, false); r.rotation.set(rnd(-.15, .15), 0, rnd(-.2, .2)); if (k === 2) cyl(.05, .05, .22, '#6b4a2a', r.position.x, WY + 1, r.position.z, 5, undefined, false); }
        }
      }
    }
    // Pont cassé : piles (elles serviront au pont réparé) ; planches tombées à l'eau et panneau (disparaissent à la réparation)
    [[8.7, 27.6], [11.3, 27.6], [8.7, 32.4], [11.3, 32.4]].forEach(([x, z]) => { cyl(.2, .26, 1.6, '#8a5a3b', x, .3, z, 6); cyl(.22, .22, .06, '#c9a074', x, 1.1, z, 6, undefined, false); solidCircle(x, z, .25, 1); });
    [[8.2, 27.1], [11.8, 27.1], [8.2, 32.9], [11.8, 32.9]].forEach(([x, z]) => { box(.9, .4, .9, '#b5ad9e', x, .1, z); });
    const brokenSign = new THREE.Group(); cyl(.06, .06, 1.2, '#7a5236', 0, .6, 0, 5, brokenSign); box(1, .5, .06, '#f6d36b', 0, 1.15, 0, brokenSign); box(1, .1, .07, '#d6402f', 0, 1.15, 0, brokenSign, false);
    { const p1 = box(2.6, .14, 1.1, '#a8764a', 0, .02, 1.25, brokenSign); p1.rotation.x = .35; const p2 = box(2.4, .14, .9, '#9a6b42', .2, -.1, 4.6, brokenSign); p2.rotation.set(-.4, 0, .12); }
    brokenSign.position.set(10, 0, 27.2); W.dyn(brokenSign); W.R.brokenSign = brokenSign;
    if (isOpen('plage')) brokenSign.userData.gone = true;   // déjà réparé (partie reprise)
    W.R.bridgeEgg = W.egg('bridge', 10, 26.3, 2.2, 1.4); if (isOpen('plage')) W.R.bridgeEgg.r = 0;
    W.sign(13.6, 23.8, 'plage', 0, 2); W.sign(7, 22.2, 'riviere', 0, 1.8);
    // Pêcheur + seau
    const pech = W.npc({ id: 'pecheur', x: -14, z: 26.6, yaw: 0, shirt: '#6f8a5a', pants: '#4a6d9a', hair: '#d9d4c8', tool: () => { const g = new THREE.Group(); cyl(.02, .03, 2.6, '#8a5a3b', 0, 1.1, .6, 4, g).rotation.x = .9; return g; },
      route: [{ p: new THREE.Vector3(-14, 0, 26.6), wait: 7, act: 'rod', yaw: 0 }, { p: new THREE.Vector3(-16.5, 0, 25.4), wait: 2, act: 'look', yaw: 0 }] });
    cyl(.28, .22, .45, '#9aa7b3', -12.6, .22, 26, 8);
    const fish = W.item({ kind: 'poisson', x: -12.6, z: 26, y: .5, owner: pech, sh: .3, bring: new THREE.Vector3(-12.6, 0, 25.4),
      build: () => { const g = new THREE.Group(); const b = sph(.2, '#9fb7c9', 0, 0, 0, g, 1); b.scale.set(.5, .7, 1.6); cone(.16, .22, '#8aa3b5', 0, 0, -.38, 4, g, false).rotation.x = -Math.PI / 2; return g; } });
    fish.onGrab = () => W.complete('poisson');
    // Héron
    const heron = W.dyn((() => { const g = new THREE.Group(); const b = sph(.3, '#c9cdd3', 0, 1.3, 0, g, 1); b.scale.set(.7, .8, 1.4); cyl(.05, .07, .8, '#c9cdd3', 0, 1.8, .3, 5, g).rotation.x = .3; sph(.12, '#e9e6df', 0, 2.2, .42, g, 1); cone(.04, .4, '#e8a12a', 0, 2.2, .7, 4, g, false).rotation.x = Math.PI / 2;
      [-.08, .08].forEach(x => cyl(.02, .02, 1.1, '#e8a12a', x, .55, 0, 4, g, false)); return g; })());
    heron.position.set(HERON.x, WY - .02, HERON.z);
    let heronFly = W.done('heron') ? 99 : -1;
    W.yap(new THREE.Vector3(HERON.x, 0, HERON.z - 1.5), 5, () => { if (heronFly >= 0) return; heronFly = 0; W.SFX.flutter(); W.complete('heron'); });
    // Maisonnette + étendoir + lavandière
    building(25, 24.6, 4.4, 3, 2.3, '#f4efe4', '#c8643c', { rot: 0, shutter: '#6f9a6a', chimney: -1 });
    [[18.5, 25.6], [22.5, 25.6]].forEach(([x, z]) => { cyl(.05, .05, 1.8, '#8a5a3b', x, .9, z, 4); solidCircle(x, z, .1, 1); });
    box(4, .02, .02, '#f6f2e8', 20.5, 1.75, 25.6, undefined, false);
    [['#d6402f', 19.2], ['#2563c9', 20.1], ['#f6d36b', 21.6]].forEach(([c, x]) => box(.5, .6, .04, c, x, 1.42, 25.6, undefined, false));
    const lav = W.npc({ id: 'lavandiere', x: 21, z: 24.4, yaw: 0, shirt: '#b9a5e8', pants: '#5a5048', hair: '#a8764a',
      route: [{ p: new THREE.Vector3(21, 0, 24.4), wait: 4, act: 'arrange', yaw: 0 }, { p: new THREE.Vector3(26.5, 0, 23.6), wait: 3, act: 'sweep', yaw: Math.PI }] });
    const sock = W.item({ kind: 'chaussette', x: 20.8, z: 25.6, y: 1.1, owner: lav, sh: .25, bring: new THREE.Vector3(20.8, 0, 24.8),
      build: () => { const g = new THREE.Group(); box(.16, .4, .1, '#e8742a', 0, 0, 0, g); box(.16, .1, .26, '#e8742a', 0, -.2, .08, g, false); box(.17, .08, .11, '#f6f2e8', 0, .18, 0, g, false); return g; } });
    // Barrage du castor + bâtons
    for (let i = 0; i < 9; i++) { const l = cyl(.08, .08, 1.6, '#7a5236', DAM.x + rnd(-1.2, 1.2), .25 + (i % 3) * .14, DAM.z + rnd(-.3, .3), 5); l.rotation.set(rnd(-.3, .3), rnd(0, 3), Math.PI / 2); }
    const beaver = W.dyn((() => { const g = new THREE.Group(); const b = sph(.32, '#8a5a3b', 0, .3, 0, g, 1); b.scale.set(.9, .8, 1.3); sph(.2, '#8a5a3b', 0, .45, .38, g, 1); box(.08, .06, .03, '#f6efe0', 0, .38, .56, g, false); const tl = box(.3, .06, .5, '#5a3b2a', 0, .1, -.55, g); tl.rotation.x = .2; return g; })());
    beaver.position.set(DAM.x + 1.6, 0, DAM.z - 1.1);
    W.egg('dam', DAM.x, DAM.z - 1.6, 2, 1.6);
    const sticks = [[-30, 24.4], [-2, 24.2], [28.5, 26.6], [-20, 23.8]].map(([x, z], i) => W.item({ kind: 'baton', id: 'baton' + i, x, z, y: .05, sh: .3,
      build: () => { const g = new THREE.Group(); cyl(.05, .06, .9, '#8a5a3b', 0, 0, 0, 5, g).rotation.z = Math.PI / 2; return g; } }));
    // Bouteille (cachée dans les roseaux), galet à ricochets
    const bottle = W.item({ kind: 'bouteille', x: 30.4, z: 27, y: .05, sh: .2, build: () => { const g = new THREE.Group(); const b = cyl(.08, .08, .34, '#7fb7a2', 0, 0, 0, 7, g); b.rotation.z = Math.PI / 2; cyl(.03, .04, .12, '#7fb7a2', .22, 0, 0, 5, g, false).rotation.z = Math.PI / 2; box(.12, .1, .02, '#f6efe0', 0, .03, 0, g, false); return g; } });
    for (let i = 0; i < 6; i++) cyl(.03, .03, 1.1, '#6b8f3a', 30 + rnd(-1, 1.2), .55, 26.8 + rnd(-.3, .4), 4);
    rock(2.4, 26.4, .45, '#b5ad9e', false); W.egg('stone', 2.4, 26, 1.6, 1.2);
    W.yap(new THREE.Vector3(2.4, 0, 26.4), 1.8, () => { W.say({ anchor: new THREE.Vector3(4, 1.6, 29.5) }, t().ricochet, 'note', 2, 0, 'rico'); W.SFX.splashSmall(); [0, .3, .6].forEach((d, i) => setTimeout(() => W.emit(new THREE.Vector3(4 + i * 1.6, .2, 29 + i * .4), '#bfe3f0', { n: 6, spd: 1, up: 2 }), d * 1000)); W.complete('ricochet'); });
    [[-24, 23.6, .7], [16, 26.8, .6], [-30, 26.6, .8]].forEach(([x, z, s]) => rock(x, z, s));
    [[-8, 23.8], [4, 23.6], [-28, 23.9], [30, 23.7]].forEach(([x, z]) => bush(x, z, .8));
    // Objets lâchés au bord de l'eau
    const floats = [];
    const sendFloat = (it, keep) => { floats.push({ it, keep }); it.gone = true; it.held = false; W.SFX.splashSmall(); giveUp(it); };
    W.place(it => {
      const inWater = it.pos.z > RIVER.z0 - .7 && it.pos.x > -33 && it.pos.x < 32 && Math.abs(it.pos.x - 10) > 1.6;
      if (it.kind === 'baton' && flat2(it.pos, DAM) < 2.2) { it.gone = true; it.mesh.visible = false; W.progress('castor', it.id); W.say({ anchor: new THREE.Vector3(DAM.x + 1.6, 1.4, DAM.z - 1.1) }, t().castorThanks, 'note', 1.6, 0, 'castor'); beaver.userData.happy = 1.5; return true; }
      if (!inWater) return false;
      if (it.kind === 'chaussette') { sendFloat(it, true); W.say({ anchor: new THREE.Vector3(it.pos.x, 1.6, RIVER.z0 + .6) }, t().sockAway, 'note', 1.8, 0, 'sock'); W.complete('chaussette'); return true; }
      if (it.kind === 'bouteille') { sendFloat(it, true); W.say({ anchor: new THREE.Vector3(it.pos.x, 1.6, RIVER.z0 + .6) }, t().bottle, 'note', 2.4, 0, 'bottle'); W.complete('bouteille'); return true; }
      // Tout autre objet part au fil de l'eau… puis réapparaît à sa place (le courant le ramène)
      sendFloat(it, false); return true;
    });
    W.dest(it => it.kind === 'baton' && !W.done('castor') ? { key: 'barrage', pos: new THREE.Vector3(DAM.x, 0, DAM.z - 1.2), r: 1.2 }
      : (it.kind === 'chaussette' && !W.done('chaussette')) || (it.kind === 'bouteille' && !W.done('bouteille')) ? { key: 'riviere', pos: new THREE.Vector3(fox.pos.x, 0, RIVER.z0), r: 1 } : null);
    // Portillon de la clôture
    const gate = new THREE.Group(); const leaf = new THREE.Group(); leaf.position.x = -1.2; gate.add(leaf);
    for (let i = 0; i < 4; i++) box(.1, .8, .1, '#c9a77a', .3 + i * .6, .4, 0, leaf); [.3, .6].forEach(y => box(2.3, .08, .06, '#d8b88a', 1.2, y, 0, leaf, false));
    gate.position.set(10, 0, 22.7); W.dyn(gate); gate.userData.gate = true;
    W.R.gates = [show => { if (!show) { leaf.rotation.y = -1.7; return; } let k = 0; const step = () => { k = Math.min(1, k + .04); leaf.rotation.y = -1.7 * (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); }; setTimeout(step, 600); }];
    W.update(dt => {
      const now = performance.now() / 1000;
      wmat.map.offset.x = now * .05; wmat.map.offset.y = Math.sin(now * .4) * .04;
      if (heronFly >= 0 && heronFly < 99) { heronFly += dt; heron.position.set(HERON.x + heronFly * 4, WY + Math.min(12, heronFly * heronFly * 2), HERON.z + heronFly * 2); heron.rotation.y = 1.1; if (heronFly > 6) { heronFly = 99; heron.visible = false; heron.userData.gone = true; } }
      else if (heronFly < 0) heron.rotation.y = Math.sin(now * .3) * .6;
      for (let i = floats.length - 1; i >= 0; i--) {
        const { it, keep } = floats[i]; it.pos.x += dt * 1.4; it.pos.z = RIVER.z0 + 1.6 + Math.sin(now + i) * .3; it.pos.y = WY + .1 + Math.sin(now * 2 + i) * .04; it.mesh.rotation.y += dt;
        if (it.pos.x > 40) { floats.splice(i, 1); if (keep) it.mesh.visible = false; else { it.gone = false; it.pos.copy(it.home); it.noticed = false; it.missAt = null; it.mesh.rotation.set(0, 0, 0); if (it.kind === 'carotte') it.planted = true; if (it.kind === 'chapeau') it.pos.y = .03; } }
      }
      if (beaver.userData.happy > 0) { beaver.userData.happy -= dt; beaver.position.y = Math.abs(Math.sin(now * 10)) * .2; } else beaver.position.y = 0;
      beaver.rotation.y = Math.sin(now * .7) * .5;
    });
    // Canards : une famille qui suit la meneuse (elle file vers l'autre rive quand le renard approche)
    addDucks(-30, -9, 28.3, 31.7, WY + .02, 5, { bank: 27.15, wet: 27.88, onImprint: () => W.complete('canetons') });
    // Bord de l'eau : saules, nénuphars, barque amarrée et petit ponton
    willow(-19, 23.9, .8); willow(5, 24, .75); willow(-31, 24.3, .7);
    for (let i = 0; i < 16; i++) { const x = -30 + i * 4 + rnd(-1, 1); if (Math.abs(x - 10) < 3) continue; const lz = RIVER.z0 + rnd(.6, 4); W.disc(.45, '#5f9b4a', x, lz, WY + .025); if (i % 3 === 0) W.sph(.1, '#f2b8c6', x + .15, WY + .07, lz + .1, undefined, 0, false); }
    W.ground(2, 2.2, '#a8764a', -4, 28.2, .09); [-4.9, -3.1].forEach(x => W.cyl(.08, .08, 1.3, '#7a5236', x, .25, 29.1, 5)); boat(-4, 31.2, Math.PI / 2, '#5d8fb0', false).position.y = WY - .12;

    return {
      restore() {
        if (W.done('heron')) { heronFly = 99; heron.visible = false; heron.userData.gone = true; }
        if (W.done('poisson')) { fish.gone = true; fish.mesh.visible = false; }
        if (W.done('chaussette')) { sock.gone = true; sock.mesh.visible = false; }
        if (W.done('bouteille')) { bottle.gone = true; bottle.mesh.visible = false; }
        for (const s of sticks) if (W.run.progress.castor?.has(s.id) || W.done('castor')) { s.gone = true; s.mesh.visible = false; }
      },
    };
  },
});
