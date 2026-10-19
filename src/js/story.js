/* =====================================================================
   Le fil rouge : « Les souvenirs du terrier ».
   Gaston, pigeon voyageur et facteur un peu débordé, attend le renard dans chaque zone ouverte.
   Neuf souvenirs traînent dans le monde (certains viennent du vrai parcours de Pierre, tel qu'il est
   sur sa fiche) ; une fois trouvés, ils rejoignent l'étagère du terrier. Quand les neuf y sont,
   la prochaine visite au terrier tourne à la petite fête.
   ===================================================================== */
import * as THREE from 'three';
import { SFX } from './audio.js';
import { blob, box, cone, cyl, flat2, mergeRig, noShadowCast, scene, sph } from './engine.js';
import { fox } from './fox.js';
import { emit } from './fx.js';
import { HOOKS } from './hooks.js';
import { T } from './i18n.js';
import { say, showCard, toast } from './hud.js';
import { saveRun } from './persist.js';
import { RG, isOpen } from './regions.js';
import { DEN } from './regions/terrier.js';
import { S, run, t } from './state.js';

/* ---------- Textes ---------- */
Object.assign(T.fr, { story: {
  names: { foret: 'une plume de hibou dorée', sport: 'le ballon de handball de Pierre', moto: 'le casque de motocross de Pierre', riviere: 'un galet parfait pour les ricochets', plage: 'un coquillage qui chante',
    gare: 'un billet Nantes ⇄ Paris', nantes: 'la toque de diplômé d’Euridis', paris: 'une tour Eiffel de poche', montagne: 'une clé USB « cloud souverain »' },
  found: (n, name) => `Souvenir trouvé : <b>${name}</b> (${n}/9). Il file au terrier !`,
  gaston: {
    village: ['Gaston, pigeon voyageur. Ce terrier, là-bas… on dit qu’il est bien vide.', 'Neuf souvenirs de Pierre traînent dans le monde. Rapporte-les au terrier, je fais passer le mot !', 'Le terrier est complet. Plus rien à livrer… enfin des vacances !'],
    foret: ['Le hibou a perdu une plume dorée. Cherche près de son grand arbre, à l’est.', 'Une plume de hibou ! Il ne la réclamera pas : il dort.'],
    sport: ['Le ballon de hand de Pierre ? Il traîne près de la buvette, côté entrée.', 'Le ballon de Pierre ! Au terrier, et pas de tir dans les fenêtres.'],
    moto: ['Un casque de motocross attend du côté du paddock et de la buvette.', 'Le casque de Pierre. Il a encore de la boue dessus, c’est bon signe.'],
    riviere: ['Le galet parfait pour les ricochets dort sur la berge, à l’ouest du pont.', 'Un galet tout plat. Six rebonds, au moins.'],
    plage: ['Un coquillage qui chante, quelque part au bord de l’eau.', 'Écoute… on entend la mer. Normal, on est à la plage.'],
    gare: ['Un billet Nantes ⇄ Paris s’est envolé vers le bout du quai.', 'Un aller-retour Nantes ⇄ Paris. Pratique, quand on vit entre les deux.'],
    nantes: ['On a vu une toque de diplômé traîner par ici. Celle d’Euridis, je crois.', 'La toque du MSc d’Euridis Nantes ! Elle a fait du chemin.'],
    paris: ['Une tour Eiffel de poche s’est échappée d’un kiosque. Regarde près des allées.', 'Une tour Eiffel de poche. La vraie ne rentrait pas dans le terrier.'],
    montagne: ['Près du centre de données, une clé USB est tombée dans la neige.', 'Une clé « cloud souverain ». Un sujet que Pierre connaît bien.'],
    ile: ['L’île secrète ! Les souvenirs, eux, c’est au terrier qu’ils vont.', 'Tous les souvenirs sont au terrier. La fête t’attend là-bas !'],
    done: 'Celui-là, tu l’as déjà rapporté. Cherche ailleurs !', all: 'Les neuf souvenirs sont au terrier ! File y faire un tour.',
  },
  finaleTitle: 'Le terrier est complet !',
  finaleText: 'Les neuf souvenirs sont rentrés à la maison, sur l’étagère du terrier. Merci d’avoir joué jusqu’ici : si le renard t’a fait sourire, passe dire bonjour à Pierre sur LinkedIn.',
} });
Object.assign(T.en, { story: {
  names: { foret: 'a golden owl feather', sport: 'Pierre’s handball', moto: 'Pierre’s motocross helmet', riviere: 'the perfect skimming stone', plage: 'a singing seashell',
    gare: 'a Nantes ⇄ Paris ticket', nantes: 'the Euridis graduation cap', paris: 'a pocket Eiffel Tower', montagne: 'a “sovereign cloud” USB key' },
  found: (n, name) => `Souvenir found: <b>${name}</b> (${n}/9). Off to the den!`,
  gaston: {
    village: ['Gaston, carrier pigeon. That den over there… they say it’s rather empty.', 'Nine of Pierre’s souvenirs are scattered around the world. Bring them back to the den, I’ll spread the word!', 'The den is complete. Nothing left to deliver… holidays at last!'],
    foret: ['The owl lost a golden feather. Look near its big tree, to the east.', 'An owl feather! It won’t ask for it back: it’s asleep.'],
    sport: ['Pierre’s handball? It’s lying around near the club bar, by the entrance.', 'Pierre’s ball! To the den, and no shooting at windows.'],
    moto: ['A motocross helmet is waiting near the paddock and the snack bar.', 'Pierre’s helmet. Still muddy, that’s a good sign.'],
    riviere: ['The perfect skimming stone is sleeping on the bank, west of the bridge.', 'A nice flat stone. Six bounces, at least.'],
    plage: ['A singing seashell, somewhere by the water.', 'Listen… you can hear the sea. Well, we are at the beach.'],
    gare: ['A Nantes ⇄ Paris ticket blew off towards the end of the platform.', 'A Nantes ⇄ Paris return. Handy when you live between the two.'],
    nantes: ['Someone saw a graduation cap around here. Euridis, I think.', 'The Euridis Nantes MSc cap! It’s come a long way.'],
    paris: ['A pocket Eiffel Tower escaped from a kiosk. Look along the paths.', 'A pocket Eiffel Tower. The real one didn’t fit in the den.'],
    montagne: ['Near the data center, a USB key fell in the snow.', 'A “sovereign cloud” key. A topic Pierre knows well.'],
    ile: ['The secret island! Souvenirs go to the den, though.', 'All the souvenirs are in the den. The party is waiting for you there!'],
    done: 'You already brought that one home. Look elsewhere!', all: 'All nine souvenirs are in the den! Go and have a look.',
  },
  finaleTitle: 'The den is complete!',
  finaleText: 'All nine souvenirs are home, on the den’s shelf. Thanks for playing this far: if the fox made you smile, come and say hi to Pierre on LinkedIn.',
} });

