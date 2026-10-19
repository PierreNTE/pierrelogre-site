/* =====================================================================
   La plage de Vendée (au sud de la rivière) : dunes et oyats, promenade en bois,
   parasols, serviettes, vacanciers, baigneurs, mouettes, poste de secours, phare,
   kiosque à glaces, château de sable, trésor, course sur la plage.
   S'ouvre après 2 bêtises à la rivière : le pont est réparé.
   ===================================================================== */
import * as THREE from 'three';
import { setBuild } from '../engine.js';
import { giveUp } from '../actions.js';
import { behave } from '../crowd.js';
import { M as MAT, TX, flat2 } from '../engine.js';
import { surfaceHooks } from '../foxupdate.js';
import { fox } from '../fox.js';
import { RG, defineRegion, inRect, isOpen, needIn, regionDone, teleport } from '../regions.js';
import { pick, rnd, t } from '../state.js';
import { beachHut, bench, boat, hash, lamp, parasol, path, rock, windbreak } from './kit.js';

const B = { minX: -45, maxX: 50, minZ: 32.6, maxZ: 96 };
const SEA = 89;                                   // la mer commence ici
const KIOSK = { x: -12, z: 47 };
const TOWER = { x: 14, z: 78 };
const CASTLE = { x: -2, z: 70 };
const CONTEST = { x: 26, z: 66 };
const XMARK = { x: 41, z: 62 };
const LIGHT = { x: 46, z: 88 };
const PIER = { x: 38, z: 91 };

