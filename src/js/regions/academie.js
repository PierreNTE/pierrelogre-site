/* =====================================================================
   L'Académie Dell Storage : un campus au nord du stade, entre la forêt et le motocross.
   On y vient par la navette du village (arrêt au nord du bureau) ou par le carnet de voyage.
   - Le hall (au centre) : la directrice et le tableau de progression, le défi chronométré, l'évaluation
     finale, l'étagère des trophées (un par badge).
   - Sept pavillons, un par famille (PowerVault, PowerStore, APEX, Data Domain, logiciels de sauvegarde,
     reprise après sinistre, cyber-résilience) : un formateur (les points clés), des équipements à examiner,
     une borne de quiz, un client (missions et simulation commerciale). Ils s'ouvrent l'un après l'autre.
   - La cour : le laboratoire d'architecture (porter les bons blocs sur les bons socles).
   Hors du parcours des bêtises (extra) : ni bêtises, ni carte postale ; la progression est à part
   (academy/engine.js) et le contenu pédagogique est chargé à la demande (academy/content/).
   ===================================================================== */
import * as THREE from 'three';
import { behave } from '../crowd.js';
import { box, cone, cyl, flat2, removeObstacle, solidBox, solidCircle, sph, textTex } from '../engine.js';
import { fox } from '../fox.js';
import { HOOKS } from '../hooks.js';
import { renderGoals, say, toast } from '../hud.js';
import { refreshNav } from '../npclogic.js';
import { defineRegion, openHidden, teleport } from '../regions.js';
import { S, run, t } from '../state.js';
import { E } from '../academy/engine.js';
import { KINDS, ROOM, ROOMS } from '../academy/meta.js';
import { boardHTML, openAcad, world as acadWorld } from '../academy/ui.js';
import { bench, flowerBed, hash, hedgeRow, lamp, oak, planeTree, planter, tramShelter, van } from './kit.js';

const B = { minX: 40, maxX: 96, minZ: -84, maxZ: -32 };
const COLX = { W: 50, C: 68, E: 86 }, ROWZ = { N: -73, M: -58.5, S: -44 };
/** Pavillon de chaque salle : colonne, rangée, côté de la porte (vers les allées). */
const PLACE = { powervault: ['W', 'S', 'E'], powerstore: ['W', 'M', 'E'], apex: ['W', 'N', 'E'], datadomain: ['C', 'N', 'S'], software: ['E', 'N', 'W'], dr: ['E', 'M', 'W'], cyber: ['E', 'S', 'W'] };
const PW = 12, PD = 9;
const HUB = { x: 68, z: -58.5, w: 14, d: 10 };
const STOP = { x: 64.6, z: -36 };
export const ACAD_SPAWN = { x: 66.9, z: -34.8, yaw: 2.4 };
/** Arrêt de la navette au village (au nord du bureau) : construit par village.js. */
export const VILLAGE_STOP = { x: 11, z: -19.4, arrive: { x: 13.3, z: -17.3, yaw: -Math.PI / 4 } };
const PEDS = [61.4, 64.6, 71.4, 74.6].map(x => ({ x, z: -46.4 }));
const SHELF = [{ x: 61.9, z: -41.4 }, { x: 74.1, z: -41.4 }];
const PAVE = '#d9d3c6', WALL = '#f4f1ea';

/** Teinte claire d'une couleur (sol des pavillons). */
function tint(hex, k = .82) { const c = new THREE.Color(hex), w = new THREE.Color('#f6f1e6'); c.lerp(w, k); return '#' + c.getHexString(); }

