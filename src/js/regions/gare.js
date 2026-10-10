/* =====================================================================
   La gare (à l'ouest du village, par la trouée de la haie) : quai, train à vapeur,
   chef de gare, voyageurs, composteur. Le train relie la gare à Nantes, puis à Paris.
   S'ouvre après 24 bêtises : la barrière du passage à niveau se lève.
   ===================================================================== */
import * as THREE from 'three';
import { behave } from '../crowd.js';
import { fox } from '../fox.js';
import { openTravel } from '../journal.js';
import { RG, defineRegion, isOpen, needTotal, teleport, totalDone } from '../regions.js';
import { pick, rnd, saved, store, t } from '../state.js';
import { addCows } from '../fauna.js';
import { barrel, bench, bistroChair, bistroTable, bocageBank, building, crate, fenceRow, hash, hydrangea, lamp, lantern, pine, planeTree, planter, treeLine, waterTower } from './kit.js';

const B = { minX: -80, maxX: -36, minZ: -22, maxZ: 22 };
const PLAT = { x: -58, z: 7 };                  // quai (le train est au nord du quai, voie z = 10.4)

/* ---------- Train : construction partagée (gare, Nantes, Paris) ---------- */
export function makeTrain(W, x, z, c = '#2f6b4a') {
  const { box, cyl, cone } = W;
  const g = new THREE.Group();
  // Locomotive
  box(5, 1.6, 2, c, 2.6, 1.5, 0, g); cyl(.9, .9, 4, '#2f2a24', 2.4, 2.1, 0, 10, g).rotation.z = Math.PI / 2; box(1.6, 1.4, 2.1, c, 4.6, 2.6, 0, g); box(1.8, .15, 2.3, '#2f2a24', 4.6, 3.35, 0, g, false);
  cyl(.25, .32, 1, '#2f2a24', .9, 3.1, 0, 8, g); cone(.4, .3, '#2f2a24', .9, 3.75, 0, 8, g).rotation.x = Math.PI;
  box(.15, .9, 2.2, '#d6402f', .05, .9, 0, g, false); box(.5, .5, .1, '#f6d36b', 4.6, 2.6, 1.07, g, false);
  // Voitures
  [-4, -11].forEach(dx => { box(6.4, 2.2, 2.1, '#f6efe0', dx, 1.8, 0, g); box(6.6, .2, 2.3, '#2f3640', dx, 3, 0, g, false); box(6.4, .3, 2.12, c, dx, 1, 0, g, false);
    for (let i = 0; i < 4; i++) box(.9, .6, .05, '#8fc9df', dx - 2.3 + i * 1.5, 2.2, 1.06, g, false); box(.8, 1.4, .05, '#a8764a', dx + 2.6, 1.5, 1.06, g, false); });
  for (let i = 0; i < 7; i++) { const w = cyl(.45, .45, .2, '#2f2a24', 4.4 - i * 2.6 - (i > 1 ? 1.2 : 0), .5, 1.05, 10, g); w.rotation.x = Math.PI / 2; const w2 = w.clone(); w2.position.z = -1.05; g.add(w2); }
  g.position.set(x, 0, z); W.dyn(g);
  return g;
}
/** Voies ferrées : traverses + rails, de x0 à x1, à z. */
export function rails(W, x0, x1, z) {
  W.ground(x1 - x0, 2.6, '#a59a86', (x0 + x1) / 2, z, .02);
  for (let x = x0 + .4; x < x1; x += 1.1) W.box(.35, .1, 2.4, '#6b4a2a', x, .05, z, undefined, false);
  [-.75, .75].forEach(dz => W.box(x1 - x0, .12, .1, '#9aa7b3', (x0 + x1) / 2, .14, z + dz, undefined, false));
}
/** Gares desservies : où l'on descend du train. */
export const STATIONS = {
  gare: { region: 'gare', x: -56, z: 6, yaw: Math.PI },
  nantes: { region: 'nantes', x: -150, z: 26, yaw: Math.PI },
  paris: { region: 'paris', x: -290, z: 36, yaw: Math.PI },
};
/** Menu « Prendre le train » (une destination par gare ouverte). */
export function trainMenu(here) {
  const opts = Object.entries(STATIONS).filter(([id, s]) => isOpen(s.region)).map(([id, s]) => ({
    label: (id === here ? '📍 ' : '🚆 ') + t().regions[s.region], current: id === here,
    go: () => { saved.stats.trains = (saved.stats.trains || 0) + 1; store.set(saved); RG.gare.api?.whistle?.(); teleport(s.x, s.z, s.yaw); },
  }));
  if (opts.filter(o => !o.current).length === 0) { fox.idle = 0; return false; }
  openTravel(t().trTitle, opts); return true;
}