defineRegion({
  id: 'plage', bounds: B, mapColor: '#f0dca6',
  veg: { biome: 'beach', density: 1, rect: { minX: -44, maxX: 49, minZ: 33, maxZ: 88 }, avoid: [{ minX: -45, maxX: 50, minZ: 35.9, maxZ: 39.7 }] },
  walk: [{ minX: 8.6, maxX: 11.4, minZ: 26.8, maxZ: 34 }, { minX: -44, maxX: 49, minZ: 33.2, maxZ: SEA + 1.2 }, { minX: 36.8, maxX: 39.2, minZ: 88, maxZ: 96 }],
  adj: ['ile'], unlock: () => regionDone('riviere') >= 2, need: needIn('riviere', 2),
  spawn: new THREE.Vector3(10, 0, 36), spawnYaw: 0, gatePos: new THREE.Vector3(10, 0, 30),
  mood: { bg: '#d8ecf2', fog: '#d4e8ee', near: 50, far: 120, sun: '#fff4dc', sky: '#f0fbff', ground: '#c9b98a', life: .3, music: 'plage' },
  goals: [
    { id: 'coquillages', need: 5 }, { id: 'chateau', need: 3 }, { id: 'pietiner' }, { id: 'mouettes' }, { id: 'tresor' }, { id: 'course' }, { id: 'glace' }, { id: 'serviette' }, { id: 'dunes', need: 3 },
    { id: 'cloche', secret: true }, { id: 'phare', secret: true },
  ],
  i18n: {
    fr: {
      goals: { coquillages: "Ramasser 5 coquillages", chateau: "Construire un château de sable", pietiner: "Piétiner le château du concours", mouettes: "Faire s'envoler les mouettes", tresor: "Déterrer le trésor",
        course: "Battre le joggeur à la course jusqu'au poste de secours", glace: "Voler une glace au kiosque", serviette: "Jeter une serviette de plage à la mer", dunes: "Retrouver 3 objets perdus dans les dunes",
        cloche: "Sonner la cloche du sauveteur", phare: "Glapir au pied du phare" },
      hints: { coquillages: "Ils brillent sur le sable mouillé, près de l'eau.", chateau: "Il y a un seau et une pelle sur la plage. Appuie sur E… plusieurs fois.", pietiner: "Le château du concours est à l'est. Cours dessus (Maj).",
        mouettes: "Elles picorent les frites près de la promenade.", tresor: "Une croix est dessinée dans le sable, près des rochers à l'est. Appuie sur E dessus.", course: "Le joggeur longe la mer. Glapis près de lui pour le défier.",
        glace: "Le kiosque est sur la promenade, à l'ouest.", serviette: "Prends une serviette et lâche-la dans les vagues.", dunes: "Les dunes sont au nord de la plage. Fouille entre les oyats." },
      L: { glacier: { chase: ["Ma glace !", "Elle va fondre !", "Reviens payer !"], idle: ["Vanille, fraise, caramel au beurre salé !", "Une boule ou deux ?", "Il fait chaud, hein ?"] },
        sauveteur: { chase: ["Hé !"], idle: ["Baignade surveillée !", "Drapeau vert aujourd'hui.", "Restez entre les bouées !"] } },
      search: { glace: "Il me manque un cornet…", serviette: "Ma serviette ?!" },
      dest: { mer: "Mer" },
      eggs: { kiosk: "« Glaces artisanales. Caramel au beurre salé : spécialité locale. »", tower: "Poste de secours. Drapeau vert : baignade surveillée.", contest: "Panneau : « Concours de châteaux de sable : ne pas marcher dessus. » Tentant.",
        light: "Le phare veille sur la côte vendéenne.", boatIle: "Navette pour l'île : départ quand le capitaine le décidera.", xmark: "Une croix dans le sable. Un vrai X de carte au trésor !" },
      signs: { plage: "Plage →", ile: "Île →" },
      cards: { plage: "Bons baisers de la plage de Vendée ! Sable fin, mouettes voleuses et caramel au beurre salé. Le renard a pris un coup de soleil sur les oreilles." },
      castle: ["Une tour !", "Deux tours !", "Un vrai château !"], squash: "Oups… le concours est annulé.", raceGo: "Le joggeur relève le défi : jusqu'au poste de secours !", raceWin: "Le renard gagne ! Le joggeur est vexé.", raceLose: "Perdu… le joggeur a gagné.",
      treasure: "Un coffre ! Dedans : une vieille pièce et un mot « Bravo, petit renard ».", bell: "DING DING ! Tout le monde sort de l'eau !", lighthouse: "Le phare répond d'un éclat de lumière.", boatGo: "En route pour l'île…", boatClosed: "Le capitaine fait la sieste. Reviens quand tout le monde parlera de toi.",
    },
    en: {
      goals: { coquillages: "Collect 5 shells", chateau: "Build a sandcastle", pietiner: "Trample the contest sandcastle", mouettes: "Make the gulls fly away", tresor: "Dig up the treasure",
        course: "Beat the jogger in a race to the lifeguard tower", glace: "Steal an ice cream from the kiosk", serviette: "Throw a beach towel into the sea", dunes: "Find 3 lost things in the dunes",
        cloche: "Ring the lifeguard's bell", phare: "Yap at the foot of the lighthouse" },
      hints: { coquillages: "They shine on the wet sand near the water.", chateau: "There's a bucket and spade on the beach. Press E… several times.", pietiner: "The contest castle is to the east. Run over it (Shift).",
        mouettes: "They peck at fries near the boardwalk.", tresor: "A cross is drawn in the sand near the eastern rocks. Press E on it.", course: "The jogger runs along the shore. Yap near him to challenge him.",
        glace: "The kiosk is on the boardwalk, to the west.", serviette: "Grab a towel and drop it in the waves.", dunes: "The dunes are north of the beach. Search among the marram grass." },
      L: { glacier: { chase: ["My ice cream!", "It'll melt!", "Come back and pay!"], idle: ["Vanilla, strawberry, salted butter caramel!", "One scoop or two?", "Hot today, huh?"] },
        sauveteur: { chase: ["Hey!"], idle: ["Lifeguard on duty!", "Green flag today.", "Stay between the buoys!"] } },
      search: { glace: "I'm missing a cone…", serviette: "My towel?!" },
      dest: { mer: "Sea" },
      eggs: { kiosk: "\"Homemade ice cream. Salted butter caramel: local speciality.\"", tower: "Lifeguard station. Green flag: supervised swimming.", contest: "Sign: \"Sandcastle contest: do not step on.\" Tempting.",
        light: "The lighthouse watches over the Vendée coast.", boatIle: "Ferry to the island: leaves whenever the captain feels like it.", xmark: "A cross in the sand. A real treasure-map X!" },
      signs: { plage: "Beach →", ile: "Island →" },
      cards: { plage: "Greetings from Vendée beach! Fine sand, thieving gulls and salted butter caramel. The fox got sunburnt ears." },
      castle: ["One tower!", "Two towers!", "A real castle!"], squash: "Oops… the contest is cancelled.", raceGo: "The jogger accepts: race to the lifeguard tower!", raceWin: "The fox wins! The jogger is sulking.", raceLose: "Lost… the jogger won.",
      treasure: "A chest! Inside: an old coin and a note: \"Well done, little fox\".", bell: "DING DING! Everyone out of the water!", lighthouse: "The lighthouse answers with a flash of light.", boatGo: "Off to the island…", boatClosed: "The captain is napping. Come back when everyone is talking about you.",
    },
  },
  build(W) {
    const { box, cyl, sph, cone, solidBox, solidCircle } = W;
    // Sable, sable mouillé, mer
    W.patch(102, 60.5, '#efdcaa', 2.5, 65.2, { round: .25, jitter: .5 }); W.mottle({ minX: -40, maxX: 46, minZ: 50, maxZ: 84 }, ['#f3e2b4', '#e9d4a0', '#f6e6bc'], 16);
    W.ground(96, 5, '#d9c18e', 2.5, SEA - 1.5, .016);
    const sea = new THREE.MeshLambertMaterial({ color: '#ffffff', map: TX.water.clone(), transparent: true, opacity: .95 }); sea.map.repeat.set(26, 12); sea.map.needsUpdate = true;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(260, 90), sea); water.rotation.x = -Math.PI / 2; water.position.set(10, .06, SEA + 45); W.dyn(water, false);
    const foamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7 });
    const foam = [0, 1, 2].map(i => { const m = new THREE.Mesh(new THREE.PlaneGeometry(100, .5), foamMat); m.rotation.x = -Math.PI / 2; m.position.set(2.5, .08, SEA + i * 2); W.dyn(m, false); return m; });
    // Pont réparé (apparaît à l'ouverture)
    // Pont en dos d'âne : tablier de planches qui suit l'arche, garde-corps ; le renard monte dessus (fox.lift)
    const arch = lz => .2 + .32 * Math.sin(Math.PI * Math.min(1, Math.max(0, (lz + 2.9) / 5.8)));
    const bridge = new THREE.Group();
    for (let i = 0; i < 11; i++) { const lz = -2.75 + i * .55, p = box(2.5, .12, .57, i % 2 ? '#b8834a' : '#a8764a', 0, arch(lz) - .06, lz, bridge); p.rotation.x = -Math.atan((arch(lz + .1) - arch(lz - .1)) / .2); }
    for (const x of [-1.2, 1.2]) {
      for (let i = 0; i < 7; i++) { const lz = -2.7 + i * .9; box(.13, .64, .13, '#7a4f33', x, arch(lz) + .27, lz, bridge, false); }
      for (let i = 0; i < 6; i++) { const a = -2.7 + i * .9, b = a + .9, r = box(.11, .1, .94, '#6b4630', x, (arch(a) + arch(b)) / 2 + .56, (a + b) / 2, bridge, false); r.rotation.x = -Math.atan((arch(b) - arch(a)) / .9); }
    }
    bridge.position.set(10, 0, 30); W.dyn(bridge); bridge.scale.set(1, 1, .001); bridge.visible = false; bridge.userData.gate = true; bridge.userData.gone = true;
    // Dunes et oyats (nord de la plage) : un cordon de dunes avec trois passages, ganivelles en châtaignier
    const oyat = (x, y, z, n = 6, k = 1) => { for (let i = 0; i < n; i++) { const a = i / n * 6.28 + x; const c = cone(.05 * k, rnd(.6, 1) * k, ['#a3b56a', '#b8c27a', '#94a85e'][i % 3], x + Math.cos(a) * .12, y + .35 * k, z + Math.sin(a) * .12, 3, undefined, false); c.rotation.set(Math.sin(a) * .35, 0, -Math.cos(a) * .35); } };
    const ganivelle = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len, ang = Math.atan2(-uz, ux);
      for (let d = 0, i = 0; d <= len; d += .17, i++) { const h = .78 + hash(i * 1.3 + x0) * .14; const sl = box(.07, h, .025, ['#b89a72', '#a88a64', '#c4a67e'][i % 3], x0 + ux * d, h / 2, z0 + uz * d, undefined, false); sl.rotation.set(0, ang, (hash(i + z0) - .5) * .08); }
      for (const y of [.24, .6]) { const wv = box(len, .025, .025, '#7a6a5a', (x0 + x1) / 2, y, (z0 + z1) / 2, undefined, false); wv.rotation.y = ang; }
      for (let d = 0; d <= len + .01; d += 2.4) cyl(.05, .06, 1, '#8a6a4a', x0 + ux * d, .5, z0 + uz * d, 5, undefined, false);
      if (Math.abs(uz) < .02) solidBox((x0 + x1) / 2, z0, len + .1, .2, .9); else solidBox(x0, (z0 + z1) / 2, .2, len + .1, .9);
    };
    const GAPS = [[-21.5, -18.5], [8.4, 11.6], [28.5, 31.5]], DUNE = { z: 37.8, x0: -44, x1: 49 };
    const segs = []; { let a = DUNE.x0; for (const [g0, g1] of GAPS) { segs.push([a, g0]); a = g1; } segs.push([a, DUNE.x1]); }
    for (const [xa, xb] of segs) {
      for (let x = xa + 1.2, i = 0; x < xb - 1; x += 2.3, i++) {
        const r = 2 + hash(x) * .9, zz = DUNE.z + (hash(x * 1.7) - .5) * 1.2, end = Math.min(x - xa, xb - x) < 2.2 ? .7 : 1;
        const d = sph(r, ['#ead6a2', '#e4cf98', '#efdcab'][i % 3], x, -.55, zz, undefined, 2, false); d.scale.set(1.25, (.36 + hash(x * 3.3) * .14) * end, .85); d.castShadow = false;
        const top = -.55 + r * d.scale.y;
        oyat(x + rnd(-.6, .6), top - .15, zz + rnd(-.4, .4), 7); if (hash(x * 5.1) > .4) oyat(x + rnd(-1.4, 1.4), top - .35, zz + rnd(-.9, .9), 5, .85);
      }
      solidBox((xa + xb) / 2, DUNE.z, xb - xa - .6, 3.2, 1);
      ganivelle(xa + .3, 35.6, xb - .3, 35.6);
    }
    // Les passages : ganivelles de part et d'autre, chemin de sable qui serpente jusqu'à la promenade
    for (const [g0, g1] of GAPS) { ganivelle(g0 + .1, 35.8, g0 + .1, 39.8); ganivelle(g1 - .1, 35.8, g1 - .1, 39.8); }
    W.R.noVeg.push(...path([[10, 32.6], [10.3, 35], [9.6, 37.6], [10.4, 40.6], [9.7, 43.2], [10, 44.9]], 2, { style: 'sand', fade: [false, false], seed: 21 }));
    W.R.noVeg.push(...path([[-20, 35.2], [-19.6, 38], [-20.5, 41], [-20, 44.9]], 1.6, { style: 'sand', fade: [true, false], seed: 22 }));
    W.R.noVeg.push(...path([[30, 35.2], [30.4, 38], [29.6, 41], [30, 44.9]], 1.6, { style: 'sand', fade: [true, false], seed: 23 }));
    for (let x = -42; x < 48; x += 1.6) if (!GAPS.some(([a, b]) => x > a - 1 && x < b + 1) && hash(x * 2.7) > .35) oyat(x + rnd(-.5, .5), 0, rnd(33.4, 35.2), 5, .75);
    // Promenade en bois
    W.ground(92, 3.4, MAT('#c9a074'), 2.5, 46.5, .03);
    for (let x = -43.3; x < 48.4; x += .55) box(.035, .012, 3.4, x % 2.2 < .55 ? '#a8835a' : '#b8936a', x, .036, 46.5, undefined, false);   // planches
    for (const z of [44.8, 48.2]) box(92, .08, .14, '#8a6a4a', 2.5, .05, z, undefined, false);
    for (let x = -42; x <= 46; x += 8) { lamp(x, 44.9, 3); if (x % 16 === 0) bench(x + 3, 45, 0, '#5d8fb0'); }
    // Kiosque à glaces
    { const g = new THREE.Group(); g.position.set(KIOSK.x, 0, KIOSK.z); W.R.group.add(g); box(3, 1.1, 1.6, '#f6efe0', 0, .55, 0, g); box(3.2, .12, 1.8, '#f2b8c6', 0, 1.14, 0, g, false);
      [-1.4, 1.4].forEach(x => cyl(.06, .06, 1.6, '#e9e6df', x, 1.9, .7, 5, g)); for (let i = 0; i < 5; i++) box(.64, .1, 2, i % 2 ? '#f6efe0' : '#f2b8c6', -1.28 + i * .64, 2.7, .2, g, false);
      const cone_ = cone(.4, .8, '#e2a548', 0, 3.13, 0, 6, g); cone_.rotation.x = Math.PI; sph(.42, '#f2b8c6', 0, 3.68, 0, g, 1); /* posée sur l'auvent */ solidBox(KIOSK.x, KIOSK.z, 3, 1.6, 1.1); }
    W.egg('kiosk', KIOSK.x + 2.4, KIOSK.z + 1.2, 2.6, 1.4);
    const glacier = W.npc({ id: 'glacier', x: KIOSK.x, z: KIOSK.z - 1.3, yaw: 0, shirt: '#f2b8c6', pants: '#f6efe0', hair: '#2f2a24', apron: true,
      route: [{ p: new THREE.Vector3(KIOSK.x - .8, 0, KIOSK.z - 1.3), wait: 3, act: 'arrange', yaw: 0 }, { p: new THREE.Vector3(KIOSK.x + .8, 0, KIOSK.z - 1.3), wait: 3, act: 'arrange', yaw: 0 }] });
    const ice = W.item({ kind: 'glace', x: KIOSK.x + .9, z: KIOSK.z + .55, y: 1.22, owner: glacier, sh: .2, bring: new THREE.Vector3(KIOSK.x + .9, 0, KIOSK.z - 1.3),
      build: () => { const g = new THREE.Group(); const c = cone(.1, .3, '#e2a548', 0, 0, 0, 6, g); c.rotation.x = Math.PI; sph(.12, '#f6efe0', 0, .18, 0, g, 1); sph(.1, '#c9894f', 0, .3, 0, g, 1); return g; } });
    ice.onGrab = () => W.complete('glace');
    // Parasols, serviettes (dont une attrapable), vacanciers
    const towels = [];
    [[-34, 60, '#d6402f'], [-24, 66, '#2563c9'], [-14, 58, '#f6d36b'], [-6, 79, '#7fb05c'], [4, 62, '#e8742a'], [20, 58, '#8a7cc2'], [30, 76, '#d9705a'], [-30, 78, '#5d8fb0']].forEach(([x, z, c], i) => {
      parasol(x, z, c, '#f6efe0'); W.ground(1.2, 2.2, c, x + 1.2, z + .4, .03, .2); W.ground(1.2, .3, '#f6efe0', x + 1.2, z - .5, .032, .2); towels.push({ x: x + 1.2, z: z + .4, i }); });
    const towel = W.item({ kind: 'serviette', x: 22, z: 59.4, y: .05, sh: .4, build: () => { const g = new THREE.Group(); box(1.1, .04, .7, '#e8742a', 0, 0, 0, g); box(1.1, .045, .14, '#f6efe0', 0, 0, .2, g, false); return g; } });
    const crowd = W.crowd(26);
    const lying = towels.slice(0, 6).map((tw, i) => crowd.add({ pos: { x: tw.x, z: tw.z - .7 }, yaw: Math.PI, bodyX: -Math.PI / 2, shirt: pick(['#f2c7a5', '#e9b48f']), pants: pick(['#2563c9', '#d6402f', '#2f2a24']), hair: pick(['#5a3b2a', '#c9a33d', '#2f2a24']), lie: true }));
    for (const a of lying) a.pos.y = .26;
    const walkers = [0, 1, 2, 3].map(i => crowd.add({ pos: { x: rnd(-30, 30), z: rnd(55, 80) }, shirt: pick(['#f6efe0', '#8fc9df', '#f2b8c6', '#f6d36b']), pants: pick(['#2563c9', '#5d8fb0', '#d9705a']), hair: pick(['#5a3b2a', '#c9a33d']), hat: i % 2 ? 'cap' : null, hatColor: '#f6efe0' }));
    const swimmers = [0, 1, 2, 3, 4].map(i => crowd.add({ pos: { x: -20 + i * 9, z: SEA + 3 + (i % 2) * 2 }, shirt: '#f2c7a5', pants: '#2563c9', hair: pick(['#5a3b2a', '#2f2a24', '#c9a33d']), swim: i }));
    const kids = [0, 1].map(i => crowd.add({ pos: { x: CONTEST.x - 1.5 + i * 3, z: CONTEST.z + 1.8 }, scale: .7, yaw: Math.PI, shirt: pick(['#f6d36b', '#7fb05c']), pants: '#2563c9', hair: '#c9a33d' }));
    const jogger = crowd.add({ pos: { x: -36, z: SEA - 3 }, shirt: '#d6402f', pants: '#2f3640', hair: '#2f2a24', hat: 'cap', hatColor: '#f6efe0' });
    // Poste de secours + cloche, sauveteur
    { const g = new THREE.Group(); g.position.set(TOWER.x, 0, TOWER.z); W.R.group.add(g); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(.08, .08, 3, '#f6efe0', a, 1.5, b, 5, g)); box(2.6, .18, 2.6, '#d6402f', 0, 3, 0, g); box(2.4, 1.2, 2.4, '#f6efe0', 0, 3.7, 0, g); box(2.8, .14, 2.8, '#d6402f', 0, 4.35, 0, g, false);
      cyl(.04, .04, 2.4, '#d9d4c8', 1.2, 5.5, 1.2, 4, g); box(.8, .5, .03, '#7fb05c', 1.62, 6.4, 1.2, g, false); cone(.25, .3, '#e2a548', -1.6, 2.2, 1.4, 8, g).rotation.x = Math.PI; box(.68, .05, .05, '#f6efe0', -1.32, 2.42, 1.2, g, false).rotation.y = .5; cyl(.012, .012, .1, '#5a4a3a', -1.6, 2.38, 1.4, 3, g, false);   // cloche suspendue à une potence
      solidBox(TOWER.x, TOWER.z, 2.4, 2.4, 3); }
    W.egg('tower', TOWER.x - 2.2, TOWER.z + 1.2, 3, 1.4);
    W.interact({ x: TOWER.x - 1.6, y: 1.6, z: TOWER.z + 2 }, 1.4, () => { W.SFX.bell(); W.say({ anchor: new THREE.Vector3(TOWER.x, 5.5, TOWER.z) }, t().bell, '', 2.4, 0, 'bell'); bellT = 6; W.complete('cloche'); });
    let bellT = 0;
    W.npc({ id: 'sauveteur', x: TOWER.x + 2, z: TOWER.z + 2, yaw: 0, shirt: '#d6402f', pants: '#d6402f', hair: '#c9a33d',
      route: [{ p: new THREE.Vector3(TOWER.x + 2, 0, TOWER.z + 2.4), wait: 5, act: 'look', yaw: 0 }, { p: new THREE.Vector3(TOWER.x - 4, 0, TOWER.z + 6), wait: 4, act: 'point', yaw: 0 }] });
    // Château de sable (à construire), château du concours (à piétiner)
    W.disc(1.4, '#e3cf9c', CASTLE.x, CASTLE.z, .02); cyl(.2, .16, .3, '#d6402f', CASTLE.x + 1.6, .15, CASTLE.z + .4, 8); box(.06, .5, .2, '#f6d36b', CASTLE.x + 1.9, .25, CASTLE.z + .9);
    const castle = W.dyn((() => { const g = new THREE.Group(); const parts = []; parts.push(cyl(.9, 1, .5, '#e3c98e', 0, .25, 0, 10, g)); [[-.55, -.55], [.55, -.55], [-.55, .55], [.55, .55]].forEach(([x, z]) => { parts.push(cyl(.22, .26, .8, '#e3c98e', x, .7, z, 8, g)); }); parts.push(cyl(.35, .4, 1.1, '#e3c98e', 0, 1, 0, 8, g)); parts.push(cone(.4, .5, '#e3c98e', 0, 1.8, 0, 8, g)); g.userData.parts = parts; return g; })(), false);
    castle.position.set(CASTLE.x, 0, CASTLE.z);
    const stage = () => (W.run.progress.chateau?.size || 0) + (W.done('chateau') ? 3 : 0);
    const showCastle = () => { const st = Math.min(3, stage()); const P = castle.userData.parts; P.forEach((p, i) => { p.visible = st >= (i === 0 ? 1 : i < 5 ? 2 : 3); }); };
    W.interact({ x: CASTLE.x, y: .8, z: CASTLE.z }, 2, () => { const k = W.run.progress.chateau?.size || 0; W.SFX.pull(); W.emit(new THREE.Vector3(CASTLE.x, .4, CASTLE.z), '#e3cf9c', { n: 14, spd: 2, up: 3 }); W.progress('chateau', 'c' + k); W.say(fox, t().castle[Math.min(2, k)], '', 1.4, 2); showCastle(); }, () => !W.done('chateau'));
    const contest = W.dyn((() => { const g = new THREE.Group(); cyl(1.2, 1.4, .6, '#e3c98e', 0, .3, 0, 10, g); [[-.8, 0], [.8, 0], [0, -.8], [0, .8]].forEach(([x, z]) => cyl(.25, .3, .9, '#e3c98e', x, .9, z, 8, g)); cyl(.45, .5, 1.4, '#e3c98e', 0, 1.2, 0, 8, g); cone(.5, .5, '#e3c98e', 0, 2.15, 0, 8, g); cyl(.02, .02, .6, '#8a5a3b', 0, 2.6, 0, 4, g, false); box(.3, .2, .02, '#d6402f', .15, 2.8, 0, g, false); return g; })());
    contest.position.set(CONTEST.x, 0, CONTEST.z);
    W.egg('contest', CONTEST.x + 2.2, CONTEST.z - 1.4, 2.6, 1.4);
    W.zone(new THREE.Vector3(CONTEST.x, 0, CONTEST.z), 1.5, () => { contest.scale.set(1.3, .2, 1.3); W.SFX.crack(); W.emit(new THREE.Vector3(CONTEST.x, .5, CONTEST.z), '#e3cf9c', { n: 30, spd: 3, up: 4 }); W.say({ anchor: new THREE.Vector3(CONTEST.x, 2.4, CONTEST.z) }, t().squash, '', 2, 0, 'squash'); kidsSad = 4; W.complete('pietiner'); }, { cond: () => fox.running && !W.done('pietiner') });
    let kidsSad = 0;
    // Mouettes (près des frites de la promenade)
    box(.4, .1, .3, '#f6d36b', 4, .06, 49.5); const gulls = W.flock(4, 49.8, 5, '#ffffff'); for (const g of gulls) g.onScare = () => W.complete('mouettes');
    W.flock(-28, 70, 3, '#ffffff');
    // Coquillages (sable mouillé), objets perdus dans les dunes
    const shell = () => { const g = new THREE.Group(); const s = sph(.14, '#f6c9b8', 0, 0, 0, g, 0); s.scale.set(1, .4, .9); for (let i = -1; i <= 1; i++) box(.02, .05, .2, '#e8a090', i * .07, .04, 0, g, false); return g; };
    W.pickups('coquillages', [[-38, 86], [-22, 87.4], [-8, 85.8], [6, 87.6], [24, 86.4], [33, 87.8], [44, 84]], shell, { y: .08, spin: false });
    const lost = [() => { const g = new THREE.Group(); [-.12, .12].forEach(x => { const l = cyl(.1, .1, .03, '#2f2a24', x, 0, 0, 10, g); l.rotation.x = Math.PI / 2; }); box(.08, .02, .02, '#2f2a24', 0, 0, 0, g, false); return g; },
      () => { const g = new THREE.Group(); box(.18, .04, .44, '#2563c9', 0, 0, 0, g); box(.03, .06, .2, '#f6efe0', 0, .04, .05, g, false); return g; },
      () => { const g = new THREE.Group(); cyl(.24, .24, .04, '#d6402f', 0, 0, 0, 12, g); return g; }];
    const dPts = [[-36, 41.6], [-12, 42.6], [24, 41.4], [40, 42.8]];
    W.pickups('dunes', dPts, () => lost[Math.floor(Math.random() * 3)](), { y: .15, spin: true });
    // Trésor (croix dans le sable près des rochers est)
    [[44, 58, 1.8], [47, 66, 2.2], [45, 72, 1.6], [47, 80, 2], [43, 84, 1.4]].forEach(([x, z, s]) => rock(x, z, s, '#8d877c'));
    W.ground(1.2, .18, '#a8764a', XMARK.x, XMARK.z, .03, .785); W.ground(1.2, .18, '#a8764a', XMARK.x, XMARK.z, .031, -.785);
    W.egg('xmark', XMARK.x - 1.4, XMARK.z, 1.6, 1.2);
    const chest = W.dyn((() => { const g = new THREE.Group(); box(.8, .5, .55, '#8a5a3b', 0, .25, 0, g); box(.82, .2, .57, '#a8764a', 0, .58, 0, g); box(.84, .06, .1, '#f6d36b', 0, .4, .28, g, false); return g; })());
    chest.position.set(XMARK.x, -1, XMARK.z);
    W.interact({ x: XMARK.x, y: .6, z: XMARK.z }, 1.3, () => { W.SFX.pull(); W.emit(new THREE.Vector3(XMARK.x, .3, XMARK.z), '#e3cf9c', { n: 26, spd: 2.4, up: 4 }); chestUp = 0; setTimeout(() => { W.SFX.acorn(); W.say({ anchor: new THREE.Vector3(XMARK.x, 2, XMARK.z) }, t().treasure, 'note', 3.6, 0, 'chest'); W.complete('tresor'); }, 700); }, () => !W.done('tresor'));
    let chestUp = W.done('tresor') ? 1 : -1;
    // Phare, ponton et bateau pour l'île
    { const g = new THREE.Group(); g.position.set(LIGHT.x, 0, LIGHT.z); W.R.group.add(g); cyl(1.25, 1.35, .5, '#b8ad9a', 0, .25, 0, 12, g);   // socle de pierre
      for (let i = 0; i < 5; i++) cyl(.95 - i * .1, 1 - i * .1, 1.6, i % 2 ? '#d6402f' : '#f6efe0', 0, .5 + .8 + i * 1.6, 0, 14, g);
      box(.5, .9, .1, '#4a3a2c', 0, .95, .99, g, false); box(.24, .34, .06, '#2f3640', 0, 4.4, .75, g, false); box(.24, .34, .06, '#2f3640', 0, 6.9, .63, g, false);   // porte et fenêtres
      // galerie (plancher et garde-corps), lanterne vitrée à montants, coupole et épi
      cyl(.92, .78, .16, '#2f3640', 0, 8.58, 0, 14, g); cyl(.9, .9, .05, '#2f3640', 0, 9.05, 0, 14, g, false);
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; cyl(.025, .025, .42, '#2f3640', Math.cos(a) * .86, 8.86, Math.sin(a) * .86, 4, g, false); }
      cyl(.5, .5, .18, '#2f3640', 0, 8.75, 0, 12, g, false); cyl(.46, .46, .62, '#fff1b8', 0, 9.15, 0, 12, g, false);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; box(.05, .64, .05, '#2f3640', Math.cos(a) * .47, 9.15, Math.sin(a) * .47, g, false); }
      cone(.62, .55, '#d6402f', 0, 9.73, 0, 12, g); sph(.09, '#2f3640', 0, 10.06, 0, g, 1, false);
      solidCircle(LIGHT.x, LIGHT.z, 1.3, 8); }
    const beam = W.dyn(new THREE.Mesh(new THREE.ConeGeometry(.6, 6, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: .35, depthWrite: false, side: THREE.DoubleSide })), false);
    beam.position.set(LIGHT.x, 9.15, LIGHT.z); beam.rotation.z = Math.PI / 2; beam.visible = false; beam.userData.gone = true;
    W.egg('light', LIGHT.x - 2.2, LIGHT.z - .8, 3, 1.6);
    W.yap(new THREE.Vector3(LIGHT.x, 0, LIGHT.z), 3.4, () => { beamT = 4; beam.userData.gone = false; beam.visible = true; W.say({ anchor: new THREE.Vector3(LIGHT.x, 10, LIGHT.z) }, t().lighthouse, 'note', 2, 0, 'light'); W.complete('phare'); });
    let beamT = 0;
    W.ground(2.4, 8, MAT('#b8834a'), PIER.x, PIER.z + 2, .1); for (let i = 0; i < 5; i++) [-1.1, 1.1].forEach(dx => cyl(.1, .1, 1.2, '#7a5236', PIER.x + dx, .3, PIER.z - 1.5 + i * 2, 5));
    boat(PIER.x + 3, PIER.z + 4, 0, '#f6efe0');
    W.sign(PIER.x - 2, PIER.z - 2.6, 'ile', -.4, 1.8); W.egg('boatIle', PIER.x, PIER.z + 4, 2, 2);
    W.interact({ x: PIER.x, y: 1, z: PIER.z + 4.5 }, 1.8, () => {
      if (!isOpen('ile')) { W.say(fox, t().boatClosed, '', 2.6, 2); return; }
      W.toast(t().boatGo); W.SFX.horn(); W.run.flags.boat = (W.run.flags.boat || 0) + 1; teleport(RG.ile.spawn.x, RG.ile.spawn.z, 0);
    });
    boat(-30, SEA - 4, 1.2, '#5d8fb0', false); boat(-18, SEA + 6, .4, '#f6efe0'); boat(30, SEA + 10, -.3, '#d9705a');
    // Sol qui crisse : sable / bois
    surfaceHooks.push(p => inRect(p, B) && p.z > 33 ? (Math.abs(p.z - 46.5) < 1.7 ? 'wood' : 'sand') : null);
    // Objets dans la mer. Ça compte dès l'écume, là où commence l'anneau qui guide le renard (SEA + .4, rayon 1,2) :
    // objet lâché à partir de là, ou renard qui a les pattes dans l'eau, même s'il longe la plage ou s'est retourné.
    const WET = SEA - .8;
    W.place(it => {
      if (!inRect(it.pos, B)) return false;
      const byFox = !fox.held && flat2(it.pos, fox.pos) < 1.3 && fox.pos.z >= WET;
      if (it.pos.z < WET && !byFox) return false;
      it.pos.z = Math.max(it.pos.z, SEA + .3);   // il part des vagues, pas du sable mouillé
      it.gone = true; it.held = false; W.SFX.splashSmall(); W.emit(new THREE.Vector3(it.pos.x, .3, it.pos.z), '#ffffff', { n: 12, spd: 1.6, up: 3 });
      if (it === towel) W.complete('serviette');
      giveUp(it); drift.push({ it, keep: it === towel }); return true;
    });
    W.dest(it => it === towel && !W.done('serviette') ? { key: 'mer', pos: new THREE.Vector3(fox.pos.x, 0, SEA + .4), r: 1.2 } : null);
    const drift = [];
    // Course contre le joggeur
    const race = { on: false, t: 0 };
    W.R.yaps.push({ get pos() { return jogger.pos; }, r: 3.5, fn: () => { if (race.on || W.done('course')) return; race.on = true; race.t = 0; jogger.k = 0; W.toast(t().raceGo); W.SFX.whistle(); } });
    // Ouverture : le pont se construit
    W.R.gates = [show => { bridge.visible = true; bridge.userData.gone = false; if (RG.riviere.brokenSign) { RG.riviere.brokenSign.visible = false; RG.riviere.brokenSign.userData.gone = true; } if (RG.riviere.bridgeEgg) RG.riviere.bridgeEgg.r = 0; if (!show) { bridge.scale.z = 1; return; } let k = 0; const step = () => { k = Math.min(1, k + .025); bridge.scale.z = Math.max(.001, k); if (k < 1) requestAnimationFrame(step); }; setTimeout(step, 700); if (RG.riviere.brokenSign) { RG.riviere.brokenSign.visible = false; RG.riviere.brokenSign.userData.gone = true; } }];
    showCastle();
    let onBridge = false;
    W.update(dt => {
      const now = performance.now() / 1000;
      // Sur le pont : le renard suit la courbe du tablier
      const ob = bridge.visible && !bridge.userData.gone && Math.abs(fox.pos.x - 10) < 1.35 && Math.abs(fox.pos.z - 30) < 2.95;
      if (ob) { fox.lift = fox.ground = arch(fox.pos.z - 30) * bridge.scale.z; onBridge = true; } else if (onBridge) { fox.lift = fox.ground = 0; onBridge = false; }
      sea.map.offset.set(now * .01, Math.sin(now * .5) * .03);
      foam.forEach((f, i) => { const k = ((now * .25 + i / 3) % 1); f.position.z = SEA + 2.5 - k * 3; f.material.opacity = Math.sin(k * Math.PI) * .7; });
      // Vacanciers
      for (const a of lying) { a.t += dt; a.armR = Math.sin(a.t * .5) > .9 ? -1 : 0; a.pos.y = .26; }
      for (const a of walkers) { a.t += dt; behave.wander(a, { minX: -38, maxX: 38, minZ: 52, maxZ: 84 }, dt, 1.1); }
      for (const a of swimmers) { a.t += dt; const out = bellT > 0; const tz = out ? SEA - 2 : SEA + 3 + (a.swim % 2) * 2; a.pos.z += (tz - a.pos.z) * Math.min(1, dt * (out ? 1.2 : .3)); a.pos.y = a.pos.z > SEA ? -.95 + Math.sin(a.t * 2 + a.swim) * .08 : 0; a.armL = -2.6 + Math.sin(a.t * 3) * .6; a.armR = -2.6 - Math.sin(a.t * 3) * .6; a.yaw = Math.PI; a.moving = out; a.walk += dt * 4; }
      for (const k of kids) { k.t += dt; if (kidsSad > 0) { k.lean = .4; behave.rest(k); k.armL = k.armR = -.3; } else { behave.cheer(k, k.t * .5); k.jump = 0; } }
      if (kidsSad > 0) kidsSad -= dt; if (bellT > 0) bellT -= dt;
      // Joggeur : aller-retour le long de l'eau, ou course
      jogger.t += dt;
      if (race.on) {
        race.t += dt; const d = behave.walkTo(jogger, TOWER.x, SEA - 3, 6.6, dt); jogger.lean = .2;
        if (flat2(fox.pos, { x: TOWER.x, z: TOWER.z + 2 }) < 3.2) { race.on = false; W.toast(t().raceWin); W.SFX.cheer(); W.complete('course'); }
        else if (d < .3 || race.t > 30) { race.on = false; W.toast(t().raceLose); }
      } else behave.loop(jogger, [[-38, SEA - 3], [38, SEA - 3]], dt, 4.2);
      // Coffre, phare, objets à la dérive
      if (chestUp >= 0 && chestUp < 1) { chestUp = Math.min(1, chestUp + dt * 1.5); chest.position.y = -1 + chestUp; }
      if (beamT > 0) { beamT -= dt; beam.rotation.y = now * 2; if (beamT <= 0) { beam.visible = false; beam.userData.gone = true; } }
      for (let i = drift.length - 1; i >= 0; i--) { const { it, keep } = drift[i]; it.pos.z += dt * 1.2; it.pos.y = .1 + Math.sin(now * 2 + i) * .05; if (it.pos.z > SEA + 14) { drift.splice(i, 1); if (keep) it.mesh.visible = false; else { it.gone = false; it.pos.copy(it.home); it.noticed = false; it.missAt = null; if (it.kind === 'carotte') it.planted = true; } } }
    });
    // Cabines de plage, paravents, ballons, voiliers au large, cerf-volant
    ['#2563c9', '#d6402f', '#7fb05c'].forEach((c, i) => beachHut(-40 + i * 2.1, 51, c)); ['#f6d36b', '#2563c9', '#d6402f'].forEach((c, i) => beachHut(30 + i * 2.1, 51, c));
    windbreak(-31.5, 62.4, .3); windbreak(11, 71, -.2, '#2563c9'); windbreak(-9, 58, .1, '#7fb05c');
    [[-20, 66, '#d6402f'], [8, 64, '#2563c9'], [26, 72, '#f6d36b']].forEach(([x, z, c]) => { W.sph(.3, c, x, .3, z); W.sph(.302, '#f6efe0', x, .3, z, undefined, 0, false).scale.set(1, .35, 1); });
    const sails = [0, 1].map(i => { const g = new THREE.Group(); setBuild(g); boat(0, 0, Math.PI / 2, i ? '#d9705a' : '#f6efe0'); setBuild(W.R.group); g.position.set(-30 + i * 40, 0, SEA + 11 + i * 6); return W.dyn(g); });
    const kite = W.dyn((() => { const g = new THREE.Group(); const k = W.box(.9, .9, .05, '#e8742a', 0, 0, 0, g); k.rotation.z = Math.PI / 4; W.box(.04, .9, .06, '#f6efe0', 0, 0, 0, g, false); for (let i = 0; i < 4; i++) W.box(.18, .1, .04, ['#d6402f', '#2563c9'][i % 2], 0, -.7 - i * .3, 0, g, false); return g; })());
    W.update(() => { const n = performance.now() / 1000; sails.forEach((g, i) => { g.position.x = -40 + ((n * (.9 + i * .4) + i * 30) % 90); g.position.y = Math.sin(n * 1.2 + i) * .08; g.rotation.z = Math.sin(n * .9 + i) * .04; }); kite.position.set(-14 + Math.sin(n * .5) * 3, 9 + Math.sin(n * .9) * 1.2, 74 + Math.cos(n * .4) * 1.5); kite.rotation.z = Math.sin(n * 1.3) * .3; });

    return {
      restore() {
        showCastle(); if (W.done('pietiner')) contest.scale.set(1.3, .2, 1.3);
        if (W.done('tresor')) { chestUp = 1; chest.position.y = 0; }
        if (W.done('serviette')) { towel.gone = true; towel.mesh.visible = false; }
        if (W.done('glace')) { ice.gone = true; ice.mesh.visible = false; }
      },
    };
  },
});
