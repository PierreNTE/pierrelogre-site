/* =====================================================================
   Le motocross (au-delà du complexe sportif) : une vraie course en boucle
   (grille de départ, compte à rebours, tours, bosses, tremplins, drapeau à damier, podium),
   un paddock avec son mécano, des spectateurs. S'ouvre après 3 bêtises au complexe sportif.
   ===================================================================== */
import * as THREE from 'three';
import { giveUp } from '../actions.js';
import { behave } from '../crowd.js';
import { blob, flat2, textTex } from '../engine.js';
import { fox } from '../fox.js';
import { defineRegion, needIn, regionDone } from '../regions.js';
import { pick, rnd, t } from '../state.js';
import { adBoard, building, bunting, fenceRow, fir, gorse, hash, mound, pine, rock, rockCluster, tree, treeLine, van } from './kit.js';

const B = { minX: 99, maxX: 175, minZ: -40, maxZ: 40 };
const TW = 5.2;                                  // largeur de piste
const PTS = [[108, -25], [130, -32], [155, -31], [168, -16], [168, 10], [156, 29], [131, 32], [114, 25], [117, 9], [131, 3], [124, -10], [109, -11]];
const curve = new THREE.CatmullRomCurve3(PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
const N = 480, SP = curve.getSpacedPoints(N);   // échantillons réguliers (SP[N] = SP[0])
const LEN = curve.getLength();
const BUMPS = [.09, .11, .13, .33, .35, .37, .52, .54, .82, .84, .86];
const RAMPS = [.24, .66];
const MUD_S = .74, START_S = 0, LAPS = 3;
const at = s => SP[Math.floor(((s % 1) + 1) % 1 * N + 1e-6) % N];   // (+1e-6 : évite qu'un arrondi renvoie l'échantillon précédent)
const tan = s => { const a = at(s), b = at(s + 1 / N); return Math.atan2(b.x - a.x, b.z - a.z); };
const dS = (a, b) => { let d = b - a; if (d > .5) d -= 1; if (d < -.5) d += 1; return d; };
function bumpH(s) {
  let h = 0; for (const b of BUMPS) { const d = Math.abs(dS(s, b)) * LEN; if (d < 1.6) h += Math.cos(d / 1.6 * Math.PI / 2) ** 2 * .45; }
  for (const r of RAMPS) { const d = dS(r, s) * LEN; if (d > -3 && d < 0) h += (d + 3) / 3 * 1.1; }
  return h;
}
function nearestS(p) { let best = 0, bd = 1e9; for (let i = 0; i < N; i += 2) { const q = SP[i], d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < bd) { bd = d; best = i; } } return [best / N, Math.sqrt(bd)]; }

