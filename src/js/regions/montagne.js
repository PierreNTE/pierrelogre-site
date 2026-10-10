/* =====================================================================
   La montagne (au nord de la forêt, par un éboulement à dégager) : neige, sapins,
   téléphérique, marmottes, luge, bonhomme de neige, belvédère… et le datacenter
   « Cloud souverain » avec son vigile, sa clim, ses baies de serveurs et une IA bavarde.
   Le yéti, lui, n'existe pas. S'ouvre après 40 bêtises.
   ===================================================================== */
import * as THREE from 'three';
import { giveUp } from '../actions.js';
import { blob, flat2, removeObstacle, solidBox as SB, textTex } from '../engine.js';
import { surfaceHooks } from '../foxupdate.js';
import { fox } from '../fox.js';
import { refreshNav } from '../npclogic.js';
import { defineRegion, inRect, needTotal, totalDone } from '../regions.js';
import { rnd, t } from '../state.js';
import { chalet, hash, mound, rock, scatter, snowPine, snowRock, treeLine } from './kit.js';

const B = { minX: -42, maxX: 32, minZ: -150, maxZ: -84 };
const DC = { x: -18, z: -118, w: 18, d: 12 };           // datacenter
const DOOR = { x: DC.x, z: DC.z + DC.d / 2 };
const BELV = { x: 22, z: -144 };
const SLED = { x: 12, z: -140 };
const CAVE = { x: -37, z: -145 };

