/* Le village : construit par world.js. Ici, ce que l'aventure y ajoute : détails, vie, progression. */
import * as THREE from 'three';
import { VC_SWAY, partGeometry, scene, setBuild } from '../engine.js';
import { defineRegion } from '../regions.js';
import { MAIN_IDS, pick, run, t } from '../state.js';
import { VILLAGE_NOVEG } from '../world.js';
import { barrel, bench, bunting, crate, lantern, mailbox, tramShelter, wheelbarrow, woodpile } from './kit.js';
import { HOOKS } from '../hooks.js';
import { addCat, addHens, addSwallows } from '../fauna.js';
import { behave } from '../crowd.js';
import { fox } from '../fox.js';

defineRegion({
  id: 'village', bounds: { minX: -32, maxX: 32, minZ: -21, maxZ: 22 },
  // La végétation évite la place, les chemins (VILLAGE_NOVEG), le potager, le bureau, la boue et le terrier
  veg: { biome: 'meadow', density: 1, rect: { minX: -33, maxX: 33, minZ: -22, maxZ: 23 }, avoid: [
    { x: -4, z: 0, w: 10, d: 10 }, ...VILLAGE_NOVEG, { x: -20, z: -9, w: 6.6, d: 3.8 }, { minX: 4.6, maxX: 29.5, minZ: -15.5, maxZ: 15.5 },
    { x: -11, z: 5.3, r: 1.7 }, { x: -8, z: 13.9, r: 1.9 }, { x: -8, z: 17.6, r: 2.6 }, { x: -19, z: 8, w: 5, d: 2.2 }] },
  adj: ['foret', 'sport', 'riviere', 'gare'],
  spawn: new THREE.Vector3(-4, 0, 5.5), mapColor: '#b9d79a',
  mood: { bg: '#cfe3cf', fog: '#d3e3c9', near: 34, far: 74, sun: '#ffdcab', sky: '#fff1d6', ground: '#7c9a6a', music: 'village' },
  goals: [{ id: 'basseCour', secret: true }, { id: 'chat', need: 3, secret: true }, { id: 'coq', secret: true }],
  i18n: {
    fr: { goals: { basseCour: "Semer la panique dans la basse-cour", chat: "Déloger le chat de ses trois siestes", coq: "Faire chanter le coq (en glapissant à côté de lui)" },
      cards: { village: "Bons baisers du village ! Ici tout le monde connaît le renard. Enfin, surtout ses bêtises. Le jardinier a commandé une clôture plus haute." }, signs: { acadStop: "Navette · Académie Dell Storage" },
      eggs: { well: "Un vieux puits. Tout au fond, l'écho répond : « Renard ? »", fairy: "Un rond de sorcière. On dit qu'il ne faut jamais danser dedans. Personne ne l'a dit au renard.", bank: "Un talus de bocage : la haie pousse sur une levée de terre. Les chênes têtards y sont taillés depuis des générations." } },
    en: { goals: { basseCour: "Throw the farmyard into a panic", chat: "Disturb the cat in all three of its napping spots", coq: "Make the rooster crow (by yapping next to it)" },
      cards: { village: "Greetings from the village! Everyone here knows the fox. Well, mostly its mischief. The gardener has ordered a taller fence." }, signs: { acadStop: "Shuttle · Dell Storage Academy" },
      eggs: { well: "An old well. From the bottom, the echo answers: \"Fox?\"", fairy: "A fairy ring. They say you should never dance inside one. Nobody told the fox.", bank: "A bocage bank: the hedge grows on a raised bank of earth. The pollarded oaks have been trimmed here for generations." } },
  },
  build(W) {
    W.postcard(-29.4, 16.8);
    W.mottle({ minX: -31, maxX: 4, minZ: -20, maxZ: 21 }, ['#9fc47c', '#b0d08c', '#a4c682', '#b7d394'], 18);
    // Petits groupes de décor, là où les habitants vivent
    barrel(-22.7, 6.4); barrel(-23.4, 7.4, '#8a5a3b'); crate(-22.6, 9.6, .3); crate(-22.6, 9.6, .7, .7);    // réserve du boulanger
    woodpile(-22.3, -14.2, Math.PI / 2); mailbox(-24.6, -11.3, 0, '#6f9a6a');                             // maison aux volets verts
    mailbox(-12.6, -11.7, 0, '#5b87a8'); crate(-13.6, -12.6, .5);                                         // maison aux volets bleus
    wheelbarrow(-15.7, -8.1, -.9);                                                                        // au potager
    bench(-1.2, -6.4, 0, '#8a5a3b'); bench(-14.4, 6.9, Math.PI / 2, '#8a5a3b');                               // autour de la place
    lantern(-5.7, 7.6); lantern(-8.9, 11.4); lantern(-6.2, 14.6, 1.8);                                   // le chemin du terrier
    W.flock(-27.5, -9, 3, '#a9aeb5');
    // Petits secrets non signalés : le puits qui répond, un rond de sorcière caché derrière le bureau, le talus
    W.egg('well', -21.4, 13.4, 2.8, 1.7);
    { const fx = 22.5, fz = -19, MUSH = ['#d6402f', '#c9894f', '#d6402f', '#e2b26a'];
      for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, r = 1.25 + Math.sin(i * 2.3) * .08, x = fx + Math.cos(a) * r, z = fz + Math.sin(a) * r;
        W.cyl(.05, .06, .2, '#f3e6d2', x, .1, z, 5, undefined, false); const c = W.sph(.13, MUSH[i % 4], x, .22, z, undefined, 1, false); c.scale.set(1, .55, 1);
        if (i % 2 === 0) W.sph(.025, '#ffffff', x + .05, .28, z + .03, undefined, 0, false); }
      W.patch(2.2, 2.2, '#b7d394', fx, fz, { y: .008, round: 1 });
      W.egg('fairy', fx, fz, 2.2, 1.3); }
    W.egg('bank', -31.6, 6.5, 2.6, 1.4);
    // Arrêt de la navette de l'Académie Dell Storage, au nord du bureau (l'académie arrive avec les régions lointaines)
    tramShelter(11, -19.4, 0); W.sign(14.6, -19.9, 'acadStop', 0, 2.8);
    W.transport({ x: 11, y: 1.6, z: -18.3 }, 1.8, () => HOOKS.toAcademy?.(), () => !!HOOKS.toAcademy && run.mode === 'libre');
    // Basse-cour derrière les maisons (poulailler sur pilotis), hirondelles autour des toits, le chat du puits
    { const cx = -17.4, cz = -19.6; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) W.cyl(.06, .06, .7, '#7a5236', cx + a * .7, .35, cz + b * .5, 4);
      W.box(1.7, 1, 1.3, '#a8764a', cx, 1.2, cz); for (const sd of [-1, 1]) { const r = W.box(1.9, .08, .85, '#8a4b3a', cx, 1.9, cz + sd * .36); r.rotation.x = sd * .6; }
      W.box(.36, .4, .05, '#3a2a22', cx + .4, 1.05, cz + .66, undefined, false); const rp = W.box(.36, .05, 1.1, '#9a6b42', cx + .4, .4, cz + 1.1, undefined, false); rp.rotation.x = .75;
      W.solidBox(cx, cz, 1.8, 1.3, 1.6); }
    const hens = addHens({ minX: -24.2, maxX: -15.2, minZ: -20.6, maxZ: -16.6 }, 5, { onPanic: () => W.complete('basseCour') });
    W.yap(new THREE.Vector3(-19.7, 0, -18.6), 8, () => { const r = hens.list[hens.list.length - 1]; if (Math.hypot(r.p.x - fox.pos.x, r.p.z - fox.pos.z) < 3.4) { hens.crow(); W.complete('coq'); } });
    addSwallows([[-26, -14], [-11, -14], [-27, 13]], 6);
    const cat = addCat([[-21.4, .9, 14.16, Math.PI / 2], [-14.4, .55, 6.9, Math.PI / 2], [-22.3, .92, -14.2, 0]]);
    cat.onWake = k => W.progress('chat', 'spot' + k);
    // Deux habitants qui vont et viennent : la dame au panier (boulangerie ↔ place), le vieux monsieur (banc de la place)
    { const crowd = W.crowd(3);
      const lady = crowd.add({ pos: { x: -19.4, z: 5.6 }, shirt: '#8a7cc2', pants: '#5a5048', hair: '#d9d4c8', yaw: 0 });
      const old = crowd.add({ pos: { x: -9.2, z: -5.2 }, shirt: '#6f8a5a', pants: '#4a4a52', hair: '#d9d4c8', hat: 'beret', hatColor: '#2f2a24', yaw: 0 });
      const LADY = [[-19.2, 5.2], [-18.9, 1.6], [-14, .4], [-9.6, .2], [-6, 2.6], [-9.6, .1], [-15, .3], [-19.4, 1.5]];
      const OLD = [[-9.2, -5.2], [-9.9, -7.2], [-9.2, -5.2], [-6.5, -5.4], [-2.6, -6.4]];
      let chat = 0; const st = { old: 0, sit: 0 };
      W.update(dt => {
        chat -= dt;
        for (const a of [lady, old]) { a.t = (a.t || 0) + dt; const d = Math.hypot(fox.pos.x - a.pos.x, fox.pos.z - a.pos.z);
          a.headYaw = d < 6 ? Math.max(-1, Math.min(1, Math.atan2(Math.sin(Math.atan2(fox.pos.x - a.pos.x, fox.pos.z - a.pos.z) - a.yaw), Math.cos(Math.atan2(fox.pos.x - a.pos.x, fox.pos.z - a.pos.z) - a.yaw)))) : Math.sin(a.t * .4) * .3;
          if (d < 2.6 && chat <= 0) { chat = 7; W.say({ anchor: new THREE.Vector3(a.pos.x, 2.6, a.pos.z) }, pick(t().amb.villager), '', 2, 0, 'villager'); } }
        // la dame fait ses courses en boucle (petite pause à la boulangerie)
        if ((lady.pause = (lady.pause || 0) - dt) > 0) { lady.moving = false; lady.armR = -.4; } else { const k0 = lady.k || 0; behave.loop(lady, LADY, dt, 1.25); lady.armR = -.35; lady.armL = Math.sin(lady.walk || 0) * .4; if ((lady.k || 0) !== k0 && (lady.k % LADY.length) === 0) lady.pause = 4; }
        // le vieux monsieur va s'asseoir sur le banc, puis repart
        if (st.sit > 0) { st.sit -= dt; old.seated = true; old.moving = false; old.pos.set(-1.7, .1, -6.32); old.yaw = 0; old.lean = 0; if (st.sit <= 0) { old.seated = false; old.pos.y = 0; old.k = 0; } }
        else { const k0 = old.k || 0; behave.loop(old, OLD, dt, .7); old.lean = .12; if ((old.k || 0) !== k0 && (old.k % OLD.length) === 0) st.sit = 14; }
      });
    }
    // La guirlande de la place apparaît quand le village commence à subir les bêtises
    const g = new THREE.Group(); setBuild(g);
    [[-8.6, -4.6], [.6, 4.6], [.6, -4.6], [-8.6, 4.6]].forEach(([x, z]) => W.cyl(.07, .09, 3.6, '#8a5a3b', x, 1.8, z, 5, g));
    bunting(-8.6, -4.6, .6, 4.6, 3.5); bunting(.6, -4.6, -8.6, 4.6, 3.4);
    setBuild(W.R.group);
    const flags = new THREE.Mesh(partGeometry(g, new Set(), false).geo, VC_SWAY); flags.castShadow = true; scene.add(flags);
    const villageTasks = () => MAIN_IDS.filter(id => run.done[id]).length;
    let shown = 0;
    W.update(dt => { const want = villageTasks() >= 5 ? 1 : 0; if (shown !== want) { shown += Math.sign(want - shown) * Math.min(Math.abs(want - shown), dt * .8); } flags.visible = shown > 0; flags.scale.set(1, Math.max(.001, 1 - Math.pow(1 - shown, 3)), 1); });
    return { restore() { shown = villageTasks() >= 5 ? 1 : 0; flags.visible = shown > 0; flags.scale.y = Math.max(.001, shown); } };
  },
});