defineRegion({
  id: 'academie', bounds: B, mapColor: '#cfdcef', always: true, extra: true, hasCard: false, notebook: 'academie',
  veg: { biome: 'meadow', density: .5, rect: { minX: 40, maxX: 96, minZ: -84, maxZ: -32 } },
  walk: [{ minX: 41.6, maxX: 94.4, minZ: -82.4, maxZ: -33.3 }],
  spawn: new THREE.Vector3(ACAD_SPAWN.x, 0, ACAD_SPAWN.z), spawnYaw: ACAD_SPAWN.yaw,
  mood: { bg: '#d6e4ee', fog: '#d4e2e8', near: 38, far: 84, sun: '#fff1d8', sky: '#f2f6f8', ground: '#7f9d70', life: .45, music: 'academie' },
  mapStatus: () => { const lv = E.levelOf(); return `${lv.name} · ${E.A.xp} ${E.ui().xp}`; },
  goals: [],
  i18n: {
    fr: { regions: { academie: 'Académie Dell Storage' }, eggs: { acadSculpt: "Une sculpture de disques empilés. Quelqu'un a gravé dessous : « 3 copies, 2 supports, 1 hors site ».", acadStop: "La navette attend. Elle sent le café et le câble neuf." },
      acad: {
        yap: { powervault: "Un glapissement en mode bloc ? Je te le provisionne finement.", powerstore: "Bloc, fichier, vVols… et maintenant renard. Vraiment unifié !", apex: "Ce glapissement sera facturé à l'usage.",
          datadomain: "Deux glapissements identiques ? Je n'en garde qu'un.", software: "Glapissement sauvegardé, rétention : 7 ans.", dr: "RPO du glapissement : zéro. Je l'ai entendu.", cyber: "Identifiants, s'il te plaît. Même pour un renard.",
          director: "Chut, on révise ici !", lab: "Un renard architecte, on aura tout vu.", student: ["Tu as compris le RPO, toi ?", "Je refais le quiz Data Domain.", "On se retrouve au labo ?"] },
        spot: { trainer: "E : parler au formateur (points clés)", kiosk: "E : borne de quiz", client: "E : rencontrer le client (missions, simulation)", gear: "E : examiner", locked: "Salle fermée · E pour savoir comment l'ouvrir",
          director: "E : tableau de progression", flash: "E : défi chronométré", final: "E : évaluation finale", lab: "E : le laboratoire", stop: "E : navette vers le village", block: "Bloc à poser sur un socle", ped: "Socle", cup: "Trophées : un par badge" },
        labClosed: "Le labo est fermé : tente d'abord le quiz « Logiciels de sauvegarde ».", labOk: "Bien posé !", labFull: "Ce socle est déjà pris.",
      } },
    en: { regions: { academie: 'Dell Storage Academy' }, eggs: { acadSculpt: "A sculpture of stacked disks. Someone carved underneath: “3 copies, 2 media, 1 off site”.", acadStop: "The shuttle is waiting. It smells of coffee and new cable." },
      acad: {
        yap: { powervault: "A block-mode yap? I'll thin-provision it for you.", powerstore: "Block, file, vVols… and now fox. Truly unified!", apex: "That yap will be billed by usage.",
          datadomain: "Two identical yaps? I'm only keeping one.", software: "Yap backed up, retention: 7 years.", dr: "Yap RPO: zero. I heard it.", cyber: "Credentials, please. Even for a fox.",
          director: "Shh, people are studying!", lab: "A fox architect, now I've seen everything.", student: ["Did you get RPO?", "I'm redoing the Data Domain quiz.", "See you at the lab?"] },
        spot: { trainer: "E: talk to the trainer (key points)", kiosk: "E: quiz kiosk", client: "E: meet the customer (missions, simulation)", gear: "E: examine", locked: "Room locked · E to see how to open it",
          director: "E: progress board", flash: "E: timed challenge", final: "E: final assessment", lab: "E: the lab", stop: "E: shuttle to the village", block: "A block to place on a plinth", ped: "Plinth", cup: "Trophies: one per badge" },
        labClosed: "The lab is closed: first try the “Backup software” quiz.", labOk: "Well placed!", labFull: "This plinth is taken.",
      } },
  },
  build(W) {
    const A_ = () => t().acad;
    E.loadContent().then(() => { refreshAll(); }, () => {});   // le contenu arrive en tâche de fond (tableau mural, trophées)

    const spots = [];   // plaques d'aide en bas de l'écran (comme dans le terrier)
    /* ---------- Textures de texte : deux planches (une seule matière chacune → fusionnées) ---------- */
    const ROWS = 8, RH = 128;
    const row = (g, k, draw) => { g.save(); g.translate(0, k * RH); draw(g); g.restore(); };
    const signTx = textTex(1024, ROWS * RH, g => {
      row(g, 0, g => { g.fillStyle = '#1f3b63'; g.fillRect(0, 0, 1024, RH); g.fillStyle = '#c9a33d'; g.fillRect(0, RH - 10, 1024, 6); g.fillStyle = '#f6f2e8'; g.textAlign = 'center';
        g.font = '800 62px "Baloo 2",sans-serif'; g.fillText(E.ui().title.toUpperCase(), 512, 66); g.font = '600 26px "Baloo 2",sans-serif'; g.fillStyle = '#cfdcef';
        g.fillText(S.lang === 'fr' ? 'Projet personnel non officiel · sources publiques Dell Technologies' : 'Unofficial personal project · public Dell Technologies sources', 512, 104); });
      ROOMS.forEach((r, i) => row(g, i + 1, g => { const open = E.roomOpen(r.id); g.fillStyle = open ? r.color : '#8b919a'; g.fillRect(0, 0, 1024, RH); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(0, 0, 150, RH);
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 78px "Baloo 2",sans-serif'; g.fillText(open ? String(r.n) : '🔒', 75, 92);
        g.textAlign = 'left'; g.font = '800 56px "Baloo 2",sans-serif'; g.fillText(E.tx(r.name), 180, 64); g.font = '600 30px "Baloo 2",sans-serif'; g.fillStyle = 'rgba(255,255,255,.88)'; g.fillText(E.tx(r.tag), 182, 106); }));
    });
    const labelTx = textTex(1024, ROWS * RH, g => {
      const plain = (k, txt, bg, fg = '#fff', size = 54) => row(g, k, g => { g.fillStyle = bg; g.fillRect(0, 0, 1024, RH); g.fillStyle = fg; g.textAlign = 'center'; g.font = `800 ${size}px "Baloo 2",sans-serif`; g.fillText(txt, 512, 82); });
      const LB = E.C()?.LAB; const sl = ['1', '2', '3', '4'];
      sl.forEach((d, k) => plain(k, LB ? E.tx(LB.slots[k].label) : d, '#2f3640', '#f6f2e8', 52));
      plain(4, '🧪 ' + (S.lang === 'fr' ? "Laboratoire d'architecture" : 'Architecture lab'), '#2f8f9d');
      plain(5, '🚌 ' + E.ui().shuttle, '#2563c9');
      plain(6, '⏱️ ' + (S.lang === 'fr' ? 'Défi : Classe-le !' : 'Challenge: Sort it!'), '#e08a2a');
      plain(7, '🎓 ' + E.ui().final, '#8a6d1f');
    });
    const signMat = new THREE.MeshLambertMaterial({ map: signTx }), labelMat = new THREE.MeshLambertMaterial({ map: labelTx });
    /** Panneau texturé : ligne k de la planche, w × h mètres, tourné de rot (face vers +z avant rotation). */
    const plane = (mat, k, w, h, x, y, z, rot = 0, parent) => {
      const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, top = 1 - k / ROWS, bot = 1 - (k + 1) / ROWS;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > .5 ? top : bot);
      const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = rot; m.receiveShadow = true; (parent || W.R.group).add(m); return m;
    };
    const dynG = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };

    /* ---------- Sols : pelouse, allées, route de la navette ---------- */
    W.patch(56, 52, '#9cc17a', 68, -58, { round: .25, jitter: .5 });
    W.mottle({ minX: 42, maxX: 94, minZ: -82, maxZ: -34 }, ['#a3c682', '#94bb72', '#a9cb88'], 16);
    W.ground(30, 2.4, '#8d929a', 68, -33.3); W.ground(30, .18, '#e6e1d6', 68, -34.6, .031);   // route et bordure
    W.ground(3, 18.6, PAVE, 68, -44.3); W.ground(19, 12, '#e3ddd0', 68, -43.6, .026);          // allée centrale et cour
    W.ground(3, 42, PAVE, 58.5, -57.5); W.ground(3, 42, PAVE, 77.5, -57.5);                     // allées ouest et est
    W.ground(22, 2.6, PAVE, 68, -51.25); W.ground(22, 2.6, PAVE, 68, -65.75);                   // allées transversales
    for (let i = 0; i < 9; i++) W.ground(.9, .9, i % 2 ? '#cfc8b8' : '#ebe5d8', 63.5 + i * 1.12, -38.6, .033);   // petit damier devant la cour

    /* ---------- Lisières : chênes et platanes, haies basses (on reste dans le campus) ---------- */
    for (let i = 0; i < 12; i++) { const z = -80 + i * 4.1 + hash(i) * 1.2; if (z > -36) continue; (i % 3 ? oak : planeTree)(42.2 + hash(i * 3) * .6, z, 1 + hash(i * 7) * .25, i % 4); }
    for (let i = 0; i < 12; i++) { const z = -80 + i * 4.1 + hash(i + 5) * 1.2; if (z > -36) continue; (i % 3 ? planeTree : oak)(93.8 - hash(i * 5) * .6, z, 1 + hash(i * 2) * .25, (i + 1) % 4); }
    for (let i = 0; i < 13; i++) { const x = 44 + i * 4.1 + hash(i * 9) * 1.2; oak(x, -82.6 + hash(i) * .4, 1.05 + hash(i * 4) * .3, i % 4); }
    hedgeRow(41.6, -35.2, 60, -35.2, { h: .8, seed: 7 }); hedgeRow(76, -35.2, 94.4, -35.2, { h: .8, seed: 8 });
    // Lampadaires et bancs le long des allées, jardinières, massifs
    for (const z of [-40, -48, -55, -62, -70, -77]) { lamp(56.8, z, 3); lamp(79.2, z, 3); }
    bench(60.3, -54.6, Math.PI / 2); bench(75.7, -62.4, -Math.PI / 2); bench(60.3, -69.6, Math.PI / 2); bench(75.7, -48, -Math.PI / 2);
    planter(62.4, -52.6, 1.6); planter(73.6, -52.6, 1.6); planter(62.4, -64.4, 1.6); planter(73.6, -64.4, 1.6);
    flowerBed(44.5, -52.8, 54.5, -50.2, ['#f2b8c6', '#f6d36b', '#b9a5e8']); flowerBed(81.5, -52.8, 91.5, -50.2, ['#f6a07a', '#f6d36b', '#f5f0e6']);
    // Sculpture de disques empilés au bout de l'allée nord
    { const sx = 68, sz = -79.6; cyl(1.1, 1.2, .4, '#b5ad9e', sx, .2, sz, 12); for (let k = 0; k < 5; k++) cyl(.9 - k * .06, .9 - k * .06, .22, ['#2f8f9d', '#2563c9', '#3d9a5b', '#e08a2a', '#c9a33d'][k], sx + (hash(k) - .5) * .2, .55 + k * .26, sz, 14); solidCircle(sx, sz, 1.2, 2); W.egg('acadSculpt', sx, sz + 1.6, 2.6, 1.6); }

    /* ---------- Navette (arrêt, véhicule, retour au village) ---------- */
    tramShelter(STOP.x, STOP.z, 0);
    plane(labelMat, 5, 2.6, .33, STOP.x, 2.72, STOP.z + .73);
    van(72.4, -33.2, 0, '#e9eef4');
    W.egg('acadStop', 72.4, -34.9, 2.6, 1.4);
    W.transport({ x: STOP.x, y: 1.6, z: STOP.z + 1.1 }, 1.8, () => goVillage());
    spots.push({ x: STOP.x, z: STOP.z + 1.1, r: 1.8, k: 'stop' });

    /* ---------- Murets : un mur = boîte + liseré + obstacle ---------- */
    const wall = (x, z, w, d, h, trim) => { box(w, h, d, WALL, x, h / 2, z); box(w + .02, .08, d + .02, trim, x, h + .04, z, undefined, false); return solidBox(x, z, w, d, h); };
    const T_ = .3;

    /* ---------- Le hall ---------- */
    {
      const { x, z, w, d } = HUB, x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, gold = '#c9a33d';
      W.ground(w, d, W.TM(W.TX.tile, 7, 5), x, z, .03);
      wall(x, z0, w, T_, 2.8, gold); wall(x0, z, T_, d, 1.2, gold); wall(x1, z, T_, d, 1.2, gold);
      wall((x0 + 66.8) / 2, z1, 66.8 - x0, T_, .9, gold); wall((69.2 + x1) / 2, z1, x1 - 69.2, T_, .9, gold);
      for (const px of [66.65, 69.35]) { box(.3, 2.4, .4, '#e6e0d2', px, 1.2, z1); solidBox(px, z1, .3, .4, 2.4); }
      box(3, .36, .42, '#1f3b63', x, 2.58, z1);
      plane(signMat, 0, 8, 1, x, 2.05, z0 + .17);
      // Tableau de progression mural (redessiné à chaque progrès)
      const brd = textTex(512, 320, g => drawBoard(g));
      const bm = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.625), new THREE.MeshLambertMaterial({ map: brd })); bm.position.set(x + 4.2, 1.45, z0 + .18); W.R.group.add(bm);
      box(2.76, 1.78, .08, '#7a5236', x + 4.2, 1.45, z0 + .12, undefined, false);
      boardTex = brd;
      // Directrice (tableau de progression)
      W.interact({ x, y: 1.6, z: z0 + 2.6 }, 1.5, () => openAcad('board'));
      spots.push({ x, z: z0 + 2.6, r: 1.5, k: 'director' });
      // Étagère des trophées
      box(3.4, .9, .5, '#8a5a3b', x - 4.3, .45, z0 + .5); box(3.5, .06, .56, '#6b4a2f', x - 4.3, .92, z0 + .5, undefined, false); solidBox(x - 4.3, z0 + .5, 3.4, .5, 1);
      ROOMS.forEach((r, k) => { const cx = x - 5.7 + k * .47, g = dynG(cx, .95, z0 + .5); cyl(.07, .1, .05, gold, 0, .025, 0, 8, g); cyl(.025, .025, .12, gold, 0, .11, 0, 6, g, false); const cup = cyl(.12, .06, .16, r.color, 0, .25, 0, 10, g); cup.castShadow = false; sph(.04, gold, 0, .36, 0, g, 0, false);
        W.dyn(g); g.userData.gone = true; g.visible = false; cups[r.id] = g; });
      spots.push({ x: x - 4.3, z: z0 + 1.5, r: 1.2, k: 'cup' });
      // Borne du défi chronométré (façon borne d'arcade)
      { const kx = x0 + 1.6, kz = z + .6; box(.9, 1.5, .7, '#e08a2a', kx, .75, kz); const s = box(.72, .5, .06, '#20262e', kx, 1.25, kz + .34, undefined, false); s.rotation.x = -.25;
        box(.7, .1, .3, '#2f3640', kx, .92, kz + .45, undefined, false); for (let i = 0; i < 4; i++) cyl(.04, .04, .04, ['#d6402f', '#2563c9', '#7fb05c', '#f6d36b'][i], kx - .22 + i * .15, .99, kz + .48, 8, undefined, false);
        plane(labelMat, 6, 1.6, .2, kx, 1.82, kz + .36); solidBox(kx, kz, .9, .7, 1.5);
        W.interact({ x: kx, y: 1.5, z: kz + 1 }, 1.3, () => openAcad('flash')); spots.push({ x: kx, z: kz + 1, r: 1.3, k: 'flash' }); }
      // Table de l'évaluation finale
      { const fx = x1 - 2.2, fz = z + 1.2; cyl(.75, .75, .07, '#f6efe0', fx, .74, fz, 16); cyl(.08, .14, .72, '#5d6670', fx, .37, fz, 8); solidCircle(fx, fz, .8, .8);
        box(.36, .02, .26, '#ffffff', fx - .2, .785, fz + .1, undefined, false); cyl(.05, .05, .1, '#e8742a', fx + .3, .83, fz - .1, 8, undefined, false);
        chair(fx, fz - 1.05, 0); plane(labelMat, 7, 1.8, .225, fx, 1.25, fz - 1.6);
        W.interact({ x: fx, y: 1.4, z: fz + 1.1 }, 1.3, () => openAcad('final')); spots.push({ x: fx, z: fz + 1.1, r: 1.3, k: 'final' }); }
      // Plantes et accueil
      planter(x0 + 1.3, z1 - .8, 1.4); planter(x1 - 1.3, z1 - .8, 1.4);
    }

    /* ---------- Les pavillons ---------- */
    const gates = {};
    for (const r of ROOMS) pavilion(r);
    function pavilion(r) {
      const [col, rw, door] = PLACE[r.id], cx = COLX[col], cz = ROWZ[rw], x0 = cx - PW / 2, x1 = cx + PW / 2, z0 = cz - PD / 2, z1 = cz + PD / 2;
      const P = (lx, lz) => ({ x: cx + (door === 'W' ? -lx : lx), z: cz + lz });
      const trim = r.accent || r.color, gap = 1.25;
      W.ground(PW, PD, tint(r.color), cx, cz, .03);
      W.ground(PW - 1.2, .5, tint(r.color, .6), cx, z0 + .9, .032);
      // Murs : fond haut (le panneau de la salle), côtés à mi-hauteur, devant bas ; une porte vers l'allée
      wall(cx, z0, PW, T_, 2.5, trim);
      const side = (x, isDoor) => { if (!isDoor) { wall(x, cz, T_, PD, 1.1, trim); return; } wall(x, (z0 + cz - gap) / 2, T_, cz - gap - z0, 1.1, trim); wall(x, (cz + gap + z1) / 2, T_, z1 - cz - gap, 1.1, trim);
        for (const s of [-1, 1]) { box(.3, 2.3, .4, '#e6e0d2', x, 1.15, cz + s * (gap + .1)); solidBox(x, cz + s * (gap + .1), .3, .4, 2.3); } box(.42, .34, 2 * gap + .6, r.color, x, 2.45, cz); };
      side(x0, door === 'W'); side(x1, door === 'E');
      if (door === 'S') { wall((x0 + cx - gap) / 2, z1, cx - gap - x0, T_, .9, trim); wall((cx + gap + x1) / 2, z1, x1 - cx - gap, T_, .9, trim);
        for (const s of [-1, 1]) { box(.4, 2.3, .3, '#e6e0d2', cx + s * (gap + .1), 1.15, z1); solidBox(cx + s * (gap + .1), z1, .4, .3, 2.3); } box(2 * gap + .6, .34, .42, r.color, cx, 2.45, z1); }
      else wall(cx, z1, PW, T_, .9, trim);
      plane(signMat, r.n, 5, .625, cx, 1.95, z0 + .17);
      // Tableau blanc derrière le formateur
      box(2.4, 1, .06, '#f8f8f4', cx, 1.05, z0 + .2, undefined, false); [['#2563c9', -.5, 1.25], [r.color, .2, 1.05], ['#d6402f', -.2, .85]].forEach(([c, dx, y]) => box(.8, .04, .02, c, cx + dx, y, z0 + .24, undefined, false));
      // Porte fermée (vitre) tant que la salle n'est pas ouverte
      const dp = door === 'S' ? { x: cx, z: z1 } : { x: door === 'E' ? x1 : x0, z: cz };
      if (!E.roomOpen(r.id)) {
        const g = dynG(dp.x, 0, dp.z), along = door === 'S';
        box(along ? 2 * gap : .12, 1.9, along ? .12 : 2 * gap, '#bfe0ee', 0, .95, 0, g); box(along ? .5 : .14, .5, along ? .14 : .5, '#8b919a', 0, 1.2, 0, g, false);
        W.dyn(g); gates[r.id] = { g, obs: solidBox(dp.x, dp.z, along ? 2 * gap : .3, along ? .3 : 2 * gap, 2) };
      }
      const outside = door === 'S' ? { x: cx, z: z1 + 1.1 } : { x: dp.x + (door === 'E' ? 1.1 : -1.1), z: cz };
      W.interact({ x: outside.x, y: 1.4, z: outside.z }, 1.3, () => openAcad('locked', r.id), () => !E.roomOpen(r.id));
      spots.push({ x: outside.x, z: outside.z, r: 1.3, k: 'locked', room: r.id, when: () => !E.roomOpen(r.id) });
      // Le formateur (foule) et son point d'interaction
      const tp = P(0, -2.9);
      people.push({ role: 'trainer', room: r.id, pos: tp, yaw: 0, shirt: r.color, pants: '#2b3448', hair: ['#5a3b2a', '#2f2a24', '#c9a33d', '#8a6a4a', '#a8764a', '#2f2a24', '#5a3b2a'][r.n - 1] });
      solidCircle(tp.x, tp.z, .45, 2);
      const ti = P(0, -1.8); W.interact({ x: ti.x, y: 1.6, z: ti.z }, 1.35, () => openAcad('room', r.id), () => E.roomOpen(r.id)); spots.push({ ...ti, r: 1.35, k: 'trainer', room: r.id });
      // Borne de quiz
      { const k = P(-1.9, 2.6); cyl(.08, .12, 1, '#5d6670', k.x, .5, k.z, 6); const s = box(.7, .48, .08, r.color, k.x, 1.12, k.z, undefined, true); s.rotation.x = -.5; box(.56, .34, .02, '#20262e', k.x, 1.15, k.z + .06, undefined, false).rotation.x = -.5;
        box(.5, .06, .5, '#5d6670', k.x, .03, k.z, undefined, false); solidCircle(k.x, k.z, .3, 1.2);
        W.interact({ x: k.x, y: 1.4, z: k.z + .9 }, 1.2, () => openAcad('quiz', r.id), () => E.roomOpen(r.id)); spots.push({ x: k.x, z: k.z + .9, r: 1.2, k: 'kiosk', room: r.id }); }
      // Coin client : table, chaise, client assis, une tasse
      { const tb = P(3.8, 2.7); box(1.3, .06, .8, '#c9a982', tb.x, .74, tb.z); for (const [a, b] of [[-.55, -.3], [.55, -.3], [-.55, .3], [.55, .3]]) box(.06, .72, .06, '#6b6b6b', tb.x + a, .36, tb.z + b, undefined, false);
        solidBox(tb.x, tb.z, 1.3, .8, .8); cyl(.05, .04, .09, '#f6efe0', tb.x - .3, .82, tb.z + .1, 8, undefined, false); box(.3, .01, .22, '#ffffff', tb.x + .25, .775, tb.z, undefined, false);
        chair(tb.x, tb.z - .75, 0);
        people.push({ role: 'client', room: r.id, pos: { x: tb.x, z: tb.z - .8 }, yaw: 0, seated: true, shirt: ['#8a7cc2', '#c9894f', '#5d8a8a', '#d9705a', '#3e5677', '#7fb05c', '#6b6155'][r.n - 1], pants: '#3d4a5c', hair: ['#2f2a24', '#8a6a4a', '#c9a33d', '#5a3b2a', '#d9d4c8', '#a8764a', '#2f2a24'][r.n - 1] });
        W.interact({ x: tb.x, y: 1.4, z: tb.z + .95 }, 1.3, () => openAcad('client', r.id), () => E.roomOpen(r.id)); spots.push({ x: tb.x, z: tb.z + .95, r: 1.3, k: 'client', room: r.id }); }
      // Équipements à examiner (un point clé chacun)
      GEAR[r.id].forEach(([lx, lz, fid, make]) => { const p = P(lx, lz); make(p.x, p.z, r); const ip = { x: p.x, z: p.z + 1.05 };
        W.interact({ x: ip.x, y: 1.4, z: ip.z }, 1.15, () => openAcad('fact', r.id, fid), () => E.roomOpen(r.id)); spots.push({ ...ip, r: 1.15, k: 'gear', room: r.id, fid }); });
    }
    function chair(x, z, rot) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; W.R.group.add(g);
      box(.5, .07, .48, '#5d6670', 0, .46, 0, g); box(.5, .46, .06, '#5d6670', 0, .72, -.22, g); for (const [a, b] of [[-.21, -.19], [.21, -.19], [-.21, .19], [.21, .19]]) box(.05, .44, .05, '#3a3a3a', a, .22, b, g, false); solidBox(x, z, .5, .5, .9); }

    /* ---------- La cour : le laboratoire ---------- */
    const pedGlow = [];
    PEDS.forEach((p, k) => {
      box(1.1, .66, 1.1, '#e6e0d2', p.x, .33, p.z); box(1.2, .06, 1.2, '#2f8f9d', p.x, .69, p.z, undefined, false); solidBox(p.x, p.z, 1.1, 1.1, .7);
      // pupitre avec l'étiquette du socle, derrière (côté nord)
      cyl(.04, .05, 1.2, '#5d6670', p.x, .6, p.z - .9, 6); box(2.2, .3, .05, '#2f3640', p.x, 1.25, p.z - .9, undefined, false); plane(labelMat, k, 2.1, .2625, p.x, 1.25, p.z - .87);
      const gl = dynG(p.x, .73, p.z); cyl(.5, .5, .02, '#7fe0a0', 0, 0, 0, 16, gl, false); W.dyn(gl); gl.userData.gone = true; gl.visible = false; pedGlow.push(gl);
      if (k < 3) { const a = PEDS[k + 1], mid = (p.x + a.x) / 2, len = a.x - p.x - 1.4; W.ground(len, .22, '#2f8f9d', mid, p.z, .034); const tip = cone(.22, .4, '#2f8f9d', a.x - .82, .04, p.z, 3, undefined, false); tip.rotation.set(0, 0, -Math.PI / 2); }
      spots.push({ x: p.x, z: p.z + 1, r: 1, k: 'ped', ped: k });
    });
    // Arche du labo au-dessus de l'allée
    for (const px of [66.1, 69.9]) { box(.26, 3, .26, '#5d6670', px, 1.5, -49.6); solidBox(px, -49.6, .3, .3, 3); }
    box(4.2, .56, .14, '#2f8f9d', 68, 3.1, -49.6); plane(labelMat, 4, 4, .5, 68, 3.1, -49.52);
    // Étagères des blocs
    for (const s of SHELF) { box(4.4, .08, .7, '#a8764a', s.x, .56, s.z); for (const [a, b] of [[-2.1, -.3], [2.1, -.3], [-2.1, .3], [2.1, .3]]) box(.08, .54, .08, '#6b4a2f', s.x + a, .27, s.z + b, undefined, false); solidBox(s.x, s.z, 4.4, .7, .6); }
    // L'architecte du labo
    people.push({ role: 'lab', pos: { x: 77, z: -44.6 }, yaw: -Math.PI / 2, shirt: '#2f8f9d', pants: '#2f3640', hair: '#2f2a24', hat: 'helmet', hatColor: '#f6d36b' });
    solidCircle(77, -44.6, .45, 2);
    W.interact({ x: 76.9, y: 1.6, z: -43.5 }, 1.4, () => openAcad('lab')); spots.push({ x: 76.9, z: -43.5, r: 1.4, k: 'lab' });

    /* ---------- Les blocs du labo (objets à porter) ---------- */
    const BLK = ['ps', 'ppdm', 'vault', 'dd', 'pv', 'apex'];   // ordre sur les étagères (mélangé : la bonne réponse n'est pas l'ordre)
    const COLORS = { ps: '#2563c9', pv: '#2f8f9d', ppdm: '#e08a2a', dd: '#3d9a5b', vault: '#c9a33d', apex: '#6b5bd2' };
    const blocks = BLK.map((id, k) => {
      const s = SHELF[k < 3 ? 0 : 1], x = s.x - 1.5 + (k % 3) * 1.5;
      return W.item({ kind: 'acadBlock', id: 'blk-' + id, block: id, x, z: s.z, y: .62, sh: .28, build: () => blockMesh(id, COLORS[id]) });
    });
    const placed = {};   // socle → bloc
    function blockMesh(id, c) {
      const g = new THREE.Group();
      if (id === 'ps') { box(.56, .34, .4, c, 0, .17, 0, g); box(.5, .05, .02, '#9fd3ff', 0, .2, .21, g, false); }
      else if (id === 'pv') { box(.6, .2, .4, c, 0, .1, 0, g); for (let i = 0; i < 4; i++) box(.1, .12, .02, '#d9e6ea', -.21 + i * .14, .1, .21, g, false); }
      else if (id === 'ppdm') { cyl(.22, .22, .16, c, 0, .08, 0, 10, g); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; box(.09, .14, .09, c, Math.cos(a) * .26, .08, Math.sin(a) * .26, g, false); } cyl(.08, .08, .18, '#f6efe0', 0, .09, 0, 8, g, false); }
      else if (id === 'dd') { for (let i = 0; i < 3; i++) box(.52 - i * .04, .11, .4, i % 2 ? '#2f7a48' : c, 0, .06 + i * .12, 0, g); }
      else if (id === 'vault') { box(.46, .42, .4, c, 0, .21, 0, g); const d = cyl(.15, .15, .03, '#8a6d1f', 0, .22, .21, 14, g, false); d.rotation.x = Math.PI / 2; }
      else { cyl(.2, .22, .36, c, 0, .18, 0, 12, g); box(.04, .2, .02, '#f6efe0', 0, .22, .21, g, false); }
      return g;
    }
    W.place(it => {
      if (it.kind !== 'acadBlock') return false;
      const k = PEDS.findIndex(p => flat2(it.pos, p) < 1.05); if (k < 0) return false;
      const p = PEDS[k], back = () => { it.pos.set(p.x + (hash(k) - .5) * .6, 0, p.z + 1.05); };
      if (!E.labOpen()) { back(); toast(A_().labClosed); W.SFX.question(); return true; }
      if (Object.values(placed).includes(it)) return false;
      if (placed[k]) { back(); toast(A_().labFull); return true; }
      const LB = E.C()?.LAB; if (!LB) { back(); return true; }
      const slot = LB.slots[k];
      if (it.block === slot.want) {
        placed[k] = it; it.fixed = true; it.pos.set(p.x, .72, p.z); it.mesh.rotation.set(0, 0, 0); pedGlow[k].userData.gone = false; pedGlow[k].visible = W.R.active;
        W.SFX.ding(); W.emit(new THREE.Vector3(p.x, 1.2, p.z), '#7fe0a0', { n: 14, spd: 1.6, up: 2.6, life: .8 });
        say({ anchor: new THREE.Vector3(p.x, 2.2, p.z) }, A_().labOk, '', 1.6, 0, 'acadLab');
        if (LB.slots.every((_, j) => placed[j])) setTimeout(() => openAcad('labDone'), 700);
      } else {
        back(); W.SFX.question();
        const bl = LB.blocks.find(b => b.id === it.block), key = it.block + '>' + slot.id;
        const msg = LB.wrong[key] || LB.wrong[it.block + '>*'];
        const txt = msg ? E.tx(msg) : E.tx(LB.generic).replace('{slot}', E.tx(slot.label).replace(/^\d · /, '').toLowerCase()).replace('{block}', E.tx(bl.name)).replace('{role}', E.tx(bl.role));
        say({ anchor: new THREE.Vector3(77, 2.6, -44.6) }, txt, '', 5.5, 0, 'acadLabArch');
      }
      return true;
    });
    function labReset() {
      for (const it of blocks) { if (fox.held === it) { fox.held = null; it.held = false; } it.fixed = false; it.gone = false; it.pos.copy(it.home); it.mesh.rotation.set(0, 0, 0); it.mesh.visible = !W.R.sleeping; }
      for (const k of Object.keys(placed)) delete placed[k];
      for (const g of pedGlow) { g.userData.gone = true; g.visible = false; }
      if (E.A.lab) solveLab();
    }
    /** Labo déjà réussi : les blocs attendent sur leurs socles. */
    function solveLab() {
      const LB = E.C()?.LAB; if (!LB) return;
      LB.slots.forEach((s, k) => { const it = blocks.find(b => b.block === s.want); placed[k] = it; it.fixed = true; it.pos.set(PEDS[k].x, .72, PEDS[k].z); pedGlow[k].userData.gone = false; pedGlow[k].visible = W.R.active; });
    }
    acadWorld.labReset = labReset;
    acadWorld.labState = () => { const LB = E.C()?.LAB, o = {}; if (LB) LB.slots.forEach((s, k) => { if (placed[k]) o[s.id] = placed[k].block; }); return o; };

    /* ---------- Les personnages (une seule foule : une dizaine d'appels de dessin pour tout le monde) ---------- */
    people.push({ role: 'director', pos: { x: HUB.x, z: HUB.z - HUB.d / 2 + 1.5 }, yaw: 0, shirt: '#1f3b63', pants: '#2f2a24', hair: '#d9d4c8' });
    solidCircle(HUB.x, HUB.z - HUB.d / 2 + 1.5, .45, 2);
    people.push({ role: 'board', pos: { x: HUB.x + HUB.w / 2 - 2.2, z: HUB.z + 1.2 - 1.1 }, yaw: 0, seated: true, shirt: '#6b6155', pants: '#2b3448', hair: '#8a6a4a' });
    const WANDER = [{ minX: 57.6, maxX: 59.4, minZ: -76, maxZ: -40 }, { minX: 76.6, maxX: 78.4, minZ: -76, maxZ: -40 }, { minX: 50, maxX: 86, minZ: -66.6, maxZ: -64.9 }, { minX: 50, maxX: 86, minZ: -52.1, maxZ: -50.4 }];
    WANDER.forEach((rc, i) => people.push({ role: 'student', rect: rc, pos: { x: (rc.minX + rc.maxX) / 2, z: (rc.minZ + rc.maxZ) / 2 }, yaw: 0, shirt: ['#d9705a', '#7fb05c', '#8a7cc2', '#f6d36b'][i], pants: ['#2b3448', '#3d4a5c', '#6b6155', '#2b3448'][i], hair: ['#2f2a24', '#c9a33d', '#5a3b2a', '#8a6a4a'][i], hat: i === 1 ? 'cap' : null, hatColor: '#2563c9' }));
    const crowd = W.crowd(people.length);
    const folks = people.map(p => { const a = crowd.add({ pos: { x: p.pos.x, z: p.pos.z }, yaw: p.yaw, seated: !!p.seated, shirt: p.shirt, pants: p.pants, hair: p.hair, hat: p.hat || null, hatColor: p.hatColor || '#d9705a' }); if (p.seated) a.pos.y = .1; return Object.assign(a, { role: p.role, room: p.room, rect: p.rect, home: { x: p.pos.x, z: p.pos.z, yaw: p.yaw }, near: false }); });
    const head = a => new THREE.Vector3(a.pos.x, a.seated ? 2.1 : 2.6, a.pos.z);
    // Glapir près de quelqu'un : une réplique (et un petit saut)
    W.yap(new THREE.Vector3(68, 0, -58), 60, () => {
      let a = null, bd = 3.2; for (const p of folks) { const d = flat2(fox.pos, p.pos); if (d < bd) { bd = d; a = p; } } if (!a) return;
      const y = A_().yap, line = a.role === 'trainer' ? y[a.room] : a.role === 'student' ? y.student[a.i % y.student.length] : y[a.role] || y.director;
      a.jump = .4; W.SFX.pop(); say({ anchor: head(a) }, line, '', 2.6, 0, 'acadYap' + a.i);
    });

    /* ---------- Décor par famille (équipements à examiner) ---------- */
    // (les fonctions sont plus bas : GEAR)

    /* ---------- Animations ---------- */
    const anim = buildAnims();
    W.update(dt => {
      const now = S.time;
      for (const a of folks) {
        a.t += dt;
        if (a.role === 'student') { behave.wander(a, a.rect, dt, .9); a.armR = 0; continue; }
        const d = flat2(fox.pos, a.pos);
        if (d < 4.5) { behave.face(a, fox.pos.x, fox.pos.z, dt, 4); a.armR = d < 2.6 && !a.seated ? -1.2 + Math.sin(a.t * 5) * .35 : 0; a.armRz = .25; }
        else { behave.face(a, a.pos.x + Math.sin(a.home.yaw), a.pos.z + Math.cos(a.home.yaw), dt, 2); a.armR = 0; a.armRz = 0; a.headYaw = Math.sin(a.t * .5 + a.i) * .3; }
        if (a.role === 'trainer' && E.roomOpen(a.room)) { if (d < 3.4 && !a.near && !S.paused) { a.near = true; say({ anchor: head(a) }, E.tx(ROOM[a.room].hello), '', 2.8, 0, 'acadHi' + a.i); } else if (d > 5) a.near = false; }
      }
      anim(dt, now);
      plaque();
    });

    /* ---------- Plaque d'aide (bas de l'écran), comme dans le terrier ---------- */
    const el = document.createElement('div'); el.className = 'den-plaque ac-plaque'; el.hidden = true; el.setAttribute('aria-live', 'polite'); (document.getElementById('play') || document.body).append(el);
    let shown = null;
    function plaque() {
      const here = S.region === 'academie' && !S.paused;
      let best = null, bd = 1e9;
      if (here) {
        for (const sp of spots) { if (sp.when && !sp.when()) continue; if (sp.room && sp.k !== 'locked' && !E.roomOpen(sp.room)) continue; const d = flat2(fox.pos, sp); if (d < sp.r && d < bd) { bd = d; best = sp; } }
        if (!best && !fox.held) for (const it of blocks) { if (it.fixed || it.held) continue; const d = flat2(fox.pos, it.pos); if (d < 1.4 && d < bd) { bd = d; best = { k: 'block', it }; } }
        if (!best && fox.held?.kind === 'acadBlock') best = { k: 'block', it: fox.held };
      }
      const key = best ? best.k + (best.room || '') + (best.fid || '') + (best.ped ?? '') + (best.it?.block || '') : null;
      if (key === shown) return; shown = key; el.hidden = !best; if (!best) return;
      const s = A_().spot, r = best.room && ROOM[best.room], C_ = E.C();
      let html = '';
      if (best.k === 'block') { const b = C_?.LAB.blocks.find(x => x.id === best.it.block); html = `<small>🧪 ${s.block}</small><b>${b ? E.tx(b.name) : ''}</b>${b ? `<p>${E.tx(b.role)}</p>` : ''}`; }
      else if (best.k === 'ped') { const sl = C_?.LAB.slots[best.ped]; html = `<small>🧪 ${s.ped}</small><b>${sl ? E.tx(sl.label) : ''}</b>`; }
      else if (best.k === 'gear') { const f = C_ && E.roomContent(best.room).facts.find(x => x.id === best.fid); html = `<small>${E.ui().room(r.n)} · ${E.tx(r.name)}</small><b>${f ? KINDS[f.kind].icon + ' ' + E.tx(f.title) : ''}</b><i>${s.gear}${E.A.seen[best.fid] ? ' · ✓' : ''}</i>`; }
      else if (r) html = `<small>${E.ui().room(r.n)} · ${E.tx(r.name)}</small><b>${best.k === 'trainer' ? E.tx(r.trainer) : best.k === 'locked' ? '🔒 ' + E.ui().locked : E.tx(r.tag)}</b><i>${s[best.k]}</i>`;
      else html = `<small>${E.ui().title}</small><b>${s[best.k]}</b>`;
      el.innerHTML = html; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    }
    HOOKS.leaveAcad = () => { shown = null; el.hidden = true; };

    /* ---------- Tout ce qui suit la progression : portes, panneaux, trophées, tableau mural, carnet ---------- */
    function refreshAll() {
      for (const r of ROOMS) { const g = gates[r.id]; if (g && E.roomOpen(r.id) && !g.open) { g.open = true; removeObstacle(g.obs); refreshNav(W.R.nav); let k = 0; const step = () => { k = Math.min(1, k + .04); g.g.position.y = -2 * k; if (k < 1) requestAnimationFrame(step); else { g.g.userData.gone = true; g.g.visible = false; } }; step(); } }
      for (const r of ROOMS) { const c = cups[r.id]; if (!c) continue; const on = !!E.A.badges[r.id]; c.userData.gone = !on; c.visible = on && W.R.active; }
      signTx.userData.redraw(); labelTx.userData.redraw(); boardTex?.userData.redraw();
      if (E.C() && E.A.lab && !Object.keys(placed).length) solveLab();
      if (S.region === 'academie') renderGoals();
    }
    E.onChange(refreshAll);
    return { open: () => refreshAll(), restore: () => refreshAll() };

    /* ====================== Équipements ====================== */
    function buildAnims() {
      const fns = [];
      // Data Domain : deux trains de cubes (beaucoup entrent, peu sortent)
      const dd = gearAt.dedup; if (dd) {
        const mk = (n, gap, dense) => { const g = dynG(dd.x - 1.6, .98, dd.z); for (let i = 0; i < n; i++) box(.16, .16, .16, dense ? ['#2563c9', '#e08a2a', '#2563c9', '#7fb05c', '#2563c9', '#e08a2a'][i % 6] : ['#2563c9', '#e08a2a', '#7fb05c'][i % 3], i * gap, 0, 0, g, false); W.dyn(g); return g; };
        const inT = mk(6, .26, true), outT = mk(3, .55, false); outT.position.x = dd.x + .55;
        fns.push((dt, now) => { const k = (now * .35) % 1; inT.position.x = dd.x - 2.2 + k * .26; outT.position.x = dd.x + .45 + k * .55; });
      }
      // PRA : une impulsion qui file d'un site à l'autre
      const pr = gearAt.pulse; if (pr) { const g = dynG(pr.x, 1.05, pr.z); sph(.1, '#f6d36b', 0, 0, 0, g, 1, false); W.dyn(g); fns.push((dt, now) => { const k = (now * .5) % 1; g.position.x = pr.x - 1.2 + k * 2.4; g.position.y = 1.05 + Math.sin(k * Math.PI) * .25; }); }
      // Horloge du RTO : la grande aiguille tourne
      const ck = gearAt.clock; if (ck) { const g = dynG(ck.x, 1.75, ck.z + .06); box(.04, .34, .03, '#2f2a24', 0, .15, 0, g, false); cyl(.05, .05, .03, '#2f2a24', 0, 0, 0, 10, g, false).rotation.x = Math.PI / 2; W.dyn(g); fns.push((dt, now) => { g.rotation.z = -now * .8; }); }
      // APEX : la consommation monte et descend dans la jauge (tampon au-dessus de l'engagement)
      const gg = gearAt.gauge; if (gg) { const g = dynG(gg.x, 0, gg.z + .27); box(.5, .06, .04, '#f6d36b', 0, 0, 0, g, false); W.dyn(g); fns.push((dt, now) => { g.position.y = 1.15 + Math.sin(now * .6) * .35; }); }
      // APEX : la balance CapEx / OpEx penche doucement
      const bl = gearAt.balance; if (bl) { const g = dynG(bl.x, 1.32, bl.z); box(1.3, .05, .06, '#c9a33d', 0, 0, 0, g, false); for (const s of [-1, 1]) { cyl(.01, .01, .3, '#5d6670', s * .6, -.15, 0, 4, g, false); cyl(.22, .18, .05, '#c9a33d', s * .6, -.32, 0, 12, g, false); }
        for (let i = 0; i < 4; i++) cyl(.08, .08, .04, '#f6d36b', -.6, -.27 + i * .045, 0, 10, g, false); cyl(.06, .06, .03, '#f6d36b', .55, -.28, 0, 10, g, false); cyl(.06, .06, .03, '#f6d36b', .66, -.28, 0, 10, g, false);
        W.dyn(g); fns.push((dt, now) => { g.rotation.z = Math.sin(now * .7) * .12; }); }
      // Cyber : la roue du coffre, et la passerelle de l'air gap qui se retire
      const vt = gearAt.vault; if (vt) { const g = dynG(vt.x, 1, vt.z + .57); for (let i = 0; i < 3; i++) { const s = box(.62, .05, .05, '#8a6d1f', 0, 0, 0, g, false); s.rotation.z = i * Math.PI / 3; } cyl(.07, .07, .07, '#8a6d1f', 0, 0, .02, 8, g, false).rotation.x = Math.PI / 2; W.dyn(g); fns.push((dt, now) => { g.rotation.z = now * .3; }); }
      const ag = gearAt.gap; if (ag) { const g = dynG(ag.x, .86, ag.z); box(1.3, .08, .5, '#c9a33d', 0, 0, 0, g, false); W.dyn(g); fns.push((dt, now) => { const k = Math.max(0, Math.sin(now * .5)); g.position.x = ag.x - .95 + .95 * k; }); }
      return (dt, now) => { for (const f of fns) f(dt, now); };
    }
  },
});