/* ---------- Les souvenirs ---------- */
const SOUV = [
  { id: 'foret', x: 16.2, z: -63.4, make: g => { const f = sph(.12, '#e8c25a', 0, 0, 0, g, 1); f.scale.set(.5, .2, 2.2); cyl(.015, .015, .5, '#8a6a3a', 0, 0, -.1, 4, g, false).rotation.x = Math.PI / 2; } },
  { id: 'sport', x: 40.6, z: 21.6, make: g => { sph(.2, '#f6efe0', 0, 0, 0, g, 1); sph(.205, '#2563c9', 0, 0, 0, g, 0, false).scale.set(1, .3, 1); } },
  { id: 'moto', x: 141, z: 17.5, make: g => { const h = sph(.26, '#e8742a', 0, 0, 0, g, 1); h.scale.set(1, .95, 1.1); box(.32, .1, .16, '#2f3640', 0, -.02, .22, g, false); box(.3, .03, .16, '#e8742a', 0, .14, .28, g, false); } },
  { id: 'riviere', x: -12, z: 25.6, make: g => { const s = sph(.2, '#9aa3ad', 0, 0, 0, g, 1); s.scale.set(1.2, .35, .9); } },
  { id: 'plage', x: 14, z: 80, make: g => { const c = cone(.16, .32, '#f2b8c6', 0, 0, 0, 7, g); c.rotation.z = Math.PI / 2; sph(.13, '#f6d3dc', -.12, 0, 0, g, 1, false); } },
  { id: 'gare', x: -49, z: 6.5, make: g => { box(.5, .02, .26, '#f6efe0', 0, 0, 0, g, true); box(.12, .025, .26, '#e8742a', -.16, 0, 0, g, false); } },
  { id: 'nantes', x: -150, z: 18, make: g => { box(.42, .04, .42, '#2f2a24', 0, .1, 0, g, true).rotation.y = .6; cyl(.14, .16, .12, '#2f2a24', 0, .02, 0, 8, g, false); cyl(.01, .01, .22, '#f6d36b', .2, .02, .1, 3, g, false); } },
  { id: 'paris', x: -290, z: 28, make: g => { for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = box(.05, .5, .05, '#8a6a4a', a * .1, 0, b * .1, g, false); l.rotation.set(b * .25, 0, -a * .25); } cone(.1, .5, '#8a6a4a', 0, .42, 0, 4, g); box(.24, .04, .24, '#8a6a4a', 0, .1, 0, g, false); } },
  { id: 'montagne', x: -11.5, z: -108.5, make: g => { box(.32, .12, .14, '#2563c9', 0, 0, 0, g, true); box(.12, .08, .1, '#c9cdd3', .21, 0, 0, g, false); } },
];
const got = () => (run.flags.souv ||= []);
export const souvenirCount = () => got().length;
HOOKS.souvenirs = souvenirCount;
const build = s => { const g = new THREE.Group(); s.make(g); noShadowCast(g); scene.add(g); mergeRig(g, [g]); return g; };
for (const s of SOUV) { s.g = build(s); s.g.position.set(s.x, .55, s.z); s.sh = blob(.3); s.sh.position.set(s.x, .03, s.z); }
// Copies sur l'étagère du terrier (2 rangées)
const slot = k => new THREE.Vector3(DEN.x + 4.2 - 1.3 + (k % 5) * .65, .74 + (k < 5 ? 0 : .55), DEN.z + 3.9);
for (const [k, s] of SOUV.entries()) { s.shelf = build(s); s.shelf.position.copy(slot(k)); s.shelf.scale.setScalar(.85); }

