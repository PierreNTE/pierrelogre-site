/* =====================================================================
   La forêt (au nord du village) : bûcheron, étang, hibou, grotte à écho, randonneurs,
   chevreuil, champignons. S'ouvre après 4 bêtises : un tronc tombé barre le chemin.
   ===================================================================== */
import * as THREE from 'three';
import { giveUp } from '../actions.js';
import { blob, flat2 } from '../engine.js';
import { fox } from '../fox.js';
import { defineRegion, needTotal, totalDone } from '../regions.js';
import { DAY, pick, rnd, t } from '../state.js';
import { addFrog, addHedgehog, addRabbit } from '../ambient.js';
import { addSquirrels } from '../fauna.js';
import { birch, building, bush, deadTree, fenceRow, hash, lantern, log, mound, pine, rock, rockCluster, scatter, stump, treeLine, woodpile } from './kit.js';

const B = { minX: -42, maxX: 32, minZ: -80, maxZ: -24 };
const POND = { x: -27, z: -52, r: 5.2 };
const LOG = { x: -31, z: -33 };          // tronc creux (cachette)
const CAMP = { x: 9, z: -42 };
const PICNIC = { x: -2, z: -62 };
const OWL = { x: 18, z: -66 };
const CAVE = { x: -36, z: -73 };
const SQ = [[2, -37], [3, -64], [-12, -35]];   // chênes des écureuils