defineRegion({
  id: 'montagne', bounds: B, mapColor: '#e6eef3',
  veg: { biome: 'mountain', density: 1, rect: { minX: -42, maxX: 32, minZ: -150, maxZ: -84 } },
  walk: [{ minX: -6.6, maxX: -1.4, minZ: -86, maxZ: -78 }, { minX: -41, maxX: 31, minZ: -149, maxZ: -84 }],
  unlock: () => totalDone() >= 40, need: needTotal(40),
  spawn: new THREE.Vector3(-4, 0, -88), spawnYaw: Math.PI, gatePos: new THREE.Vector3(-4, 0, -81),
  mood: { bg: '#e3ecf3', fog: '#dde7ee', near: 30, far: 80, sun: '#fff6ec', sky: '#e6f0ff', ground: '#9aa8b8', life: .25, music: 'montagne' },
  goals: [
    { id: 'badge' }, { id: 'clim' }, { id: 'robot3' }, { id: 'luge' }, { id: 'bonhomme' }, { id: 'hurler' }, { id: 'sommetMont' }, { id: 'marmotte' },
    { id: 'yeti', secret: true },
  ],
  i18n: {
    fr: {
      goals: { badge: "Ouvrir le datacenter avec le badge du vigile", clim: "Couper la clim des serveurs", robot3: "Discuter trois fois avec l'IA du datacenter", luge: "Descendre la piste en luge",
        bonhomme: "Renverser le bonhomme de neige", hurler: "Hurler face aux sommets depuis le belvédère", sommetMont: "Atteindre le belvédère tout en haut", marmotte: "Surprendre une marmotte", yeti: "Rencontrer le yéti (qui n'existe pas)" },
      hints: { badge: "Le vigile a posé son badge sur son bureau, devant l'entrée. Apporte-le à la porte.", clim: "Le gros climatiseur est dans le datacenter. Appuie sur E.", robot3: "Le robot est dans le datacenter. Glapis près de lui, plusieurs fois.",
        luge: "La luge attend en haut de la piste, au nord-est. Appuie sur E.", bonhomme: "Le bonhomme de neige est près du téléphérique. Fonce (Maj).", hurler: "Le belvédère est tout au nord-est. Glapis là-haut.",
        sommetMont: "Suis le chemin enneigé vers le nord-est.", marmotte: "Les marmottes sortent de leurs trous à l'ouest. Approche en te faufilant (C)." },
      L: { vigile: { chase: ["Mon badge !", "Accès refusé, le renard !", "Sécurité !"], idle: ["Accès réservé au personnel.", "Les données restent en France.", "Badge, s'il vous plaît."] },
        tech: { chase: ["Hé !"], idle: ["Température nominale.", "On migre ce week-end.", "Qui a touché à la clim ?"] } },
      search: { badge: "Où est mon badge ?" },
      dest: { porte: "Porte" },
      eggs: { dc: "Datacenter « Cloud souverain » : hébergé en France, refroidi à l'air de la montagne.", racks: "Des baies de serveurs qui clignotent. Ça ronronne comme un chat.", cable: "Le téléphérique monte vers les sommets. Les renards voyagent gratuitement.", belv: "Vue sur les sommets. Au loin, on devine la mer." },
      signs: { montagne: "Montagne ↑", dc: "Cloud souverain", belv: "Belvédère" },
      cards: { montagne: "Bons baisers de la montagne ! Le datacenter a eu chaud, la luge a filé, et le yéti dit qu'il n'existe pas. On le croit." },
      doorOpen: "Bip ! Accès autorisé.", clim: "ALERTE : 32 °C en salle serveurs !", robot: ["Bip. Je suis l'IA du datacenter. Mes données ne quittent pas la France.", "Bip bip. Le monsieur du terrier construit des outils avec des IA comme moi.", "Bip. Conseil d'IA : pour en savoir plus sur lui, va voir son profil LinkedIn. Fin de transmission."],
      sled: "Wiiiiiiii !", howl: ["Yaaaap…", "…aaap…", "…ap…"], top: "Le renard contemple les sommets.", marmot: "La marmotte siffle et file dans son trou !", yeti: "Chut… je n'existe pas.", snowman: "Le bonhomme de neige perd la tête.", rocks: "Des rochers bloquent le chemin de la montagne.",
    },
    en: {
      goals: { badge: "Open the data center with the guard's badge", clim: "Switch off the server cooling", robot3: "Chat three times with the data center AI", luge: "Sled down the slope",
        bonhomme: "Knock over the snowman", hurler: "Howl at the peaks from the lookout", sommetMont: "Reach the lookout at the top", marmotte: "Surprise a marmot", yeti: "Meet the yeti (who doesn't exist)" },
      hints: { badge: "The guard left his badge on his desk by the entrance. Bring it to the door.", clim: "The big cooling unit is inside the data center. Press E.", robot3: "The robot is in the data center. Yap near it, several times.",
        luge: "The sled waits at the top of the slope, to the north-east. Press E.", bonhomme: "The snowman stands by the cable car. Charge (Shift).", hurler: "The lookout is far to the north-east. Yap up there.",
        sommetMont: "Follow the snowy path to the north-east.", marmotte: "Marmots pop out of their holes to the west. Sneak up (C)." },
      L: { vigile: { chase: ["My badge!", "Access denied, fox!", "Security!"], idle: ["Staff only.", "Data stays in France.", "Badge, please."] },
        tech: { chase: ["Hey!"], idle: ["Temperature nominal.", "We migrate this weekend.", "Who touched the cooling?"] } },
      search: { badge: "Where's my badge?" },
      dest: { porte: "Door" },
      eggs: { dc: "\"Sovereign cloud\" data center: hosted in France, cooled by mountain air.", racks: "Server racks blinking away. They purr like a cat.", cable: "The cable car climbs to the peaks. Foxes ride for free.", belv: "A view of the peaks. Far away, you can just make out the sea." },
      signs: { montagne: "Mountain ↑", dc: "Sovereign cloud", belv: "Lookout" },
      cards: { montagne: "Greetings from the mountain! The data center overheated, the sled flew, and the yeti says it doesn't exist. We believe it." },
      doorOpen: "Beep! Access granted.", clim: "ALERT: 32 °C in the server room!", robot: ["Beep. I am the data center AI. My data never leaves France.", "Beep beep. The guy from the den builds tools with AIs like me.", "Beep. AI tip: to learn more about him, check his LinkedIn profile. End of transmission."],
      sled: "Wheeeeee!", howl: ["Yaaaap…", "…aaap…", "…ap…"], top: "The fox gazes at the peaks.", marmot: "The marmot whistles and dives into its hole!", yeti: "Shh… I don't exist.", snowman: "The snowman loses its head.", rocks: "Rocks block the mountain path.",
    },
  },
  build(W) {
    const { box, cyl, sph, cone, solidCircle } = W;
    W.patch(80, 74, '#eef3f6', -5, -117); W.mottle(B, ['#e3eaef', '#f6f8fa', '#dde5ea', '#d3dde6'], 22);
    // Neige jusqu'au pied des sommets (derrière les rochers du fond et sur les côtés) : plus de prairie verte entre la neige et la roche
    W.patch(150, 44, '#e6ecf1', -2, -172, { noVeg: true }); W.patch(30, 80, '#e6ecf1', -60, -122, { noVeg: true }); W.patch(30, 80, '#e6ecf1', 50, -120, { noVeg: true });
    // Sentiers damés qui serpentent : entrée → belvédère (à l'est de la piste de luge), embranchements vers le datacenter et le chalet
    const trail = [
      ...W.path([[-4, -79.4], [-4.3, -82], [-3.6, -86], [-4, -90], [-1.5, -98], [3.5, -104], [9, -110], [14, -118], [17.5, -127], [19.5, -135], [21.5, -140.5]], 2.8, { style: 'snow', fade: [true, true], pebbles: false, seed: 61 }),
      ...W.path([[-2.2, -96], [-7.5, -102], [-12.5, -106.5], [-17.5, -109.4]], 2.3, { style: 'snow', fade: [false, false], pebbles: false, seed: 62 }),
      ...W.path([[4.5, -105], [8.5, -103.2], [11.6, -103.6]], 1.8, { style: 'snow', fade: [false, true], pebbles: false, seed: 63 }),
      ...W.path([[12, -139.5], [9.5, -129], [7, -120], [4.5, -110], [2.2, -100.5]], 2, { style: 'snow', fade: [true, true], pebbles: false, seed: 64 }),   // piste de luge
    ];
    // Sommets en toile de fond : massifs à plusieurs pics, bandes de roche, neiges éternelles
    const peak = (x, z, r, h, k = 0) => {
      const rock = ['#8e98a3', '#7f8a96', '#97a1ab'][k % 3];
      const c = cone(r, h, rock, x, h / 2, z, 8); c.rotation.y = k;
      cone(r * .5, h * .46, '#f4f7fa', x, h * .77, z, 8, undefined, false).rotation.y = k;
      for (let i = 0; i < 3; i++) { const a = k + i * 2.1, sr = cone(r * .18, h * .3, '#eef3f6', x + Math.cos(a) * r * .32, h * .5, z + Math.sin(a) * r * .32, 5, undefined, false); sr.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); }
    };
    [[-40, -168, 16, 26], [-22, -175, 20, 34], [-2, -170, 15, 24], [16, -178, 22, 38], [36, -168, 15, 25], [-56, -158, 13, 20], [52, -156, 12, 19]].forEach(([x, z, r, h], k) => { peak(x, z, r, h, k); peak(x + r * .7, z - 4, r * .62, h * .7, k + 3); });
    [[-58, -122, 10, 14], [-58, -100, 8, 11], [48, -118, 9, 13], [48, -96, 8, 10]].forEach(([x, z, r, h], k) => peak(x, z, r, h, k + 5));
    // Lisières : sapins enneigés v2, rochers enneigés au fond, congères
    treeLine(-42, -84, -7, -84, 3, (x, z, i) => snowPine(x, z, rnd(1, 1.3), i)); treeLine(-1, -84, 31, -84, 3, (x, z, i) => snowPine(x, z, rnd(1, 1.3), i + 9));
    treeLine(-42.5, -86, -42.5, -149, 3, (x, z, i) => snowPine(x, z, 1.15 + hash(i) * .2, i)); treeLine(32, -86, 32, -149, 3, (x, z, i) => snowPine(x, z, 1.15 + hash(i * 3) * .2, i + 4));
    treeLine(-42, -150.5, 31, -150.5, 3.2, (x, z, i) => snowRock(x, z, 1.3 + hash(i) * .9));
    const LAKE = { x: -34, z: -114 };
    const avoidM = [{ minX: DC.x - 12, maxX: DC.x + 12, minZ: DC.z - 9, maxZ: DC.z + 12 }, { minX: -8, maxX: 0, minZ: -100, maxZ: -84 }, { x: BELV.x, z: BELV.z, r: 6 }, { x: SLED.x, z: SLED.z, r: 4 }, { x: CAVE.x, z: CAVE.z, r: 6 }, { x: -32, z: -100, r: 6 }, { x: 14, z: -104, r: 4.5 }, { x: LAKE.x, z: LAKE.z, r: 6.5 }, { x: 7, z: -96, r: 2.5 }, { x: 2, z: -92, r: 3 }, { x: 24, z: -128, r: 3 }, ...trail];
    scatter({ minX: -40, maxX: 30, minZ: -147, maxZ: -88 }, 34, (x, z, i) => snowPine(x, z, rnd(.9, 1.3), i), avoidM);
    scatter({ minX: -40, maxX: 30, minZ: -147, maxZ: -88 }, 12, (x, z, i) => { snowRock(x, z, .7 + hash(i) * .6); if (i % 2) snowRock(x + .9, z + .5, .45, false); }, avoidM);
    scatter({ minX: -41, maxX: 31, minZ: -148, maxZ: -86 }, 16, (x, z, i) => mound(x, z, 4 + hash(i) * 4, 2.6 + hash(i * 3) * 2.4, .5 + hash(i * 7) * .45, '#f4f7fa', hash(i * 5) * 3), avoidM);
    // Lac gelé (glace, bord de neige, fissures)
    { W.disc(4.2, '#f4f7fa', LAKE.x, LAKE.z, .028, 1.35, 1); W.disc(3.6, '#cfe6ef', LAKE.x, LAKE.z, .032, 1.35, 1); W.disc(1.4, '#e2f1f6', LAKE.x + 1.2, LAKE.z - .8, .034, 1.6, .7);
      for (let i = 0; i < 5; i++) { const a = i * 1.3, l = box(1.6 + hash(i) * 1.2, .01, .04, '#f6fbfd', LAKE.x + Math.cos(a) * 1.3, .036, LAKE.z + Math.sin(a) * .9, undefined, false); l.rotation.y = a + .6; }
      W.R.noVeg.push({ x: LAKE.x, z: LAKE.z, r: 5.4 }); }
    W.sign(-7, -89, 'montagne', 0, 2); W.sign(-6.4, -99.5, 'dc', -.5, 2);
    // Éboulement (barrière)
    const rocks = new THREE.Group(); [[-1.6, 0, 1.1], [.4, .3, 1.4], [2, 0, 1], [-.2, 1.2, .9]].forEach(([x, y, s]) => { const r = sph(s, '#8d877c', x, y + s * .5, 0, rocks, 0); r.scale.set(1, .8, .9); });
    rocks.position.set(-4, 0, -81.5); W.dyn(rocks); W.gate(rocks, 'sink', 3.2);
    // Datacenter
    { const { x, z, w, d } = DC; const g = new THREE.Group(); g.position.set(x, 0, z); W.R.group.add(g);
      const wall = (cx, cz, ww, dd) => { box(ww, 3.2, dd, '#e9eef2', cx, 1.6, cz, g); box(ww + .02, .12, dd + .02, '#24427a', cx, 3.25, cz, g, false); };
      wall(0, -d / 2, w, .4); wall(-w / 2, 0, .4, d); wall(w / 2, 0, .4, d); wall(-w / 4 - .8, d / 2, w / 2 - 1.6, .4); wall(w / 4 + .8, d / 2, w / 2 - 1.6, .4);
      SB(x, z - d / 2, w, .4, 3.2); SB(x - w / 2, z, .4, d, 3.2); SB(x + w / 2, z, .4, d, 3.2); SB(x - w / 4 - .8, z + d / 2, w / 2 - 1.6, .4, 3.2); SB(x + w / 4 + .8, z + d / 2, w / 2 - 1.6, .4, 3.2);
      W.ground(w - .4, d - .4, '#c9d3dc', x, z, .03);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const rx = x - 6 + c * 2.6, rz = z - 3.4 + r * 2.6; box(1.4, 2.3, .9, '#2b3138', rx, 1.15, rz); box(1.2, .05, .05, '#58e07a', rx, 1.8, rz + .46, undefined, false); box(1.2, .05, .05, '#58e07a', rx, 1, rz + .46, undefined, false); SB(rx, rz, 1.4, .9, 2.3); }
      // chemins de câbles jaunes posés sur les rangées de baies (au lieu de plaques qui flottaient en l'air)
      for (let r = 0; r < 3; r++) { const rz = z - 3.4 + r * 2.6; box(11.9, .07, .34, '#e8c34a', x - .8, 2.34, rz, undefined, false); for (let c = 0; c < 5; c++) box(.05, .12, .3, '#c9a33d', x - 6 + c * 2.6, 2.4, rz, undefined, false); }
      // neige sur les murs, antenne et parabole
      box(w + .3, .14, .6, '#f4f7fa', 0, 3.38, -d / 2, g, false); box(.6, .14, d + .3, '#f4f7fa', -w / 2, 3.38, 0, g, false); box(.6, .14, d + .3, '#f4f7fa', w / 2, 3.38, 0, g, false);
      cyl(.05, .07, 3, '#9aa3ad', w / 2 - .4, 4.8, -d / 2 + .4, 5, g); const dish = sph(.6, '#e9eef2', -w / 2 + 1, 3.9, -d / 2 + .5, g, 1); dish.scale.set(1, .35, 1); dish.rotation.x = -.8; }
    { const tx = textTex(512, 128, (g, w, h) => { g.fillStyle = '#24427a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6f2e8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 52px "Baloo 2",sans-serif'; g.fillText((t().signs?.dc || '').toUpperCase(), w / 2, h / 2 + 3); });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: tx })); p.position.set(DC.x, 4.2, DC.z + DC.d / 2 + .25); W.R.group.add(p); box(6.2, 1.7, .3, '#1f2a44', DC.x, 4.2, DC.z + DC.d / 2 + .05, undefined, false); }
    W.egg('dc', DC.x + 5, DOOR.z + 2.4, 3, 2); W.egg('racks', DC.x - 3, DC.z - 1, 2.6, 1.6);
    const doorObs = SB(DOOR.x, DOOR.z, 3.2, .4, 3);
    const door = W.dyn((() => { const g = new THREE.Group(); box(3.2, 2.8, .2, '#5d8fb0', 0, 1.4, 0, g); box(.2, .2, .05, '#58e07a', 1.2, 1.4, .12, g, false); return g; })());
    door.position.set(DOOR.x, 0, DOOR.z); let doorK = 0;
    const openDoor = (show = true) => { if (doorObs.off) return; removeObstacle(doorObs); refreshNav(W.R.nav); doorK = show ? .001 : 1; };
    // Vigile, badge, technicien
    box(1.6, .9, .8, '#c9a982', DOOR.x + 4, .45, DOOR.z + 3); W.solidBox(DOOR.x + 4, DOOR.z + 3, 1.6, .8, .9);
    const guard = W.npc({ id: 'vigile', x: DOOR.x + 4, z: DOOR.z + 4.2, yaw: Math.PI, shirt: '#2f3640', pants: '#2f3640', hair: '#2f2a24', hat: 'kepi', hatColor: '#2f3640',
      route: [{ p: new THREE.Vector3(DOOR.x + 4, 0, DOOR.z + 4.2), wait: 5, act: 'type', yaw: Math.PI }, { p: new THREE.Vector3(DOOR.x + 1.6, 0, DOOR.z + 2.2), wait: 3, act: 'look', yaw: Math.PI }] });
    const badge = W.item({ kind: 'badge', x: DOOR.x + 4.4, z: DOOR.z + 3, y: .96, owner: guard, sh: .2, bring: new THREE.Vector3(DOOR.x + 4.4, 0, DOOR.z + 3.9),
      build: () => { const g = new THREE.Group(); box(.3, .02, .2, '#f6f2e8', 0, 0, 0, g); box(.1, .021, .1, '#24427a', -.07, .001, 0, g, false); return g; } });
    W.place(it => { if (it === badge && flat2(it.pos, DOOR) < 2.4) { W.SFX.coin(); W.say({ anchor: new THREE.Vector3(DOOR.x, 3.4, DOOR.z) }, t().doorOpen, '', 2, 0, 'door'); openDoor(); W.complete('badge'); it.pos.set(DOOR.x + 1.9, .04, DOOR.z + 1); giveUp(it); return true; } return false; });
    W.dest(it => it === badge && !W.done('badge') ? { key: 'porte', pos: new THREE.Vector3(DOOR.x, 0, DOOR.z + 1), r: 1.2 } : null);
    W.zone(new THREE.Vector3(DOOR.x, 0, DOOR.z + .6), 1.4, () => { if (fox.held === badge) { W.SFX.coin(); W.say({ anchor: new THREE.Vector3(DOOR.x, 3.4, DOOR.z) }, t().doorOpen, '', 2, 0, 'door'); openDoor(); W.complete('badge'); } });
    W.npc({ id: 'tech', x: DC.x + 5, z: DC.z + 3.4, yaw: 0, shirt: '#5d8a8a', pants: '#2b3448', hair: '#c9a33d',
      route: [{ p: new THREE.Vector3(DC.x + 5, 0, DC.z + 3.6), wait: 4, act: 'type', yaw: Math.PI }, { p: new THREE.Vector3(DC.x - 5, 0, DC.z + 3.6), wait: 4, act: 'check', yaw: Math.PI }] });
    // Clim (ventilateurs) + alarme
    box(2.4, 2.2, 1.2, '#c9cdd3', DC.x + 7.6, 1.1, DC.z - 4.4); W.solidBox(DC.x + 7.6, DC.z - 4.4, 2.4, 1.2, 2.2);
    const fans = new THREE.Group(); const fanParts = [-.55, .55].map(x => { const f = new THREE.Group(); f.position.set(x, 1.4, .62); fans.add(f); box(.8, .08, .04, '#5d6670', 0, 0, 0, f, false); box(.08, .8, .04, '#5d6670', 0, 0, 0, f, false); return f; });
    fans.position.set(DC.x + 7.6, 0, DC.z - 4.4); W.rig(fans, fanParts); let climOff = 0;
    W.interact({ x: DC.x + 7.6, y: 2.4, z: DC.z - 3.2 }, 1.4, () => { climOff = 12; W.SFX.alarm(); W.say({ anchor: new THREE.Vector3(DC.x, 4.4, DC.z) }, t().clim, 'alarm', 2.6, 0, 'clim'); W.complete('clim'); }, () => climOff <= 0);
    // Robot IA
    const robot = new THREE.Group(); { const hd = new THREE.Group(); hd.position.y = 1.5; robot.add(hd); cyl(.4, .5, 1.1, '#c9cdd3', 0, .55, 0, 8, robot); box(.7, .5, .5, '#e9eef2', 0, 0, 0, hd); box(.5, .14, .05, '#58c0e0', 0, .02, .26, hd, false); cyl(.02, .02, .4, '#5d6670', 0, .4, 0, 4, hd, false); sph(.07, '#e8742a', 0, .62, 0, hd, 0, false); robot.userData.hd = hd; W.rig(robot, [robot, hd]); }
    robot.position.set(DC.x - 6, 0, DC.z + 3.6); solidCircle(DC.x - 6, DC.z + 3.6, .5, 1.5);
    W.yap(new THREE.Vector3(DC.x - 6, 0, DC.z + 3.6), 3, () => { const k = W.talk('robot'); W.SFX.coin(); W.say({ anchor: new THREE.Vector3(DC.x - 6, 2.6, DC.z + 3.6) }, t().robot[Math.min(2, k - 1)], '', 3.4, 0, 'robot'); if (k >= 3) W.complete('robot3'); });
    // Téléphérique (décor animé), bonhomme de neige
    [[2, -92], [24, -128]].forEach(([x, z]) => {
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const lg = box(.14, 7.2, .14, '#5d6670', x + a * .45, 3.5, z + b * .45); lg.rotation.set(-b * .07, 0, a * .07); }
      for (let i = 0; i < 4; i++) { const y = 1.2 + i * 1.6, wd = 1.05 - i * .1; box(wd, .08, .08, '#6d7880', x, y, z - wd / 2 + .02, undefined, false); box(wd, .08, .08, '#6d7880', x, y, z + wd / 2 - .02, undefined, false); box(.08, .08, wd, '#6d7880', x - wd / 2 + .02, y, z, undefined, false); box(.08, .08, wd, '#6d7880', x + wd / 2 - .02, y, z, undefined, false); }
      box(2.2, .3, .7, '#5d6670', x, 7.1, z); cyl(.3, .3, .2, '#2f2a24', x, 7.35, z, 10, undefined, false); solidCircle(x, z, .6, 7);
    });
    { const a = new THREE.Vector3(2, 7.3, -92), b = new THREE.Vector3(24, 7.3, -128), mid = a.clone().lerp(b, .5), d = b.clone().sub(a);
      const cb = cyl(.035, .035, d.length(), '#2f2a24', mid.x, mid.y, mid.z, 4, undefined, false); cb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
    const cabins = [0, 1].map(() => W.dyn((() => { const g = new THREE.Group(); box(1.4, 1.2, 1.4, '#d6402f', 0, -1.2, 0, g); box(1.2, .5, 1.42, '#8fc9df', 0, -1, 0, g, false); cyl(.03, .03, .8, '#2f2a24', 0, -.3, 0, 4, g, false); return g; })()));
    W.egg('cable', 4, -94, 3, 2);
    W.pushable(7, -96, () => { const g = new THREE.Group(); sph(.6, '#f6f8fa', 0, .5, 0, g, 1); sph(.42, '#f6f8fa', 0, 1.3, 0, g, 1); sph(.3, '#f6f8fa', 0, 1.9, 0, g, 1); cone(.06, .3, '#e8742a', 0, 1.9, .3, 4, g, false).rotation.x = Math.PI / 2; cyl(.2, .22, .3, '#2f2a24', 0, 2.25, 0, 8, g, false); return g; }, { goal: 'bonhomme', r: .65, onKnock: () => W.say(fox, t().snowman, '', 1.8, 2) });
    // Marmottes
    const holes = [[-32, -100], [-28, -96], [-35, -95]].map(([x, z]) => { W.disc(.4, '#5a4636', x, z, .03); const m = W.dyn((() => { const g = new THREE.Group(); const b = sph(.25, '#a8764a', 0, .25, 0, g, 1); b.scale.set(.9, 1.3, .9); sph(.15, '#a8764a', 0, .6, .05, g, 1); return g; })()); m.position.set(x, -.6, z); return { x, z, m, up: 0, t: rnd(0, 4) }; });
    // Luge, belvédère, grotte du yéti
    const sled = W.dyn((() => { const g = new THREE.Group(); box(.7, .1, 1.4, '#d6402f', 0, .3, 0, g); [-.3, .3].forEach(x => box(.05, .2, 1.5, '#8a5a3b', x, .12, 0, g, false)); return g; })());
    sled.position.set(SLED.x, 0, SLED.z);
    const SL = { t: -1 };
    W.interact({ x: SLED.x, y: .8, z: SLED.z }, 1.4, () => { SL.t = 0; W.say(fox, t().sled, '', 2, 2); }, () => SL.t < 0 && !fox.held);
    { cyl(.06, .06, 3, '#d9d4c8', BELV.x + 2, 1.5, BELV.z, 4); box(.9, .5, .03, '#d6402f', BELV.x + 2.45, 2.7, BELV.z, undefined, false); for (let i = 0; i < 5; i++) box(.1, .8, .1, '#8a5a3b', BELV.x - 2 + i, .4, BELV.z - 2.6); box(4.4, .08, .08, '#8a5a3b', BELV.x, .7, BELV.z - 2.6); }
    W.sign(BELV.x - 3, BELV.z + 3, 'belv', .4, 2); W.egg('belv', BELV.x, BELV.z - 1, 2.4, 1.6);
    W.zone(new THREE.Vector3(BELV.x, 0, BELV.z), 3, () => { W.say(fox, t().top, '', 2, 2); W.complete('sommetMont'); });
    W.yap(new THREE.Vector3(BELV.x, 0, BELV.z), 4, () => { t().howl.forEach((l, i) => setTimeout(() => W.say({ anchor: new THREE.Vector3(BELV.x - 4 - i * 3, 6 + i, BELV.z - 8) }, l, 'note', 1.3, 0, 'howl' + i), 300 + i * 450)); setTimeout(() => W.complete('hurler'), 1400); });
    rock(CAVE.x + 3, CAVE.z, 2.2, '#b9c3cc'); rock(CAVE.x - 1, CAVE.z - 2.6, 2.6, '#b9c3cc');
    { const arch = sph(3, '#cfd8e0', CAVE.x, 0, CAVE.z - 1.4); arch.scale.set(1, .9, .7); const hole = new THREE.Mesh(new THREE.CircleGeometry(1.3, 12), new THREE.MeshBasicMaterial({ color: '#2a3440' })); hole.position.set(CAVE.x, 1.1, CAVE.z + .7); W.R.group.add(hole); }
    const yeti = W.dyn((() => { const g = new THREE.Group(); const b = sph(.9, '#f6f8fa', 0, 1.4, 0, g, 1); b.scale.set(1, 1.3, .9); sph(.55, '#f6f8fa', 0, 2.7, .1, g, 1); box(.5, .2, .1, '#8fa9c0', 0, 2.65, .58, g, false); [-1, 1].forEach(s => { const a = cyl(.22, .2, 1.3, '#f6f8fa', s * .95, 1.6, 0, 6, g); a.rotation.z = s * .4; }); return g; })());
    yeti.position.set(CAVE.x, 0, CAVE.z + .4); yeti.visible = false; yeti.userData.gone = true; let yetiT = 0;
    W.zone(new THREE.Vector3(CAVE.x, 0, CAVE.z + 2.6), 1.6, () => { yetiT = 5; yeti.userData.gone = false; yeti.visible = true; W.say({ anchor: new THREE.Vector3(CAVE.x, 4.2, CAVE.z + .4) }, t().yeti, '', 3, 0, 'yeti'); W.complete('yeti'); }, { cond: () => fox.idle > 5 && fox.sneaking === false });
    surfaceHooks.push(p => inRect(p, B) ? (inRect(p, { minX: DC.x - DC.w / 2, maxX: DC.x + DC.w / 2, minZ: DC.z - DC.d / 2, maxZ: DC.z + DC.d / 2 }) ? 'tile' : 'snow') : null);
    W.postcard(-40, -148);
    const msh = blob(.4);
    W.update(dt => {
      const now = performance.now() / 1000;
      if (doorK > 0 && doorK < 1) doorK = Math.min(1, doorK + dt); if (doorK > 0) door.position.x = DOOR.x + 3.2 * (1 - Math.pow(1 - doorK, 3));
      if (climOff > 0) { climOff -= dt; if (Math.random() < dt * 3) W.emit(new THREE.Vector3(DC.x + rnd(-6, 6), 3.6, DC.z + rnd(-4, 4)), '#ff8a5a', { n: 1, spd: .3, up: 1.4, life: 1.2, grav: -1 }); } else fanParts.forEach(f => { f.rotation.z += dt * 12; });
      robot.userData.hd.rotation.y = Math.sin(now * .8) * .7;
      const cl = (now * .03) % 1; cabins.forEach((c, i) => { const k = (cl + i * .5) % 1, u = k < .5 ? k * 2 : 2 - k * 2; c.position.set(2 + u * 22, 6.8 + u * 0, -92 - u * 36); });
      // Marmottes : sortent, regardent, rentrent si on court
      for (const h of holes) { h.t += dt; const d = Math.hypot(fox.pos.x - h.x, fox.pos.z - h.z), spooked = d < 6 && !fox.sneaking && Math.hypot(fox.vel.x, fox.vel.z) > .5; const want = spooked ? 0 : (Math.sin(h.t * .6) > -.2 ? 1 : 0); h.up += (want - h.up) * Math.min(1, dt * (spooked ? 12 : 3)); h.m.position.y = -.6 + h.up * .6; h.m.rotation.y = Math.atan2(fox.pos.x - h.x, fox.pos.z - h.z); if (d < 2 && fox.sneaking && h.up > .6 && !W.done('marmotte')) { h.up = 0; W.SFX.whistle(); W.say(fox, t().marmot, '', 2, 2); W.complete('marmotte'); } }
      // Luge : descente le long de la pente
      if (SL.t >= 0) { SL.t += dt; const k = Math.min(1, SL.t / 4); const x = SLED.x - 10 * k, z = SLED.z + 40 * k; fox.pos.set(x, 0, z); fox.vel.set(0, 0, 0); fox.yaw = Math.PI * 0 + .25; fox.lift = .25; sled.position.set(x, 0, z); sled.rotation.y = -.25; msh.position.set(x, .03, z); if (Math.random() < dt * 30) W.emit(new THREE.Vector3(x, .2, z - .8), '#ffffff', { n: 2, spd: 1, up: 1.2, life: .6 }); if (k >= 1) { SL.t = -1; fox.lift = 0; W.complete('luge'); setTimeout(() => { sled.position.set(SLED.x, 0, SLED.z); sled.rotation.y = 0; }, 2500); } }
      msh.visible = SL.t >= 0;
      if (yetiT > 0) { yetiT -= dt; yeti.rotation.y = Math.sin(now * 3) * .3; if (yetiT <= 0) { yeti.visible = false; yeti.userData.gone = true; } }
      if (Math.random() < dt * 4) W.emit(new THREE.Vector3(fox.pos.x + rnd(-14, 14), 8, fox.pos.z + rnd(-10, 10)), '#ffffff', { n: 1, spd: .3, up: 0, life: 4, grav: 1.6, size: .7 });
    });
    // Chalets fumants
    chalet(14, -104, -.4); chalet(-33, -128, .5);

    return { open() {}, restore() { if (W.done('badge')) { openDoor(false); badge.pos.set(DOOR.x + 1.9, .04, DOOR.z + 1); } } };
  },
});