/* ---------- Gaston, le pigeon facteur ---------- */
const PERCH = { village: [-10.5, 10.5], foret: [-16, -30], sport: [41.5, 16.2], moto: [104.5, -2], riviere: [12.5, 24.4], plage: [7.5, 38.5], gare: [-40.5, 2.6], nantes: [-147.5, 24], paris: [-287.5, 34], montagne: [-1.5, -89.5], ile: [48.5, 131.5], terrier: [DEN.x + 6.3, DEN.z + 1.8] };
const gaston = (() => {
  const g = new THREE.Group();
  cyl(.06, .08, .7, '#7a5236', 0, .35, 0, 6, g); box(.5, .06, .16, '#8a5a3b', 0, .72, 0, g, false);    // perchoir
  const b = new THREE.Group(); b.position.y = .75; g.add(b);
  const body = sph(.22, '#8f98a8', 0, .2, 0, b, 1); body.scale.set(.9, .85, 1.25); sph(.14, '#6f8f8a', 0, .36, .14, b, 1, false).scale.set(1, .8, .8);
  sph(.12, '#9aa3b2', 0, .48, .2, b, 1); cone(.03, .08, '#e8b04a', 0, .46, .33, 4, b, false).rotation.x = Math.PI / 2; [-1, 1].forEach(s => sph(.022, '#1f1f1f', s * .07, .5, .28, b, 0, false));
  cyl(.1, .11, .05, '#2563c9', 0, .58, .2, 8, b, false); box(.12, .02, .08, '#2563c9', 0, .565, .29, b, false);   // casquette de facteur
  box(.14, .14, .06, '#a8764a', .2, .2, .02, b, false); box(.03, .3, .03, '#7a5236', .1, .3, .04, b, false).rotation.z = .6;   // sacoche
  const tl = cone(.12, .2, '#7f8898', 0, .16, -.3, 4, b, false); tl.rotation.x = -1.2;
  noShadowCast(g); scene.add(g); mergeRig(g, [g]); g.visible = false;
  return { g, b, region: null, said: false, sh: blob(.3) };
})();
const lineFor = id => {
  const L = t().story.gaston, n = souvenirCount();
  if (id === 'village') return run.done.terrier ? (n >= 9 ? L.village[2] : L.village[1]) : L.village[0];
  if (id === 'terrier') return t().den.shelfText(n);
  if (id === 'ile') return n >= 9 ? L.ile[1] : L.ile[0];
  if (n >= 9) return L.all;
  return got().includes(id) ? L[id][1] : L[id][0];
};

