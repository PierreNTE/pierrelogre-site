/* =====================================================================
   Nantes (en train depuis la gare) : le grand éléphant mécanique des Machines de l'Île
   (pattes, oreilles, trompe qui arrose, vapeur, bruits de mécanique, passagers sur son dos),
   le carrousel marin, la grue jaune, le tram, les anneaux du quai, la tour de la biscuiterie.
   S'ouvre quand un billet a été composté à la gare.
   ===================================================================== */
import * as THREE from 'three';
import { behave } from '../crowd.js';
import { M as MAT, TX, blob, flat2, mk } from '../engine.js';
import { fox } from '../fox.js';
import { defineRegion } from '../regions.js';
import { pick, rnd, run, t } from '../state.js';
import { bench, bikeRack, birch, building, flowerBed, hash, lamp, planeTree, planter, tramShelter } from './kit.js';
import { makeTrain, rails, trainMenu } from './gare.js';

const B = { minX: -215, maxX: -110, minZ: -45, maxZ: 40 };
const LOOP = [[-182, -12], [-168, -22], [-150, -18], [-142, -4], [-152, 8], [-170, 8], [-184, 0]];
const CAR = { x: -128, z: -14 };
const CRANE = { x: -200, z: -28 };
const TRAM_Z = 16;

defineRegion({
  id: 'nantes', bounds: B, mapColor: '#c9d3df',
  veg: { biome: 'city', density: 1, rect: { minX: -213, maxX: -112, minZ: -31, maxZ: 28 } },
  walk: [{ minX: -213, maxX: -112, minZ: -31.4, maxZ: 28.4 }],
  unlock: () => !!run.done.composter, need: () => t().needTask(t().goals.composter),
  spawn: new THREE.Vector3(-150, 0, 26), spawnYaw: Math.PI,
  mood: { bg: '#d8dee6', fog: '#cfd6de', near: 46, far: 110, sun: '#fff0dc', sky: '#eef2f8', ground: '#8a96a0', life: .35, music: 'nantes' },
  goals: [
    { id: 'arrose' }, { id: 'sousElephant' }, { id: 'barrit' }, { id: 'carrousel' }, { id: 'biscuit' }, { id: 'photobomb' }, { id: 'grue' }, { id: 'tram' }, { id: 'anneaux', need: 3 },
    { id: 'suivre', secret: true }, { id: 'machiniste', secret: true },
  ],
  i18n: {
    fr: {
      goals: { arrose: "Se faire arroser par la trompe de l'éléphant", sousElephant: "Passer sous l'éléphant pendant qu'il marche", barrit: "Faire barrir l'éléphant", carrousel: "Faire un tour de carrousel",
        biscuit: "Voler un petit-beurre à la biscuiterie", photobomb: "Gâcher la photo des touristes", grue: "Glapir au pied de la grue jaune", tram: "Faire sonner le tram", anneaux: "Passer sous 3 anneaux du quai",
        suivre: "Suivre l'éléphant pendant toute une promenade", machiniste: "Écouter le machiniste jusqu'au bout" },
      hints: { arrose: "De temps en temps, l'éléphant arrose devant lui avec sa trompe. Mets-toi juste devant.", sousElephant: "Faufile-toi entre ses pattes pendant qu'il avance (attention aux pieds).",
        barrit: "Glapis tout près de sa tête.", carrousel: "Le carrousel tourne à l'est. Monte sur la plateforme et laisse-toi porter.", biscuit: "La biscuiterie est près de la tour, au nord-est.",
        photobomb: "Les touristes photographient l'éléphant. Mets-toi entre eux et lui au moment du flash.", grue: "La grue jaune est au sud-ouest, sur le quai.", tram: "Le tram passe sur l'avenue. Glapis à côté.",
        anneaux: "Les anneaux colorés bordent le quai, au sud." },
      L: { machiniste: { chase: ["Hé !"], idle: ["Attention à la trompe !", "48 tonnes de bois et d'acier !", "On graisse les rouages tous les matins."] },
        vendeuse: { chase: ["Mon biscuit !", "Au voleur de gâteaux !"], idle: ["Biscuits nantais, tout frais !", "Un petit-beurre ?", "Recette d'ici, depuis toujours."] } },
      search: { biscuit: "Il manque un biscuit…" },
      eggs: { tower: "La tour de la biscuiterie, avec son dôme. On sent le beurre jusqu'ici.", hangar: "Le hangar des machines : on y construit des animaux géants en bois et en métal.", crane: "La grue jaune veille sur l'île. Ici, on a construit des bateaux.", rings: "Des anneaux colorés le long du quai, face à la Loire.", train: "Appuie sur E devant la porte pour reprendre le train." },
      signs: { nantes: "Nantes", quai: "Quai de la Loire", machines: "Les Machines" },
      cards: { nantes: "Bons baisers de Nantes ! L'éléphant a barri, le carrousel a tourné, et le renard a mangé un biscuit au beurre. Ici, même les grues sont jaunes." },
      trumpet: "PWAAAOOOOH !", splash: "Pschhhh ! Le renard est trempé.", flash: "Clic ! … il y a un renard sur la photo.", tramDing: "Ding ding !", craneLine: "La grue tourne doucement… pour toi ?", underLine: "Quel ventre !",
      macTalk: ["Cet éléphant, il a mis des années à naître.", "Il y a des passagers sur son dos, tu les vois ?", "Et le soir, il dort dans son hangar. Comme toi dans ton terrier."], follow: "Le renard a fait toute la promenade avec l'éléphant !",
      carDone: "Le renard a fait un tour de manège !",
    },
    en: {
      goals: { arrose: "Get sprayed by the elephant's trunk", sousElephant: "Walk under the elephant while it moves", barrit: "Make the elephant trumpet", carrousel: "Ride the carousel",
        biscuit: "Steal a butter biscuit from the biscuit shop", photobomb: "Photobomb the tourists", grue: "Yap at the foot of the yellow crane", tram: "Make the tram ring its bell", anneaux: "Pass under 3 rings on the quay",
        suivre: "Follow the elephant for a whole walk", machiniste: "Listen to the machinist until the end" },
      hints: { arrose: "Now and then the elephant sprays water ahead with its trunk. Stand right in front.", sousElephant: "Slip between its legs while it walks (mind the feet).",
        barrit: "Yap right next to its head.", carrousel: "The carousel spins to the east. Step on the platform and let it carry you.", biscuit: "The biscuit shop is near the tower, to the north-east.",
        photobomb: "Tourists are photographing the elephant. Stand between them and it when the flash goes off.", grue: "The yellow crane is to the south-west, on the quay.", tram: "The tram runs along the avenue. Yap next to it.",
        anneaux: "Colourful rings line the quay, to the south." },
      L: { machiniste: { chase: ["Hey!"], idle: ["Mind the trunk!", "48 tonnes of wood and steel!", "We grease the gears every morning."] },
        vendeuse: { chase: ["My biscuit!", "Cookie thief!"], idle: ["Nantes biscuits, fresh!", "A butter biscuit?", "A local recipe, forever."] } },
      search: { biscuit: "A biscuit is missing…" },
      eggs: { tower: "The biscuit factory tower with its dome. You can smell the butter from here.", hangar: "The machine hangar: giant animals of wood and metal are built here.", crane: "The yellow crane watches over the island. Ships were built here.", rings: "Colourful rings along the quay, facing the Loire.", train: "Press E at the door to take the train again." },
      signs: { nantes: "Nantes", quai: "Loire quay", machines: "The Machines" },
      cards: { nantes: "Greetings from Nantes! The elephant trumpeted, the carousel spun, and the fox ate a butter biscuit. Here, even the cranes are yellow." },
      trumpet: "PWAAAOOOOH!", splash: "Pssshhh! The fox is soaked.", flash: "Click! … there's a fox in the picture.", tramDing: "Ding ding!", craneLine: "The crane turns slowly… for you?", underLine: "What a belly!",
      macTalk: ["This elephant took years to be born.", "There are passengers on its back, see them?", "At night it sleeps in its hangar. Like you in your den."], follow: "The fox walked the whole route with the elephant!",
      carDone: "The fox rode the carousel!",
    },
  },
  build(W) {
    const { box, cyl, sph, cone, solidBox, solidCircle } = W;
    const esh = blob(5.2);
    // Sol : pavés de l'île, Loire au sud, avenue du tram
    W.patch(109, 68, W.TM(TX.cobble, 26, 16), -162.5, -2, { round: .12, jitter: .3 });
    W.ground(105, 4.2, '#9aa3ad', -162.5, TRAM_Z, .02);
    [-1, 1].forEach(d => W.ground(105, .12, '#6d7880', -162.5, TRAM_Z + d * .7, .025));
    const loire = new THREE.MeshLambertMaterial({ color: '#c9dbe0', map: TX.water.clone(), transparent: true, opacity: .95 }); loire.map.repeat.set(30, 6); loire.map.needsUpdate = true;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 40), loire); water.rotation.x = -Math.PI / 2; water.position.set(-162, .04, -53); W.dyn(water, false);
    W.ground(105, 1, '#8b97a6', -162.5, -32.6, .03);
    for (let x = -212; x < -112; x += 3) box(.25, .7, .25, '#5d6670', x, .35, -32.2, undefined, false);
    solidBox(-162.5, -32.4, 106, .4, .7);
    // Gare et train
    rails(W, -216, -110, 31); W.ground(30, 3, '#c9c2b2', -150, 26.9, .03);
    makeTrain(W, -150, 31, '#7d3f6b');
    W.transport({ x: -151, y: 1.4, z: 28 }, 2, () => trainMenu('nantes'));
    W.egg('train', -146, 27, 2.6, 1.2);
    W.sign(-139, 25.4, 'nantes', 0, 2);
    // Tour de la biscuiterie + boutique
    { const x = -124, z = 22; cyl(2, 2.2, 9, '#e9dfcf', x, 4.5, z, 8); cyl(2.3, 2.3, .4, '#c9a982', x, 9.2, z, 8); sph(2.1, '#5d8a8a', x, 9.6, z); cyl(.25, .3, 2.2, '#c9a33d', x, 12.4, z, 6); sph(.45, '#c9a33d', x, 13.6, z); solidCircle(x, z, 2.2, 9); }
    W.egg('tower', -124, 19, 3, 2);
    building(-133, 21, 7, 4, 3.4, '#f3e6d2', '#5d6670', { trim: '#c9a33d', slate: true, shutter: '#2f6b4a' });
    const vend = W.npc({ id: 'vendeuse', x: -133, z: 18.4, yaw: 0, shirt: '#f2b8c6', pants: '#5a5048', hair: '#a8764a', apron: true,
      route: [{ p: new THREE.Vector3(-134, 0, 18.4), wait: 4, act: 'arrange', yaw: 0 }, { p: new THREE.Vector3(-130.5, 0, 18.4), wait: 3, act: 'wave', yaw: 0 }] });
    box(2.6, .9, .9, '#c9a982', -132, .45, 17.6); solidBox(-132, 17.6, 2.6, .9, .9);
    const bisc = W.item({ kind: 'biscuit', x: -131.6, z: 17.6, y: .96, owner: vend, sh: .2, bring: new THREE.Vector3(-131.6, 0, 16.8),
      build: () => { const g = new THREE.Group(); box(.42, .06, .32, '#e2b26a', 0, 0, 0, g); for (let i = 0; i < 4; i++) box(.06, .061, .06, '#c9894f', -.15 + i * .1, .005, .13, g, false); return g; } });
    bisc.onGrab = () => W.complete('biscuit');
    // Hangar des Machines
    { const g = new THREE.Group(); g.position.set(-196, 0, -4); W.R.group.add(g); box(14, 7, 18, '#7d8a90', 0, 3.5, 0, g); for (let i = 0; i < 6; i++) box(.3, 7.2, 18.2, '#5d6670', -6.5 + i * 2.6, 3.6, 0, g, false);
      const r = mk(new THREE.CylinderGeometry(7.2, 7.2, 18, 12, 1, false, 0, Math.PI), MAT('#9aa7b3'), 0, 7, 0, g); r.rotation.set(Math.PI / 2, 0, Math.PI / 2); box(.2, 5, 8, '#3d4a5c', 7.05, 2.5, 0, g, false); solidBox(-196, -4, 14, 18, 7); }
    W.sign(-187.5, 7.5, 'machines', -.6, 2.4); W.egg('hangar', -188, 5, 2.8, 2);
    const mac = W.npc({ id: 'machiniste', x: -187, z: 2, yaw: 1.2, shirt: '#3d4a5c', pants: '#2f3640', hair: '#d9d4c8', overalls: true,
      route: [{ p: new THREE.Vector3(-187, 0, 2), wait: 5, act: 'check', yaw: 1.2 }, { p: new THREE.Vector3(-186, 0, -6), wait: 3, act: 'point', yaw: 1.5 }] });
    mac.onYap = n => { n.jump = .3; const k = W.talk('machiniste'); W.say(n, t().macTalk[Math.min(2, k - 1)], '', 3); if (k >= 3) W.complete('machiniste'); };
    // Grue jaune
    { const x = CRANE.x, z = CRANE.z; for (let i = 0; i < 6; i++) { box(.25, 3, .25, '#f2c230', x - 1, 1.5 + i * 3, z - 1); box(.25, 3, .25, '#f2c230', x + 1, 1.5 + i * 3, z - 1); box(.25, 3, .25, '#f2c230', x - 1, 1.5 + i * 3, z + 1); box(.25, 3, .25, '#f2c230', x + 1, 1.5 + i * 3, z + 1); box(2.2, .2, 2.2, '#e0b020', x, 3 + i * 3, z, undefined, false); }
      solidBox(x, z, 2.4, 2.4, 18); }
    const jib = W.dyn((() => { const g = new THREE.Group(); box(3.2, 2.6, 3.2, '#f2c230', 0, 0, 0, g); box(22, 1, 1.2, '#f2c230', 6, .8, 0, g); box(6, 1.6, 1.6, '#c9a020', -6, .6, 0, g); cyl(.05, .05, 8, '#2f2a24', 15, -3.6, 0, 4, g, false); box(1.2, .6, 1.2, '#2f2a24', 15, -7.8, 0, g, false); return g; })());
    jib.position.set(CRANE.x, 19.3, CRANE.z);
    W.egg('crane', CRANE.x + 2.4, CRANE.z + 2.6, 2.6, 2);
    let craneSpin = 0;
    W.yap(new THREE.Vector3(CRANE.x, 0, CRANE.z), 4.5, () => { craneSpin = 4; W.SFX.clank(); W.say(fox, t().craneLine, '', 2, 2); W.complete('grue'); });
    // Anneaux du quai
    const RINGS = [-190, -176, -162, -148, -134].map((x, i) => { const r = mk(new THREE.TorusGeometry(2.6, .22, 6, 18), MAT(['#d6402f', '#2563c9', '#f6d36b', '#7fb05c', '#8a7cc2'][i]), x, 2.4, -30.4); r.rotation.y = Math.PI / 2; solidCircle(x, -32.3, .3, 1); solidCircle(x, -28.5, .3, 1); return new THREE.Vector3(x, 0, -30.4); });
    RINGS.forEach((p, i) => W.zone(p, 1.4, () => W.progress('anneaux', 'r' + i)));
    W.egg('rings', -183, -27.6, 3.2, 1.6);
    W.sign(-170, -29, 'quai', 0, 2.2);
    // Carrousel des mondes marins (plateforme tournante)
    const car = W.dyn((() => { const g = new THREE.Group(); cyl(4.2, 4.4, .35, '#c9a982', 0, .18, 0, 16, g); cyl(.35, .35, 5, '#c9a33d', 0, 2.6, 0, 8, g); cone(5, 1.8, '#5d8a8a', 0, 5.6, 0, 16, g); cyl(5, 5, .3, '#c9a33d', 0, 4.65, 0, 16, g, false);
      const crit = [['#e8742a', 1.2, .8, 1.8], ['#8a7cc2', 1, 1, 1], ['#5d8fb0', 1.5, .7, 1.3], ['#d6402f', 1, 1.3, 1], ['#7fb05c', .9, .8, 2]];
      crit.forEach(([c, sx, sy, sz], i) => { const a = i / crit.length * Math.PI * 2; const x = Math.cos(a) * 3, z = Math.sin(a) * 3; cyl(.05, .05, 4.3, '#f6d36b', x, 2.5, z, 4, g, false); const b = sph(.55, c, x, 1.5, z, g, 1); b.scale.set(sx, sy, sz); b.rotation.y = -a; }); return g; })());
    car.position.set(CAR.x, 0, CAR.z); solidCircle(CAR.x, CAR.z, .4, 5);
    let carT = 0;
    // L'éléphant
    const el = new THREE.Group(), head = new THREE.Group(), tr1 = new THREE.Group(), tr2 = new THREE.Group(), ears = [new THREE.Group(), new THREE.Group()], legs = [0, 1, 2, 3].map(() => new THREE.Group());
    const G = '#7d6a55', G2 = '#6a5846', WD = '#a8764a';
    { const b = sph(3, G, 0, 7.6, 0, el, 1); b.scale.set(1.05, .82, 1.55); for (let i = 0; i < 5; i++) box(.15, 2.6, .5, G2, 2.9, 7.6, -3 + i * 1.5, el, false); for (let i = 0; i < 5; i++) box(.15, 2.6, .5, G2, -2.9, 7.6, -3 + i * 1.5, el, false);
      cyl(.35, .35, 2.4, '#5d6670', 1.4, 9.4, -3.6, 6, el).rotation.x = Math.PI / 2; cyl(.3, .3, 1.2, '#5d6670', -1.2, 10.4, -2.4, 6, el);
      box(4.2, .3, 5.4, WD, 0, 10.2, -.4, el); [[-1.9, -2.9], [1.9, -2.9], [-1.9, 2.1], [1.9, 2.1]].forEach(([x, z]) => cyl(.08, .08, 2.6, WD, x, 11.5, z, 4, el)); box(4.6, .2, 5.8, '#c9894f', 0, 12.8, -.4, el);
      for (let i = 0; i < 6; i++) box(.06, .7, 5.2, WD, -2 + (i > 2 ? 4 : 0), 10.7, -.4, el, false); box(.4, .5, .6, '#d9d4c8', 0, 8.2, -4.6, el); }
    head.position.set(0, 8.4, 4.4); el.add(head);
    { const h = sph(2, G, 0, 0, 0, head, 1); h.scale.set(1, 1.05, .95); [-1, 1].forEach(s => { sph(.22, '#f6efe0', s * .9, .5, 1.5, head, 1, false); sph(.12, '#2f2a24', s * .92, .5, 1.68, head, 1, false); const tk = cone(.22, 2.2, '#efe6d0', s * .7, -1.3, 1.3, 6, head); tk.rotation.x = 2.2; }); box(1.6, .2, .2, G2, 0, 1.3, 1.6, head, false); }
    tr1.position.set(0, -.9, 1.6); head.add(tr1); { cyl(.45, .55, 2.6, G, 0, -1.3, 0, 8, tr1); for (let i = 0; i < 4; i++) cyl(.56, .56, .12, G2, 0, -.4 - i * .6, 0, 8, tr1, false); }
    tr2.position.set(0, -2.6, 0); tr1.add(tr2); { cyl(.3, .44, 2.4, G, 0, -1.2, 0, 8, tr2); cyl(.36, .3, .3, G2, 0, -2.4, 0, 8, tr2); }
    ears.forEach((e, i) => { const s = i ? 1 : -1; e.position.set(s * 1.7, .4, -.4); head.add(e); const ear = box(.18, 3, 2.4, '#8a7a66', s * .1, 0, -1.1, e); ear.rotation.z = s * .15; for (let k = 0; k < 3; k++) box(.2, .1, 2.2, G2, s * .12, -1 + k, -1.1, e, false); });
    [[-1.7, 3], [1.7, 3], [-1.7, -3], [1.7, -3]].forEach(([x, z], i) => { const L = legs[i]; L.position.set(x, 6.4, z); el.add(L); cyl(.75, .8, 5.2, G, 0, -2.6, 0, 8, L); cyl(.95, 1, .9, G2, 0, -5.9, 0, 10, L); box(.3, .3, 1, '#5d6670', 0, -1.6, 0, L, false); });
    W.rig(el, [el, head, tr1, tr2, ...ears, ...legs]);
    const E = { pos: new THREE.Vector3(LOOP[0][0], 0, LOOP[0][1]), yaw: 0, k: 1, ph: 0, spray: 0, sprayCd: 8, trumpet: 0, follow: 0, followK: 0, stepCd: 0 };
    const sprayPt = new THREE.Vector3();
    W.yap(E.pos, 7, () => { if (flat2(fox.pos, headWorld()) > 5.5) return; E.trumpet = 2; W.SFX.trumpet(); W.say({ anchor: headWorld().setY(14) }, t().trumpet, '', 2, 0, 'trumpet'); W.complete('barrit'); });
    const _hw = new THREE.Vector3();
    function headWorld() { return _hw.set(E.pos.x + Math.sin(E.yaw) * 5.5, 0, E.pos.z + Math.cos(E.yaw) * 5.5); }
    // Touristes, photographes, passagers
    const crowd = W.crowd(24);
    const tourists = [0, 1, 2, 3, 4, 5].map(i => crowd.add({ pos: { x: -165 + rnd(-8, 8), z: rnd(-15, 5) }, shirt: pick(['#f6d36b', '#8fc9df', '#f2b8c6', '#7fb05c', '#d9705a', '#f6efe0']), pants: pick(['#2563c9', '#3d4a5c', '#8a7a5a']), hair: pick(['#5a3b2a', '#c9a33d', '#2f2a24', '#d9d4c8']), hat: i % 3 === 0 ? 'cap' : null, hatColor: '#f6efe0', off: rnd(0, 6) }));
    const photogs = [0, 1, 2].map(i => crowd.add({ pos: { x: -160 + i * 5, z: 12 }, shirt: pick(['#3e5677', '#c9894f', '#7fb05c']), pants: '#2f2a24', hair: '#2f2a24', ph: i, flashCd: 3 + i * 1.7 }));
    const riders = [0, 1, 2, 3].map(i => crowd.add({ pos: { x: 0, z: 0 }, shirt: pick(['#d6402f', '#2563c9', '#f6d36b', '#8a7cc2']), pants: '#3d4a5c', hair: pick(['#5a3b2a', '#c9a33d']), seat: i }));
    const carRiders = [0, 1].map(i => crowd.add({ pos: { x: CAR.x, z: CAR.z }, scale: .75, seated: true, shirt: pick(['#f6d36b', '#7fb05c']), pants: '#2563c9', hair: '#c9a33d', a0: i * Math.PI }));
    // Tram
    const tram = W.dyn((() => { const g = new THREE.Group(); [0, 7].forEach(dx => { box(6.6, 2.6, 2.4, '#f6f2e8', dx, 1.7, 0, g); box(6.7, .5, 2.45, '#7fb05c', dx, .65, 0, g, false); box(6.4, .9, 2.42, '#8fc9df', dx, 2.2, 0, g, false); box(6.6, .2, 2.5, '#6d7880', dx, 3.1, 0, g, false); }); box(.4, 1.4, .1, '#2f3640', 3.5, 4, 0, g, false); return g; })());
    const TR = { x: -200, dir: 1, wait: 0, ding: 0 };
    W.R.yaps.push({ get pos() { return new THREE.Vector3(tram.position.x + 3.5, 0, TRAM_Z); }, r: 7, fn: () => { TR.ding = 1; W.SFX.bell(); W.say({ anchor: new THREE.Vector3(tram.position.x + 3.5, 4.4, TRAM_Z) }, t().tramDing, '', 1.4, 0, 'tram'); W.complete('tram'); } });
    // Décor : bancs, lampadaires, arbres
    for (let x = -206; x < -114; x += 12) { lamp(x, 12.6); lamp(x + 6, 19.4); }
    // Arbres de ville (platanes, bouleaux du parc des Chantiers), abri de tram, jardins de graminées
    [[-140, -26], [-120, -26], [-205, 12], [-113.5, -6], [-178, 22], [-200, 24]].forEach(([x, z]) => planeTree(x, z, 1 + hash(x * z) * .2));
    for (const x of [-183, -169, -155, -141]) planeTree(x, -27.4, .9 + hash(x) * .2);
    tramShelter(-158, 19.6); tramShelter(-176, 12.4, Math.PI);
    { // jardin de graminées et de bouleaux (est, près du carrousel)
      W.patch(12, 9, '#9fbf7a', -119, 1, { y: .021, round: .5 });
      [[-123, -1.5], [-116.5, 3.5], [-119.5, 4.5]].forEach(([x, z], i) => birch(x, z, .9 + i * .1));
      for (let i = 0; i < 18; i++) { const x = -124.5 + (i % 6) * 2.1 + rnd(-.4, .4), z = -2.2 + Math.floor(i / 6) * 2.6 + rnd(-.4, .4); for (let k = 0; k < 5; k++) { const c = cone(.04, rnd(.7, 1.1), ['#b8b06a', '#a9a95e', '#c4b878'][k % 3], x + rnd(-.2, .2), .45, z + rnd(-.2, .2), 3, undefined, false); c.rotation.set(rnd(-.25, .25), 0, rnd(-.25, .25)); } }
    }
    { // jardin ouest (près de la grue) : bouleaux et graminées
      W.patch(8, 10, '#9fbf7a', -208, -18, { y: .021, round: .5 });
      [[-209, -21], [-206, -15.5], [-210.2, -15]].forEach(([x, z], i) => birch(x, z, .85 + i * .12));
    }
    bikeRack(-137, 12.2, 5); bikeRack(-199.5, 12.2, 4);
    bench(-158, 10.6, Math.PI); bench(-170, 10.6, Math.PI); bench(-128, -4, 0);
    { // Jardin au cœur de la boucle de l'éléphant : pelouse, platanes, massif, bancs tournés vers son passage
      const gx = -164, gz = -6; W.patch(12, 9.5, '#9fbf7a', gx, gz, { y: .021, round: .95 });
      planeTree(gx - 2.8, gz - 1, .95); planeTree(gx + 3, gz + 1.2, .9);
      flowerBed(gx - 1.8, gz + 2.4, gx + 1.4, gz + 3.3, ['#f6d36b', '#d6402f', '#f2b8c6']);
      bench(gx - .2, gz - 3.4, Math.PI); bench(gx + 4.4, gz - 2.2, Math.PI * .75); lamp(gx + .8, gz - .6);
    }
    W.postcard(-212, -30);
    const _v = new THREE.Vector3();
    W.update(dt => {
      const now = performance.now() / 1000;
      loire.map.offset.x = now * .02;
      // Éléphant : marche, pattes, oreilles, trompe, vapeur, bruits
      const tgt = LOOP[E.k], dx = tgt[0] - E.pos.x, dz = tgt[1] - E.pos.z, d = Math.hypot(dx, dz);
      const walking = E.spray <= 0 && E.trumpet <= 0;
      if (walking) { if (d < 1) { E.k = (E.k + 1) % LOOP.length; if (E.k === 1 && E.followK > .8) { W.say(fox, t().follow, '', 2.4, 2.4); W.complete('suivre'); } E.followK = 0; } const ty = Math.atan2(dx, dz); let df = ((ty - E.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; E.yaw += df * Math.min(1, dt * .6); E.pos.x += Math.sin(E.yaw) * 1.3 * dt; E.pos.z += Math.cos(E.yaw) * 1.3 * dt; E.ph += dt * 2.2; }
      el.position.set(E.pos.x, Math.abs(Math.sin(E.ph)) * .12, E.pos.z); el.rotation.y = E.yaw;
      esh.position.set(E.pos.x, .03, E.pos.z); esh.visible = el.visible;
      legs.forEach((L, i) => { L.rotation.x = walking ? Math.sin(E.ph + (i === 0 || i === 3 ? 0 : Math.PI)) * .28 : 0; });
      ears.forEach((e, i) => { e.rotation.y = (i ? 1 : -1) * (Math.sin(now * (E.trumpet > 0 ? 9 : 1.6)) * (E.trumpet > 0 ? .6 : .2) + .2); });
      E.sprayCd -= dt;
      if (E.sprayCd <= 0 && E.spray <= 0) { E.spray = 3.4; E.sprayCd = rnd(9, 14); W.SFX.steam(); }
      const curl = E.spray > 0 ? Math.min(1, (3.4 - E.spray) * 2) : E.trumpet > 0 ? 1 : 0;
      tr1.rotation.x += ((curl ? -1.25 : Math.sin(now * .9) * .15) - tr1.rotation.x) * Math.min(1, dt * 3); tr2.rotation.x += ((curl ? -1 : Math.sin(now * 1.1) * .25) - tr2.rotation.x) * Math.min(1, dt * 3);
      head.rotation.x = E.trumpet > 0 ? -.2 : Math.sin(now * .7) * .04;
      if (E.spray > 0) { E.spray -= dt; tr2.updateMatrixWorld(true); _v.set(0, -2.6, 0); tr2.localToWorld(_v); sprayPt.copy(_v);
        if (E.spray < 2.8 && Math.random() < dt * 40) W.emit(_v.clone(), '#bfe3f0', { n: 2, spd: 1.2, up: 1, life: .9, grav: 9 });
        const ahead = new THREE.Vector3(E.pos.x + Math.sin(E.yaw) * 9.5, 0, E.pos.z + Math.cos(E.yaw) * 9.5);
        if (E.spray < 2.8 && flat2(fox.pos, ahead) < 2.4 && !E.wet) { E.wet = true; W.SFX.splash(); W.say(fox, t().splash, '', 1.8, 2); fox.muddy = 0; W.complete('arrose'); }
        if (Math.random() < dt * 30) W.emit(new THREE.Vector3(ahead.x + rnd(-1, 1), 2.5, ahead.z + rnd(-1, 1)), '#bfe3f0', { n: 1, spd: .6, up: .2, life: .7, grav: 9 }); }
      else E.wet = false;
      if (E.trumpet > 0) E.trumpet -= dt;
      if (Math.random() < dt * 3) W.emit(new THREE.Vector3(E.pos.x - Math.sin(E.yaw) * 3.6 + .2, 10.8, E.pos.z - Math.cos(E.yaw) * 3.6), '#f2f2f2', { n: 1, spd: .3, up: 1.6, life: 1.6, grav: -1, size: 2.2 });
      const fd = flat2(fox.pos, E.pos);
      if ((E.stepCd -= dt) < 0 && fd < 30 && walking) { E.stepCd = rnd(1.6, 2.6); W.SFX.clank(); }
      // Pattes : on ne traverse pas, mais on peut passer dessous
      const cy = Math.cos(E.yaw), sy = Math.sin(E.yaw);
      for (const [lx, lz] of [[-1.7, 3], [1.7, 3], [-1.7, -3], [1.7, -3]]) { const wx = E.pos.x + lx * cy + lz * sy, wz = E.pos.z - lx * sy + lz * cy; const ddx = fox.pos.x - wx, ddz = fox.pos.z - wz, dd = Math.hypot(ddx, ddz); if (dd < 1.4 && dd > .01) { fox.pos.x = wx + ddx / dd * 1.4; fox.pos.z = wz + ddz / dd * 1.4; } }
      if (fd < 1.6 && walking) { if (!E.under) { E.under = true; W.say(fox, t().underLine, '', 1.4, 2); W.complete('sousElephant'); } } else if (fd > 3) E.under = false;
      if (fd < 12) E.followK += dt / 40;
      // Passagers sur le dos
      riders.forEach((r, i) => { const lx = (i % 2 ? 1 : -1) * 1, lz = i < 2 ? 1 : -1.6; r.pos.set(el.position.x + lx * cy + lz * sy, el.position.y + 10.35, el.position.z - lx * sy + lz * cy); r.yaw = E.yaw + (i % 2 ? -.6 : .6); r.t += dt; if (E.trumpet > 0 || E.spray > 0) behave.cheer(r, r.t); else { behave.rest(r); r.armR = Math.sin(r.t + i) > .7 ? -2.6 : 0; } });
      // Touristes qui suivent l'éléphant, photographes
      for (const a of tourists) { a.t += dt; const tx = E.pos.x - Math.sin(E.yaw) * 9 + Math.cos(a.off) * 5, tz = E.pos.z - Math.cos(E.yaw) * 9 + Math.sin(a.off) * 5; if (behave.walkTo(a, tx, tz, 1.4, dt) < .5) { behave.face(a, E.pos.x, E.pos.z, dt); a.armR = -1.5; } else a.armR = 0; }
      for (const p of photogs) {
        p.t += dt; behave.face(p, E.pos.x, E.pos.z, dt, 3); p.armL = p.armR = -1.5; p.armLz = .25; p.armRz = -.25;
        p.flashCd -= dt;
        if (p.flashCd <= 0) { p.flashCd = rnd(4, 7); W.emit(new THREE.Vector3(p.pos.x + Math.sin(p.yaw) * .6, 1.9, p.pos.z + Math.cos(p.yaw) * .6), '#ffffff', { n: 6, spd: 1.5, up: .5, life: .25 });
          // Le renard entre l'appareil et l'éléphant ?
          const ax = E.pos.x - p.pos.x, az = E.pos.z - p.pos.z, L = Math.hypot(ax, az), fx = fox.pos.x - p.pos.x, fz = fox.pos.z - p.pos.z, proj = (fx * ax + fz * az) / L, perp = Math.abs(fx * az - fz * ax) / L;
          if (proj > .8 && proj < L - 2 && perp < 1.6) { W.SFX.pop(); W.say({ anchor: new THREE.Vector3(p.pos.x, 2.8, p.pos.z) }, t().flash, '', 2, 0, 'flash' + p.ph); W.complete('photobomb'); } }
      }
      // Carrousel : la plateforme tourne et emporte le renard
      car.rotation.y += dt * .6;
      for (const r of carRiders) { const a = r.a0 + car.rotation.y; r.pos.set(CAR.x + Math.cos(a) * 3, .9 + Math.sin(now * 2 + r.a0) * .25, CAR.z - Math.sin(a) * 3); r.yaw = -a; }
      const cd = flat2(fox.pos, CAR);
      if (cd < 4.1 && cd > .6) { const a = Math.atan2(-(fox.pos.z - CAR.z), fox.pos.x - CAR.x) + dt * .6; fox.pos.x = CAR.x + Math.cos(a) * cd; fox.pos.z = CAR.z - Math.sin(a) * cd; fox.lift = .36; fox.ground = .36; carT += dt; if (carT > 6 && !W.done('carrousel')) { W.say(fox, t().carDone, '', 2, 2.4); W.complete('carrousel'); } }
      else if (cd < 6) { fox.lift = 0; fox.ground = 0; carT = 0; }
      // Grue, tram
      if (craneSpin > 0) { craneSpin -= dt; jib.rotation.y += dt * .5; } else jib.rotation.y += dt * .03;
      if (TR.wait > 0) TR.wait -= dt; else { TR.x += TR.dir * dt * 6; if (TR.x > -122 || TR.x < -208) { TR.dir *= -1; TR.wait = 4; } }
      tram.position.set(TR.x, 0, TRAM_Z);
      if (Math.abs(fox.pos.z - TRAM_Z) < 1.6 && fox.pos.x > TR.x - 3.5 && fox.pos.x < TR.x + 10.5) { fox.pos.z = TRAM_Z + (fox.pos.z > TRAM_Z ? 1.6 : -1.6); }
    });
    // Avenue arborée (platanes), jardinières, bancs autour du carrousel
    for (let x = -206; x < -114; x += 12) { planeTree(x + 6, 10.6, 1); planeTree(x, 21.6, 1); }
    planter(CAR.x - 6, CAR.z - 5, 2.4); planter(CAR.x + 6, CAR.z + 5, 2.4); bench(CAR.x, CAR.z + 7, Math.PI); bench(CAR.x - 7, CAR.z + 2, Math.PI / 2);

    return { restore() { if (W.done('biscuit')) { bisc.gone = true; bisc.mesh.visible = false; } } };
  },
});
