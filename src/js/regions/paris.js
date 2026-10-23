/* =====================================================================
   Paris (en train depuis Nantes) : une grande tour Eiffel low-poly visible de loin
   (ascenseur jusqu'au sommet et panorama), le Champ-de-Mars, des immeubles haussmanniens,
   des terrasses de café, un peintre, un mime, des cyclistes, des pigeons, la Seine
   et son bateau-mouche. S'ouvre après 4 bêtises à Nantes.
   ===================================================================== */
import * as THREE from 'three';
import { behave } from '../crowd.js';
import { M as MAT, RM, TX, flat2 } from '../engine.js';
import { fox } from '../fox.js';
import { BURROW } from '../world.js';
import { defineRegion, needIn, regionDone } from '../regions.js';
import { pick, rnd, t } from '../state.js';
import { bench, bikeRack, bistroChair, bistroTable, building, carousel, flowerBed, hash, lamp, morris, newsKiosk, planeTree, planter, standCart, wallace } from './kit.js';
import { makeTrain, rails, trainMenu } from './gare.js';

const B = { minX: -345, maxX: -235, minZ: -55, maxZ: 45 };
const EIF = { x: -290, z: -14 };
const CAFE = { x: -258, z: 12 };
const PAINT = { x: -322, z: 10 };
const MIME = { x: -306, z: 20 };
const SEINE = -42;

