/* =====================================================================
   L'île secrète (fin de l'aventure, en bateau depuis la plage) : palmiers, hamac,
   cocotier, couronne du renard, feu de joie, et le coffre final.
   S'ouvre quand 60 bêtises sont faites et que toutes les autres régions ont été visitées.
   ===================================================================== */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { TX } from '../engine.js';
import { fox } from '../fox.js';
import { showCard } from '../hud.js';
import { REGIONS, RG, defineRegion, teleport, totalDone } from '../regions.js';
import { GOALS, S, run, rnd, t } from '../state.js';
import { boat, building, palm, rock } from './kit.js';
import { addCrabs } from '../fauna.js';

const B = { minX: 18, maxX: 74, minZ: 120, maxZ: 170 };
const C = { x: 46, z: 146 };
const visitedAll = () => REGIONS.every(R => R.id === 'ile' || R.hidden || run.discovered.includes(R.id));

defineRegion({
  id: 'ile', bounds: B, mapColor: '#f6d98a',
  veg: { biome: 'tropical', density: 1, rect: { minX: 31, maxX: 61, minZ: 134, maxZ: 160 } },
  walk: [{ minX: 26, maxX: 66, minZ: 128, maxZ: 164 }],
  unlock: () => totalDone() >= 60 && visitedAll(), need: () => totalDone() < 60 ? t().needTasks(60 - totalDone()) : t().needVisit,
  spawn: new THREE.Vector3(46, 0, 130), spawnYaw: 0,
  mood: { bg: '#d6eef4', fog: '#d2eaf0', near: 46, far: 110, sun: '#fff0c8', sky: '#e8f8ff', ground: '#7aa88a', life: 1.2, music: 'ile' },
  goals: [{ id: 'couronne' }, { id: 'hamac' }, { id: 'noix' }, { id: 'feuJoie' }, { id: 'coffreFinal' }, { id: 'crabes', need: 6 }, { id: 'message', secret: true }],
  i18n: {
    fr: {
      goals: { crabes: "Renvoyer les six crabes à la mer", couronne: "Trouver la couronne du roi des renards", hamac: "Faire la sieste dans le hamac", noix: "Faire tomber une noix de coco", feuJoie: "Allumer le feu de joie (en glapissant)", coffreFinal: "Ouvrir le coffre au trésor final", message: "Retrouver la bouteille jetée à la rivière" },
      hints: { crabes: "Ils se promènent de côté sur le sable, tout autour de l'île. Approche-toi d'eux, un par un.", couronne: "Elle brille quelque part au nord de l'île.", hamac: "Le hamac est entre deux palmiers. Reste immobile dedans.", noix: "Un grand cocotier, au centre. Fonce dans son tronc (Maj).", feuJoie: "Le bûcher est sur la plage ouest. Glapis à côté.", coffreFinal: "Le coffre est au milieu de l'île. Appuie sur E." },
      needVisit: "visiter toutes les régions", signs: { retour: "← Retour plage" },
      eggs: { hut: "La cabane de vacances du renard. Il y a un hamac, c'est tout ce qui compte.", statue: "Un gland doré géant. Personne ne sait qui l'a posé là." },
      cards: { ile: "Bons baisers de l'île secrète ! Il n'y a personne ici, à part un renard très fier de lui." },
      crown: "Le renard porte la couronne. Il ne la quittera plus.", nap: "zzz… Le renard fait la sieste du siècle.", coconut: "Bonk !", fire: "Le feu de joie s'allume !", bottle: "La bouteille de la rivière ! Elle a fait tout ce chemin.", back: "Retour vers la plage…",
      finalTitle: "Le roi des renards", finalText: (d, n) => `Le coffre contient… une petite carte : « Merci d'avoir joué jusqu'ici ! » Tu as fait <b>${d}</b> bêtises sur <b>${n}</b>. Le renard, c'est Pierre Logre : pour suivre ce qu'il fait (en vrai), c'est sur <a href="${CONFIG.linkedin}" target="_blank" rel="noopener">LinkedIn</a>.`,
    },
    en: {
      goals: { crabes: "Send all six crabs back to the sea", couronne: "Find the fox king's crown", hamac: "Take a nap in the hammock", noix: "Knock down a coconut", feuJoie: "Light the bonfire (by yapping)", coffreFinal: "Open the final treasure chest", message: "Find the bottle thrown into the river" },
      hints: { crabes: "They scuttle sideways on the sand all around the island. Walk up to them, one by one.", couronne: "It shines somewhere in the north of the island.", hamac: "The hammock hangs between two palm trees. Stay still in it.", noix: "A tall coconut palm in the middle. Charge its trunk (Shift).", feuJoie: "The bonfire is on the west beach. Yap next to it.", coffreFinal: "The chest is in the middle of the island. Press E." },
      needVisit: "visit every area", signs: { retour: "← Back to the beach" },
      eggs: { hut: "The fox's holiday hut. There's a hammock, and that's all that matters.", statue: "A giant golden acorn. Nobody knows who put it there." },
      cards: { ile: "Greetings from the secret island! Nobody here except a fox who is very proud of itself." },
      crown: "The fox wears the crown. It will never take it off.", nap: "zzz… The fox takes the nap of the century.", coconut: "Bonk!", fire: "The bonfire lights up!", bottle: "The bottle from the river! It came all this way.", back: "Back to the beach…",
      finalTitle: "The fox king", finalText: (d, n) => `The chest holds… a little card: "Thanks for playing this far!" You did <b>${d}</b> of <b>${n}</b> mischiefs. The fox is Pierre Logre: to follow what he does (for real), head to <a href="${CONFIG.linkedin}" target="_blank" rel="noopener">LinkedIn</a>.`,
    },
  },
  build(W) {
    const { box, cyl, sph, cone, solidCircle } = W;
    // Mer autour, sable, palmiers
    const sea = new THREE.MeshLambertMaterial({ color: '#ffffff', map: TX.water.clone(), transparent: true, opacity: .95 }); sea.map.repeat.set(12, 12); sea.map.needsUpdate = true;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), sea); water.rotation.x = -Math.PI / 2; water.position.set(C.x, .05, C.z); W.dyn(water, false);
    // Île aux contours irréguliers : sable mouillé, sable sec, prairie ; écume qui respire autour
    W.patch(50, 43, '#d9c18e', C.x, C.z, { y: .07, round: 1, jitter: .9 }); W.patch(46.5, 39.5, '#efdcaa', C.x, C.z, { y: .08, round: 1, jitter: 1.1 });
    W.patch(31, 25, '#8fbf6a', C.x, C.z + 2, { y: .09, round: 1, jitter: 1.4 }); W.mottle({ minX: 33, maxX: 59, minZ: 137, maxZ: 157 }, ['#86b862', '#9cc876', '#82b05e'], 6);
    const foamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .5, depthWrite: false });
    const foam = new THREE.Mesh(new THREE.RingGeometry(24.4, 26.2, 48), foamMat); foam.rotation.x = -Math.PI / 2; foam.scale.set(1, .86, 1); foam.position.set(C.x, .065, C.z); W.dyn(foam, false);
    [[30, 136, 1.1, .3], [62, 138, 1, -.3], [34, 158, 1.2, .25], [60, 156, 1, -.2], [40, 132, .9, .1], [55, 162, .9, .2], [27, 147, .95, .35], [65, 148, 1, .3]].forEach(([x, z, sc, l], i) => palm(x, z, sc, Math.abs(l) + .1, i + 1));
    const cocoTop = palm(C.x + 4, C.z + 2, 1.4, .06, 42);
    [[28, 148, 1.2], [66, 146, 1.4], [46, 166, 1.1], [24.5, 140, .9], [68, 154, 1]].forEach(([x, z, sc]) => { rock(x, z, sc); W.disc(sc * 1.4, '#ffffff', x, z, .068, 1.2, 1); });
    // Buissons tropicaux fleuris (hibiscus), chemin de sable du ponton au coffre
    [[38, 140], [56, 141], [36.5, 146.8], [53.5, 145], [50, 157], [42, 158]].forEach(([x, z], i) => { const b = sph(.75, ['#3f8f45', '#4f9f55', '#468a3e'][i % 3], x, .5, z); b.scale.set(1.25, .75, 1.1); for (let k = 0; k < 5; k++) sph(.12, ['#e8405a', '#f2789a', '#f6a07a'][(i + k) % 3], x + Math.cos(k * 1.3 + i) * .7, .85 + (k % 2) * .12, z + Math.sin(k * 1.3 + i) * .6, undefined, 0, false); solidCircle(x, z, .8, .9); });
    addCrabs(C.x, C.z, 22.5, 19.4, 6, { onSea: i => W.progress('crabes', 'c' + i) });
    W.path([[46, 129.4], [45.4, 133], [46.6, 136.5], [46, 140.4]], 1.8, { style: 'sand', fade: [false, true], pebbles: false, seed: 71 });
    // Ponton + bateau de retour
    W.ground(2.4, 6, W.M('#b8834a'), 46, 126.5, .12); for (let i = 0; i < 10; i++) box(2.4, .02, .04, '#8a5a3b', 46, .125, 123.8 + i * .6, undefined, false); for (const [x, z] of [[44.9, 124], [47.1, 124], [44.9, 127], [47.1, 127]]) cyl(.1, .1, 1, '#7a5236', x, .2, z, 5);
    boat(49.5, 124.5, 0, '#f6efe0');
    W.sign(42.6, 129.5, 'retour', -.3, 2);
    W.interact({ x: 46, y: 1, z: 128.5 }, 1.6, () => { W.toast(t().back); W.SFX.horn(); teleport(RG.plage.spawn.x + 28, 92, Math.PI); });
    // Cabane + hamac
    building(58, 150, 4, 3.4, 2.4, '#d9a25a', '#c9a33d', { rot: -Math.PI / 2, tiles: false, plinth: null }); W.egg('hut', 55.6, 150, 2.6, 1.6);
    const hamZ = { x: 35, z: 152 };
    cyl(.12, .14, 2.4, '#a8764a', hamZ.x - 1.8, 1.2, hamZ.z, 5); cyl(.12, .14, 2.4, '#a8764a', hamZ.x + 1.8, 1.2, hamZ.z, 5); solidCircle(hamZ.x - 1.8, hamZ.z, .15); solidCircle(hamZ.x + 1.8, hamZ.z, .15);
    const ham = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 3.4, 10, 1, true, Math.PI, Math.PI), W.M('#d6402f')); ham.rotation.z = Math.PI / 2; ham.position.set(hamZ.x, 1.4, hamZ.z); ham.scale.set(1, 1, .5); W.R.group.add(ham);
    W.zone(new THREE.Vector3(hamZ.x, 0, hamZ.z), 1.4, () => { W.say(fox, t().nap, 'note', 2.6, 2.2); W.complete('hamac'); }, { cond: () => fox.idle > 4 });
    // Couronne (à trouver), statue du gland
    const crown = () => { const g = new THREE.Group(); cyl(.22, .2, .14, '#f6d36b', 0, 0, 0, 8, g); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; cone(.06, .16, '#f6d36b', Math.cos(a) * .19, .14, Math.sin(a) * .19, 4, g, false); } sph(.04, '#d6402f', 0, .02, .21, g, 0, false); return g; };
    const worn = crown(); worn.position.set(0, .24, -.02); worn.visible = !!run.done.couronne; fox.head.add(worn);
    W.pickups('couronne', [[48, 161]], crown, { y: .5, onPick: () => { worn.visible = true; W.say(fox, t().crown, '', 2.4, 2.4); } });
    { const g = new THREE.Group(); g.position.set(C.x - 8, 0, C.z + 4); W.R.group.add(g); box(1.6, 1, 1.6, '#cfc6b4', 0, .5, 0, g); const a = sph(1.1, '#e8b23a', 0, 2.3, 0, g, 1); a.scale.set(1, 1.25, 1); const c = sph(1.18, '#8a5a3b', 0, 3.3, 0, g, 1); c.scale.set(1, .5, 1); cyl(.12, .14, .6, '#6b4429', 0, 4, 0, 5, g); solidCircle(C.x - 8, C.z + 4, 1.1, 3); }
    W.egg('statue', C.x - 8, C.z + 6, 4.2, 2);
    // Noix de coco
    const coco = W.dyn((() => { const g = new THREE.Group(); sph(.25, '#6b4429', 0, 0, 0, g, 1); return g; })());
    const cocoP = new THREE.Vector3(cocoTop.x + .2, cocoTop.y - .45, cocoTop.z + .2); coco.position.copy(cocoP); let cocoV = null;
    W.zone(new THREE.Vector3(C.x + 4, 0, C.z + 2), 1.3, () => { if (cocoV) return; cocoV = 0; W.SFX.crack(); }, { cond: () => fox.running });
    // Feu de joie
    const fire = { x: 30, z: 142, on: false };
    for (let i = 0; i < 6; i++) { const l = cyl(.1, .12, 1.4, '#8a5a3b', fire.x, .3, fire.z, 5); l.rotation.set(.9, i * 1.05, 0); } solidCircle(fire.x, fire.z, .7, .8);
    W.yap(new THREE.Vector3(fire.x, 0, fire.z), 3, () => { if (fire.on) return; fire.on = true; W.SFX.fanfare(); W.say(fox, t().fire, '', 2, 2.2); W.complete('feuJoie'); });
    // Bouteille de la rivière, échouée (si elle a été jetée)
    const bottle = W.dyn((() => { const g = new THREE.Group(); const b = cyl(.08, .08, .34, '#7fb7a2', 0, .1, 0, 7, g); b.rotation.z = Math.PI / 2; return g; })());
    bottle.position.set(63, 0, 132); bottle.visible = false; bottle.userData.gone = true;
    W.zone(new THREE.Vector3(63, 0, 132), 1.2, () => { W.say(fox, t().bottle, 'note', 2.6, 2.2); W.complete('message'); }, { cond: () => !!run.done.bouteille });
    // Coffre final
    const ch = new THREE.Group(); const lid = new THREE.Group(); lid.position.set(0, .6, -.4); ch.add(lid);
    box(1.2, .6, .8, '#8a5a3b', 0, .3, 0, ch); box(1.24, .08, .14, '#f6d36b', 0, .45, .4, ch, false); box(1.24, .26, .82, '#a8764a', 0, .13, .4, lid); box(.2, .2, .06, '#f6d36b', 0, .1, .82, lid, false);
    ch.position.set(C.x, 0, C.z - 4); W.rig(ch, [ch, lid]); solidCircle(C.x, C.z - 4, .7, .8);
    let lidK = W.done('coffreFinal') ? 1 : 0, lidOpen = W.done('coffreFinal');
    W.interact({ x: C.x, y: 1.2, z: C.z - 2.8 }, 1.5, () => {
      lidOpen = true; W.SFX.fanfare(); W.complete('coffreFinal');
      for (let i = 0; i < 4; i++) setTimeout(() => W.emit(new THREE.Vector3(C.x + rnd(-1, 1), 1.4, C.z - 4), ['#f6d36b', '#e8742a', '#8fc9df'][i % 3], { n: 30, spd: 3, up: 6, life: 1.4 }), i * 300);
      setTimeout(() => { S.paused = true; showCard({ icon: '👑', title: t().finalTitle, text: t().finalText(GOALS.filter(g => run.done[g.id]).length, GOALS.length) }, () => { S.paused = false; }); }, 1500);
    });
    W.postcard(66, 160);
    W.update(dt => {
      const now = performance.now() / 1000;
      sea.map.offset.set(now * .01, Math.sin(now * .4) * .03);
      { const k = .5 + .5 * Math.sin(now * .7); foamMat.opacity = .25 + k * .35; foam.scale.set(1 + k * .015, .86 + k * .013, 1); }
      bottle.visible = !!run.done.bouteille && !run.done.message; bottle.userData.gone = !bottle.visible;
      if (cocoV !== null && cocoV !== 'done') { cocoV += dt * 12; coco.position.y = Math.max(.25, coco.position.y - cocoV * dt); if (coco.position.y <= .25) { cocoV = 'done'; coco.position.x += 1; W.SFX.drop(); W.say({ anchor: coco.position.clone().setY(1.4) }, t().coconut, '', 1.2, 0, 'coco'); W.complete('noix'); } }
      if (fire.on && Math.random() < dt * 30) W.emit(new THREE.Vector3(fire.x + rnd(-.3, .3), .6, fire.z + rnd(-.3, .3)), ['#f6d36b', '#e8742a', '#d6402f'][Math.random() * 3 | 0], { n: 1, spd: .4, up: 2.6, life: .9, grav: -1, size: 1.2 });
      if (lidOpen && lidK < 1) lidK = Math.min(1, lidK + dt * 1.5); lid.rotation.x = -1.9 * lidK;
    });
    return { restore() { worn.visible = !!run.done.couronne; if (W.done('feuJoie')) fire.on = true; if (W.done('noix')) { cocoV = 'done'; coco.position.y = .25; } if (W.done('coffreFinal')) { lidOpen = true; lidK = 1; } } };
  },
});