defineRegion({
  id: 'moto', bounds: B, mapColor: '#d9b98a',
  veg: { biome: 'dry', density: .8 },
  walk: [{ minX: 94, maxX: 100, minZ: -4, maxZ: 4 }, B],
  unlock: () => regionDone('sport') >= 3, need: needIn('sport', 3),
  spawn: new THREE.Vector3(102, 0, 0), spawnYaw: Math.PI / 2, gatePos: new THREE.Vector3(97, 0, 0),
  mood: { bg: '#e8dcc2', fog: '#ddd0b2', near: 40, far: 90, sun: '#ffd49a', sky: '#fff0d0', ground: '#9a8a5a', life: .5, music: 'moto' },
  goals: [
    { id: 'tourCircuit' }, { id: 'tremplin' }, { id: 'boueMoto' }, { id: 'drapeau' }, { id: 'cle' }, { id: 'fauxDepart' }, { id: 'podium' }, { id: 'klaxon' },
    { id: 'champion', secret: true }, { id: 'mecano3', secret: true },
  ],
  i18n: {
    fr: {
      goals: { tourCircuit: "Faire un tour complet du circuit", tremplin: "Sauter du tremplin à pleine vitesse", boueMoto: "Se rouler dans la boue du circuit", drapeau: "Agiter le drapeau à damier sur la ligne d'arrivée",
        cle: "Cacher la clé à molette du mécano dans le foin", fauxDepart: "Provoquer un faux départ", podium: "Monter sur la plus haute marche du podium", klaxon: "Se faire klaxonner par un pilote",
        champion: "Être sur le podium pendant la remise des prix", mecano3: "Écouter les histoires du mécano" },
      hints: { tourCircuit: "Suis la piste de terre jusqu'à revenir à ton point de départ.", tremplin: "Les tremplins sont sur la piste. Cours (Maj) droit dessus.", boueMoto: "Une grosse flaque de boue au nord-est de la piste. Reste dedans un moment.",
        drapeau: "Le commissaire tient le drapeau à damier près de la ligne d'arrivée. Prends-le, puis glapis sur la ligne.", cle: "La clé à molette est dans le paddock. Les bottes de foin sont au bord de la piste.",
        fauxDepart: "Pendant le compte à rebours, glapis près de la grille de départ.", podium: "Le podium est à côté du paddock. Grimpe tout en haut.", klaxon: "Traverse la piste quand une moto arrive… prudemment." },
      L: { commissaire: { chase: ["Mon drapeau !", "Rends-moi ça, renard !"], idle: ["Dernier tour !", "Attention au virage !", "Drapeau jaune !"] },
        meca: { chase: ["Ma clé de 13 !", "Ma clé à molette !"], idle: ["Il faut régler le carbu.", "Qui a encore crevé ?", "Passe-moi la clé… elle est où ?"] } },
      search: { cle: "Quelqu'un a vu ma clé ?", drapeau: "Mon drapeau ?" },
      dest: { foin: "Foin", ligne: "Ligne" },
      eggs: { board: "Tableau : « Course en cours. Interdit aux renards. »", paddock: "Le paddock : odeur d'huile, de pneu chaud et de sandwich." },
      signs: { moto: "Motocross", paddock: "Paddock" },
      cards: { moto: "Bons baisers du motocross ! On a mis un casque au renard. Il a refusé la moto. Il préfère courir à côté (et c'est plus rapide)." },
      board: (lap, n, lead) => `TOUR ${lap}/${n} · EN TÊTE : N°${lead}`, boardGrid: "DÉPART DANS QUELQUES SECONDES", boardEnd: lead => `VAINQUEUR : N°${lead} !`,
      honk: ["Pousse-toi !", "Attention, renard !", "Tût-tût !"], falseStart: "FAUX DÉPART ! Tout le monde recommence !", flagWave: "Course terminée… ah non ?!",
      mecTalk: ["Tu sais, le motocross, c'est 90 % de boue…", "…et 10 % de bosses.", "Il paraît que le monsieur du terrier en fait aussi, de la moto-cross."], champ: "LE RENARD EST CHAMPION !",
    },
    en: {
      goals: { tourCircuit: "Run a full lap of the track", tremplin: "Jump off the ramp at full speed", boueMoto: "Roll in the track's mud", drapeau: "Wave the chequered flag on the finish line",
        cle: "Hide the mechanic's wrench in the hay", fauxDepart: "Cause a false start", podium: "Climb to the top of the podium", klaxon: "Get honked at by a rider",
        champion: "Be on the podium during the prize ceremony", mecano3: "Listen to the mechanic's stories" },
      hints: { tourCircuit: "Follow the dirt track until you are back where you started.", tremplin: "The ramps are on the track. Run (Shift) straight at them.", boueMoto: "A big mud puddle north-east of the track. Stay in it for a moment.",
        drapeau: "The marshal holds the chequered flag near the finish line. Grab it, then yap on the line.", cle: "The wrench is in the paddock. The hay bales line the track.",
        fauxDepart: "During the countdown, yap near the starting gate.", podium: "The podium is next to the paddock. Climb to the top.", klaxon: "Cross the track as a bike comes… carefully." },
      L: { commissaire: { chase: ["My flag!", "Give that back, fox!"], idle: ["Last lap!", "Careful in the corner!", "Yellow flag!"] },
        meca: { chase: ["My spanner!", "My wrench!"], idle: ["The carb needs tuning.", "Who got a flat this time?", "Pass me the wrench… where is it?"] } },
      search: { cle: "Has anyone seen my wrench?", drapeau: "My flag?" },
      dest: { foin: "Hay", ligne: "Line" },
      eggs: { board: "Board: \"Race in progress. No foxes.\"", paddock: "The paddock: smells of oil, hot tyres and sandwiches." },
      signs: { moto: "Motocross", paddock: "Paddock" },
      cards: { moto: "Greetings from the motocross track! They gave the fox a helmet. It turned down the bike. It prefers running alongside (it's faster)." },
      board: (lap, n, lead) => `LAP ${lap}/${n} · LEADER: #${lead}`, boardGrid: "START IN A FEW SECONDS", boardEnd: lead => `WINNER: #${lead}!`,
      honk: ["Move it!", "Watch out, fox!", "Beep beep!"], falseStart: "FALSE START! Everyone back to the gate!", flagWave: "Race over… wait, what?!",
      mecTalk: ["You know, motocross is 90% mud…", "…and 10% bumps.", "Word is the guy from the den rides motocross too."], champ: "THE FOX IS CHAMPION!",
    },
  },
  build(W) {
    const { box, cyl, sph, cone, solidBox, solidCircle } = W;
    const R = { phase: 'grid', t: 4, lead: null, lapDisp: 1, ceremony: 0 };
    W.patch(84, 88, '#bcc68c', 137, 0); W.mottle(B, ['#b5bf84', '#c3c991', '#afb97e', '#c2c38c'], 22);
    W.path([[94, .2], [97, -.3], [100.5, .4], [103.5, 0]], 3.2, { style: 'lane', fade: [false, true], seed: 51 });
    // Piste : un ruban de terre continu (ornières sombres), bords fondus dans l'herbe sèche
    W.path(PTS, TW + .5, { style: 'mx', closed: true, pebbles: false, seed: 52 });
    // Terre arrachée autour de la piste (taches) et talus de terre à l'extérieur des virages
    const nrm = s => { const y = tan(s); return [Math.cos(y), -Math.sin(y)]; };
    const turn = s => { const d = tan(s + 5 / N) - tan(s - 5 / N); return Math.atan2(Math.sin(d), Math.cos(d)); };
    const berm = [];
    for (let i = 0; i < N; i += 3) {
      const s = i / N, k = turn(s); if (Math.abs(k) < .22) continue;   // virages serrés seulement : un talus continu
      const p = at(s), [nx, nz] = nrm(s), o = -Math.sign(k) * (TW / 2 + 1.15), x = p.x + nx * o, z = p.z + nz * o;
      const m = mound(x, z, 1.8, 3.8, .7 + hash(i) * .12, hash(i * 3) > .5 ? '#ab7f52' : '#a5784c', tan(s), 1); m.castShadow = true;
      if (i % 6 === 0) solidCircle(x, z, .85, .8); berm.push(i);
    }
    W.patch(9, 5.6, '#a98a5e', 120, -16, { y: .021, round: .95 }); W.patch(4.6, 7, '#a98a5e', 158, 6, { y: .021, round: .95 }); W.patch(6, 4.2, '#a98a5e', 128, 22, { y: .021, round: .95 });
    // Bosses, tremplins (terre tassée, lèvre en bois), boue
    for (const s of BUMPS) { const p = at(s); const m = sph(1.7, '#a97d52', p.x, -.02, p.z, undefined, 1, false); m.scale.set(TW / 3.4, .27, .95); m.rotation.y = tan(s); m.castShadow = false; }
    const ramps = RAMPS.map(s => { const p = at(s - 1.5 / LEN), y = tan(s); const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = y; W.R.group.add(g);
      const w = box(TW - .6, .3, 3.2, '#a97d52', 0, .55, 0, g); w.rotation.x = -.35; box(TW - .6, .14, .25, '#8a5a3b', 0, 1.07, 1.45, g, false);
      for (const sx of [-1, 1]) { const sd = sph(1, '#9c7046', sx * (TW / 2 - .2), 0, .2, g, 1, false); sd.scale.set(.6, .95, 1.7); }
      return { s, p, y }; });
    const mudP = at(MUD_S); W.disc(2.6, '#6b4c33', mudP.x, mudP.z, .03, 1.3, 1); W.disc(1.2, '#5a3f2a', mudP.x + .5, mudP.z - .3, .035);
    // Bottes de foin et pneus aux virages, palissade autour
    const hay = [];
    for (let i = 0; i < N; i += 24) { const s = i / N, p = at(s), y = tan(s), k = turn(s); let o = (i / 24) % 2 ? 1 : -1; if (Math.abs(k) >= .22) o = Math.sign(k);   // dans les virages : côté intérieur (le talus est à l'extérieur)
      const x = p.x + Math.cos(y) * (TW / 2 + 1.1) * o, z = p.z - Math.sin(y) * (TW / 2 + 1.1) * o;
      if ((i / 24) % 3 === 0) { const b = box(1.2, .7, .8, '#e2c06a', x, .35, z); b.rotation.y = y; solidCircle(x, z, .6, .7); hay.push(new THREE.Vector3(x, 0, z)); }
      else { cyl(.4, .4, .3, '#2f2a24', x, .15, z, 10); cyl(.4, .4, .3, '#2f2a24', x, .45, z, 10); solidCircle(x, z, .4, .6); } }
    // Rubalise rouge et blanche le long de la piste (piquets), avec des passages pour traverser, la grille et les tremplins dégagés
    { const OFF = TW / 2 + 2.1, step = 2.6 / LEN, open = s => [START_S, ...RAMPS].some(c => Math.abs(dS(s, c)) * LEN < 5) || ((s * LEN) % 38) < 4.5;
      for (const side of [-1, 1]) { let prev = null, k = 0;
        for (let s = 0; s < 1; s += step) {
          const p = at(s), [nx, nz] = nrm(s), x = p.x + nx * OFF * side, z = p.z + nz * OFF * side;
          if (open(s)) { prev = null; continue; }
          cyl(.035, .045, .8, '#ece6da', x, .4, z, 4, undefined, false);
          if (prev) { const dx = x - prev[0], dz = z - prev[1], L = Math.hypot(dx, dz); if (L < 4) { const t = box(L, .05, .015, k++ % 2 ? '#f6f2e8' : '#d6402f', (x + prev[0]) / 2, .68, (z + prev[1]) / 2, undefined, false); t.rotation.y = Math.atan2(-dz, dx); } }
          prev = [x, z];
        } } }
    // Lande : touffes d'ajonc piquées de jaune dans les espaces libres (loin de la piste, du paddock et de la buvette)
    { let n = 0; for (let i = 0; i < 400 && n < 30; i++) { const x = rnd(B.minX + 4, B.maxX - 4), z = rnd(B.minZ + 4, B.maxZ - 4);
        if (nearestS({ x, z })[1] < TW / 2 + 3.4) continue; if (Math.abs(x - 140) < 11 && Math.abs(z + 14) < 7) continue; if (Math.hypot(x - 146.5, z - 17) < 6 || Math.hypot(x - 128, z + 20) < 4 || Math.abs(x - 101) < 4) continue;
        gorse(x, z, 1.05 + hash(i) * .55, i); n++; } }
    // Lisières mélangées (pins, sapins, chênes) et collines au-delà, pour fermer l'horizon
    const edge = (x, z, i) => (i % 4 === 1 ? tree(x, z, 1.15 + hash(i) * .2, 0, i + 3) : i % 4 === 3 ? fir(x, z, 1.2 + hash(i * 2) * .25, i) : pine(x, z, 1.1 + hash(i * 5) * .3, i));
    treeLine(99, -39.5, 175, -39.5, 3.2, edge); treeLine(99, 39.5, 175, 39.5, 3.2, edge); treeLine(175.5, -39, 175.5, 39, 3.2, edge); treeLine(99, -39, 99, -6, 3.2, edge); treeLine(99, 6, 99, 39, 3.2, edge);
    [[137, -50, 46, 14, 5], [178, -46, 30, 14, 6], [186, 0, 16, 60, 7], [140, 50, 50, 12, 4]].forEach(([x, z, w, d, h], i) => mound(x, z, w, d, h, ['#9fb070', '#a7b676'][i % 2]));
    [[104, 36], [172, -36], [171, 35], [104, -36], [146, 12], [140, 14]].forEach(([x, z], i) => (i % 2 ? fir(x, z, 1.2, i) : pine(x, z, 1.2, i)));
    rock(150, 14, 1.4); rock(138, 18, 1.1); rockCluster(160, -26, .9); rockCluster(112, 18, .8);
    // Panneaux le long des lignes droites, tapis de pneus, butte des spectateurs
    for (const [s0, side] of [[.03, 1], [.44, -1], [.6, 1], [.93, -1]]) { const p = at(s0), y = tan(s0), x = p.x + Math.cos(y) * (TW / 2 + 2.3) * side, z = p.z - Math.sin(y) * (TW / 2 + 2.3) * side; adBoard(x, z, 4.2, y + Math.PI / 2 + (side > 0 ? Math.PI : 0), ['#2563c9', '#e8742a', '#7fb05c', '#d6402f'][Math.round(s0 * 10) % 4]); solidBox(x, z, 1.4, 1.4, .8); }
    // Ligne d'arrivée, portique, grille de départ
    const sp = at(START_S), sy = tan(START_S);
    for (let k = -2; k <= 2; k++) for (let j = 0; j < 2; j++) W.ground(.5, .5, (k + j) % 2 ? '#f6f2e8' : '#2f2a24', sp.x + Math.cos(sy) * k * .55 + Math.sin(sy) * j * .5, sp.z - Math.sin(sy) * k * .55 + Math.cos(sy) * j * .5, .035, sy);
    { const g = new THREE.Group(); g.position.set(sp.x, 0, sp.z); g.rotation.y = sy; W.R.group.add(g); [-1, 1].forEach(s => cyl(.15, .18, 4.4, '#e8742a', s * (TW / 2 + .5), 2.2, 0, 6, g)); box(TW + 1.4, .7, .2, '#2f3640', 0, 4.3, 0, g);
      [-1, 1].forEach(s => { const px = sp.x + Math.cos(sy) * s * (TW / 2 + .5), pz = sp.z - Math.sin(sy) * s * (TW / 2 + .5); solidCircle(px, pz, .2, 3); }); }
    // Grille de départ : barrières qui basculent au départ et se relèvent sur la grille
    const gateBars = new THREE.Group(); { const gp = at(START_S - 2.4 / LEN); gateBars.position.set(gp.x, 0, gp.z); gateBars.rotation.y = sy; }
    const gateLeaves = [];
    for (let k = -2; k <= 2; k++) { const lf = new THREE.Group(); lf.position.set(k * 1.02, .05, 0); gateBars.add(lf); box(.9, .5, .06, '#c9cdd3', 0, .27, 0, lf); box(.9, .08, .07, '#2563c9', 0, .45, 0, lf, false); gateLeaves.push(lf); }
    box(5.6, .1, .2, '#5d6670', 0, .04, -.15, gateBars, false);
    W.rig(gateBars, [gateBars, ...gateLeaves]);
    const boardTex = textTex(512, 96, (g, w, h) => { g.fillStyle = '#1f2328'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6d36b'; g.font = 'bold 34px "Baloo 2",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(boardText(), w / 2, h / 2 + 2); });
    { const p = new THREE.Mesh(new THREE.PlaneGeometry(TW + 1.2, .62), new THREE.MeshBasicMaterial({ map: boardTex, side: THREE.DoubleSide })); p.position.set(sp.x, 4.3, sp.z); p.rotation.y = sy + Math.PI; p.translateZ(-.12); W.R.group.add(p); }
    W.egg('board', sp.x + Math.cos(sy) * 5, sp.z - Math.sin(sy) * 5, 3, 1.8);
    // Paddock (au centre du circuit), podium
    const PAD = { x: 140, z: -14 };
    W.ground(18, 10, '#cdbf9e', PAD.x, PAD.z, .02);
    [[-5, -2], [1, -2], [7, -2]].forEach(([dx, dz], i) => { const x = PAD.x + dx, z = PAD.z + dz; [-1, 1].forEach(a => [-1, 1].forEach(b => cyl(.05, .05, 2.4, '#d9d4c8', x + a * 1.5, 1.2, z + b * 1.5, 4))); box(3.4, .12, 3.4, ['#d6402f', '#2563c9', '#f6d36b'][i], x, 2.45, z); cone(2.4, .7, ['#d6402f', '#2563c9', '#f6d36b'][i], x, 2.85, z, 4).rotation.y = Math.PI / 4; });
    box(2.4, 1, 1, '#9aa7b3', PAD.x - 6, .5, PAD.z + 3); solidBox(PAD.x - 6, PAD.z + 3, 2.4, 1, 1);
    building(PAD.x + 8, PAD.z + 3.5, 4, 3, 2.4, '#f6efe0', '#2f3640', { roofType: 'flat', trim: '#e8742a' });
    W.sign(PAD.x - 9.5, PAD.z + 5, 'paddock', .3, 2); W.egg('paddock', PAD.x - 2, PAD.z + 4, 2.6, 1.8);
    const POD = { x: 128, z: -20 };
    const podium = [[0, 1.1, '#f6d36b'], [-1.3, .75, '#c9cdd3'], [1.3, .5, '#d9a25a']].map(([dx, h, c]) => { box(1.3, h, 1.3, c, POD.x + dx, h / 2, POD.z); return { x: POD.x + dx, z: POD.z, h }; });
    W.sign(102.5, -4.6, 'moto', Math.PI / 2, 2.4);
    // Spectateurs (une foule) + pilotes
    const crowd = W.crowd(30);
    const fanSpots = [[118, -37.2, 0], [146, -37.2, 0], [172, 0, -Math.PI / 2], [146, 36.8, Math.PI], [104, 15, Math.PI / 2], [146, 23.4, 0]];
    // Buvette au milieu du circuit (frites, sandwichs)
    building(146.5, 16.8, 4, 2.6, 2.3, '#f6efe0', '#d6402f', { roofType: 'flat', trim: '#2563c9', plinth: null, seed: 5 });
    for (let i = 0; i < 7; i++) { const aw = box(.58, .06, 1.1, i % 2 ? '#f6efe0' : '#d6402f', 144.75 + i * .58, 2.1, 18.5, undefined, false); aw.rotation.x = .3; }
    [[143.6, 20.2], [149.4, 20.2]].forEach(([x, z]) => { cyl(.42, .42, .05, '#f6efe0', x, .78, z, 10); cyl(.04, .05, .78, '#2f2a24', x, .39, z, 5, undefined, false); solidCircle(x, z, .5, .8); });
    const fans = [];
    fanSpots.forEach(([x, z, yaw]) => { for (let i = 0; i < 3; i++) { const dx = Math.cos(yaw) * (i - 1) * 1.1, dz = -Math.sin(yaw) * (i - 1) * 1.1; fans.push(crowd.add({ pos: { x: x + dx, z: z + dz }, yaw, shirt: pick(['#d6402f', '#2563c9', '#f6d36b', '#7fb05c', '#2f3640', '#e8742a']), pants: pick(['#3d4a5c', '#2f2a24', '#4a6d9a']), hair: pick(['#5a3b2a', '#2f2a24', '#c9a33d']), hat: i === 1 ? 'cap' : null, hatColor: '#e8742a' })); }
      fenceRow(x - Math.cos(yaw) * 2.4 + Math.sin(yaw) * 1.2, z + Math.sin(yaw) * 2.4 + Math.cos(yaw) * 1.2, x + Math.cos(yaw) * 2.4 + Math.sin(yaw) * 1.2, z - Math.sin(yaw) * 2.4 + Math.cos(yaw) * 1.2, '#f6f2e8'); });
    const COLORS = ['#d6402f', '#2563c9', '#f6d36b', '#7fb05c', '#8a7cc2'], NUMS = [7, 22, 4, 13, 91];
    const bikes = COLORS.map((c, i) => {
      const g = new THREE.Group();
      box(.3, .45, 1.3, c, 0, .75, 0, g); box(.34, .18, .7, '#2f2a24', 0, 1.02, -.15, g, false); box(.5, .35, .08, '#f6f2e8', 0, 1.05, .62, g, false);
      [-.62, .66].forEach(z => { const w = cyl(.38, .38, .18, '#2f2a24', 0, .38, z, 10, g); w.rotation.z = Math.PI / 2; cyl(.16, .16, .2, '#9aa7b3', 0, .38, z, 6, g, false).rotation.z = Math.PI / 2; });
      cyl(.04, .04, .7, '#c9cdd3', 0, .75, .6, 4, g, false).rotation.x = -.35; box(.7, .05, .05, '#2f2a24', 0, 1.15, .45, g, false); box(.32, .3, .5, c, 0, .62, .35, g, false);
      W.dyn(g);
      const rider = crowd.add({ pos: { x: 0, z: 0 }, seated: true, hat: 'helmet', hatColor: c, shirt: c, pants: '#2f2a24', hair: '#2f2a24' });
      return { g, rider, s: -i * .012, lane: (i % 3 - 1) * 1.3, v: 0, base: rnd(13.5, 15.5), lap: 0, air: 0, num: NUMS[i], sh: blob(.8), done: false };
    });
    // Commissaire (drapeau à damier), mécano
    const fl = at(START_S + .012), fy = tan(START_S);
    const marshal = W.npc({ id: 'commissaire', x: fl.x + Math.cos(fy) * (TW / 2 + 2.2), z: fl.z - Math.sin(fy) * (TW / 2 + 2.2), yaw: -fy, shirt: '#f6f2e8', pants: '#2f3640', hair: '#5a3b2a',
      route: [{ p: new THREE.Vector3(fl.x + Math.cos(fy) * (TW / 2 + 2.2), 0, fl.z - Math.sin(fy) * (TW / 2 + 2.2)), wait: 99, act: 'wave', yaw: fy - Math.PI / 2 }] });
    const chk = W.item({ kind: 'drapeau', x: marshal.pos.x + .8, z: marshal.pos.z + .3, y: .1, owner: marshal, sh: .3, bring: marshal.pos.clone().add(new THREE.Vector3(.8, 0, .3)),
      build: () => { const g = new THREE.Group(); cyl(.03, .03, 1.2, '#8a5a3b', 0, 0, 0, 4, g).rotation.z = Math.PI / 2; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(.15, .02, .15, (i + j) % 2 ? '#f6f2e8' : '#2f2a24', .2 + i * .15, .02, .1 + j * .15, g, false); return g; } });
    const meca = W.npc({ id: 'meca', x: PAD.x - 6, z: PAD.z + 4.2, yaw: Math.PI, shirt: '#2f3640', pants: '#2f3640', hair: '#6b4a2a', overalls: true,
      route: [{ p: new THREE.Vector3(PAD.x - 6, 0, PAD.z + 4.2), wait: 4, act: 'check', yaw: Math.PI }, { p: new THREE.Vector3(PAD.x + 1, 0, PAD.z + 2), wait: 3, act: 'type', yaw: Math.PI }] });
    meca.onYap = n => { n.jump = .3; const k = W.talk('meca'); W.say(n, t().mecTalk[Math.min(2, k - 1)], '', 2.8); if (k >= 3) W.complete('mecano3'); };
    const wrench = W.item({ kind: 'cle', x: PAD.x - 5, z: PAD.z + 3, y: 1.04, owner: meca, sh: .3, bring: new THREE.Vector3(PAD.x - 5, 0, PAD.z + 4),
      build: () => { const g = new THREE.Group(); box(.6, .05, .1, '#9aa7b3', 0, 0, 0, g); const h = cyl(.1, .1, .05, '#9aa7b3', .32, 0, 0, 6, g); h.rotation.x = Math.PI / 2; return g; } });
    W.place(it => {
      if (it === wrench && hay.some(h => flat2(h, it.pos) < 1.5)) { it.gone = true; it.mesh.visible = false; W.SFX.grab(); W.complete('cle'); giveUp(it); return true; }
      return false;
    });
    W.dest(it => it === wrench && !W.done('cle') ? { key: 'foin', pos: hay.reduce((a, h) => flat2(h, fox.pos) < flat2(a, fox.pos) ? h : a, hay[0]), r: 1 } : it === chk && !W.done('drapeau') ? { key: 'ligne', pos: sp.clone(), r: 1.4 } : null);

    /* ---------- Course ---------- */
    R.lead = bikes[0];
    function boardText() { return R.phase === 'grid' ? t().boardGrid : R.phase === 'end' || R.phase === 'podium' ? t().boardEnd(R.winner?.num ?? '?') : t().board(Math.min(LAPS, (R.lead?.lap ?? 0) + 1), LAPS, R.lead?.num ?? '?'); }
    const redraw = () => boardTex.userData.redraw();
    function toGrid() { R.phase = 'grid'; R.t = 5; R.beep = 4; bikes.forEach((b, i) => { b.s = -(i * .008) - .004; b.lap = 0; b.v = 0; b.air = 0; b.done = false; b.rider.visible = true; }); R.winner = null; redraw(); }
    W.yap(sp, 7, () => {
      if (R.phase === 'grid') { W.SFX.horn(); W.say({ anchor: new THREE.Vector3(sp.x, 3.6, sp.z) }, t().falseStart, '', 2.4, 0, 'false'); bikes.forEach(b => { b.v = 6; }); setTimeout(() => toGrid(), 1600); W.complete('fauxDepart'); return; }
      if (fox.held === chk && flat2(fox.pos, sp) < 4) { W.say({ anchor: new THREE.Vector3(sp.x, 3.6, sp.z) }, t().flagWave, '', 2.4, 0, 'flag'); W.SFX.cheer(); R.phase = 'end'; R.t = 4; R.winner = R.lead; redraw(); W.complete('drapeau'); }
    });
    // Le renard sur la piste : bosses, tremplins, boue, tour complet
    const fx = { acc: 0, last: null, air: 0, airV: 0, mud: 0 };
    W.zone(mudP, 2.4, () => { fox.muddy = 8; W.SFX.mud(); W.emit(new THREE.Vector3(fox.pos.x, .3, fox.pos.z), '#5b3f29', { n: 20, spd: 2.4, up: 3.5 }); W.complete('boueMoto'); }, { stay: 1.2 });
    W.update(dt => {
      const now = performance.now() / 1000;
      // Spectateurs
      for (const f of fans) { f.t += dt; const near = bikes.some(b => flat2(b.g.position, f.pos) < 9); if (near || R.phase === 'end' || R.phase === 'podium') { behave.cheer(f, f.t); f.jump = Math.abs(Math.sin(f.t * 6)) > .8 ? .2 : 0; } else { behave.rest(f); f.jump = 0; f.headYaw = Math.sin(f.t * .5 + f.pos.x) * .4; } }
      // Barrières de départ : debout sur la grille, couchées pendant la course
      const down = R.phase !== 'grid'; for (const lf of gateLeaves) lf.rotation.x += ((down ? 1.45 : 0) - lf.rotation.x) * Math.min(1, dt * (down ? 14 : 3));
      // Phases de course
      if (R.phase === 'grid') { R.t -= dt; if (R.t < R.beep && R.beep > 0) { R.beep--; W.SFX.coin(); } if (R.t <= 0) { R.phase = 'race'; W.SFX.engine(); redraw(); } }
      else if (R.phase === 'end') { R.t -= dt; if (R.t <= 0) { R.phase = 'podium'; R.t = 7; } }
      else if (R.phase === 'podium') { R.t -= dt; if (R.t <= 0) toGrid(); }
      // Motos
      let lead = R.lead;
      for (const b of bikes) {
        const racing = R.phase === 'race' || (R.phase === 'end' && !b.done) || (R.phase === 'grid' && b.v > 0);
        const target = R.phase === 'race' ? b.base + Math.sin(now * .7 + b.num) * 1.2 : R.phase === 'end' ? 6 : (b.v > 0 ? 6 : 0);
        b.v += (target - b.v) * Math.min(1, dt * (R.phase === 'race' ? .9 : 2));
        if (racing || b.v > .1) { const ps = b.s; b.s += b.v * dt / LEN; if (Math.floor(b.s) > Math.floor(ps) && R.phase === 'race') { b.lap++; if (b.lap >= LAPS && !R.winner) { R.winner = b; R.phase = 'end'; R.t = 5; W.SFX.cheer(); W.say(marshal, '🏁', 'note', 2, 2.8); redraw(); } } }
        if (R.phase === 'podium') { b.v = 0; }
        if (b.lap * 1 + b.s > (lead.lap + lead.s)) lead = b;
        const s = ((b.s % 1) + 1) % 1, p = at(s), y = tan(s);
        // Saut des tremplins
        for (const r of RAMPS) if (Math.abs(dS(s, r)) < 1 / N && b.air <= 0 && b.v > 8) { b.air = .01; b.airV = 5.5; }
        let h = bumpH(s);
        if (b.air > 0) { b.air += b.airV * dt; b.airV -= 14 * dt; if (b.air <= 0) { b.air = 0; W.emit(new THREE.Vector3(p.x, .2, p.z), '#b98d5e', { n: 6, spd: 1.6, up: 2 }); } h = Math.max(h, b.air + .8); }
        const lx = p.x + Math.cos(y) * b.lane, lz = p.z - Math.sin(y) * b.lane;
        b.g.position.set(lx, h, lz); b.g.rotation.set(b.air > 0 ? -b.airV * .05 : -(bumpH(s + .6 / LEN) - bumpH(s - .6 / LEN)) * .6, y, 0);
        b.sh.position.set(lx, .04, lz); b.sh.visible = b.g.visible;
        const rd = b.rider; rd.pos.set(lx - Math.sin(y) * .2, h + .38, lz - Math.cos(y) * .2); rd.yaw = y; rd.lean = .35; rd.armL = rd.armR = -1.25; rd.armLz = -.15; rd.armRz = .15;
        if (R.phase === 'podium') { const k = [R.winner, ...bikes.filter(x => x !== R.winner)].indexOf(b); if (k < 3) { const pd = podium[k]; rd.seated = false; rd.pos.set(pd.x, pd.h, pd.z + .1); rd.yaw = 0; behave.cheer(rd, now + k); rd.lean = 0; } }
        else rd.seated = true;
        if (b.v > 6 && Math.random() < dt * 8) W.emit(new THREE.Vector3(lx - Math.sin(y) * 1, .2, lz - Math.cos(y) * 1), Math.abs(dS(s, MUD_S)) < .01 ? '#5b3f29' : '#c9a77a', { n: 1, spd: .8, up: 1.4, life: .7, grav: 4 });
        // Le renard sur la trajectoire : klaxon (et petite bousculade)
        const df = Math.hypot(fox.pos.x - lx, fox.pos.z - lz);
        if (df < 3.2 && b.v > 4 && (b.honkCd = (b.honkCd || 0) - dt) < 0) { b.honkCd = 3; W.SFX.horn(); W.say({ anchor: new THREE.Vector3(lx, 2.6, lz) }, pick(t().honk), '', 1.4, 0, 'honk' + b.num); W.complete('klaxon'); }
        if (df < 1 && b.v > 4 && !(fox.stunT > 0) && (fox.lift || 0) < .5) { fox.vel.set(Math.cos(y) * 7, 0, -Math.sin(y) * 7); fox.stunT = .6; W.SFX.stun(); W.say(fox, '💫', 'stun', .9, 1.7, 'stun'); }
      }
      R.lead = lead; if (R.phase === 'race' && Math.random() < dt) redraw();
      // Commissaire : agite le drapeau à l'arrivée
      marshal.act = (R.phase === 'end' || R.phase === 'grid') && !chk.held && !chk.carrier ? 'wave' : null;
      // Renard : bosses, tremplins, tour, podium
      const [fs, fd] = nearestS(fox.pos);
      let ground = 0;
      if (fd < TW / 2 + .3) {
        ground = bumpH(fs);
        if (fx.last != null) fx.acc += dS(fx.last, fs);
        fx.last = fs; if (Math.abs(fx.acc) >= .97) { W.complete('tourCircuit'); fx.acc = 0; }
        for (const r of ramps) if (Math.abs(dS(fs, r.s)) * LEN < 1.2 && fx.air <= 0 && Math.hypot(fox.vel.x, fox.vel.z) > 6) { fx.air = .01; fx.airV = 6.5; W.SFX.engine(); W.complete('tremplin'); }
      } else { fx.last = null; }
      const onPod = podium.findIndex(pd => Math.abs(fox.pos.x - pd.x) < .65 && Math.abs(fox.pos.z - pd.z) < .65);
      if (onPod >= 0) { ground = podium[onPod].h; if (onPod === 0) { fx.pod = (fx.pod || 0) + dt; if (fx.pod > .8) W.complete('podium'); if (R.phase === 'podium') { W.complete('champion'); if (!fx.champ) { fx.champ = true; W.say(fox, t().champ, '', 2.4, 2.4); } } } }
      else { fx.pod = 0; fx.champ = false; }
      if (fx.air > 0) { fx.air += fx.airV * dt; fx.airV -= 15 * dt; if (fx.air <= ground) { fx.air = 0; } }
      const want = Math.max(ground, fx.air);
      fox.lift = (fox.lift || 0) + (want - (fox.lift || 0)) * Math.min(1, dt * (fx.air > 0 ? 30 : 12)); fox.ground = ground;
    });
    // Portail du circuit
    const gate = new THREE.Group(); [-1, 1].forEach(s => { const leaf = box(.12, 1.4, 3.6, '#c9cdd3', 0, .9, s * 1.8, gate); leaf.userData.k = s; }); for (let i = 0; i < 7; i++) box(.06, 1.2, .06, '#9aa7b3', 0, .9, -3.4 + i * 1.13, gate, false);
    gate.position.set(97.5, 0, 0); W.dyn(gate); W.gate(gate, 'slideZ', 6);
    toGrid();
    // Paddock vivant : camionnettes d'équipe, fanions, pneus
    van(150, -10, Math.PI / 2, '#f6efe0'); van(136, -6.6, 0, '#2563c9'); bunting(134, -17.4, 147, -17.4, 3.3, ['#d6402f', '#f6efe0', '#2f2a24', '#f6d36b']);
    // Paddock : motos sur béquille, bidons d'essence, caisse à outils
    for (const [x, z, r, c] of [[134.6, -12.4, .3, '#d6402f'], [137.6, -12.2, -.2, '#f6d36b'], [143.4, -12.6, .15, '#2563c9']]) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; W.R.group.add(g);
      box(.3, .45, 1.3, c, 0, .82, 0, g); box(.34, .18, .7, '#2f2a24', 0, 1.09, -.15, g, false); box(.5, .35, .08, '#f6f2e8', 0, 1.12, .62, g, false);
      for (const zz of [-.62, .66]) { const w = cyl(.38, .38, .18, '#2f2a24', 0, .38, zz, 10, g, false); w.rotation.z = Math.PI / 2; }
      box(.1, .5, .1, '#5d6670', 0, .25, -.1, g, false); box(.7, .05, .05, '#2f2a24', 0, 1.22, .45, g, false); solidCircle(x, z, .7, 1);
    }
    [[132.6, -10.4], [133.1, -10.1], [147.5, -9.6]].forEach(([x, z]) => { box(.36, .46, .2, '#d6402f', x, .23, z); box(.08, .08, .08, '#2f2a24', x + .1, .5, z, undefined, false); });
    box(1, .55, .5, '#d6402f', 139.2, .28, -9.8); box(1.02, .06, .52, '#2f2a24', 139.2, .4, -9.8, undefined, false); solidBox(139.2, -9.8, 1, .5, .6);
    [[146, -4.8], [126, -14.6], [153, -21]].forEach(([x, z]) => { W.cyl(.4, .4, .3, '#2f2a24', x, .15, z, 10); W.cyl(.4, .4, .3, '#2f2a24', x, .45, z, 10); W.cyl(.4, .4, .3, '#2f2a24', x, .75, z, 10); W.solidCircle(x, z, .45, .9); });

    return { restore() { if (W.done('cle')) { wrench.gone = true; wrench.mesh.visible = false; } } };
  },
});