defineRegion({
  id: 'paris', bounds: B, mapColor: '#d9d2e6',
  veg: [{ biome: 'city', density: 1, rect: { minX: -343, maxX: -237, minZ: -37, maxZ: 38 } }, { biome: 'meadow', density: 1, rect: { minX: -304, maxX: -276, minZ: -33, maxZ: 5 }, seed: 3 }],
  walk: [{ minX: -343, maxX: -237, minZ: -37.6, maxZ: 38.4 }],
  unlock: () => regionDone('nantes') >= 4, need: needIn('nantes', 4),
  spawn: new THREE.Vector3(-290, 0, 36), spawnYaw: Math.PI,
  mood: { bg: '#e4e0ea', fog: '#dedae4', near: 56, far: 150, sun: '#ffd9a8', sky: '#fdeee0', ground: '#9a8f8a', life: .35, music: 'paris' },
  goals: [
    { id: 'sommet' }, { id: 'pigeons' }, { id: 'croissant' }, { id: 'selfie' }, { id: 'chevalet' }, { id: 'cycliste' }, { id: 'bateauMouche' }, { id: 'beret' }, { id: 'baguetteParis' },
    { id: 'mime', secret: true }, { id: 'cocorico', secret: true },
  ],
  i18n: {
    fr: {
      goals: { sommet: "Monter au sommet de la tour Eiffel", pigeons: "Faire s'envoler les pigeons du Champ-de-Mars", croissant: "Voler un croissant en terrasse", selfie: "Gâcher le selfie des touristes devant la tour",
        chevalet: "Renverser le chevalet du peintre", cycliste: "Faire sonner un cycliste", bateauMouche: "Saluer le bateau-mouche depuis le quai", beret: "Voler le béret du peintre",
        baguetteParis: "Rapporter une baguette parisienne jusqu'au terrier, au village", mime: "Imiter le mime (sans bouger)", cocorico: "Glapir tout en haut de la tour" },
      hints: { sommet: "L'ascenseur est entre les pieds de la tour. Appuie sur E.", pigeons: "Ils picorent sur le Champ-de-Mars, devant la tour.", croissant: "Le café a sa terrasse au nord-est. Les croissants sont sur les tables.",
        selfie: "Les touristes se prennent en photo devant la tour. Mets-toi dans le cadre au bon moment.", chevalet: "Le peintre est installé à l'ouest. À pleine vitesse…", cycliste: "Les vélos passent sur l'avenue. Glapis à côté.",
        bateauMouche: "Va sur le quai de la Seine, au sud, et glapis quand le bateau passe.", beret: "Le peintre a posé son béret sur sa boîte de peinture.",
        baguetteParis: "La boulangerie du café vend des baguettes. Prends le train avec, puis file au terrier du village." },
      L: { serveur: { chase: ["Mon croissant !", "Monsieur le renard, l'addition !", "Revenez !"], idle: ["Un café, un !", "Terrasse ou salle ?", "Désolé, c'est complet.", "Voilà, voilà !"] },
        peintre: { chase: ["Mon béret !", "Rends-moi ça, artiste !"], idle: ["La lumière est parfaite.", "Encore un peu de bleu…", "Ne bougez pas, je vous peins !"] } },
      search: { croissant: "Il manquait pas un croissant ici ?", beret: "Mon béret ?!" },
      dest: { terrier: "Terrier" },
      eggs: { eiffel: "La tour Eiffel, construite pour l'Exposition universelle de 1889.", cafe: "Café de la Tour : « Croissant 1,20 € — renards non servis. »", seine: "La Seine. Les bateaux-mouches promènent les touristes.", train: "Appuie sur E devant la porte pour reprendre le train.", book: "Un bouquiniste vend de vieux livres. Aucun sur les renards. Scandale." },
      signs: { paris: "Paris", eiffel: "Tour Eiffel", cafe: "Café" },
      cards: { paris: "Bons baisers de Paris ! Le renard est monté tout en haut de la tour, a mangé un croissant et a fait un selfie raté. Très parisien." },
      elevUp: "L'ascenseur monte…", top: "Quelle vue ! On voit même la Vendée (presque).", cocorico: "COCORIC… euh, YAAAP !", pigeonsFly: "Les pigeons s'envolent en grognant.", selfie: "« Attends… y a un renard sur la photo ! »",
      ring: "Dring dring !", boat: "Les touristes du bateau saluent le renard !", mime: "Le mime et le renard ne bougent plus. Le public applaudit.", tumble: "Le chevalet tombe… la toile aussi.",
      baguette: "La baguette parisienne est au terrier. Le boulanger du village est jaloux.",
    },
    en: {
      goals: { sommet: "Reach the top of the Eiffel Tower", pigeons: "Scare the Champ-de-Mars pigeons", croissant: "Steal a croissant from a café terrace", selfie: "Ruin the tourists' selfie in front of the tower",
        chevalet: "Knock over the painter's easel", cycliste: "Make a cyclist ring their bell", bateauMouche: "Wave to the tour boat from the quay", beret: "Steal the painter's beret",
        baguetteParis: "Bring a Parisian baguette all the way to the den in the village", mime: "Copy the mime (without moving)", cocorico: "Yap at the very top of the tower" },
      hints: { sommet: "The lift is between the tower's legs. Press E.", pigeons: "They peck on the Champ-de-Mars, in front of the tower.", croissant: "The café terrace is to the north-east. Croissants are on the tables.",
        selfie: "Tourists take selfies in front of the tower. Get in the frame at the right moment.", chevalet: "The painter works to the west. At full speed…", cycliste: "Bikes ride along the avenue. Yap next to one.",
        bateauMouche: "Go to the Seine quay, to the south, and yap as the boat passes.", beret: "The painter left his beret on his paint box.",
        baguetteParis: "The café's bakery sells baguettes. Take the train with one, then run to the village den." },
      L: { serveur: { chase: ["My croissant!", "Mister fox, the bill!", "Come back!"], idle: ["One coffee!", "Terrace or inside?", "Sorry, we're full.", "Coming, coming!"] },
        peintre: { chase: ["My beret!", "Give that back, you artist!"], idle: ["The light is perfect.", "A little more blue…", "Hold still, I'm painting you!"] } },
      search: { croissant: "Wasn't there a croissant here?", beret: "My beret?!" },
      dest: { terrier: "Den" },
      eggs: { eiffel: "The Eiffel Tower, built for the 1889 World's Fair.", cafe: "Café de la Tour: \"Croissant €1.20 — foxes not served.\"", seine: "The Seine. Tour boats carry visitors along the river.", train: "Press E at the door to take the train again.", book: "A bouquiniste sells old books. None about foxes. Outrageous." },
      signs: { paris: "Paris", eiffel: "Eiffel Tower", cafe: "Café" },
      cards: { paris: "Greetings from Paris! The fox went to the top of the tower, ate a croissant and ruined a selfie. Very Parisian." },
      elevUp: "The lift goes up…", top: "What a view! You can almost see Vendée.", cocorico: "COCK-A-DOODLE… er, YAAAP!", pigeonsFly: "The pigeons fly off, grumbling.", selfie: "\"Wait… there's a fox in the picture!\"",
      ring: "Ring ring!", boat: "The tourists on the boat wave at the fox!", mime: "The mime and the fox freeze. The crowd applauds.", tumble: "The easel falls… and so does the canvas.",
      baguette: "The Parisian baguette is in the den. The village baker is jealous.",
    },
  },
  build(W) {
    const { box, cyl, sph, solidBox, solidCircle } = W;
    // Sol : avenues, Champ-de-Mars, quai, Seine
    W.patch(114, 80, W.TM(TX.cobble, 28, 19), -290, 0, { round: .12, jitter: .3 });
    W.patch(30, 40, '#a9cc86', EIF.x, 0, { y: .02, round: .2, jitter: .4 });
    W.ground(4, 40, '#e3d5b0', EIF.x, 0, .024);
    W.ground(110, 5, '#8b8f99', -290, 28, .022);
    [-1, 1].forEach(d => W.ground(110, .1, '#f6f2e8', -290, 28 + d * 1.2, .026));
    const seine = new THREE.MeshLambertMaterial({ color: '#b9cdd0', map: TX.water.clone(), transparent: true, opacity: .95 }); seine.map.repeat.set(30, 3); seine.map.needsUpdate = true;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 14), seine); water.rotation.x = -Math.PI / 2; water.position.set(-290, .04, SEINE - 3); W.dyn(water, false);
    W.ground(110, 1.2, '#c9c2b2', -290, -38.2, .03); for (let x = -342; x < -237; x += 2) box(.3, .8, .3, '#5d6670', x, .4, -38.4, undefined, false); solidBox(-290, -38.4, 110, .4, .8);
    // Bouquinistes
    for (let x = -330; x < -250; x += 12) { box(2.2, .9, .9, '#2f6b4a', x, .45, -36.6); box(2.2, .1, 1.1, '#26573c', x, .95, -36.6, undefined, false); solidBox(x, -36.6, 2.2, .9, .9); }
    W.egg('book', -318, -35, 2, 1.4); W.egg('seine', -298, -36, 2.2, 1.6);
    // Tour Eiffel (low-poly, ~38 unités) : quatre piliers inclinés, arches, deux plateformes, flèche
    { const g = new THREE.Group(); g.position.set(EIF.x, 0, EIF.z); W.R.group.add(g); const C = '#8a6a4f', C2 = '#7a5c43', _up = new THREE.Vector3(0, 1, 0);
      const strut = (a, b, w, c, ol = true) => { const d = new THREE.Vector3().subVectors(b, a), len = d.length(); const m = box(w, len, w, c, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, g, ol); m.quaternion.setFromUnitVectors(_up, d.normalize()); return m; };
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const lv = [[0, 6.8, 1.5], [12, 3.6, 1.1], [21, 2, .8], [31, .55, .5]];           // hauteur, demi-écart, épaisseur
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        for (let k = 0; k < 3; k++) { const [y0, e0, w0] = lv[k], [y1, e1] = lv[k + 1]; strut(V(sx * e0, y0, sz * e0), V(sx * e1, y1, sz * e1), w0, k % 2 ? C2 : C);
          // croisillons du treillis
          const ym = (y0 + y1) / 2, em = (e0 + e1) / 2; strut(V(sx * e0, y0 + .3, sz * e0 * .2), V(sx * em, ym, sz * em), .18, '#6a4c36', false); strut(V(sx * e0 * .2, y0 + .3, sz * e0), V(sx * em, ym, sz * em), .18, '#6a4c36', false); }
        solidCircle(EIF.x + sx * 6.8, EIF.z + sz * 6.8, 1.1, 6);
      }
      [[0, 6.8, 0], [0, -6.8, 0], [6.8, 0, Math.PI / 2], [-6.8, 0, Math.PI / 2]].forEach(([x, z, r]) => { const ar = new THREE.Mesh(new THREE.TorusGeometry(4.6, .35, 4, 14, Math.PI), MAT(C)); ar.position.set(x * .78, 4.2, z * .78); ar.rotation.y = r; ar.castShadow = true; g.add(ar); });
      box(9.4, .8, 9.4, C2, 0, 12, 0, g); for (const s of [-1, 1]) { box(9.8, .5, .2, '#6a4c36', 0, 12.7, s * 4.8, g, false); box(.2, .5, 9.8, '#6a4c36', s * 4.8, 12.7, 0, g, false); }
      box(5.4, .6, 5.4, C2, 0, 21, 0, g); box(1.8, .6, 1.8, C2, 0, 31, 0, g);
      cyl(.45, .7, 3, C, 0, 32.8, 0, 6, g); cyl(.07, .1, 3.6, '#9aa7b3', 0, 36, 0, 4, g); sph(.28, '#d6402f', 0, 37.9, 0, g, 0, false);
      box(1, 11.4, 1, '#5d6670', 0, 6, 0, g, false); }
    W.egg('eiffel', EIF.x + 3, EIF.z + 9.5, 4, 2.4);
    W.sign(EIF.x + 4.2, EIF.z + 16, 'eiffel', 0, 2.4);
    const cab = W.dyn((() => { const g = new THREE.Group(); box(1.4, 1.6, 1.4, '#d9a25a', 0, .8, 0, g); box(1.2, .9, .05, '#8fc9df', 0, 1, .7, g, false); return g; })());
    cab.position.set(EIF.x, 0, EIF.z + .9);
    const LIFT = { t: -1 };
    W.interact({ x: EIF.x, y: 1.6, z: EIF.z + 2.3 }, 1.6, () => { if (LIFT.t >= 0) return; LIFT.t = 0; LIFT.top = false; W.SFX.chime(); W.say(fox, t().elevUp, '', 1.6, 2.2); }, () => LIFT.t < 0 && !fox.held);
    W.yap(new THREE.Vector3(EIF.x, 0, EIF.z), 4, () => { if (LIFT.t >= 0 && LIFT.top) { W.say(fox, t().cocorico, '', 2, 2.4); W.complete('cocorico'); } });
    // Immeubles haussmanniens (périmètre), café, boulangerie
    const HW = ['#efe2c9', '#f3e6d2', '#e9dfcf', '#efe7da'];
    for (let x = -340; x < -240; x += 9) { if (Math.abs(x - EIF.x) < 18) continue; building(x + 4, -50, 8.6, 7, 9, pick(HW), '#6d7880', { roofType: 'mansard', floors: 4, win: '#5d7890', trim: '#c9bfae', balcony: '#2f2a24', rot: Math.PI, solid: false }); }
    // Côté caméra (sud de l'écran) : rien de haut, sinon on ne verrait plus le quai ; une haie basse suffit
    for (let x = -342; x < -238; x += 2.6) W.sph(.8, '#6b9c52', x, .45, 45.4, undefined, 1, false).scale.set(1.2, .7, 1);
    for (let z = -32; z < 26; z += 9) { building(-348.5, z + 4, 6, 8.6, 9, pick(HW), '#6d7880', { roofType: 'mansard', floors: 4, win: '#5d7890', balcony: '#2f2a24', rot: Math.PI / 2, solid: false }); building(-231.5, z + 4, 6, 8.6, 9, pick(HW), '#6d7880', { roofType: 'mansard', floors: 4, win: '#5d7890', balcony: '#2f2a24', rot: -Math.PI / 2, solid: false }); }
    building(CAFE.x, CAFE.z - 6, 12, 5, 6, '#efe2c9', '#6d7880', { roofType: 'mansard', floors: 2, trim: '#2f6b4a', win: '#5d7890', balcony: '#2f2a24' });
    for (let i = 0; i < 6; i++) box(2, .1, 1.6, i % 2 ? '#d6402f' : '#f6efe0', CAFE.x - 5 + i * 2, 3.2, CAFE.z - 2.9, undefined, false);
    W.sign(CAFE.x + 7.5, CAFE.z - 2, 'cafe', -.4, 1.8); W.egg('cafe', CAFE.x - 6.6, CAFE.z - 2.2, 2.6, 1.4);
    const tables = [[-4, 0], [-1, 1.4], [2, 0], [5, 1.4]].map(([dx, dz]) => { const x = CAFE.x + dx, z = CAFE.z + dz; bistroTable(x, z, .5); [-1, 1].forEach(s => bistroChair(x + s * .78, z, -s * Math.PI / 2, '#c9894f')); return { x, z }; });
    const waiter = W.npc({ id: 'serveur', x: CAFE.x, z: CAFE.z - 1.8, yaw: 0, shirt: '#f6f2e8', pants: '#2f2a24', hair: '#2f2a24', tie: '#2f2a24', apron: true,
      route: tables.map(tb => ({ p: new THREE.Vector3(tb.x, 0, tb.z - 1), wait: 2, act: 'arrange', yaw: 0 })) });
    const crois = W.item({ kind: 'croissant', x: tables[2].x, z: tables[2].z, y: .86, owner: waiter, sh: .2, bring: new THREE.Vector3(tables[2].x, 0, tables[2].z - 1),
      build: () => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.TorusGeometry(.13, .07, 5, 8, Math.PI * 1.3), MAT('#d9a25a')); c.rotation.x = Math.PI / 2; g.add(c); return g; } });
    crois.onGrab = () => W.complete('croissant');
    const bag = W.item({ kind: 'baguetteParis', x: CAFE.x + 5.5, z: CAFE.z - 3, y: .05, sh: .5, travels: true, burrowGoal: 'baguetteParis', build: () => { const g = new THREE.Group(); cyl(.11, .11, 1.4, '#d9a25a', 0, 0, 0, 7, g).rotation.z = Math.PI / 2; for (let i = -1; i <= 1; i++) box(.05, .03, .18, '#f1d39b', i * .38, .1, 0, g, false).rotation.y = .6; box(.3, .05, .24, '#f6efe0', 0, .02, 0, g, false); return g; } });
    // Peintre, chevalet, béret ; mime
    W.pushable(PAINT.x + 1.2, PAINT.z, () => { const g = new THREE.Group(); [-.35, .35].forEach(x => cyl(.04, .04, 1.8, '#8a5a3b', x, .9, 0, 4, g).rotation.z = x * .2); box(1, .8, .05, '#f6efe0', 0, 1.3, .08, g); box(.5, .3, .06, '#7fb05c', -.1, 1.2, .1, g, false); box(.3, .2, .06, '#8fc9df', .2, 1.5, .1, g, false); return g; }, { goal: 'chevalet', r: .5 });
    const painter = W.npc({ id: 'peintre', x: PAINT.x, z: PAINT.z + 1.2, yaw: Math.PI, shirt: '#2f2a24', pants: '#3d4a5c', hair: '#5a3b2a',
      route: [{ p: new THREE.Vector3(PAINT.x, 0, PAINT.z + 1.2), wait: 6, act: 'type', yaw: Math.PI * .8 }, { p: new THREE.Vector3(PAINT.x - 1.5, 0, PAINT.z + 2.4), wait: 2.5, act: 'look', yaw: 2.4 }] });
    box(.6, .3, .4, '#8a5a3b', PAINT.x - 1, .15, PAINT.z + .4);
    const beret = W.item({ kind: 'beret', x: PAINT.x - 1, z: PAINT.z + .4, y: .38, owner: painter, sh: .25, bring: new THREE.Vector3(PAINT.x - 1, 0, PAINT.z + 1.2), build: () => { const g = new THREE.Group(); cyl(.3, .32, .1, '#2f2a24', 0, 0, 0, 10, g); sph(.05, '#2f2a24', 0, .07, 0, g, 0, false); return g; } });
    beret.onGrab = () => W.complete('beret');
    const crowd = W.crowd(26);
    const mime = crowd.add({ pos: { x: MIME.x, z: MIME.z }, yaw: Math.PI, shirt: '#f6f2e8', pants: '#2f2a24', hair: '#2f2a24', hat: 'beret', hatColor: '#2f2a24' });
    W.zone(new THREE.Vector3(MIME.x, 0, MIME.z - 1.8), 1.6, () => { W.say({ anchor: new THREE.Vector3(MIME.x, 3, MIME.z) }, t().mime, '', 2.6, 0, 'mime'); W.SFX.cheer(); W.complete('mime'); }, { cond: () => fox.idle > 3.5, stay: 0 });
    // Touristes (selfie), passants, cyclistes, pigeons
    const selfie = [0, 1, 2].map(i => crowd.add({ pos: { x: EIF.x - 1.5 + i * 1.3, z: EIF.z + 22 }, yaw: Math.PI * 0, shirt: pick(['#f6d36b', '#d9705a', '#8fc9df', '#f2b8c6']), pants: pick(['#2563c9', '#3d4a5c']), hair: pick(['#2f2a24', '#c9a33d', '#5a3b2a']), hat: i === 1 ? 'cap' : null, hatColor: '#d6402f' }));
    let selfieCd = 4;
    const walkers = [0, 1, 2, 3, 4, 5, 6].map(i => crowd.add({ pos: { x: rnd(-335, -245), z: rnd(-30, 22) }, shirt: pick(['#3e5677', '#c9894f', '#2f2a24', '#8a7cc2', '#f6efe0', '#d6402f']), pants: pick(['#2b3448', '#2f2a24', '#6b6155']), hair: pick(['#5a3b2a', '#2f2a24', '#d9d4c8']), hat: i % 4 === 0 ? 'beret' : null, hatColor: '#2f2a24' }));
    const bikeMesh = () => { const g = new THREE.Group(); [-.55, .55].forEach(z => { const w = cyl(.38, .38, .06, '#2f2a24', 0, .38, z, 12, g); w.rotation.z = Math.PI / 2; }); box(.06, .06, 1.1, '#7fb05c', 0, .7, 0, g, false); box(.06, .5, .06, '#7fb05c', 0, .55, -.25, g, false); box(.5, .05, .05, '#2f2a24', 0, 1, .5, g, false); box(.4, .25, .3, '#c9cdd3', 0, .85, .62, g, false); return g; };
    const cyclists = [0, 1, 2].map(i => ({ g: W.dyn(bikeMesh()), r: crowd.add({ pos: { x: -330 + i * 30, z: 28 }, seated: true, shirt: pick(['#7fb05c', '#f6d36b', '#d6402f']), pants: '#2f2a24', hair: '#5a3b2a', hat: 'helmet', hatColor: '#f6efe0' }), x: -330 + i * 33, dir: i % 2 ? -1 : 1, cd: 0 }));
    W.R.yaps.push({ get pos() { return fox.pos; }, r: 1, fn: () => { for (const c of cyclists) if (Math.abs(c.x - fox.pos.x) < 4 && Math.abs(fox.pos.z - 28) < 3.5) { W.SFX.bell(); W.say({ anchor: new THREE.Vector3(c.x, 2.8, 28) }, t().ring, '', 1.2, 0, 'bike'); W.complete('cycliste'); } } });
    const pig = W.flock(EIF.x - 3, EIF.z + 26, 6, '#9aa3b5'); W.flock(CAFE.x - 3, CAFE.z + 4, 4, '#9aa3b5');
    for (const p of pig) p.onScare = () => { W.complete('pigeons'); };
    // Bateau-mouche
    const boat = W.dyn((() => { const g = new THREE.Group(); box(10, 1, 3, '#f6efe0', 0, .4, 0, g); box(8, 1.2, 2.6, '#8fc9df', -.5, 1.4, 0, g); box(8.2, .15, 2.8, '#f6efe0', -.5, 2.05, 0, g, false); box(1.4, .6, 3, '#d6402f', 0, .4, 0, g, false); return g; })());
    const BT = { x: -340, dir: 1 };
    W.yap(new THREE.Vector3(-290, 0, -36), 80, () => { if (fox.pos.z < -33 && Math.abs(fox.pos.x - BT.x) < 12) { W.SFX.cheer(); W.say({ anchor: new THREE.Vector3(BT.x, 3.6, SEINE) }, t().boat, '', 2.2, 0, 'boat'); W.complete('bateauMouche'); } });
    // Gare de Paris
    rails(W, -345, -235, 41); W.ground(30, 3, '#c9c2b2', -290, 36.9, .03);
    makeTrain(W, -290, 41, '#2563c9');
    W.transport({ x: -291, y: 1.4, z: 38 }, 2, () => trainMenu('paris')); W.egg('train', -286, 37, 2.6, 1.2);
    W.sign(-279, 35.4, 'paris', 0, 2);
    for (let x = -330; x < -240; x += 14) { lamp(x, 25.4); lamp(x + 7, -30); }
    bench(EIF.x - 9, EIF.z + 18, Math.PI / 2); bench(EIF.x + 9, EIF.z + 18, -Math.PI / 2);
    // Champ-de-Mars : allées de platanes de part et d'autre de la pelouse, parterres le long de l'allée centrale
    for (const ax of [-308.6, -271.4]) {
      W.ground(3.4, 38, '#e3d5b0', ax, -1, .023);
      for (let z = -17; z <= 13; z += 6) { planeTree(ax - 2.4, z, .95 + hash(z + ax) * .15); planeTree(ax + 2.4, z + 3, .95 + hash(z * 2 + ax) * .15); }
    }
    flowerBed(-294.6, -3, -293.2, 16, ['#d6402f', '#f6f2e8', '#f2b8c6']); flowerBed(-286.8, -3, -285.4, 16, ['#d6402f', '#f6f2e8', '#f2b8c6']);
    // Mobilier parisien : fontaines Wallace, kiosque à journaux, colonne Morris, vélos en libre-service, jardinières
    wallace(-309, 22.4); wallace(-271, 22.4); newsKiosk(-322, 21.6); morris(-263.5, 21.5);
    bikeRack(-249, 22.6, 6); bikeRack(-336, 22.6, 5);
    // Square à l'ouest : platanes en carré, bancs, parterre
    for (const [x, z] of [[-337, -27], [-327, -27], [-337, -15], [-327, -15], [-337, -3], [-327, -3]]) planeTree(x, z, 1 + hash(x * z) * .2);
    flowerBed(-334, -22, -330, -20, ['#b9a5e8', '#f6d36b']); flowerBed(-334, -10, -330, -8, ['#f6a07a', '#f5f0e6']);
    bench(-332, -17.5, 0, '#2f5a45'); bench(-332, -5.5, 0, '#2f5a45');
    // À l'est : terrasse ombragée et platanes devant les immeubles
    for (const [x, z] of [[-246, -26], [-246, -14], [-246, -2], [-252, -20], [-252, -8]]) planeTree(x, z, 1 + hash(x - z) * .2);
    planter(-262, -28, 2.4); planter(-262, -20, 2.4); wallace(-258, -24);
    // Manège de chevaux de bois (à l'ouest du Champ-de-Mars) et marchand de crêpes (à l'est)
    const MAN = { x: -318.5, z: -10 }, man = carousel('#d6402f', '#f6efe0'); man.root.position.set(MAN.x, 0, MAN.z); W.rig(man.root, [man.deck, ...man.horses]);
    solidCircle(MAN.x, MAN.z, 3.6, 1.2); W.ao(MAN.x, MAN.z, 4.2, 4.2, .7);
    standCart(-259, -7, -Math.PI / 2, '#2f5a45', '#d6402f'); W.patch(5, 3.5, '#d8cdb5', -259, -7, { y: .021, round: .9 });
    W.postcard(-342, -34);
    // Baguette parisienne déposée au terrier du village (quête entre deux mondes)
    W.place(it => { if (it === bag && flat2(it.pos, BURROW) < 2.2) { it.gone = true; it.mesh.visible = false; W.say(fox, t().baguette, '', 2.6, 2); W.complete('baguetteParis'); return true; } return false; });
    W.dest(it => it === bag && !W.done('baguetteParis') && fox.pos.x > -40 ? { key: 'terrier', pos: new THREE.Vector3(BURROW.x, 0, BURROW.z - .2), r: .9 } : null);
    W.update(dt => {
      const now = performance.now() / 1000;
      seine.map.offset.x = now * .03;
      if (!RM) { man.deck.rotation.y = now * .35; man.horses[0].position.y = Math.sin(now * 1.7) * .22; man.horses[1].position.y = -Math.sin(now * 1.7) * .22; }   // manège (immobile si les animations sont réduites)
      // Ascenseur : monte, panorama, redescend
      if (LIFT.t >= 0) {
        LIFT.t += dt; const H = 30.9; let y;
        if (LIFT.t < 4) y = H * (1 - Math.cos(LIFT.t / 4 * Math.PI)) / 2;
        else if (LIFT.t < 11) { y = H; if (!LIFT.top) { LIFT.top = true; W.SFX.fanfare(); W.say(fox, t().top, '', 3, 2.4); W.complete('sommet'); } }
        else if (LIFT.t < 15) y = H * (1 + Math.cos((LIFT.t - 11) / 4 * Math.PI)) / 2;
        else { y = 0; LIFT.t = -1; LIFT.top = false; }
        fox.pos.set(EIF.x, 0, EIF.z + .9); fox.vel.set(0, 0, 0); fox.lift = y; fox.ground = y; cab.position.y = Math.max(0, y - .05);
        fox.yaw += dt * (LIFT.top ? .5 : 0);
      } else if (fox.lift && flat2(fox.pos, EIF) < 4) { fox.lift = 0; fox.ground = 0; }
      // Selfie des touristes
      for (const s of selfie) { s.t += dt; s.yaw = 0; s.armR = -2.4; s.armRz = .3; s.armL = Math.sin(s.t * 3) > .5 ? -2.6 : 0; }
      selfieCd -= dt;
      if (selfieCd <= 0) { selfieCd = rnd(4, 6); W.emit(new THREE.Vector3(EIF.x, 2.6, EIF.z + 22.6), '#ffffff', { n: 6, spd: 1.5, up: .5, life: .25 });
        if (fox.pos.z > EIF.z + 22.6 && fox.pos.z < EIF.z + 26 && Math.abs(fox.pos.x - EIF.x) < 2.6) { W.SFX.pop(); W.say({ anchor: new THREE.Vector3(EIF.x, 3, EIF.z + 22) }, t().selfie, '', 2.4, 0, 'selfie'); W.complete('selfie'); } }
      // Mime figé, passants, cyclistes
      mime.t += dt; mime.armL = -1.6; mime.armR = -1.6; mime.armLz = Math.sin(mime.t * 2) * .2; mime.armRz = -Math.sin(mime.t * 2) * .2; mime.yaw = Math.PI;
      for (const w of walkers) { w.t += dt; behave.wander(w, { minX: -335, maxX: -245, minZ: -30, maxZ: 22 }, dt, 1.2); }
      for (const c of cyclists) { c.x += c.dir * dt * 6; if (c.x > -240 || c.x < -340) c.dir *= -1; const z = 28 + (c.dir > 0 ? -.6 : .6); c.g.position.set(c.x, 0, z); c.g.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; c.r.pos.set(c.x - c.dir * .2, .55, z); c.r.yaw = c.g.rotation.y; c.r.lean = .3; c.r.armL = c.r.armR = -1.2; c.r.legL = -1.4 + Math.sin(now * 8) * .5; c.r.legR = -1.4 - Math.sin(now * 8) * .5; c.r.seated = false; }
      // Bateau-mouche
      BT.x += BT.dir * dt * 3; if (BT.x > -240 || BT.x < -340) BT.dir *= -1; boat.position.set(BT.x, 0, SEINE); boat.rotation.y = BT.dir > 0 ? 0 : Math.PI; boat.position.y = Math.sin(now) * .05;
    });
    // Allées de platanes du Champ-de-Mars, colonnes Morris, jardinières de café
    for (let z = -30; z < 6; z += 6) { planeTree(EIF.x - 17.5, z, 1.05); planeTree(EIF.x + 17.5, z, 1.05); }
    morris(-262, 21.8); morris(-318, -26); morris(-250, -14);
    planter(CAFE.x - 7.5, CAFE.z + 1.2, 1.6, Math.PI / 2); planter(CAFE.x + 7.5, CAFE.z + 1.2, 1.6, Math.PI / 2);

    return { restore() { if (W.done('croissant')) { crois.gone = true; crois.mesh.visible = false; } if (W.done('beret')) { beret.gone = true; beret.mesh.visible = false; } if (W.done('baguetteParis')) { bag.gone = true; bag.mesh.visible = false; } } };
  },
});