/* Positions des équipements animés (remplies par les fonctions de décor ci-dessous, pendant la construction). */
const gearAt = {};
const cups = {};
const people = [];
let boardTex = null;

/* ---------- Tableau mural du hall : barres de maîtrise des sept familles ---------- */
function drawBoard(g) {
  g.fillStyle = '#25313d'; g.fillRect(0, 0, 512, 320);
  g.fillStyle = '#f6f2e8'; g.font = '800 30px "Baloo 2",sans-serif'; g.textAlign = 'left';
  const lv = E.levelOf(); g.fillText(`${E.ui().level} ${lv.name} · ${E.A.xp} ${E.ui().xp}`, 20, 40);
  ROOMS.forEach((r, i) => {
    const y = 70 + i * 34, m = E.mastery(r.id).total, open = E.roomOpen(r.id);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(200, y - 18, 260, 20);
    g.fillStyle = r.accent || r.color; g.fillRect(200, y - 18, 260 * m, 20);
    g.fillStyle = open ? '#f6f2e8' : '#8b919a'; g.font = '700 21px "Baloo 2",sans-serif';
    const nm = E.tx(r.name); g.fillText(`${r.n}. ${nm.length > 15 ? nm.slice(0, 14) + '…' : nm}`, 20, y);
    g.textAlign = 'right'; g.fillText(E.A.badges[r.id] ? '🏅' : open ? Math.round(m * 100) + '%' : '🔒', 500, y); g.textAlign = 'left';
  });
}

