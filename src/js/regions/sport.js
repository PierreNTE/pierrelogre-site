/* =====================================================================
   Le complexe sportif (à l'est du bureau) : un vrai match de handball en cours
   (passes, tirs, arrêts, buts, célébrations), des tribunes qui font la ola,
   un arbitre, un coach, et le mini-jeu « Tir au renard » (tirs au but + classement).
   S'ouvre après 9 bêtises : la route est barrée derrière le bureau.
   ===================================================================== */
import * as THREE from 'three';
import { checkAch } from '../achievements.js';
import { behave } from '../crowd.js';
import { flat2, textTex } from '../engine.js';
import { fox } from '../fox.js';
import { MG, startMinigame } from '../minigame.js';
import { defineRegion, needTotal, totalDone } from '../regions.js';
import { S, pick, rnd, t } from '../state.js';
import { LIGHTS, adBoard, bench, bikeRack, bocageBank, building, bunting, bush, flag, hash, lamp, parasol, planeTree, planter, stands, trafficCone, treeLine, van } from './kit.js';

const B = { minX: 36, maxX: 95, minZ: -28, maxZ: 25.6 };   // au sud : la rivière
const C = { x: 62, z: 2 };                     // centre du terrain (40 × 20)
const GX = [42, 82];                            // lignes de but (équipe 0 défend 42, équipe 1 défend 82)
const PR = { gx: 89, gz: 11 };                  // but d'entraînement (mini-jeu), ouverture vers +z