defineRegion({
  id: 'foret', bounds: B, mapColor: '#8fb878',
  veg: { biome: 'forest', density: 1.1, rect: { minX: -44, maxX: 34, minZ: -82, maxZ: -24 }, avoid: [{ x: POND.x, z: POND.z, r: POND.r + .6 }, { x: CAMP.x, z: CAMP.z, r: 3.2 }, { x: PICNIC.x, z: PICNIC.z, r: 1.8 }] },
  walk: [{ minX: -20.6, maxX: -16.4, minZ: -26, maxZ: -20 }, B],
  adj: ['montagne'], unlock: () => totalDone() >= 4, need: needTotal(4),
  spawn: new THREE.Vector3(-18.5, 0, -28), spawnYaw: Math.PI, gatePos: new THREE.Vector3(-18.5, 0, -23),
  mood: { bg: '#b2ccaa', fog: '#a8c39f', near: 24, far: 60, sun: '#ffe6b4', sky: '#e9f0d2', ground: '#5d7d48', music: 'foret' },
  goals: [
    { id: 'champignons', need: 5 }, { id: 'hache' }, { id: 'buches', need: 3 }, { id: 'hibou' }, { id: 'echo' },
    { id: 'sandwich' }, { id: 'chevreuil' }, { id: 'canards' }, { id: 'ecureuil', need: 3 },
    { id: 'photoForet', secret: true }, { id: 'chene', secret: true },
  ],
  i18n: {
    fr: {
      goals: { ecureuil: "Faire grimper les trois écureuils aux arbres", champignons: "Cueillir 5 champignons", hache: "Jeter la hache du bûcheron dans l'étang", buches: "Faire rouler les bûches du bûcheron", hibou: "Réveiller le hibou en plein jour",
        echo: "Glapir au fond de la grotte", sandwich: "Cacher le sandwich des randonneurs dans le tronc creux", chevreuil: "Approcher le chevreuil sans l'effrayer", canards: "Faire s'envoler les canards de l'étang",
        photoForet: "Poser (immobile) devant l'appareil du photographe caché", chene: "Se faufiler dans le vieux chêne creux" },
      hints: { ecureuil: "Ils gambadent au pied de trois chênes isolés (près du camp, du pique-nique et de l'entrée). Approche-toi franchement.", champignons: "Ils poussent au pied des arbres, un peu partout dans la forêt.", hache: "La hache est posée près du billot. L'étang est à l'ouest.", buches: "Le tas de bûches du camp… à pleine vitesse (Maj).",
        hibou: "Le grand arbre à l'est, tout au fond. Un hibou, ça dort le jour. Un glapissement, ça réveille.", echo: "La grotte s'ouvre au nord-ouest, derrière les rochers.",
        sandwich: "Le pique-nique est au nord. Le tronc creux est près de l'entrée de la forêt, à l'ouest.", chevreuil: "Il broute à l'est. Approche-toi en te faufilant (C), sans courir.", canards: "Ils barbotent sur l'étang. Un glapissement près de la rive…" },
      L: { bucheron: { chase: ["Ma hache !", "Reviens, petit voleur !", "Pas la hache !"], idle: ["Un, deux… HAN !", "Belle bille de chêne.", "Encore un renard dans mes pattes…", "Faudrait pas que le tas de bûches roule."] },
        rando: { chase: ["Notre sandwich !", "Au voleur de pique-nique !"], idle: ["On a fait 12 km !", "Tu as la carte ?", "C'est par où, la montagne ?", "Joli coin pour pique-niquer."] } },
      search: { hache: "J'avais posé ma hache ici…", sandwich: "Il est où, le sandwich ?" },
      dest: { etang: "Étang", tronc: "Tronc creux" },
      eggs: { trunkSign: "« Forêt domaniale : attention, renard très actif. »", carvings: "Gravé dans l'écorce : « P + 🦊 ». Mystère.", camp: "Le billot du bûcheron. Il y a des encoches partout." },
      signs: { foret: "Forêt →", montagne: "↑ Montagne" },
      cards: { foret: "Bons baisers de la forêt ! Le hibou ne dort plus, le bûcheron cherche sa hache et les canards ont déménagé. Tout va bien." },
      owlHoot: "Hou-hou ?! HOU !", echo: ["Yap…", "…ap…", "…p…"], deerFlee: "Le chevreuil détale.", owlSleep: "zzz…", photoFlash: "Clic ! « La photo de l'année ! »",
      chene: "Le vieux chêne craque doucement. On dirait qu'il rit.",
    },
    en: {
      goals: { ecureuil: "Send all three squirrels up the trees", champignons: "Pick 5 mushrooms", hache: "Throw the lumberjack's axe into the pond", buches: "Send the lumberjack's logs rolling", hibou: "Wake the owl in broad daylight",
        echo: "Yap at the back of the cave", sandwich: "Hide the hikers' sandwich in the hollow log", chevreuil: "Get close to the deer without scaring it", canards: "Make the ducks fly off the pond",
        photoForet: "Pose (stay still) in front of the hidden photographer", chene: "Sneak into the hollow old oak" },
      hints: { ecureuil: "They scamper around three lone oaks (near the camp, the picnic and the entrance). Walk right up to them.", champignons: "They grow at the foot of trees all over the forest.", hache: "The axe lies by the chopping block. The pond is to the west.", buches: "The camp's log pile… at full speed (Shift).",
        hibou: "The big tree far to the east. Owls sleep by day. Yaps wake them up.", echo: "The cave opens to the north-west, behind the rocks.",
        sandwich: "The picnic is to the north. The hollow log is near the forest entrance, to the west.", chevreuil: "It grazes to the east. Sneak up (C), don't run.", canards: "They paddle on the pond. A yap near the shore…" },
      L: { bucheron: { chase: ["My axe!", "Come back, you little thief!", "Not the axe!"], idle: ["One, two… HUP!", "Nice bit of oak.", "Another fox under my feet…", "Hope that log pile doesn't roll."] },
        rando: { chase: ["Our sandwich!", "Picnic thief!"], idle: ["That's 12 km done!", "Do you have the map?", "Which way to the mountain?", "Lovely picnic spot."] } },
      search: { hache: "I left my axe right here…", sandwich: "Where's the sandwich?" },
      dest: { etang: "Pond", tronc: "Hollow log" },
      eggs: { trunkSign: "\"State forest: beware, very active fox.\"", carvings: "Carved in the bark: \"P + 🦊\". A mystery.", camp: "The lumberjack's chopping block. Notches everywhere." },
      signs: { foret: "Forest →", montagne: "↑ Mountain" },
      cards: { foret: "Greetings from the forest! The owl is awake, the lumberjack is looking for his axe and the ducks have moved out. All good." },
      owlHoot: "Hoo-hoo?! HOO!", echo: ["Yap…", "…ap…", "…p…"], deerFlee: "The deer bolts.", owlSleep: "zzz…", photoFlash: "Click! \"Photo of the year!\"",
      chene: "The old oak creaks softly. It almost sounds like laughter.",
    },
  },
  build(W) {
    const { box, cyl, sph, cone, solidCircle, solidBox } = W;
    // Sol : mousse plus sombre et chemins de terre
    W.patch(80, 62, '#93b873', -5, -52); W.mottle(B, ['#88ad68', '#9cbf7a', '#82a862', '#a2c07c'], 26);
    // Sentiers de terre aux bords irréguliers
    // Sentiers de terre qui serpentent entre les arbres (entrée → carrefour → est, et vers la montagne)
    W.path([[-18.5, -20.6], [-18.9, -26], [-17.8, -31], [-18.8, -36], [-18.1, -40.6], [-15.5, -43.2]], 2.4, { style: 'forest', fade: [false, false], seed: 31 });
    W.path([[-19.4, -43.1], [-14, -43.7], [-8, -42.5], [-2, -43.5], [4, -42.6], [10.5, -43.3]], 2.3, { style: 'forest', fade: [false, true], seed: 32 });
    W.path([[-4, -43.2], [-3.4, -50], [-4.6, -57], [-3.6, -64], [-4.5, -71], [-3.8, -78], [-4, -81.2]], 2.3, { style: 'forest', fade: [false, true], seed: 33 });   // fondu dans le sentier de neige de la montagne
    W.mottle(B, ['#7a9e5c', '#6f9452', '#86a964'], 18);
    // Sous-bois d'automne : tapis de feuilles mortes (ocre, rouille) et mousse sombre par taches
    W.mottle({ minX: -40, maxX: 30, minZ: -78, maxZ: -27 }, ['#a9ad5c', '#b3a25a', '#9fae60', '#b9a95e', '#7f9f56'], 18);
    W.disc(7, '#a9cc86', CAMP.x, CAMP.z, .022);
    W.patch(9, 7, '#aacb82', PICNIC.x, PICNIC.z, { y: .009 });          // clairière ensoleillée du pique-nique
    // Relief : buttes moussues entre les arbres
    for (const [x, z, w, d, h, r] of [[-31, -39, 9, 6, 1, .3], [-11, -57, 8, 5.5, .8, 1.1], [19, -55, 9, 6, 1.1, .5], [-25, -63, 6, 4.5, .7, 2], [8, -73, 8, 5, 1, .2], [27, -41, 6, 4.5, .7, .9], [-36, -47, 5, 7, .9, 0], [24, -74, 7, 5, 1.1, .7]])
      { mound(x, z, w * 1.15, d * 1.15, h * .7, ['#8bab66', '#86a662', '#8fae69'][Math.round(r * 3) % 3], r); pine(x + w * .12, z - d * .1, .8 + h * .3, Math.round(x * 3), false); bush(x - w * .25, z + d * .2, .7, '#6b9c52'); }
    // Ruisseau : il sort de la colline de la grotte et descend jusqu'à l'étang
    W.path([[-32.6, -70.4], [-31.2, -67], [-32.1, -63.6], [-30.8, -60.6], [-29.6, -57.4]], 1.25, { style: 'brook', fade: [true, false], seed: 35 });
    // Lisières denses (on ne sort pas de la forêt) : pins, chênes d'automne et bouleaux mêlés
    const edge = (x, z, i) => { const k = (i * 7 + Math.round(x + z)) % 5; if (k === 0) W.tree(x, z, rnd(1.15, 1.5), 0, i); else if (k === 3) birch(x, z, rnd(1, 1.2)); else pine(x, z, rnd(.95, 1.35), i); };
    treeLine(-42, -24, -21, -24, 2.4, edge); treeLine(-16, -24, 31, -24, 2.4, edge);
    treeLine(-42, -80, -7, -80, 2.4, edge); treeLine(-1, -80, 31, -80, 2.4, edge);
    treeLine(-42.5, -26, -42.5, -79, 2.4, edge); treeLine(32, -26, 32, -79, 2.4, edge);
    // Arbres à l'intérieur (autumn + pins), en évitant clairières et chemins
    const avoid = [{ ...POND, r: POND.r + 2.5 }, { x: CAMP.x, z: CAMP.z, r: 8 }, { x: PICNIC.x, z: PICNIC.z, r: 5 }, { x: OWL.x, z: OWL.z, r: 4 }, { x: CAVE.x, z: CAVE.z, r: 6 },
      { minX: -21, maxX: -16, minZ: -46, maxZ: -24 }, { minX: -20, maxX: 12, minZ: -45.5, maxZ: -40.5 }, { minX: -6.5, maxX: -1.5, minZ: -82, maxZ: -42 }, { x: LOG.x, z: LOG.z, r: 3 }, { x: 22, z: -50, r: 6 }, { x: 24, z: -30, r: 4 },
      ...SQ.map(([x, z]) => ({ x, z, r: 2.6 })), { seg: [-32.6, -70.4, -29.6, -57.4], r: 1.6 }, { x: CAVE.x + 1, z: CAVE.z - 4, r: 7 }];
    // Arbres des écureuils (chênes isolés) : ils y grimpent quand le renard approche
    SQ.forEach(([x, z], i) => W.tree(x, z, 1.35, 0, i + 3));
    addSquirrels(SQ, 3, { onClimb: i => W.progress('ecureuil', 's' + i) });
    // Sous-bois : arbres serrés (essences variées), buissons, souches, troncs couchés, rochers moussus
    const F = { minX: -40, maxX: 30, minZ: -78, maxZ: -27 };
    scatter(F, 150, (x, z, i) => { const r = i % 7; if (r < 4) pine(x, z, rnd(.8, 1.4), i); else if (r < 6) W.tree(x, z, rnd(.9, 1.4), 0, i); else birch(x, z, rnd(.9, 1.2)); }, avoid);
    scatter(F, 90, (x, z) => bush(x, z, rnd(.6, 1.2), pick(['#6b9c52', '#5f8f4a', '#79a356', '#86b062'])), avoid);
    const shrooms = (x, z, n) => { for (let k = 0; k < n; k++) { const a = k * 2.3 + x, r = .45 + k * .12, mx = x + Math.cos(a) * r, mz = z + Math.sin(a) * r, h = .12 + hash(a) * .1;
      cyl(.03, .04, h, '#f3e6d2', mx, h / 2, mz, 5, undefined, false); const c = sph(.08 + hash(a + 1) * .05, ['#c9894f', '#d6402f', '#e2b26a'][k % 3], mx, h, mz, undefined, 1, false); c.scale.set(1, .5, 1); } };
    scatter(F, 14, (x, z, i) => { stump(x, z, rnd(.7, 1.2)); if (i % 2 === 0) shrooms(x, z, 3); }, avoid);
    scatter(F, 7, (x, z, i) => { log(x, z, rnd(0, 3), rnd(.8, 1.1)); if (i % 2) shrooms(x + .6, z + .5, 2); }, avoid);
    scatter(F, 9, (x, z) => rockCluster(x, z, rnd(.7, 1.1)), avoid);
    scatter(F, 4, (x, z) => deadTree(x, z, rnd(.9, 1.2)), avoid);
    // Profondeur : une seconde rangée de grands arbres au-delà des lisières (décor seulement)
    for (let z = -80; z < -26; z += 3.4) { pine(-48 + rnd(-1, 1), z, rnd(1.4, 1.9), (z * 5) | 0, false); pine(-53 + rnd(-1, 1), z + 1.7, rnd(1.6, 2.1), (z * 2) | 0, false); pine(38 + rnd(-1, 1), z, rnd(1.4, 1.9), (z * 3) | 0, false); }
    // Rais de lumière entre les arbres (une seule passe de dessin, respirent doucement)
    // Rais de lumière : dégradé doux (bords et pied fondus) au lieu d'un rectangle à bords francs
    const rc = document.createElement('canvas'); rc.width = 32; rc.height = 128; const rx = rc.getContext('2d'), im = rx.createImageData(32, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 32; x++) { const u = (x + .5) / 32 * 2 - 1, v = y / 127, k = Math.exp(-u * u * 5) * Math.min(1, v * 4) * Math.pow(1 - v, .6) * 255, o = (y * 32 + x) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = k; im.data[o + 3] = 255; }
    rx.putImageData(im, 0, 0); const rayTex = new THREE.CanvasTexture(rc); rayTex.colorSpace = THREE.SRGBColorSpace;
    const rays = new THREE.Group(); const rayMat = new THREE.MeshBasicMaterial({ color: '#fff3c4', map: rayTex, transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    [[-24, -40], [6, -55], [-30, -66], [18, -38], [-8, -72], [24, -70], [-14, -52]].forEach(([x, z], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2 + (i % 3) * .6, 13), rayMat); m.position.set(x, 5, z); m.rotation.set(0, .4 + i * .3, -.42); rays.add(m); });
    W.dyn(rays, false);
    W.update(() => { rayMat.opacity = (.19 + Math.sin(performance.now() / 2600) * .06) * (1 - DAY.eve * .85) * (1 - DAY.rain * .65); });
    // Panneaux
    W.sign(-16.2, -27.5, 'foret', -.3, 2.2); W.egg('trunkSign', -16.2, -28.8, 2.6, 1.6);
    W.sign(-6.4, -76, 'montagne', 0, 2.2);
    addRabbit({ minX: -38, maxX: -22, minZ: -76, maxZ: -56 }); addRabbit({ minX: 14, maxX: 28, minZ: -50, maxZ: -30 }); addHedgehog({ minX: -16, maxX: 0, minZ: -70, maxZ: -50 });
    addFrog(POND.x + 5.4, POND.z + 2.6, new THREE.Vector3(POND.x + 2, 0, POND.z + 1));
    // --- Étang + canards ---
    // Berge piétinée, vase, bord clair peu profond, fond sombre, et l'eau animée par-dessus
    W.disc(POND.r + 1.15, '#9a8a5e', POND.x, POND.z, .018, 1.2, 1); W.disc(POND.r + .45, '#7d6a4a', POND.x, POND.z, .026, 1.2, 1);
    W.disc(POND.r, '#6fa4b5', POND.x, POND.z, .032, 1.2, 1); W.disc(POND.r * .62, '#40707f', POND.x, POND.z, .036, 1.2, 1);
    { const pw = new THREE.MeshLambertMaterial({ color: '#ffffff', map: W.TX.water.clone(), transparent: true, opacity: .55, depthWrite: false }); pw.map.repeat.set(4, 3); pw.map.needsUpdate = true;
      const pm = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 28), pw); pm.rotation.x = -Math.PI / 2; pm.scale.set(1.2, 1, 1); pm.position.set(POND.x, .045, POND.z); W.dyn(pm, false);
      W.update(dt => { pw.map.offset.x += dt * .012; pw.map.offset.y += dt * .007; }); }
    for (let i = 0; i < 9; i++) { const a = i * 1.1 + .3, r = 2.4 + (i % 3) * .9, lx = POND.x + Math.cos(a) * r * 1.15, lz = POND.z + Math.sin(a) * r * .9; W.disc(.42 + (i % 2) * .14, ['#5f9b4a', '#6aa652'][i % 2], lx, lz, .05); if (i % 3 === 0) sph(.1, '#f2b8c6', lx + .12, .1, lz - .05, undefined, 0, false).scale.set(1, .6, 1); }
    [[-2.5, -4.6], [3.8, -4.5], [-6.3, 1], [6.5, 1.6], [-4.8, 3.6], [1.2, 5.4]].forEach(([dx, dz], i) => rock(POND.x + dx * 1.04, POND.z + dz * 1.04, i > 3 ? .45 : .6));
    // Roseaux et massettes (ouest et sud-ouest), au pied de la berge
    for (let c = 0; c < 5; c++) { const a = 2.2 + c * .45, bx = POND.x + Math.cos(a) * POND.r * 1.12, bz = POND.z + Math.sin(a) * POND.r * .92;
      for (let i = 0; i < 7; i++) { const r = cone(.03, rnd(.8, 1.3), ['#6b8f3a', '#7f9f52', '#8fae5c'][i % 3], bx + rnd(-.4, .4), .5, bz + rnd(-.3, .3), 3, undefined, false); r.rotation.set(rnd(-.15, .15), 0, rnd(-.2, .2)); if (i % 3 === 1) cyl(.05, .05, .22, '#6b4a2a', r.position.x, 1.05, r.position.z, 5, undefined, false); } }
    // Petit ponton de bois (côté est)
    { const jx = POND.x + POND.r * 1.2 - .3, jz = POND.z + 1.2; for (let i = 0; i < 6; i++) box(.34, .06, 1.1, i % 2 ? '#a8865a' : '#9a7a50', jx - 1.4 + i * .38, .1, jz);
      for (const [dx, dz] of [[-1.5, -.5], [-1.5, .5], [.4, -.5], [.4, .5]]) cyl(.06, .07, .5, '#6b4a2f', jx + dx, .12, jz + dz, 5, undefined, false); }
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; solidCircle(POND.x + Math.cos(a) * POND.r * .95, POND.z + Math.sin(a) * POND.r * .8, 1.5, .4); }
    solidBox(POND.x, POND.z, POND.r * 1.8, POND.r * 1.2, .4);
    const ducks = W.flock(POND.x + 1, POND.z - 1, 4, '#c8b48a', { noReturn: false });
    for (const d of ducks) d.onScare = () => W.complete('canards');
    // --- Camp du bûcheron ---
    building(CAMP.x + 6, CAMP.z - 4, 4.4, 3.4, 2.3, '#a8764a', '#7a5236', { rot: -Math.PI / 2, chimney: 1, shutter: '#5f8f4a', plinth: '#8d877c', win: '#ffe2a0', slate: true });
    woodpile(CAMP.x + 6.2, CAMP.z + .4, 0); lantern(CAMP.x + 3.4, CAMP.z - 1.6, 1.9);
    // Clairière de coupe : souches fraîches, chevalet de sciage
    for (const [dx, dz, k] of [[-5, 4, 1], [5.6, 5.2, .9], [-4.2, -3.6, 1.1], [-6.4, .4, .8]]) stump(CAMP.x + dx, CAMP.z + dz, k);
    { const sx = CAMP.x - 3.6, sz = CAMP.z + 4.2; for (const e of [-.6, .6]) for (const s2 of [-1, 1]) { const l = box(.08, .9, .08, '#8a5a3b', sx + e, .4, sz + s2 * .18); l.rotation.x = s2 * .45; }
      const lg = cyl(.2, .22, 1.8, '#a8764a', sx, .78, sz, 8); lg.rotation.z = Math.PI / 2; cyl(.18, .18, .02, '#e2c08a', sx + .91, .78, sz, 8, undefined, false).rotation.z = Math.PI / 2; solidBox(sx, sz, 1.6, .6, .9); }
    cyl(.6, .65, .6, '#b8834a', CAMP.x - 1, .3, CAMP.z + 1.6, 9); solidCircle(CAMP.x - 1, CAMP.z + 1.6, .65, .6); W.egg('camp', CAMP.x - 1, CAMP.z + 2.6, 1.8, 1.4);
    fenceRow(CAMP.x - 6, CAMP.z - 6, CAMP.x + 3, CAMP.z - 6, '#a8764a');
    const logPile = (x, z) => W.pushable(x, z, () => { const g = new THREE.Group(); [[-.25, .22], [.25, .22], [0, .58]].forEach(([dx, y]) => cyl(.24, .24, 1.6, '#a8764a', dx, y, 0, 8, g).rotation.x = Math.PI / 2); cyl(.18, .18, .02, '#e2c08a', -.25, .22, .81, 8, g, false).rotation.x = Math.PI / 2; return g; }, { goal: 'buches', r: .55 });
    logPile(CAMP.x + 2.6, CAMP.z + 2.6); logPile(CAMP.x + 3.8, CAMP.z + 1.4); logPile(CAMP.x + 1.6, CAMP.z + 3.8);
    const buch = W.npc({ id: 'bucheron', x: CAMP.x, z: CAMP.z + 1.8, yaw: Math.PI, shirt: '#c0392b', pants: '#3d4a5c', hair: '#6b4a2a',
      route: [{ p: new THREE.Vector3(CAMP.x - .2, 0, CAMP.z + 2.7), wait: 5, act: 'chop', yaw: Math.PI }, { p: new THREE.Vector3(CAMP.x + 3, 0, CAMP.z), wait: 2, act: 'check', yaw: 2.4 }] });
    const axe = W.item({ kind: 'hache', x: CAMP.x - 1.6, z: CAMP.z + 1.7, y: .62, owner: buch, sh: .35, bring: new THREE.Vector3(CAMP.x - .4, 0, CAMP.z + 2.6),
      build: () => { const g = new THREE.Group(); cyl(.04, .05, .95, '#8a5a3b', 0, 0, 0, 5, g).rotation.z = Math.PI / 2; const h = box(.22, .26, .05, '#9aa7b3', .42, .06, 0, g); h.rotation.z = .2; return g; } });
    // --- Pique-nique des randonneurs ---
    W.ground(2.4, 1.8, '#d9705a', PICNIC.x, PICNIC.z, .03, .3); W.ground(.6, 1.6, '#f6efe0', PICNIC.x - .4, PICNIC.z, .032, .3); W.ground(.6, 1.6, '#f6efe0', PICNIC.x + .5, PICNIC.z, .032, .3);
    box(.5, .35, .35, '#c9a33d', PICNIC.x + .9, .18, PICNIC.z - .6);
    const rando = W.npc({ id: 'rando', x: PICNIC.x + 2, z: PICNIC.z + 1, yaw: -1.6, shirt: '#3f8a7a', pants: '#8a7a5a', hair: '#c9a33d',
      route: [{ p: new THREE.Vector3(PICNIC.x + 2, 0, PICNIC.z + 1), wait: 4, act: 'look', yaw: -1.6 }, { p: new THREE.Vector3(PICNIC.x - 2.5, 0, PICNIC.z + 2), wait: 3, act: 'point', yaw: Math.PI }] });
    const sandwich = W.item({ kind: 'sandwich', x: PICNIC.x - .2, z: PICNIC.z + .1, y: .1, owner: rando, sh: .3, bring: new THREE.Vector3(PICNIC.x + .3, 0, PICNIC.z + 1.2),
      build: () => { const g = new THREE.Group(); box(.5, .1, .22, '#e8c27a', 0, 0, 0, g); box(.52, .05, .24, '#7fb05c', 0, .07, 0, g, false); box(.5, .08, .22, '#e8c27a', 0, .13, 0, g); return g; } });
    // --- Tronc creux ---
    { const tr = cyl(.85, .9, 4.2, '#8a5a3b', LOG.x, .75, LOG.z, 9); tr.rotation.z = Math.PI / 2; const hole = new THREE.Mesh(new THREE.CircleGeometry(.62, 12), new THREE.MeshBasicMaterial({ color: '#2a1d14' })); hole.position.set(LOG.x + 2.12, .75, LOG.z); hole.rotation.y = Math.PI / 2; W.R.group.add(hole); solidBox(LOG.x, LOG.z, 4.2, 1.7, .9); }
    // --- Hibou ---
    W.tree(OWL.x, OWL.z, 1.8, 0, 2); W.egg('carvings', OWL.x, OWL.z + 1.6, 2.6, 1.4);
    { const br = cyl(.08, .13, 1.5, '#6b4a2f', OWL.x + .5, 2.72, OWL.z + .28, 6); br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(.85, .08, .5).normalize());
      const ho = new THREE.Mesh(new THREE.CircleGeometry(.2, 10), new THREE.MeshBasicMaterial({ color: '#2a1d14' })); ho.position.set(OWL.x - .05, 1.9, OWL.z + .36); ho.scale.y = 1.4; W.R.group.add(ho);
      shrooms(OWL.x - .3, OWL.z + .4, 3); }
    const owl = W.dyn((() => { const g = new THREE.Group(); const b = sph(.32, '#8a6a4a', 0, 0, 0, g, 1); b.scale.set(1, 1.2, 1); sph(.24, '#8a6a4a', 0, .42, 0, g, 1);
      [-1, 1].forEach(s => { sph(.09, '#f6efe0', s * .1, .45, .18, g, 1, false); cone(.06, .14, '#6b4a2a', s * .14, .66, 0, 4, g, false); }); cone(.04, .08, '#e8a12a', 0, .38, .24, 4, g, false).rotation.x = Math.PI / 2; return g; })());
    owl.position.set(OWL.x + .9, 3.1, OWL.z + .5);
    const lids = W.dyn((() => { const g = new THREE.Group(); [-1, 1].forEach(s => { const l = sph(.1, '#6b4a2a', s * .1, 0, 0, g, 1, false); l.scale.set(1, .5, .6); }); return g; })());
    lids.position.set(OWL.x + .9, 3.55, OWL.z + .7);
    let owlAwake = W.done('hibou'), zzz = 0;
    W.yap(new THREE.Vector3(OWL.x, 0, OWL.z), 5, () => { if (owlAwake) { W.say({ anchor: new THREE.Vector3(OWL.x + .9, 4.3, OWL.z) }, t().owlHoot, '', 1.4, 0, 'owl'); return; } owlAwake = true; lids.visible = false; lids.userData.gone = true; W.SFX.question(); W.say({ anchor: new THREE.Vector3(OWL.x + .9, 4.3, OWL.z) }, t().owlHoot, '', 2, 0, 'owl'); W.complete('hibou'); });
    // --- Grotte à écho ---
    // Colline boisée, éperon rocheux moussu, entrée sombre en profondeur, stalactites et lierre
    mound(CAVE.x + 1, CAVE.z - 4.6, 17, 10, 3.6, '#7f9f5c', 0, 3);
    rock(CAVE.x - 3, CAVE.z, 2.2, '#8d877c'); rock(CAVE.x + 3.1, CAVE.z + .1, 2.3, '#857f74'); rock(CAVE.x, CAVE.z - 2.4, 2.8, '#7f796f'); rock(CAVE.x - 5.4, CAVE.z - 1.6, 1.5, '#8d877c'); rock(CAVE.x + 5.2, CAVE.z - 1.2, 1.3, '#7f796f', false);
    { const arch = sph(3.2, '#8a8478', CAVE.x, 0, CAVE.z - .8); arch.scale.set(1.1, .9, .7);
      for (const [dx, y, dz, r] of [[-2.9, 1.5, .1, 1.1], [3, 1.6, .2, 1.2], [0, 2.75, -.6, 1.6], [-1.4, 2.4, .2, .7], [1.6, 2.45, .3, .8]]) sph(r, ['#6f9e4f', '#79a356', '#5f8f4a'][Math.round(r * 5) % 3], CAVE.x + dx, y, CAVE.z + dz, undefined, 1, false).scale.set(1.25, .38, 1);
      [[1.62, '#3a3128', 1.4], [1.25, '#211b16', 1.46], [.82, '#110e0b', 1.5]].forEach(([r, c, dz]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: c })); m.position.set(CAVE.x, 1.05, CAVE.z + dz); m.scale.y = 1.12; W.R.group.add(m); });
      for (const dx of [-.8, -.25, .35, .85]) { const st = cone(.1, .35 + Math.abs(dx) * .2, '#7f796f', CAVE.x + dx, 2.25 - Math.abs(dx) * .3, CAVE.z + 1.42, 5, undefined, false); st.rotation.x = Math.PI; }
      for (const dx of [-1.3, -1, 1.1, 1.45]) box(.07, .9 + Math.abs(dx) * .3, .05, '#4f7f45', CAVE.x + dx, 1.85, CAVE.z + 1.52, undefined, false); }
    W.yap(new THREE.Vector3(CAVE.x, 0, CAVE.z + 2.6), 2.6, () => { const L = t().echo; L.forEach((l, i) => setTimeout(() => W.say({ anchor: new THREE.Vector3(CAVE.x + i * .7 - .7, 3.6 + i * .5, CAVE.z) }, l, 'note', 1.2, 0, 'echo' + i), 300 + i * 420)); setTimeout(() => W.complete('echo'), 1300); });
    // --- Chevreuil ---
    const deer = W.dyn((() => { const g = new THREE.Group(); const b = sph(.45, '#b07a4a', 0, 1, 0, g, 1); b.scale.set(.7, .7, 1.4); const n = cyl(.12, .16, .7, '#b07a4a', 0, 1.35, .45, 6, g); n.rotation.x = .6;
      sph(.2, '#b07a4a', 0, 1.65, .7, g, 1).scale.set(.8, .8, 1.2); [-1, 1].forEach(s => { cone(.07, .2, '#a06a3a', s * .12, 1.85, .62, 4, g, false); }); sph(.08, '#f6efe0', 0, 1.05, -.6, g, 0, false);
      [[-.18, .45], [.18, .45], [-.18, -.4], [.18, -.4]].forEach(([x, z]) => cyl(.05, .04, .8, '#8a5a3b', x, .45, z, 4, g, false)); return g; })());
    const deerSpots = [new THREE.Vector3(22, 0, -50), new THREE.Vector3(26, 0, -36), new THREE.Vector3(14, 0, -72), new THREE.Vector3(-14, 0, -66)];
    const deerS = { pos: deerSpots[0].clone(), target: null, yaw: 0, t: 0, sh: blob(.6) };
    // --- Photographe caché (affût) ---
    // Affût perché sur pilotis : plateforme, cabane camouflée, fente d'observation, échelle
    { const hx = 24, hz = -30; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { cyl(.08, .1, 2.2, '#7a5236', hx + a * 1.05, 1.1, hz + b * .75, 5); W.solidCircle(hx + a * 1.05, hz + b * .75, .15, 2); }
      box(2.6, .12, 2, '#8a5a3b', hx, 2.2, hz); box(2.3, 1.15, 1.7, '#6b7a4a', hx, 2.85, hz); box(2.7, .1, 2.1, '#5a4a32', hx, 3.47, hz, undefined, false);
      box(1.5, .3, .05, '#1f1f1f', hx, 3.02, hz + .86, undefined, false);
      for (const [dx, dz] of [[-.8, .5], [.3, -.4], [.9, .3]]) sph(.5, ['#5f8f4a', '#6b9c52'][Math.round(dx + 1) % 2], hx + dx, 3.6, hz + dz, undefined, 1, false).scale.set(1.2, .45, 1);
      const lad = new THREE.Group(); for (const e of [-.22, .22]) box(.06, 2.5, .06, '#8a5a3b', e, 1.2, 0, lad); for (let i = 0; i < 6; i++) box(.5, .05, .06, '#a8764a', 0, .3 + i * .38, 0, lad, false);
      lad.position.set(hx - .5, 0, hz + 1.25); lad.rotation.x = -.32; W.R.group.add(lad); }
    W.zone(new THREE.Vector3(24, 0, -27.6), 1.3, () => { W.emit(new THREE.Vector3(24, 3, -29.1), '#ffffff', { n: 14, spd: 2, up: 1, life: .4 }); W.SFX.pop(); W.say({ anchor: new THREE.Vector3(24, 4.2, -30) }, t().photoFlash, '', 2.2, 0, 'photo'); W.complete('photoForet'); }, { cond: () => !W.done('photoForet') && fox.idle > 2.5, stay: 0 });
    // --- Vieux chêne ---
    W.tree(-12, -75, 2.2, 0, 1); { const hole = new THREE.Mesh(new THREE.CircleGeometry(.35, 10), new THREE.MeshBasicMaterial({ color: '#2a1d14' })); hole.position.set(-12, .6, -74.5); W.R.group.add(hole); }
    W.zone(new THREE.Vector3(-12, 0, -73.6), 1.1, () => { W.say(fox, t().chene, 'note', 2.6, 2); W.complete('chene'); }, { cond: () => fox.sneaking });
    // --- Champignons ---
    const mush = () => { const g = new THREE.Group(); cyl(.06, .07, .22, '#f6efe0', 0, 0, 0, 6, g); const c = sph(.17, '#d6402f', 0, .14, 0, g, 1); c.scale.set(1, .55, 1); [[.07, .04], [-.06, .08], [0, -.09]].forEach(([x, z]) => sph(.03, '#ffffff', x, .21, z, g, 0, false)); return g; };
    W.pickups('champignons', [[-35, -30], [-8, -50], [27, -58], [-38, -60], [6, -77], [16, -34], [-24, -70]], mush, { y: .12, spin: false, r: .75 });
    W.postcard(-40, -77.5);
    // --- Destinations des objets ---
    W.place(it => {
      if (it.kind === 'hache' && flat2(it.pos, POND) < POND.r + 1.2) { it.gone = true; it.sinking = 1; it.pos.y = .6; W.SFX.splash(); W.emit(new THREE.Vector3(it.pos.x, .5, it.pos.z), '#bfe3f0', { n: 20, spd: 2.2, up: 5 }); W.complete('hache'); giveUp(it); return true; }
      if (it.kind === 'sandwich' && flat2(it.pos, { x: LOG.x + 2.4, z: LOG.z }) < 1.6) { it.gone = true; it.mesh.visible = false; W.SFX.grab(); W.complete('sandwich'); giveUp(it); return true; }
      return false;
    });
    W.dest(it => it.kind === 'hache' && !W.done('hache') ? { key: 'etang', pos: new THREE.Vector3(POND.x + POND.r, 0, POND.z), r: 1.2 }
      : it.kind === 'sandwich' && !W.done('sandwich') ? { key: 'tronc', pos: new THREE.Vector3(LOG.x + 2.6, 0, LOG.z), r: .9 } : null);
    // --- Barrière : un gros tronc tombé en travers du chemin ---
    const trunk = new THREE.Group(); const tk = cyl(.55, .6, 6, '#8a5a3b', 0, 0, 0, 9, trunk); tk.rotation.z = Math.PI / 2; [-1.5, .8, 2].forEach(x => sph(.45, '#6f9e4f', x, .5, rnd(-.3, .3), trunk, 1, false));
    trunk.position.set(-18.5, .55, -22.4); W.dyn(trunk); W.gate(trunk, 'slide', 5.5);
    // --- Animation ---
    let dc = 0;
    W.update(dt => {
      // Hibou qui somnole
      if (!owlAwake && (zzz -= dt) < 0 && flat2(fox.pos, OWL) < 14) { zzz = 3.5; W.say({ anchor: new THREE.Vector3(OWL.x + 1.2, 4.2, OWL.z) }, t().owlSleep, 'note', 1.6, 0, 'owl'); }
      owl.rotation.y = owlAwake ? Math.sin(S_t() * 1.3) * .8 : 0;
      // Chevreuil : broute, détale si on arrive sans se cacher
      const d = flat2(fox.pos, deerS.pos);
      if (deerS.target) { const dx = deerS.target.x - deerS.pos.x, dz = deerS.target.z - deerS.pos.z, l = Math.hypot(dx, dz); if (l < .3) deerS.target = null; else { const s = Math.min(l, dt * 9); deerS.pos.x += dx / l * s; deerS.pos.z += dz / l * s; deerS.yaw = Math.atan2(dx, dz); } }
      else if (d < 6.5 && !fox.sneaking && Math.hypot(fox.vel.x, fox.vel.z) > .5) { deerS.target = pick(deerSpots.filter(p => flat2(p, deerS.pos) > 5)); W.say({ anchor: new THREE.Vector3(deerS.pos.x, 2.4, deerS.pos.z) }, '!', 'excl', .8, 0, 'deer'); }
      else if (d < 2.3 && fox.sneaking) W.complete('chevreuil');
      dc += dt; const graze = !deerS.target && Math.sin(dc * .8) > 0;
      deer.position.set(deerS.pos.x, deerS.target ? Math.abs(Math.sin(dc * 12)) * .3 : 0, deerS.pos.z); deer.rotation.set(graze ? .35 : 0, deerS.yaw, 0);
      deerS.sh.position.set(deerS.pos.x, .03, deerS.pos.z); deerS.sh.visible = deer.visible;
    });
    const S_t = () => performance.now() / 1000;
    return { axe, sandwich, restore() { if (W.done('hache')) { axe.gone = true; axe.mesh.visible = false; } if (W.done('sandwich')) { sandwich.gone = true; sandwich.mesh.visible = false; } if (W.done('hibou')) { owlAwake = true; lids.visible = false; lids.userData.gone = true; } } };
  },
});