defineRegion({
  id: 'gare', bounds: B, mapColor: '#d9c9b0',
  veg: { biome: 'meadow', density: .8, rect: { minX: -81, maxX: -35, minZ: -22, maxZ: 9 } },
  walk: [{ minX: -37.4, maxX: -31, minZ: -1.6, maxZ: 1.6 }, { minX: -79, maxX: -36.4, minZ: -21, maxZ: 8.6 }],
  adj: [], unlock: () => totalDone() >= 24, need: needTotal(24),
  spawn: new THREE.Vector3(-38.5, 0, 0), spawnYaw: -Math.PI / 2, gatePos: new THREE.Vector3(-33.5, 0, 0),
  mood: { bg: '#d6dfd2', fog: '#d0d8cb', near: 34, far: 78, sun: '#ffe0b8', sky: '#fbf1dc', ground: '#7f9a72', life: .8, music: 'gare' },
  goals: [{ id: 'composter' }, { id: 'siffler' }, { id: 'casquette' }, { id: 'voyageur' }, { id: 'valise' }, { id: 'meuh' }, { id: 'horloge', secret: true }],
  i18n: {
    fr: {
      goals: { meuh: "Faire meugler tout le troupeau", composter: "Composter un billet (pour Nantes)", siffler: "Faire siffler le train", casquette: "Voler la casquette du chef de gare", voyageur: "Réveiller le voyageur endormi", valise: "Renverser la pile de valises",
        horloge: "Attendre (sagement) sous l'horloge de la gare" },
      hints: { meuh: "Les vaches paissent dans le pré derrière la halle. Un glapissement le long de la clôture…", composter: "Le composteur jaune est à l'entrée du quai. Appuie sur E.", siffler: "Glapis tout près de la locomotive.", casquette: "Sa casquette de rechange est posée sur le banc du quai.",
        voyageur: "Un voyageur dort sur un banc, au bout du quai.", valise: "Une pile de valises attend sur le quai. Fonce dedans (Maj)." },
      L: { chefgare: { chase: ["Ma casquette !", "Pas de renard sur le quai !", "Revenez ici !"], idle: ["Attention au départ !", "Le train de 14 h 12 est à l'heure. Pour une fois.", "Compostez vos billets !"] } },
      search: { casquette: "Où est ma casquette de rechange ?" },
      eggs: { clock: "L'horloge de la gare. Elle avance de deux minutes, comme toutes les horloges de gare.", board: "Départs : Nantes · Paris-Montparnasse. Voie 1.", train: "Appuie sur E devant la porte pour monter dans le train." },
      signs: { gare: "Gare →", quai: "Voie 1" },
      cards: { gare: "Bons baisers de la gare ! Le chef de gare cherche sa casquette et le train a sifflé pour rien. Prochain arrêt : Nantes." },
      ticket: "Clac ! Billet composté. Direction Nantes !", ticketAgain: "Clac ! (encore un billet composté, pour la forme)", trainWhistle: "TCHOU-TCHOUUU !", sleeper: "Hein ? Quoi ? On est arrivés ?!", sleeping: "zzz…", noTrain: "Composte d'abord un billet !",
      clockWait: "Le renard attend sous l'horloge. Très chic.",
    },
    en: {
      goals: { meuh: "Make the whole herd moo", composter: "Validate a ticket (for Nantes)", siffler: "Make the train whistle", casquette: "Steal the stationmaster's cap", voyageur: "Wake the sleeping traveller", valise: "Knock over the pile of suitcases",
        horloge: "Wait (nicely) under the station clock" },
      hints: { meuh: "The cows graze in the meadow behind the goods shed. A yap along the fence…", composter: "The yellow ticket machine is at the platform entrance. Press E.", siffler: "Yap right next to the locomotive.", casquette: "His spare cap lies on the platform bench.",
        voyageur: "A traveller is asleep on a bench at the end of the platform.", valise: "A pile of suitcases waits on the platform. Charge into it (Shift)." },
      L: { chefgare: { chase: ["My cap!", "No foxes on the platform!", "Come back here!"], idle: ["Mind the departure!", "The 2:12 is on time. For once.", "Validate your tickets!"] } },
      search: { casquette: "Where's my spare cap?" },
      eggs: { clock: "The station clock. It runs two minutes fast, like every station clock.", board: "Departures: Nantes · Paris-Montparnasse. Platform 1.", train: "Press E at the door to board the train." },
      signs: { gare: "Station →", quai: "Platform 1" },
      cards: { gare: "Greetings from the station! The stationmaster is looking for his cap and the train whistled for nothing. Next stop: Nantes." },
      ticket: "Clack! Ticket validated. Off to Nantes!", ticketAgain: "Clack! (another ticket, just for fun)", trainWhistle: "CHOO-CHOOOO!", sleeper: "Huh? What? Are we there?!", sleeping: "zzz…", noTrain: "Validate a ticket first!",
      clockWait: "The fox waits under the clock. Very chic.",
    },
  },
  build(W) {
    const { box, cyl, sph, cone, solidBox, solidCircle } = W;
    W.patch(48, 46, '#b3cf92', -58, 0); W.mottle(B, ['#a9c98a', '#bcd69a', '#a3c482'], 12);
    // Bocage autour de la gare (comme au village) : talus plantés de haies et de chênes têtards, forêt au loin
    bocageBank(-80, 17.4, -37.6, 17.4, { oaks: 3, seed: 21 }); bocageBank(-79, -23, -37.6, -23, { oaks: 4, seed: 23 }); bocageBank(-81.6, -23.6, -81.6, 17.8, { oaks: 3, seed: 25 });
    treeLine(-80, -28, -38, -28, 3.4, (x, z, i) => pine(x, z, 1.3 + hash(i) * .3, i, false)); treeLine(-87, -27, -87, 16, 3.4, (x, z, i) => pine(x, z, 1.3 + hash(i * 3) * .3, i, false));
    // Chemin qui serpente depuis le passage à niveau, parvis pavé aux bords adoucis
    W.path([[-31.2, 0], [-35, .25], [-39, -.35], [-43, .35], [-47, -.5], [-50.6, -1.1]], 2.6, { fade: [false, false], seed: 41 });
    W.patch(16.6, 12.6, W.TM(W.TX.cobble, 4, 3), -58, -2, { y: .022, round: .25, jitter: .4, noVeg: true });
    // Bâtiment voyageurs avec horloge
    building(-58, -11, 14, 5, 4.2, '#efe2c9', '#6d7880', { floors: 2, trim: '#b8834a', slate: true, shutter: '#7d8fb3', chimney: 1 });
    // fronton de l'horloge : un petit pignon qui dépasse du toit et porte le cadran (avant : cadran collé au toit)
    box(2.1, 1.9, .7, '#efe2c9', -58, 5.15, -8.85); box(2.2, .12, .78, '#b8834a', -58, 4.25, -8.83, undefined, false);
    { const cap = cone(1.6, .75, '#6d7880', -58, 6.45, -8.85, 4); cap.rotation.y = Math.PI / 4; cap.scale.set(1, 1, .42); }
    { const clk = new THREE.Group(); clk.position.set(-58, 5.25, -8.42); W.R.group.add(clk); cyl(.8, .8, .15, '#f6efe0', 0, 0, 0, 16, clk).rotation.x = Math.PI / 2; cyl(.86, .86, .1, '#2f2a24', 0, 0, -.05, 16, clk, false).rotation.x = Math.PI / 2; box(.06, .6, .04, '#2f2a24', 0, .22, .1, clk, false); box(.45, .06, .04, '#2f2a24', .18, 0, .1, clk, false); box(1.2, 1.2, .5, '#efe2c9', 0, 0, -.35, clk); }
    W.egg('clock', -58, -6.6, 3, 1.6);
    W.zone(new THREE.Vector3(-58, 0, -7.2), 1.4, () => { W.say(fox, t().clockWait, 'note', 2.6, 2); W.complete('horloge'); }, { cond: () => fox.idle > 5 });
    // Quai, voie, abri
    W.ground(30, 3.2, '#c9c2b2', PLAT.x, PLAT.z, .03); W.ground(30, .3, '#f6d36b', PLAT.x, PLAT.z + 1.45, .035);
    rails(W, -84, -34, 10.4);
    // Marquise du quai : colonnes en fonte à consoles, toit léger, lambrequin en bois découpé
    [-66, -58, -50].forEach(x => {
      cyl(.1, .13, 3, '#2f3640', x, 1.5, PLAT.z - 1, 8); box(.3, .14, .3, '#2f3640', x, 2.95, PLAT.z - 1, undefined, false);
      for (const s of [-1, 1]) { const b = box(.06, .9, .06, '#2f3640', x + s * .35, 2.65, PLAT.z - 1, undefined, false); b.rotation.z = -s * .75; }
      solidCircle(x, PLAT.z - 1, .14, 3);
    });
    { const cn = box(18.4, .14, 2.6, '#6d7f9b', -58, 3.12, PLAT.z - .35); cn.rotation.x = -.06; box(18.4, .12, .12, '#f6efe0', -58, 3.08, PLAT.z + .93, undefined, false);
      for (let x = -67.1; x <= -48.9; x += .32) { const l = box(.21, .21, .03, '#f6efe0', x, 2.9, PLAT.z + .95, undefined, false); l.rotation.z = Math.PI / 4; } }
    lamp(-70, PLAT.z - .8); lamp(-46, PLAT.z - .8);
    W.sign(-40, -2.6, 'gare', -Math.PI / 2, 2); W.sign(-68.6, PLAT.z - 1.2, 'quai', 0, 1.6);
    { const tx = W.textTex(256, 128, (g, w, h) => { g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6d36b'; g.font = 'bold 24px "Baloo 2",sans-serif'; g.fillText('NANTES      14:12', 14, 50); g.fillText('PARIS-MTP  15:05', 14, 92); });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .9), new THREE.MeshBasicMaterial({ map: tx })); p.position.set(-62, 2.4, PLAT.z - .92); W.R.group.add(p); box(1.9, 1, .1, '#2f3640', -62, 2.4, PLAT.z - 1, undefined, false); for (const dx of [-.7, .7]) cyl(.02, .02, .25, '#2f3640', -62 + dx, 3.0, PLAT.z - 1, 4, undefined, false); }   // tiges qui le suspendent à la marquise
    W.egg('board', -62, PLAT.z, 3, 1.4);
    // Château d'eau des locomotives, halle à marchandises et son quai de chargement, café de la gare
    waterTower(-75.6, 13.6, .2);
    building(-72.6, -3.4, 7.2, 4.6, 3, '#b08a62', '#6d7880', { rot: Math.PI / 2, slate: true, win: '#3f4a52', door: '#6b4630', plinth: '#9a958c', seed: 11 });
    box(1.1, .8, 6.6, '#9a958c', -69.8, .4, -3.4); solidBox(-69.8, -3.4, 1.1, 6.6, .8);
    [[-69.9, -5.6], [-69.6, -4.8], [-69.8, -1.4]].forEach(([x, z], i) => { const sk = sph(.32, ['#d9c9a0', '#cdbb8e', '#e0d2ae'][i], x, 1.05, z, undefined, 1); sk.scale.set(1.1, .7, .8); });
    crate(-69.8, -2.4, .3, .7); barrel(-68.4, -6.6, '#8a5a3b');
    { const cart = new THREE.Group(); cart.position.set(-67.4, 0, 3.4); cart.rotation.y = .4; W.R.group.add(cart); box(1.6, .1, .9, '#8a5a3b', 0, .55, 0, cart); for (const sx of [-1, 1]) { const wl = cyl(.28, .28, .06, '#2f2a24', sx * .5, .28, .5, 10, cart, false); wl.rotation.x = Math.PI / 2; const wr = wl.clone(); wr.position.z = -.5; cart.add(wr); }
      const h = box(.06, .06, 1.2, '#6b4630', 0, .62, .9, cart, false); h.rotation.x = .5; box(.7, .4, .5, '#c9894f', -.3, .82, 0, cart); box(.5, .3, .4, '#5d8fb0', .4, .76, .05, cart); solidCircle(-67.4, 3.4, .8, .8); }
    building(-45.6, -12.2, 6, 4, 3, '#f1e4c8', '#c8643c', { shutter: '#2f6b4a', chimney: 1, seed: 7 });
    for (let i = 0; i < 6; i++) { const aw = box(.5, .06, 1.2, i % 2 ? '#f6efe0' : '#d6402f', -47.0 + i * .5, 2.15, -9.75, undefined, false); aw.rotation.x = .35; }
    [[-47.2, -8.2], [-43.8, -8.4]].forEach(([x, z]) => { bistroTable(x, z, .42); for (const s of [-1, 1]) bistroChair(x + s * .66, z, -s * Math.PI / 2, '#2f6b4a'); });
    planeTree(-68.2, -8.2, .9); planeTree(-48.6, 2.8, .85);
    hydrangea(-61.6, -8.5, .8, '#8fa8e0', 31); hydrangea(-54.4, -8.5, .8, '#e8a3c0', 32);
    // Prairie des vaches (clôture avec un passage, au nord-ouest)
    fenceRow(-78.4, -13.4, -70.4, -13.4); fenceRow(-68.6, -13.4, -64.6, -13.4); fenceRow(-64.6, -13.4, -64.6, -21.2);
    const cows = addCows({ minX: -78.2, maxX: -65.4, minZ: -21, maxZ: -14 }, 3);
    W.yap(new THREE.Vector3(-71.6, 0, -16), 8.5, () => { cows.chorus(); W.complete('meuh'); });
    { const tr = cyl(.55, .6, .5, '#9aa3ad', -66.2, .25, -15, 10); tr.scale.set(1.6, 1, .8); box(1.6, .06, .8, '#7fa9c0', -66.2, .46, -15, undefined, false); solidBox(-66.2, -15, 1.8, 1, .5); }
    // Composteur
    { box(.4, 1.2, .3, '#f6d36b', -47, .6, PLAT.z - .9); box(.3, .1, .05, '#2f2a24', -47, 1, PLAT.z - .74, undefined, false); solidBox(-47, PLAT.z - .9, .4, .3, 1.2); }
    W.interact({ x: -47, y: 1.4, z: PLAT.z - .2 }, 1.3, () => { W.SFX.crack(); W.say({ anchor: new THREE.Vector3(-47, 2, PLAT.z - .9) }, W.done('composter') ? t().ticketAgain : t().ticket, '', 2, 0, 'ticket'); W.complete('composter'); });
    // Train
    const train = makeTrain(W, -58, 10.4);
    W.egg('train', -62, PLAT.z + 1, 2.6, 1.2);
    let steam = 0;
    const whistle = () => { W.SFX.train(); steam = 2.4; W.say({ anchor: new THREE.Vector3(-57, 4.6, 10.4) }, t().trainWhistle, '', 1.8, 0, 'train'); };
    W.yap(new THREE.Vector3(-54, 0, PLAT.z + 1), 4.5, () => { whistle(); W.complete('siffler'); });
    W.interact({ x: -59, y: 1.4, z: PLAT.z + 1.2 }, 1.8, () => { if (!isOpen('nantes')) { W.say(fox, t().noTrain, '', 1.8, 2); return; } trainMenu('gare'); });
    // Chef de gare + casquette, voyageurs, valises
    const chef = W.npc({ id: 'chefgare', x: -52, z: PLAT.z - .2, yaw: Math.PI, shirt: '#24427a', pants: '#24427a', hair: '#8a6a4a', hat: 'kepi', hatColor: '#24427a',
      route: [{ p: new THREE.Vector3(-52, 0, PLAT.z), wait: 4, act: 'look', yaw: 0 }, { p: new THREE.Vector3(-64, 0, PLAT.z), wait: 3, act: 'point', yaw: 0 }] });
    bench(-62, PLAT.z - .4, 0, '#5d8fb0'); bench(-54, PLAT.z - .4, 0, '#5d8fb0'); bench(-70.5, PLAT.z - .4, 0, '#5d8fb0');
    const cap = W.item({ kind: 'casquette', x: -54.5, z: PLAT.z - .4, y: .6, owner: chef, sh: .3, bring: new THREE.Vector3(-54.5, 0, PLAT.z + .4),
      build: () => { const g = new THREE.Group(); cyl(.24, .26, .16, '#24427a', 0, 0, 0, 10, g); box(.28, .04, .18, '#1f2328', 0, -.06, .22, g, false); box(.3, .04, .04, '#f6d36b', 0, .04, .22, g, false); return g; } });
    cap.onGrab = () => W.complete('casquette');
    const crowd = W.crowd(10);
    const travellers = [0, 1, 2, 3, 4].map(i => crowd.add({ pos: { x: -66 + i * 3.4 + rnd(-.5, .5), z: PLAT.z + rnd(-.4, .6) }, yaw: 0, shirt: pick(['#c9894f', '#8a7cc2', '#5d8a8a', '#d9705a', '#3e5677']), pants: pick(['#2b3448', '#3d4a5c', '#6b6155']), hair: pick(['#5a3b2a', '#2f2a24', '#c9a33d', '#d9d4c8']), hat: i === 2 ? 'beret' : null, hatColor: '#2f2a24' }));
    const sleeper = crowd.add({ pos: { x: -70.5, z: PLAT.z - .25 }, seated: true, yaw: 0, shirt: '#7fb05c', pants: '#3d4a5c', hair: '#8a6a4a' }); sleeper.pos.y = .1;
    let woke = 0, zz = 0;
    W.yap(new THREE.Vector3(-70.5, 0, PLAT.z), 3, () => { if (woke > 0) return; woke = 4; sleeper.jump = .5; W.say({ anchor: new THREE.Vector3(-70.5, 2.6, PLAT.z) }, t().sleeper, '', 2, 0, 'sleeper'); W.complete('voyageur'); });
    const suit = (c) => () => { const g = new THREE.Group(); box(.8, .55, .3, c, 0, .28, 0, g); box(.3, .08, .06, '#2f2a24', 0, .6, 0, g, false); box(.7, .5, .28, pick(['#d6402f', '#2563c9', '#7fb05c']), 0, .83, 0, g); return g; };
    W.pushable(-49.5, PLAT.z + .3, suit('#8a5a3b'), { goal: 'valise', r: .5 });
    W.flock(-55, -3, 4, '#9aa3b5'); W.flock(-46, 3, 3, '#9aa3b5');
    // Barrière (passage à niveau) dans la trouée de la haie
    const bar = new THREE.Group(); box(.3, 1, .3, '#f6efe0', 0, .5, -1.8, bar); const arm = new THREE.Group(); arm.position.set(0, .9, -1.8); bar.add(arm);
    for (let i = 0; i < 5; i++) box(.12, .14, .75, i % 2 ? '#f6efe0' : '#d6402f', 0, 0, .4 + i * .74, arm, false);
    bar.position.set(-32.4, 0, 0); W.rig(bar, [bar, arm]); bar.userData.gate = true;
    W.R.gates = [show => { const end = -1.35; if (!show) { arm.rotation.x = end; return; } let k = 0; const step = () => { k = Math.min(1, k + .03); arm.rotation.x = end * (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); }; setTimeout(step, 600); }];
    W.postcard(-77, -18);
    W.update(dt => {
      const now = performance.now() / 1000;
      for (const a of travellers) { a.t += dt; behave.face(a, -58, 12, dt, 1); a.armR = Math.sin(a.t * .7 + a.i) > .8 ? -1.3 : 0; a.headYaw = Math.sin(a.t * .4 + a.i) * .5; }
      if (woke > 0) { woke -= dt; behave.cheer(sleeper, now); } else { sleeper.lean = .5; behave.rest(sleeper); sleeper.lean = .5; if ((zz -= dt) < 0 && Math.abs(fox.pos.x + 70) < 10) { zz = 3; W.say({ anchor: new THREE.Vector3(-70.5, 2.2, PLAT.z) }, t().sleeping, 'note', 1.5, 0, 'sleeper'); } }
      if (steam > 0 || Math.random() < dt * .6) { steam -= dt; if (Math.random() < dt * 20) W.emit(new THREE.Vector3(train.position.x + .9, 4, 10.4), '#f2f2f2', { n: 1, spd: .5, up: 2.2, life: 1.6, grav: -1, size: 2.5 }); }
    });
    // Quai fleuri, bagages, massifs devant la gare
    planter(-44.6, 6, 1.6); planter(-72.4, 6, 1.6); planter(-64.6, -8.1, 2.6); planter(-51.4, -8.1, 2.6);
    crate(-48.8, -5.6, .2); crate(-48.8, -5.6, .5, .7); barrel(-47.6, -6.2);
    lantern(-40, 2.6); lantern(-40, -2.6);

    return { whistle, restore() { if (W.done('casquette')) { cap.gone = true; cap.mesh.visible = false; } } };
  },
});