defineRegion({
  id: 'sport', bounds: B, mapColor: '#9fc4e8',
  veg: { biome: 'meadow', density: .55, rect: { minX: 36, maxX: 96, minZ: -29, maxZ: 27.2 } },
  walk: [{ minX: 28, maxX: 37, minZ: 16, maxZ: 21 }, B],
  adj: ['moto'], unlock: () => totalDone() >= 9, need: needTotal(9),
  spawn: new THREE.Vector3(39, 0, 18.5), spawnYaw: Math.PI / 2, gatePos: new THREE.Vector3(33, 0, 18.5),
  mood: { bg: '#d3e6ee', fog: '#cfe2e6', near: 40, far: 85, sun: '#fff0d0', sky: '#f4f8f0', ground: '#7c9a6a', life: .6, music: 'sport' },
  goals: [
    { id: 'ballon' }, { id: 'butRenard' }, { id: 'sifflet' }, { id: 'ola' }, { id: 'glaciere' },
    { id: 'tir5' }, { id: 'tir1500' }, { id: 'tourTerrain' },
    { id: 'mascotte', secret: true }, { id: 'coach3', secret: true },
  ],
  i18n: {
    fr: {
      goals: { ballon: "Voler le ballon en plein match", butRenard: "Marquer un but avec le ballon du match", sifflet: "Voler le sifflet de l'arbitre… et siffler la fin du match",
        ola: "Lancer une ola dans les tribunes", glaciere: "Renverser la glacière des joueurs", tir5: "Marquer 5 buts dans une partie de Tir au renard", tir1500: "Atteindre 1 500 points au Tir au renard",
        tourTerrain: "Faire le tour du terrain en moins de 20 secondes", mascotte: "Devenir la mascotte officielle", coach3: "Écouter (vraiment) le discours du coach" },
      hints: { ballon: "Approche-toi du ballon et attrape-le (E). Les joueurs ne vont pas aimer.", butRenard: "Avec le ballon dans la gueule, fonce dans un des deux buts.",
        sifflet: "Le sifflet est sur la table de marque, au bord du terrain. Une fois dans la gueule : glapis !", ola: "Glapis devant les tribunes, tout près des supporters.",
        glaciere: "La glacière est près du banc des remplaçants. À pleine vitesse…", tir5: "Le but d'entraînement est au sud-est. Appuie sur E devant le point de penalty.",
        tir1500: "Vise les lucarnes (150 points) et enchaîne les buts pour le combo.", tourTerrain: "Pars d'un coin du terrain, cours (Maj) par les quatre coins, dans un sens ou dans l'autre, et reviens au départ." },
      L: { arbitre: { chase: ["Mon sifflet !", "Carton rouge, le renard !", "Rends ça !"], idle: ["Main !", "Marcher !", "Jeu passif…", "Pas de contact !"] },
        coach: { chase: ["Hé !"], idle: ["Défense ! DÉFENSE !", "On remonte vite !", "Lève la tête !", "Ailier, ouvre !"] } },
      search: { sifflet: "Où est passé mon sifflet ?" },
      dest: { but: "But" },
      eggs: { score: "Tableau d'affichage : les Renards sont en tête du championnat (des bêtises).", poster: "Affiche : « Handball : entraînement mardi et jeudi, venez nombreux. »", minigame: "Tir au renard : appuie sur E pour jouer. Meilleur score au classement !" },
      signs: { sport: "Complexe sportif →", tir: "Tir au renard", moto: "Motocross →", barre: "Route barrée" },
      cards: { sport: "Bons baisers du complexe sportif ! Le match a été interrompu trois fois par un renard. L'arbitre a sorti un carton… orange." },
      home: "ROUGES", away: "BLEUS", foxTeam: "RENARD", stopWhistle: "PRRRRIIIT ! Fin du match !", olaLine: "OLAAA !", mascotLine: ["Re-nard ! Re-nard !", "Mascotte ! Mascotte !"],
      coachTalk: ["Écoute, petit…", "En handball, on joue avec la tête…", "…et toi, tu joues avec les bêtises. C'est un style."], tourGo: "Tour du terrain : c'est parti !", tourStep: (i) => `Coin ${i}/4`, tourFail: "Trop lent… recommence d'un coin.",
      playersChase: "Le ballon !", keeperSave: "Arrêt !",
    },
    en: {
      goals: { ballon: "Steal the ball mid-match", butRenard: "Score a goal with the match ball", sifflet: "Steal the referee's whistle… and blow full time",
        ola: "Start a Mexican wave in the stands", glaciere: "Knock over the players' cooler", tir5: "Score 5 goals in one penalty shootout game", tir1500: "Reach 1,500 points in the penalty shootout",
        tourTerrain: "Run around the court in under 20 seconds", mascotte: "Become the official mascot", coach3: "(Really) listen to the coach's speech" },
      hints: { ballon: "Get close to the ball and grab it (E). The players won't like it.", butRenard: "With the ball in your mouth, run into one of the goals.",
        sifflet: "The whistle is on the scorers' table by the court. Once you have it: yap!", ola: "Yap in front of the stands, close to the fans.",
        glaciere: "The cooler is next to the substitutes' bench. At full speed…", tir5: "The practice goal is to the south-east. Press E in front of the penalty spot.",
        tir1500: "Aim for the top corners (150 points) and chain goals for the combo.", tourTerrain: "Start at a corner of the court, run (Shift) past all four corners, either way round, and back to the start." },
      L: { arbitre: { chase: ["My whistle!", "Red card, fox!", "Give it back!"], idle: ["Handball!", "Travelling!", "Passive play…", "No contact!"] },
        coach: { chase: ["Hey!"], idle: ["Defence! DEFENCE!", "Fast break!", "Heads up!", "Wing, open up!"] } },
      search: { sifflet: "Where did my whistle go?" },
      dest: { but: "Goal" },
      eggs: { score: "Scoreboard: the Foxes lead the (mischief) league.", poster: "Poster: \"Handball: training Tuesday and Thursday, all welcome.\"", minigame: "Fox penalty shootout: press E to play. Best scores on the leaderboard!" },
      signs: { sport: "Sports ground →", tir: "Fox shootout", moto: "Motocross →", barre: "Road closed" },
      cards: { sport: "Greetings from the sports ground! The match was interrupted three times by a fox. The referee showed a card… an orange one." },
      home: "REDS", away: "BLUES", foxTeam: "FOX", stopWhistle: "PHWEEEET! Full time!", olaLine: "OLAAA!", mascotLine: ["Fox! Fox! Fox!", "Mascot! Mascot!"],
      coachTalk: ["Listen, kid…", "In handball, you play with your head…", "…and you play with mischief. That's a style."], tourGo: "Court lap: go!", tourStep: (i) => `Corner ${i}/4`, tourFail: "Too slow… start again from a corner.",
      playersChase: "The ball!", keeperSave: "Save!",
    },
  },
  build(W) {
    const { box, cyl, sph, solidBox } = W;
    // Sol : pelouse claire, allées, terrain
    W.patch(62, 60, '#a7cf88', 65.5, 1); W.mottle(B, ['#9cc67e', '#b0d592', '#a2c884'], 18);
    // Sols du complexe à hauteurs fixes (au-dessus des taches d'herbe, sans dépendre de l'ordre de création)
    const G = (w, d, c, x, z, y) => { const m = W.flat(w, d, typeof c === 'string' ? W.M(c) : c, x, z, y); m.castShadow = false; W.R.noVeg.push({ x, z, w, d, rot: 0 }); return m; };
    G(9, 4, W.TM(W.TX.dirt, 3, 1), 33, 18.5, .046);
    // Allée principale (entrée → parking → but d'entraînement) et embranchements : buvette, salle, vestiaires, motocross
    W.path([[36.4, 18.5], [43, 18.9], [50, 18.3], [57, 18.8], [64, 18.3], [71, 18.6], [77.5, 17.6], [83.6, 17.4]], 3, { style: 'lane', fade: [false, true], seed: 41 });
    W.path([[44.2, 18.8], [44.6, 20.6]], 2.2, { style: 'lane', fade: [false, true], seed: 42 });
    W.path([[84.4, 1.6], [88.5, .9], [92, .2], [95.6, 0]], 2.4, { style: 'lane', fade: [true, false], seed: 43 });
    W.path([[85, -7.6], [86.6, -11], [86.8, -14.2]], 2, { style: 'lane', fade: [true, true], seed: 44 });
    W.path([[49, -10.6], [48.6, -14], [49, -17.6]], 2.2, { style: 'lane', fade: [true, true], seed: 45 });
    G(44, 24, '#86a28d', C.x, C.z, .046);                                 // dégagement (résine verte)
    for (const [w, d, x, z] of [[44, .12, C.x, C.z - 12], [44, .12, C.x, C.z + 12], [.12, 24, C.x - 22, C.z], [.12, 24, C.x + 22, C.z]]) G(w, d, '#e9e6df', x, z, .048);
    G(40, 20, '#4f86c6', C.x, C.z, .05);                                 // terrain
    // Zones des 6 m (demi-disques) et lignes pointillées des 9 m
    for (const gx of GX) { const s = gx < C.x ? 1 : -1;
      const zn = new THREE.Mesh(new THREE.CircleGeometry(6, 30, -Math.PI / 2, Math.PI), W.M('#e09a5a')); zn.rotation.set(-Math.PI / 2, 0, s > 0 ? 0 : Math.PI); zn.position.set(gx, .053, C.z); zn.receiveShadow = true; W.R.group.add(zn);
      for (let k = 0; k < 11; k++) { const a0 = -Math.PI / 2 + k * Math.PI / 11 + .03, dash = new THREE.Mesh(new THREE.RingGeometry(8.94, 9.06, 4, 1, a0, Math.PI / 22), W.M('#f6f2e8')); dash.rotation.set(-Math.PI / 2, 0, s > 0 ? 0 : Math.PI); dash.position.set(gx, .054, C.z); W.R.group.add(dash); } }
    const line = (w, d, x, z) => G(w, d, '#f6f2e8', x, z, .056);
    line(40, .1, C.x, C.z - 10); line(40, .1, C.x, C.z + 10); line(.1, 20, GX[0], C.z); line(.1, 20, GX[1], C.z); line(.1, 20, C.x, C.z);
    W.disc(.9, '#f6f2e8', C.x, C.z, .057); W.disc(.8, '#4f86c6', C.x, C.z, .058);
    // Buts
    for (const gx of GX) {
      const s = gx < C.x ? -1 : 1; const g = new THREE.Group(); g.position.set(gx, 0, C.z); W.R.group.add(g);
      [-1.5, 1.5].forEach(z => { for (let i = 0; i < 4; i++) box(.1, .5, .1, i % 2 ? '#f6f2e8' : '#d6402f', 0, .25 + i * .5, z, g); });
      for (let i = 0; i < 6; i++) box(.1, .1, .5, i % 2 ? '#f6f2e8' : '#d6402f', 0, 2, -1.25 + i * .5, g);
      box(.04, 1.9, 3, '#e9e6df', s * .9, 1, 0, g, false); box(.9, .04, 3, '#e9e6df', s * .45, 1.98, 0, g, false);
      solidBox(gx + s * .5, C.z - 1.5, 1, .2, 2); solidBox(gx + s * .5, C.z + 1.5, 1, .2, 2); solidBox(gx + s * .95, C.z, .2, 3, 2);
    }
    // Tribunes (nord) + supporters
    const seats = stands(C.x, C.z - 13, 34, 4, 0);
    W.egg('poster', 44, -12.5, 2.4, 1.6);
    // Tableau d'affichage
    const score = [0, 0, 0];
    const sbTex = textTex(512, 160, (g, w, h) => { g.fillStyle = '#1f2328'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6d36b'; g.font = 'bold 44px "Baloo 2",sans-serif'; g.textAlign = 'center';
      g.fillText(`${t().home} ${score[0]} - ${score[1]} ${t().away}`, w / 2, 70); g.fillStyle = '#e8742a'; g.font = 'bold 34px "Baloo 2",sans-serif'; g.fillText(`🦊 ${t().foxTeam} ${score[2]}`, w / 2, 128); });
    cyl(.12, .14, 4.4, '#5d6670', C.x - 3, 2.2, C.z - 18.6, 6); cyl(.12, .14, 4.4, '#5d6670', C.x + 3, 2.2, C.z - 18.6, 6); box(7, 2.3, .3, '#2f3640', C.x, 4.6, C.z - 18.6);
    { const p = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.05), new THREE.MeshBasicMaterial({ map: sbTex })); p.position.set(C.x, 4.6, C.z - 18.43); W.R.group.add(p); }
    W.egg('score', C.x, C.z - 16, 3.4, 2.2);
    // Banc, table de marque, glacière
    bench(C.x - 6, C.z + 12.6, Math.PI); bench(C.x + 6, C.z + 12.6, Math.PI);
    box(2.4, .9, .9, '#c9a982', C.x, .45, C.z + 13.4); solidBox(C.x, C.z + 13.4, 2.4, .9, .9);
    W.pushable(C.x + 9.5, C.z + 13.2, () => { const g = new THREE.Group(); box(.8, .55, .5, '#2563c9', 0, .28, 0, g); box(.84, .12, .54, '#f6f2e8', 0, .6, 0, g, false); [-.2, .1, .3].forEach(x => cyl(.06, .06, .3, '#7fb05c', x, .78, 0, 6, g, false)); return g; }, { goal: 'glaciere', r: .5 });
    // Lampadaires de stade, fanions, arbres autour
    [[40, -10], [84, -10], [40, 14], [84, 14]].forEach(([x, z]) => { cyl(.12, .16, 8, '#8b97a6', x, 4, z, 6); box(1.4, .6, .3, '#e9e6df', x, 8.1, z); W.solidCircle(x, z, .2, 3); LIGHTS.push({ x, y: 8.1, z, s: 2 }); });
    flag(37.5, 15, '#d6402f'); flag(37.5, 22, '#2563c9');
    const mix = (x, z, i) => (i % 4 === 1 ? W.tree(x, z, rnd(1.1, 1.4), 0, i) : W.tree(x, z, rnd(1, 1.3), 1, i));
    treeLine(36, -27.5, 94, -27.5, 3, mix); bocageBank(37, 26.6, 94, 26.6, { oaks: 8, seed: 21 }); treeLine(95, -27, 95, -6, 3, mix); treeLine(95, 6, 95, 25.6, 3, mix);
    treeLine(35.5, -27, 35.5, 14, 3); treeLine(35.5, 23, 35.5, 25.6, 3);
    // Vestiaires
    building(86, -18, 7, 5, 3, '#e9e6df', '#7d8fb3', { roofType: 'flat', trim: '#2563c9', rot: Math.PI / 2 });
    W.sign(36.6, 16.2, 'sport', -Math.PI / 2, 2.4); W.sign(92, -2.2, 'moto', -Math.PI / 2, 2.2);
    // But d'entraînement + point de penalty (mini-jeu)
    { const g = new THREE.Group(); g.position.set(PR.gx, 0, PR.gz); W.R.group.add(g);
      [-1.5, 1.5].forEach(x => { for (let i = 0; i < 4; i++) box(.1, .5, .1, i % 2 ? '#f6f2e8' : '#e8742a', x, .25 + i * .5, 0, g); });
      for (let i = 0; i < 6; i++) box(.5, .1, .1, i % 2 ? '#f6f2e8' : '#e8742a', -1.25 + i * .5, 2, 0, g);
      box(3, 1.9, .04, '#e9e6df', 0, 1, -.9, g, false); box(3, .04, .9, '#e9e6df', 0, 1.98, -.45, g, false);
      G(8, 9, '#4f86c6', PR.gx, PR.gz + 3.5, .05); W.disc(.25, '#f6f2e8', PR.gx, PR.gz + 7, .056);
      solidBox(PR.gx - 1.5, PR.gz - .45, .2, 1, 2); solidBox(PR.gx + 1.5, PR.gz - .45, .2, 1, 2); solidBox(PR.gx, PR.gz - .9, 3, .2, 2); }
    W.sign(PR.gx - 3.4, PR.gz + 9, 'tir', .4, 2.2); W.egg('minigame', PR.gx - 2.2, PR.gz + 8, 2.8, 1.5);
    lamp(PR.gx - 4.5, PR.gz + 8); lamp(PR.gx + 4.5, PR.gz + 8);
    W.postcard(91.5, 24.8);   // au bord de la rivière, côté terrain (à 27.5 elle était hors d'atteinte)

    /* ---------- Personnages : joueurs, gardiens, supporters (une seule foule) ---------- */
    const crowd = W.crowd(44);
    const TEAM = [{ shirt: '#d6402f', pants: '#f6f2e8' }, { shirt: '#2563c9', pants: '#f6f2e8' }];
    const players = [[], []];
    for (let tm = 0; tm < 2; tm++) {
      for (let i = 0; i < 3; i++) players[tm].push(crowd.add({ pos: { x: C.x + (tm ? 5 : -5), z: C.z - 5 + i * 5 }, ...TEAM[tm], hair: pick(['#5a3b2a', '#2f2a24', '#c9a33d', '#8a6a4a']), team: tm, role: i }));
      const k = crowd.add({ pos: { x: GX[tm] + (tm ? -.6 : .6), z: C.z }, shirt: tm ? '#7fb05c' : '#f6d36b', pants: '#2f3640', hair: '#2f2a24', team: tm, keeper: true });
      players[tm].keeper = k;
    }
    const fans = seats.filter((_, i) => i % 2 === 0).slice(0, 26).map((p, i) => crowd.add({ pos: { x: p.x, z: p.z + .2 }, seated: true, yaw: 0, shirt: pick(['#d6402f', '#2563c9', '#f6f2e8', '#e8742a', '#7fb05c', '#f6d36b']), pants: '#3d4a5c', hair: pick(['#5a3b2a', '#2f2a24', '#c9a33d', '#8a6a4a', '#d9d4c8']), hat: i % 5 === 0 ? 'cap' : null, hatColor: pick(['#d6402f', '#2563c9']), fan: true }));
    for (const f of fans) f.pos.y = f.seatY = seats.find(s => Math.abs(s.x - f.pos.x) < .01 && Math.abs(s.z + .2 - f.pos.z) < .3)?.y - .45 || 0;
    const mgKeeper = crowd.add({ pos: { x: PR.gx, z: PR.gz + .5 }, shirt: '#f6d36b', pants: '#2f3640', hair: '#5a3b2a' });
    // Spectateurs debout le long du terrain et à la terrasse de la buvette (ils suivent le ballon et fêtent les buts)
    for (const [x, z, yaw, seated] of [[50.5, 15.2, Math.PI, false], [74.6, 15.4, Math.PI, false], [41.7, 20.9, Math.PI * .8, true], [43.1, 20.3, Math.PI * 1.1, true]]) {
      const f = crowd.add({ pos: { x, z }, yaw, seated, shirt: pick(['#d6402f', '#2563c9', '#f6d36b', '#7fb05c']), pants: pick(['#3d4a5c', '#5a5048', '#2f3640']), hair: pick(['#5a3b2a', '#d9d4c8', '#2f2a24']), hat: seated ? null : 'cap', hatColor: '#2563c9' });
      f.seatY = seated ? .12 : 0; fans.push(f); }
    // Arbitre, coach
    const ref = W.npc({ id: 'arbitre', x: C.x, z: C.z + 11, yaw: 0, shirt: '#2f2a24', pants: '#2f2a24', hair: '#8a6a4a', route: [{ p: new THREE.Vector3(C.x, 0, C.z + 11), wait: .3, act: null, yaw: 0 }] });
    const coach = W.npc({ id: 'coach', x: C.x - 3, z: C.z + 13.8, yaw: Math.PI, shirt: '#d6402f', pants: '#2f3640', hair: '#d9d4c8', tie: null,
      route: [{ p: new THREE.Vector3(C.x - 3, 0, C.z + 11.6), wait: 3, act: 'point', yaw: 0 }, { p: new THREE.Vector3(C.x - 8, 0, C.z + 11.6), wait: 2.5, act: 'cheer', yaw: 0 }] });
    coach.onYap = n => { n.jump = .4; const k = W.talk('coach'); const L = t().coachTalk; W.say(n, L[Math.min(L.length - 1, k - 1)], '', 2.6); if (k >= 3) W.complete('coach3'); };
    const whistle = W.item({ kind: 'sifflet', x: C.x + .6, z: C.z + 13.3, y: .95, owner: ref, sh: .2, bring: new THREE.Vector3(C.x + .6, 0, C.z + 12.6),
      build: () => { const g = new THREE.Group(); const b = cyl(.08, .08, .2, '#c9cdd3', 0, 0, 0, 8, g); b.rotation.z = Math.PI / 2; box(.12, .06, .06, '#c9cdd3', .14, .04, 0, g, false); return g; } });

    /* ---------- Le ballon du match (un objet attrapable) ---------- */
    const ball = W.item({ kind: 'ballon', x: C.x, z: C.z, y: .2, sh: .25, build: () => { const g = new THREE.Group(); sph(.17, '#f6efe0', 0, 0, 0, g, 1); sph(.175, '#d6402f', 0, 0, 0, g, 0, false).scale.set(1, .35, 1); return g; } });
    ball.matchBall = true;
    const all = [...players[0], ...players[1]];
    const M = { phase: 'kickoff', holder: null, attack: 0, hold: 1.5, fly: null, celebrate: 0, stopped: 0, t: 0 };
    const redraw = () => sbTex.userData.redraw();
    function kickoff(team) { M.phase = 'kickoff'; M.attack = team; M.holder = players[team][1]; M.hold = 1.6; M.fly = null; }
    function goal(team, byFox) {
      score[byFox ? 2 : team]++; redraw(); W.SFX.goal(); W.SFX.cheer(); M.phase = 'goal'; M.celebrate = 2.8; M.scorer = byFox ? -1 : team; M.fly = null; M.holder = null;
      for (const f of fans) f.jumpT = rnd(0, .5);
    }
    function passTo(a, kind) {
      const from = ball.pos.clone(); from.y = 1;
      let to, dur;
      if (kind === 'shot') { const gx = GX[1 - M.attack]; to = new THREE.Vector3(gx, rnd(.4, 1.7), C.z + rnd(-1.35, 1.35)); dur = .45; }
      else { to = a.pos.clone().setY(1); dur = Math.max(.35, flat2(from, to) / 14); }
      M.fly = { from, to, t: 0, dur, kind, target: a }; M.holder = null; W.SFX.kick();
    }
    ball.onGrab = () => { M.phase = 'stolen'; M.fly = null; M.holder = null; W.complete('ballon'); W.SFX.whistle(); W.say(ref, '!', 'excl', .8, 3.1, 'ref!'); for (const p of all) if (!p.keeper) p.chase = true; };
    W.place(it => {
      if (it !== ball) return false;
      // But : près d'une ligne de but, ou n'importe où dans l'anneau devant le but (ballon lâché dedans, ou renard dedans)
      const ring = { x: GX[1] - .6, z: C.z }, inRing = flat2(it.pos, ring) < 1.3 || (!fox.held && flat2(it.pos, fox.pos) < 1.3 && flat2(fox.pos, ring) < 1.3);
      const gi = inRing ? 1 : GX.findIndex(gx => Math.abs(it.pos.x - gx) < 1.3 && Math.abs(it.pos.z - C.z) < 1.6);
      if (gi >= 0) { W.complete('butRenard'); goal(0, true); W.say(fox, '⚽', 'note', 1.2, 2); }
      else M.phase = 'loose';
      for (const p of all) p.chase = false;
      return true;
    });
    W.dest(it => it === ball && !W.done('butRenard') ? { key: 'but', pos: new THREE.Vector3(GX[1] - .6, 0, C.z), r: 1.2 } : null);
    // Siffler avec le sifflet dans la gueule
    W.yap(new THREE.Vector3(C.x, 0, C.z), 60, () => {
      if (fox.held !== whistle) return;
      W.SFX.whistle(); W.say(fox, t().stopWhistle, '', 2.2, 2); M.phase = 'stopped'; M.stopped = 6; M.fly = null; W.complete('sifflet');
    });
    // Ola : glapir devant les tribunes
    let ola = -1;
    W.yap(new THREE.Vector3(C.x, 0, C.z - 10), 7, () => { if (ola >= 0) return; ola = 0; W.say({ anchor: new THREE.Vector3(C.x, 3, C.z - 13) }, t().olaLine, '', 2, 0, 'ola'); W.SFX.cheer(); setTimeout(() => W.complete('ola'), 1500); });
    // Mascotte : s'asseoir au rond central (il faut rester immobile un moment)
    W.zone(new THREE.Vector3(C.x, 0, C.z), 1.6, () => { W.say({ anchor: new THREE.Vector3(C.x, 3.4, C.z - 13) }, pick(t().mascotLine), '', 2.6, 0, 'mascot'); W.SFX.cheer(); for (const f of fans) f.jumpT = rnd(0, .4); W.complete('mascotte'); }, { cond: () => fox.idle > 4 && !fox.held });
    // Mini-jeu
    W.interact({ x: PR.gx, y: 1, z: PR.gz + 7 }, 1.6, () => startMinigame({ gx: PR.gx, gz: PR.gz, keeper: mgKeeper }, res => {
      if (res.goals >= 5) W.complete('tir5'); if (res.score >= 1500) W.complete('tir1500'); checkAch();
    }), () => !fox.held);
    // Tour du terrain (4 coins dans l'ordre, à partir de n'importe lequel)
    const CP = [[40, -10], [84, -10], [84, 14], [40, 14]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const tour = { start: -1, n: 0, t: 0, last: -1, dir: 0 };
    // Gardiens d'entraînement
    // Barrière « Route barrée »
    const bar = new THREE.Group(); [-2, 2].forEach(dz => { box(.15, 1.1, .15, '#5d6670', 0, .55, dz, bar); });
    for (let i = 0; i < 5; i++) box(.12, .28, .9, i % 2 ? '#f6f2e8' : '#d6402f', 0, .9, -1.8 + i * .9, bar, false);
    box(.1, .5, 1.6, '#f6d36b', .05, 1.45, 0, bar, false);
    bar.position.set(32.6, 0, 18.5); W.dyn(bar); W.gate(bar, 'sink', 2);

    /* ---------- Simulation du match ---------- */
    W.update(dt => {
      const now = S.time; M.t += dt;
      // Supporters
      for (const f of fans) {
        f.t += dt; f.jumpT = (f.jumpT ?? 9) - dt;
        const cheer = M.phase === 'goal' || f.jumpT > -1.4;
        const waveK = ola >= 0 ? Math.max(0, 1 - Math.abs((f.pos.x - (C.x - 18)) - ola * 14) / 3) : 0;
        if (cheer || waveK > .2) { behave.cheer(f, f.t); f.jump = waveK > .2 ? waveK * .6 : (f.jumpT > 0 ? .5 : 0); }
        else { f.armL = f.armR = -.2 + Math.sin(f.t * 1.3 + f.pos.x) * .1; f.armLz = f.armRz = 0; f.jump = 0; f.headYaw = Math.max(-1, Math.min(1, (ball.pos.x - f.pos.x) * .05)); }
        f.pos.y = f.seatY;
      }
      if (ola >= 0) { ola += dt * .9; if (ola > 3) ola = -1; }
      // Gardien du mini-jeu au repos
      if (!MG.active) { mgKeeper.pos.set(PR.gx + Math.sin(now * .7) * 1, 0, PR.gz + .5); mgKeeper.yaw = 0; mgKeeper.armL = mgKeeper.armR = -.4; mgKeeper.armLz = -.4; mgKeeper.armRz = .4; mgKeeper.moving = false; mgKeeper.jump = 0; }
      // Arbitre : suit le ballon le long de la ligne de touche
      ref.route[0].p.x = Math.max(GX[0] + 2, Math.min(GX[1] - 2, ball.pos.x));
      if (M.phase === 'stopped') { M.stopped -= dt; for (const p of all) { p.moving = false; behave.rest(p); p.armR = -2.6; behave.face(p, fox.pos.x, fox.pos.z, dt); } if (M.stopped <= 0) kickoff(0); syncBall(now); return; }
      if (M.phase === 'goal') {
        M.celebrate -= dt;
        for (const p of all) { if (M.scorer === p.team) { behave.cheer(p, now); p.jump = Math.abs(Math.sin(now * 5)) > .7 ? .3 : 0; p.moving = false; } else { behave.rest(p); p.lean = .25; p.moving = false; } }
        if (M.celebrate <= 0) { for (const p of all) { behave.rest(p); p.jump = 0; } kickoff(M.scorer === 0 ? 1 : 0); }
        syncBall(now); return;
      }
      // Ballon volé : les joueurs poursuivent le renard
      if (M.phase === 'stolen') {
        for (const p of all) { if (p.keeper) { keeperTrack(p, dt); continue; } const d = behave.walkTo(p, fox.pos.x, fox.pos.z, 4.4, dt); p.armR = -1.6; p.lean = .15;
          if (d < .9 && fox.held === ball && !(fox.stunT > 0)) { fox.held = null; ball.held = false; fox.vel.set(Math.sign(fox.pos.x - p.pos.x) * 6, 0, Math.sign(fox.pos.z - p.pos.z) * 6); fox.stunT = .7; W.SFX.stun(); W.say(fox, '💫', 'stun', .9, 1.7, 'stun'); W.say({ anchor: p.pos.clone().setY(2.6) }, t().playersChase, '', 1.4, 0, 'pl'); M.holder = p; M.attack = p.team; M.phase = 'play'; M.hold = 1; for (const q of all) q.chase = false; break; } }
        return;
      }
      if (M.phase === 'loose') {
        let best = null, bd = 1e9; for (const p of all) { if (p.keeper) continue; const d = flat2(p.pos, ball.pos); if (d < bd) { bd = d; best = p; } }
        for (const p of all) if (!p.keeper) behave.walkTo(p, p === best ? ball.pos.x : p.pos.x, p === best ? ball.pos.z : p.pos.z, 3.6, dt);
        for (const tm of players) keeperTrack(tm.keeper, dt);
        if (bd < .7) { M.holder = best; M.attack = best.team; M.phase = 'play'; M.hold = 1; }
        return;
      }
      if (M.phase === 'kickoff') { M.phase = 'play'; }
      // Jeu
      const atk = players[M.attack], def = players[1 - M.attack], dir = M.attack === 0 ? 1 : -1, oppGoal = GX[1 - M.attack];
      atk.forEach((p, i) => {
        if (p === M.holder) { const tx = oppGoal - dir * 9, tz = C.z + (p.role - 1) * 3; behave.walkTo(p, tx, tz, 2.6, dt); p.armR = -1.2 + Math.sin(now * 8) * .2; return; }
        const tx = oppGoal - dir * (8 + (i === 1 ? 3.5 : 0)), tz = C.z + (i - 1) * 6.5 + Math.sin(now * .8 + i) * 1.5;
        behave.walkTo(p, tx, tz, 3.2, dt); p.armR = p.armL = 0;
        if (flat2(p.pos, { x: tx, z: tz }) < .3) behave.face(p, ball.pos.x, ball.pos.z, dt);
      });
      def.forEach((p, i) => { const gx = GX[1 - M.attack], tx = gx - dir * (6.4 + (i === 1 ? 1.5 : 0)), tz = C.z + (i - 1) * 3.4 + (ball.pos.z - C.z) * .4; behave.walkTo(p, tx, tz, 3.4, dt); if (flat2(p.pos, { x: tx, z: tz }) < .3) { behave.face(p, ball.pos.x, ball.pos.z, dt); p.armL = p.armR = -2.4; p.armLz = -.4; p.armRz = .4; } else behave.rest(p); });
      keeperTrack(players[0].keeper, dt); keeperTrack(players[1].keeper, dt);
      if (M.holder) { M.hold -= dt; if (M.hold <= 0) { const close = Math.abs(M.holder.pos.x - oppGoal) < 11.5; if (close && Math.random() < .55) passTo(null, 'shot'); else passTo(pick(atk.filter(p => p !== M.holder)), 'pass'); } }
      if (M.fly) {
        const f = M.fly; f.t += dt / f.dur; const u = Math.min(1, f.t);
        ball.pos.lerpVectors(f.from, f.to, u); ball.pos.y += Math.sin(u * Math.PI) * (f.kind === 'shot' ? .4 : 1.2);
        if (u >= 1) {
          if (f.kind === 'shot') {
            const k = def.keeper; const saved = Math.abs(k.pos.z - f.to.z) < .75 && Math.random() < .75 || Math.random() < .2;
            if (saved) { W.SFX.save(); W.say({ anchor: k.pos.clone().setY(2.6) }, t().keeperSave, '', 1.2, 0, 'save'); M.attack = 1 - M.attack; M.holder = k; M.hold = 1.2; M.fly = null; }
            else goal(M.attack, false);
          } else { M.holder = f.target; M.hold = rnd(.9, 2.2); M.fly = null; }
        }
      }
      syncBall(now);
      // Tour du terrain chronométré
      const ci = CP.findIndex(p => flat2(fox.pos, p) < 2.6);
      if (tour.start >= 0) tour.t += dt;
      // Dans un sens ou dans l'autre ; un tour commencé il y a plus de 20 s (coin touché en passant) repart du coin atteint
      if (ci >= 0 && ci !== tour.last) {
        const fwd = ci === (tour.last + 1) % 4, back = ci === (tour.last + 3) % 4, ok = tour.start >= 0 && tour.t < 20 && (tour.dir > 0 ? fwd : tour.dir < 0 ? back : fwd || back);
        if (!ok) { if (tour.start >= 0 && tour.n > 0 && tour.t >= 20) W.toast(t().tourFail); tour.start = ci; tour.n = 0; tour.t = 0; tour.last = ci; tour.dir = 0; W.toast(t().tourGo); }
        else { tour.dir = tour.dir || (fwd ? 1 : -1); tour.last = ci; tour.n++; if (tour.n >= 4) { W.complete('tourTerrain'); tour.start = -1; tour.last = -1; } else W.toast(t().tourStep(tour.n)); }
      }
      if (tour.start >= 0 && tour.t > 30) tour.start = -1;
    });
    function keeperTrack(k, dt) { const tz = Math.max(C.z - 1.2, Math.min(C.z + 1.2, ball.pos.z)); behave.walkTo(k, GX[k.team] + (k.team ? -.6 : .6), tz, 3, dt); behave.face(k, C.x, ball.pos.z, dt, 10); k.armL = k.armR = -2.2; k.armLz = -.5; k.armRz = .5; }
    function syncBall(now) {
      if (ball.held || ball.carrier) return;
      if (M.holder) { const h = M.holder; ball.pos.set(h.pos.x + Math.sin(h.yaw + .8) * .45, .2 + Math.abs(Math.sin(now * 8)) * .55, h.pos.z + Math.cos(h.yaw + .8) * .45); }
      else if (M.phase === 'goal' && !M.fly) ball.pos.y = Math.max(.17, ball.pos.y - .05);
    }
    kickoff(0);
    // Habillage : panneaux autour du terrain, fanions au-dessus des tribunes, cônes d'entraînement, arbres le long de l'allée
    for (let x = 45; x < 80; x += 6) adBoard(x + 1.5, -9.6, 5.4, 0, ['#2563c9', '#d6402f', '#e8742a', '#7fb05c', '#2f3640', '#8a7cc2'][((x - 45) / 6) % 6]);
    W.cyl(.08, .1, 5.6, '#8b97a6', 44.6, 2.8, -15.4, 5); W.cyl(.08, .1, 5.6, '#8b97a6', 79.4, 2.8, -15.4, 5); bunting(44.6, -15.4, 79.4, -15.4, 5.4);
    [[84.6, 15.6], [85.8, 17.2], [84.8, 18.8], [86.2, 20.2]].forEach(([x, z]) => trafficCone(x, z));
    // Platanes le long de l'allée (côté sud), à l'écart de la buvette et du parking
    for (const x of [51.2, 70.6, 77, 83.2]) planeTree(x, 21 + hash(x) * .3, 1.05);

    /* ---------- Salle omnisports (au nord-ouest, derrière les tribunes) ---------- */
    { const hx = 49, hz = -22.4, hw = 16, hd = 8, hh = 5.2, g = new THREE.Group(); g.position.set(hx, 0, hz); W.R.group.add(g);
      box(hw + .2, .5, hd + .2, '#b5ad9e', 0, .25, 0, g); box(hw, hh - .4, hd, '#efe9dc', 0, .45 + (hh - .4) / 2, 0, g);
      box(hw + .06, .55, hd + .06, '#2563c9', 0, hh - .7, 0, g, false); box(hw + .06, .18, hd + .06, '#d6402f', 0, hh - 1.15, 0, g, false);
      for (let i = 0; i < 7; i++) box(1.6, 1.1, .06, '#8fb3c9', -6 + i * 2, 3.1, hd / 2 + .02, g, false);                      // bandeau vitré
      for (let i = -3; i <= 3; i++) box(.12, hh - 1, .1, '#d9d4c8', i * 2.3, (hh - 1) / 2 + .3, hd / 2 + .04, g, false);         // poteaux de façade
      box(3.4, 2.4, .08, '#6f97ad', 0, 1.5, hd / 2 + .05, g, false); box(.06, 2.4, .1, '#e9e6df', 0, 1.5, hd / 2 + .1, g, false);   // portes vitrées
      box(4.6, .16, 1.8, '#d6402f', 0, 2.9, hd / 2 + .9, g); for (const e of [-2.1, 2.1]) cyl(.07, .07, 2.8, '#5d6670', e, 1.4, hd / 2 + 1.6, 6, g, false);
      // Toit en voûte (tôle) et pignons
      const vault = new THREE.Mesh(new THREE.CylinderGeometry(hd / 2 + .3, hd / 2 + .3, hw + .5, 16, 1, false, 0, Math.PI), W.M('#8f9ca8')); vault.rotation.z = Math.PI / 2; vault.scale.set(.42, 1, 1); vault.position.set(0, hh - .4, 0); vault.castShadow = vault.receiveShadow = true; g.add(vault);
      for (let i = 0; i < 8; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(hd / 2 + .32, .05, 4, 16, Math.PI), W.M('#7d8994')); rib.rotation.y = Math.PI / 2; rib.scale.set(1, .42, 1); rib.position.set(-hw / 2 + 1 + i * (hw - 2) / 7, hh - .4, 0); g.add(rib); }
      for (const e of [-1, 1]) { const gab = new THREE.Mesh(new THREE.CircleGeometry(hd / 2 + .3, 16, 0, Math.PI), W.M('#e2dccd')); gab.scale.set(1, .42, 1); gab.rotation.y = e * Math.PI / 2; gab.position.set(e * (hw / 2 + .26), hh - .4, 0); g.add(gab); }
      const signT = textTex(512, 96, (c, w, h) => { c.fillStyle = '#2563c9'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = 'bold 56px "Baloo 2",sans-serif'; c.textAlign = 'center'; c.fillText('HANDBALL', w / 2, 66); });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.6, .86), new THREE.MeshBasicMaterial({ map: signT })); sg.position.set(0, 4.5, hd / 2 + .06); g.add(sg);
      W.solidBox(hx, hz, hw + .2, hd + .2, 6); bikeRack(hx + 5.6, hz + hd / 2 + 1.2, 5, 0); bench(hx - 5, hz + hd / 2 + 1.1, Math.PI); }
    // Mur du fond des tribunes, aux couleurs du club
    box(35.2, 2.4, .25, '#d9d4c8', C.x, 1.2, -14.55); box(35.25, .32, .27, '#2563c9', C.x, 2.1, -14.55, undefined, false); box(35.25, .14, .27, '#d6402f', C.x, 1.82, -14.55, undefined, false);
    // Filets pare-ballons derrière les buts
    for (const gx of [GX[0] - 1.1, GX[1] + 1.1]) { for (const dz of [-5.5, 0, 5.5]) cyl(.06, .07, 3.8, '#8b97a6', gx, 1.9, C.z + dz, 5);
      const net = new THREE.Mesh(new THREE.PlaneGeometry(11, 3.5, 1, 1), new THREE.MeshBasicMaterial({ color: '#2f3640', transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false })); net.rotation.y = Math.PI / 2; net.position.set(gx, 1.95, C.z); W.dyn(net, false);
      box(.04, .04, 11, '#5d6670', gx, 3.7, C.z, undefined, false); W.solidBox(gx, C.z, .2, 11, 3); }

    /* ---------- Buvette du club et sa terrasse (au sud de l'allée) ---------- */
    building(45.2, 23.9, 6.4, 3.4, 2.6, '#f4efe4', '#c8643c', { rot: Math.PI, shutter: '#d6402f', win: '#ffe2a0', chimney: -1 });
    { const aw = new THREE.Group(); aw.position.set(45.2, 2.3, 21.75); W.R.group.add(aw); for (let i = 0; i < 8; i++) { const st = box(.8, .06, 1.3, i % 2 ? '#f6efe0' : '#2563c9', -2.8 + i * .8, 0, 0, aw, false); st.rotation.x = -.32; } }
    for (const [x, z] of [[42.4, 20.6], [47.9, 20.7]]) { cyl(.4, .4, .05, '#f6efe0', x, .74, z, 10); cyl(.05, .05, .74, '#5d6670', x, .37, z, 5); for (const dx of [-.7, .7]) box(.4, .45, .4, '#d6402f', x + dx, .22, z, undefined, false); W.solidCircle(x, z, .5, .8); }
    parasol(42.4, 20.6, '#2563c9', '#f6efe0');

    /* ---------- Parking : deux voitures du club, arceaux à vélos ---------- */
    G(13, 4.6, '#9a9a92', 61, 22.9, .046);
    for (let i = 0; i < 5; i++) G(.1, 3.4, '#ece8de', 55.2 + i * 2.9, 23.2, .048);
    van(56.65, 23.1, Math.PI / 2, '#d6402f'); van(62.45, 23, Math.PI / 2 + .04, '#f6efe0'); bikeRack(66.2, 21.5, 4, 0);
    [[38.5, -24], [93, -24], [38.5, 27], [93, 27]].forEach(([x, z]) => { bush(x, z, 1.2); bush(x + 1.4, z + .6, .9); });
    planter(56, 16.6, 2.4); planter(68, 16.6, 2.4);

    return { ball, whistle };
  },
});