/* ---------- Construction des équipements : [x local, z local, point clé, fonction] par salle ---------- */
function rackAt(x, z, h = 2.1, c = '#2b3138') {
  box(.8, h, .8, c, x, h / 2, z); box(.84, .06, .84, '#5d6670', x, h + .03, z, undefined, false); solidBox(x, z, .82, .82, h); return h;
}
function encl(x, y, z, u, bays, bezel = '#3a4048', led = '#58e07a') {
  const hh = u * .09;
  box(.74, hh, .06, bezel, x, y + hh / 2, z + .42, undefined, false);
  const n = bays, cols = bays > 12 ? Math.min(bays, 12) : 4, rows = Math.ceil(n / cols), bw = .66 / cols, bh = (hh - .03) / rows;
  for (let i = 0; i < Math.min(n, 24); i++) { const c_ = i % cols, r_ = Math.floor(i / cols); box(bw * .8, bh * .78, .02, '#c9cdd3', x - .33 + bw * (c_ + .5), y + .015 + bh * (r_ + .5), z + .455, undefined, false); }
  box(.05, .03, .02, led, x + .33, y + hh - .03, z + .455, undefined, false);
}
const GEAR = {
  powervault: [
    [-4.3, -2.6, 'pv2', (x, z) => { rackAt(x, z); encl(x, .25, z, 2, 12); encl(x, .5, z, 2, 24); encl(x, .8, z, 5, 12, '#2f8f9d'); encl(x, 1.35, z, 2, 12, '#2f8f9d'); }],
    [4.3, -2.6, 'pv1', (x, z) => { box(1.6, .7, .8, '#c9a982', x, .35, z); solidBox(x, z, 1.6, .8, .75);
      box(.36, .5, .5, '#2f3640', x - .5, .95, z); box(.36, .5, .5, '#2f3640', x + .02, .95, z); box(.5, .2, .4, '#2f8f9d', x + .52, .8, z);
      for (const [dx, c] of [[-.5, '#e08a2a'], [.02, '#2563c9']]) { box(.03, .03, .5, c, x + dx + .12, .74, z + .18, undefined, false); box(.5 - dx, .03, .03, c, x + (dx + .52) / 2 + .12, .74, z + .42, undefined, false); } }],
    [-4.3, 2.0, 'pv3', (x, z) => deskScreen(x, z, '#2f8f9d')],
  ],
  powerstore: [
    [-4.3, -2.6, 'ps2', (x, z) => { rackAt(x, z); encl(x, .3, z, 3, 24, '#2563c9', '#6fb8ff'); encl(x, .65, z, 2, 24); encl(x, .9, z, 2, 24); box(.7, .03, .02, '#9fd3ff', x, .48, z + .46, undefined, false); }],
    [4.3, -2.6, 'ps1', (x, z) => { box(2.2, .12, 1, '#d9d4c8', x, .06, z); solidBox(x, z, 2.2, 1, .9);
      box(.5, .5, .4, '#2563c9', x - .75, .37, z); box(.3, .45, .35, '#2f3640', x + .2, .35, z - .25); box(.34, .4, .3, '#c9a074', x + .75, .32, z - .2); box(.3, .07, .3, '#f6d36b', x + .75, .56, z - .2, undefined, false);
      for (let i = 0; i < 3; i++) box(.22, .1, .22, '#8a7cc2', x + .25, .2 + i * .12, z + .25, undefined, false);
      for (const [dx, dz, c] of [[.2, -.25, '#2563c9'], [.75, -.2, '#e08a2a'], [.25, .25, '#8a7cc2']]) { const l = Math.hypot(dx + .75, dz), b = box(l, .03, .03, c, x + (dx - .75) / 2, .14, z + dz / 2, undefined, false); b.rotation.y = -Math.atan2(dz, dx + .75); }
      cyl(.02, .02, .01, '#fff', x, .13, z, 4, undefined, false); }],
    [-4.3, 2.0, 'ps5', (x, z) => deskScreen(x, z, '#2563c9', true)],
  ],
  apex: [
    [-4.3, -2.6, 'ap2', (x, z) => { box(.9, .1, .7, '#5d6670', x, .05, z); for (const s of [-1, 1]) box(.06, 2, .06, '#5d6670', x + s * .4, 1, z + .3, undefined, false);
      box(.7, 1.3, .5, '#6b5bd2', x, .75, z); box(.7, .4, .5, '#c9c0f0', x, 1.6, z); box(.74, .04, .54, '#2f2a24', x, 1.4, z, undefined, false); solidBox(x, z, .9, .7, 2); gearAt.gauge = { x, z }; }],
    [4.3, -2.6, 'ap3', (x, z) => { box(.6, .1, .6, '#5d6670', x, .05, z); cyl(.05, .06, 1.25, '#5d6670', x, .68, z, 6); solidBox(x, z, .6, .6, 1.4); gearAt.balance = { x, z }; }],
    [-4.3, 2.0, 'ap4', (x, z) => { box(1.2, .14, .9, '#c9a074', x, .07, z); box(.7, .55, .55, '#2563c9', x, .42, z); box(.6, .04, .02, '#9fd3ff', x, .5, z + .28, undefined, false);
      box(.74, .08, .1, '#6b5bd2', x, .45, z + .23, undefined, false); box(.08, .59, .58, '#6b5bd2', x, .42, z, undefined, false); box(.3, .02, .22, '#ffffff', x + .38, .15, z + .3, undefined, false); solidBox(x, z, 1.2, .9, .8); }],
  ],
  datadomain: [
    [-4.3, -2.6, 'dd1', (x, z) => { rackAt(x, z); encl(x, .3, z, 4, 12, '#3d9a5b'); encl(x, .75, z, 2, 12, '#3d9a5b'); encl(x, 1.05, z, 2, 12, '#3d9a5b'); }],
    [4.3, -2.6, 'dd2', (x, z) => { box(2.6, .08, .5, '#2f3640', x, .86, z); for (const s of [-1.2, 1.2]) box(.08, .82, .4, '#5d6670', x + s, .41, z, undefined, false);
      box(.7, 1, .7, '#3d9a5b', x - .2, .5, z - .05); const f = cone(.45, .55, '#2f7a48', x - .2, 1.3, z - .05, 8); f.rotation.x = Math.PI; solidBox(x, z, 2.6, .7, 1.4); gearAt.dedup = { x, z }; }],
    [-4.3, 2.0, 'dd4', (x, z) => { rackAt(x - .4, z, 1.2, '#2f3640'); encl(x - .4, .3, z, 2, 12, '#3d9a5b'); cyl(.04, .05, 1.7, '#9aa3ad', x + .45, .85, z, 6); solidCircle(x + .45, z, .15);
      for (const [dx, dy, r] of [[0, 0, .28], [.28, .02, .22], [-.26, .03, .2], [.1, .16, .2]]) sph(r, '#f6f8fb', x + .45 + dx, 1.85 + dy, z, undefined, 1); }],
  ],
  software: [
    [-4.3, -2.6, 'sw2', (x, z) => { deskScreen(x, z, '#e08a2a'); box(1.3, .8, .04, '#f8f8f4', x, 1.9, z - .5); for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) box(.18, .14, .02, (r + c) % 3 ? '#f2d3b0' : '#e08a2a', x - .48 + c * .24, 2.12 - r * .2, z - .47, undefined, false); for (const s of [-1, 1]) box(.04, 1.5, .04, '#5d6670', x + s * .6, 1.25, z - .52, undefined, false); }],
    [4.3, -2.6, 'sw1', (x, z) => { cyl(.03, .05, 1.1, '#2f2a24', x - .8, .55, z + .3, 6); const st = box(.4, .3, .03, '#2f2a24', x - .8, 1.15, z + .28, undefined, false); st.rotation.x = -.6; solidCircle(x - .8, z + .3, .2);
      box(.4, .4, .4, '#8a7cc2', x, .2, z - .3); cyl(.2, .2, .45, '#c9894f', x + .6, .22, z - .3, 10); const w = cyl(.22, .22, .08, '#2563c9', x + 1.1, .25, z + .1, 7); w.rotation.x = Math.PI / 2; box(.06, .25, .06, '#2563c9', x + 1.1, .12, z + .1, undefined, false);
      box(.6, .3, .4, '#3d9a5b', x + .4, .15, z + .5); solidBox(x + .45, z, 1.6, 1.4, .6); }],
    [-4.3, 2.0, 'sw4', (x, z) => { box(.9, .06, .6, '#c9a982', x, .7, z); cyl(.04, .05, .68, '#6b6b6b', x, .34, z, 6); solidBox(x, z, .9, .6, .8);
      box(.44, .02, .3, '#5d6670', x, .74, z + .05, undefined, false); const sc = box(.44, .28, .02, '#2f3640', x, .88, z - .1, undefined, false); sc.rotation.x = -.2; cyl(.025, .03, .9, '#9aa3ad', x + .35, 1.15, z - .2, 6);
      for (const [dx, dy, r] of [[0, 0, .24], [.22, .02, .18], [-.22, .03, .17]]) sph(r, '#f6f8fb', x + .35 + dx, 1.7 + dy, z - .2, undefined, 1); }],
  ],
  dr: [
    [-4.3, -2.6, 'dr4', (x, z) => { for (const s of [-1.2, 1.2]) { box(.9, .5, .7, '#d9d4c8', x + s, .25, z); box(.4, .5, .4, '#2f3640', x + s, .75, z); box(.3, .03, .02, '#58e07a', x + s, .85, z + .21, undefined, false); }
      box(1.6, .04, .04, '#d6563a', x, 1.02, z, undefined, false); box(.4, .9, .4, '#e6e0d2', x, .45, z - .7); box(.18, .18, .18, '#f6d36b', x, 1, z - .7, undefined, false); solidBox(x, z - .1, 3.3, 1.4, 1.1); gearAt.pulse = { x, z }; }],
    [4.3, -2.6, 'dr1', (x, z) => { for (const s of [-1, 1]) box(.06, 1.6, .06, '#5d6670', x + s * 1.05, .8, z, undefined, false); box(2.3, .7, .05, '#f8f8f4', x, 1.35, z);
      box(.9, .12, .02, '#2563c9', x - .5, 1.35, z + .03, undefined, false); box(.9, .12, .02, '#e08a2a', x + .5, 1.35, z + .03, undefined, false); box(.08, .5, .02, '#d6402f', x, 1.35, z + .04, undefined, false); solidBox(x, z, 2.2, .3, 1.7); }],
    [-4.3, 2.0, 'dr2', (x, z) => { cyl(.06, .08, 1.4, '#5d6670', x, .7, z, 6); const f = cyl(.45, .45, .08, '#f8f8f4', x, 1.75, z, 20); f.rotation.x = Math.PI / 2; const rim = cyl(.48, .48, .06, '#d6563a', x, 1.75, z - .02, 20, undefined, false); rim.rotation.x = Math.PI / 2;
      box(.04, .22, .03, '#2f2a24', x, 1.82, z + .06, undefined, false); solidBox(x, z, .3, .3, 2); gearAt.clock = { x, z }; }],
  ],
  cyber: [
    [-4.3, -2.6, 'cy3', (x, z) => { box(1.5, 1.8, 1, '#3b4a5e', x, .9, z); const d = cyl(.6, .6, .1, '#c9a33d', x, 1, z + .5, 20); d.rotation.x = Math.PI / 2; solidBox(x, z, 1.5, 1, 1.9); gearAt.vault = { x, z }; }],
    [4.3, -2.6, 'cy2', (x, z) => { box(.7, .9, .7, '#3b4a5e', x - .95, .45, z); box(.7, .9, .7, '#3b4a5e', x + .95, .45, z); box(.3, .2, .3, '#58e07a', x - .95, 1, z, undefined, false); box(.3, .2, .3, '#c9a33d', x + .95, 1, z, undefined, false); solidBox(x, z, 2.6, .7, 1.1); gearAt.gap = { x, z }; }],
    [-4.3, 2.0, 'cy4', (x, z) => { deskScreen(x, z, '#3b4a5e'); for (let i = 0; i < 6; i++) box(.08, .06, .02, i === 3 ? '#d6402f' : '#7fb05c', x - .2 + i * .08, 1.06, z - .26, undefined, false); }],
  ],
};
/** Bureau avec écran (tableau de bord) : la couleur de la salle sur l'écran. */
function deskScreen(x, z, c, graph = false) {
  
  box(1.4, .08, .7, '#c9a982', x, .76, z); for (const [a, b] of [[-.62, -.28], [.62, -.28], [-.62, .28], [.62, .28]]) box(.06, .74, .06, '#6b6b6b', x + a, .37, z + b, undefined, false);
  box(.8, .5, .06, '#20262e', x, 1.12, z - .25); box(.7, .38, .02, c, x, 1.12, z - .21, undefined, false); box(.1, .2, .1, '#20262e', x, .88, z - .25, undefined, false);
  if (graph) for (let i = 0; i < 5; i++) box(.08, .06 + i * .05, .02, '#9fd3ff', x - .22 + i * .11, .98 + (.06 + i * .05) / 2, z - .2, undefined, false);
  box(.5, .03, .18, '#e0e0e0', x, .815, z + .1, undefined, false); solidBox(x, z, 1.4, .7, .9);
}