/* ---------- Mise à jour (appelée par main.js) ---------- */
let sparkle = 0;
export function updateStory(dt, now) {
  const reg = S.region || 'village';
  // Gaston se pose dans la zone où se trouve le renard
  if (gaston.region !== reg) { gaston.region = reg; gaston.said = false; const p = PERCH[reg]; gaston.g.visible = !!p; if (p) { gaston.g.position.set(p[0], 0, p[1]); gaston.sh.position.set(p[0], .03, p[1]); emit(new THREE.Vector3(p[0], 1.2, p[1]), '#c9cdd3', { n: 6, spd: 1.2, up: 1.5, life: .6 }); } }
  gaston.sh.visible = gaston.g.visible;
  if (gaston.g.visible) {
    const d = flat2(fox.pos, gaston.g.position);
    gaston.b.rotation.y += (Math.atan2(fox.pos.x - gaston.g.position.x, fox.pos.z - gaston.g.position.z) - gaston.b.rotation.y) * Math.min(1, dt * 3);
    gaston.b.position.y = .75 + Math.abs(Math.sin(now * (d < 3 ? 6 : 1.5))) * (d < 3 ? .05 : .015);
    if (d < 2.6 && !gaston.said && !S.paused) { gaston.said = true; say({ anchor: gaston.g.position.clone().setY(2) }, lineFor(reg), 'note', 4.2, 0, 'gaston'); SFX.at?.(gaston.g.position, 'cluck'); }
    if (d > 5) gaston.said = false;
  }
  // Souvenirs : visibles dans les zones ouvertes, ramassés en passant dessus
  sparkle += dt;
  for (const s of SOUV) {
    const has = got().includes(s.id), open = isOpen(s.id) && RG[s.id]?.active;
    s.g.visible = !has && !!open; s.sh.visible = s.g.visible; s.shelf.visible = has;
    if (!s.g.visible) continue;
    s.g.position.y = .55 + Math.sin(now * 2.2 + s.x) * .08; s.g.rotation.y += dt * 1.4;
    if (sparkle > .25 && flat2(fox.pos, s) < 14) emit(new THREE.Vector3(s.x + (Math.random() - .5) * .5, .9, s.z + (Math.random() - .5) * .5), '#ffe9a8', { n: 1, spd: .2, up: .8, life: .9, grav: -.4, size: .5 });
    if (flat2(fox.pos, s) < .9 && !S.paused) {
      got().push(s.id); saveRun(); SFX.acorn(); emit(new THREE.Vector3(s.x, .8, s.z), '#f6d36b', { n: 24, spd: 2.4, up: 3, life: 1 });
      toast(t().story.found(souvenirCount(), t().story.names[s.id]));
      gaston.said = false;
      HOOKS.achCheck?.();
    }
  }
  if (sparkle > .25) sparkle = 0;
  // La fête du terrier : les neuf souvenirs sont rentrés, et le renard revient chez lui
  if (reg === 'terrier' && souvenirCount() >= 9 && !run.flags.finale && !S.paused) {
    run.flags.finale = true; saveRun(); SFX.fanfare();
    for (let i = 0; i < 8; i++) setTimeout(() => emit(new THREE.Vector3(DEN.x + (Math.random() - .5) * 10, 2.5, DEN.z + (Math.random() - .5) * 6), ['#e8742a', '#f6d36b', '#8fc9df', '#f2b8c6'][i % 4], { n: 26, spd: 3, up: 4, life: 1.4 }), i * 250);
    setTimeout(() => { S.paused = true; showCard({ icon: '🏡', title: t().story.finaleTitle, text: t().story.finaleText, li: true }, () => { S.paused = false; HOOKS.achCheck?.(); }); }, 1400);
  }
}