/* ---------- Voyages : la navette ---------- */
function goVillage() {
  const a = VILLAGE_STOP.arrive; HOOKS.leaveAcad?.();
  teleport(a.x, a.z, a.yaw);
}
/** Depuis le village (arrêt construit par village.js), ou le lien direct #academie. */
HOOKS.toAcademy = () => { openHidden('academie'); teleport(ACAD_SPAWN.x, ACAD_SPAWN.z, ACAD_SPAWN.yaw); };
/** Carnet de voyage, onglet « Académie » : un tableau compact et un bouton vers le tableau complet. */
HOOKS.acadBoard = pane => {
  pane.innerHTML = `<p class="lb-note">${E.ui().loading}</p>`;
  E.loadContent().then(() => {
    const visited = run.discovered.includes('academie');
    pane.innerHTML = `<div class="ac-jb">${boardHTML(true)}<p class="ac-disc">${E.ui().unofficial}</p><button class="big" data-acad="board">📊 ${E.ui().board}</button>${!visited ? `<p class="lb-note">${S.lang === 'fr' ? 'Prends la navette au village : l’arrêt est au nord du bureau.' : 'Take the shuttle from the village: the stop is north of the office.'}</p>` : ''}</div>`;
    for (const n of pane.querySelectorAll('[data-w]')) n.style.width = n.dataset.w + '%';
    for (const n of pane.querySelectorAll('[data-c]')) n.style.setProperty('--c', n.dataset.c);
  }, () => { pane.innerHTML = `<p class="lb-note">${E.ui().loadFail}</p>`; });
};
/** Carnet (à gauche) dans l'académie : les salles ouvertes, leur maîtrise, et la prochaine étape. */
HOOKS.notebook ||= {};
HOOKS.notebook.academie = list => {
  const L_ = E.lang(), C_ = E.C(), items = [];
  for (const r of ROOMS) {
    if (!E.roomOpen(r.id)) { items.push(`<li class="secret" data-acad="${r.id}"><button type="button">🔒 ${E.ui().room(r.n)} · ${E.tx(r.name)}</button></li>`); break; }
    const m = C_ ? Math.round(E.mastery(r.id).total * 100) : 0, done = !!E.A.badges[r.id];
    items.push(`<li${done ? ' class="done"' : ''} data-acad="${r.id}"><button type="button">${E.ui().room(r.n)} · ${E.tx(r.name)}<span class="count"> (${done ? '🏅' : m + ' %'})</span><span class="strike"></span></button></li>`);
  }
  if (E.labOpen()) items.push(`<li${E.A.lab ? ' class="done"' : ''} data-acad="lab"><button type="button">🧪 ${E.ui().lab}<span class="strike"></span></button></li>`);
  if (E.finalOpen()) items.push(`<li${E.A.final.passed ? ' class="done"' : ''} data-acad="final"><button type="button">🎓 ${E.ui().final}${E.A.final.n ? `<span class="count"> (${Math.round(E.A.final.best * 100)} %)</span>` : ''}<span class="strike"></span></button></li>`);
  list.innerHTML = items.join('');
  const lv = E.levelOf();
  return { mode: E.ui().nbMode(lv.name, E.A.xp), tip: L_ === 'fr' ? 'Touche une ligne : où aller.' : 'Tap a line: where to go.' };
};
/** Ligne du carnet touchée : où se trouve la salle (ou le labo, l'évaluation). */
const WHERE = {
  powervault: ["pavillon au sud-ouest du hall", "pavilion south-west of the hall"], powerstore: ["pavillon à l'ouest du hall", "pavilion west of the hall"], apex: ["pavillon au nord-ouest du hall", "pavilion north-west of the hall"],
  datadomain: ["pavillon au nord du hall", "pavilion north of the hall"], software: ["pavillon au nord-est du hall", "pavilion north-east of the hall"], dr: ["pavillon à l'est du hall", "pavilion east of the hall"], cyber: ["pavillon au sud-est du hall", "pavilion south-east of the hall"],
  lab: ["dans la cour, devant le hall (l'architecte au casque jaune)", "in the courtyard, in front of the hall (the architect in the yellow hard hat)"], final: ["dans le hall, la table ronde à droite", "in the hall, the round table on the right"],
};
HOOKS.notebookClick = id => {
  const w = WHERE[id]; if (!w) return; const r = ROOM[id], fr = E.lang() === 'fr';
  const name = r ? `${E.ui().room(r.n)} · ${E.tx(r.name)}` : id === 'lab' ? E.ui().lab : E.ui().final;
  const lock = r && !E.roomOpen(id) ? ` · ${E.ui().lockedWhy(E.tx(ROOMS[E.roomIndex(id) - 1].name))}` : '';
  toast(`📍 <b>${name}</b> : ${fr ? w[0] : w[1]}${lock}`);
};
HOOKS.openAcad = (what, a, b) => openAcad(what, a, b);
// Lien direct : pierrelogre.com/#academie (ou /fr/#academie) emmène à l'académie dès que la partie commence
if (/academ/i.test(location.hash)) { const go = () => { if (S.started && !S.paused && window.__foxWorld) HOOKS.toAcademy(); else setTimeout(go, 400); }; setTimeout(go, 400); }
// Pour les tests (comme window.__fox.dev) : le moteur, la fenêtre, et l'ouverture de toutes les salles
if (window.__fox?.dev) window.__fox.dev.academy = { E, openAcad, unlockAll: () => { for (const r of ROOMS) if (!(E.A.tries[r.id] > 0)) E.recordQuiz(r.id, 0, {}); } };
