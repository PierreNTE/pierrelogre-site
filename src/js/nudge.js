/* =====================================================================
   Indices qui montrent : quand le joueur tourne en rond, l'indice automatique propose la bêtise du village
   la plus proche dont on connaît l'endroit, et l'anneau au sol + la flèche de bord d'écran (« Indice »)
   y conduisent pendant quelques secondes. Ailleurs (régions), l'indice reste un texte.
   ===================================================================== */
import * as THREE from 'three';
import { MEETING } from './actions.js';
import { fox } from './fox.js';
import { setHintPicker } from './hud.js';
import { baguette, carrots, hat, mug, plug, props } from './items.js';
import { gardener } from './npc.js';
import { S, run } from './state.js';
import { BURROW, COFFEE, FOUNTAIN, MUD, PRINTER } from './world.js';

const v = (x, z) => new THREE.Vector3(x, 0, z);
const PRINT = v(PRINTER.x + .95, PRINTER.z), MEET = v((MEETING.minX + MEETING.maxX) / 2, (MEETING.minZ + MEETING.maxZ) / 2);
/** Où se joue chaque bêtise du village (null : rien à montrer pour l'instant). */
const WHERE = {
  carottes: () => carrots.find(c => c.planted && !c.gone)?.pos,
  jardinier: () => gardener.pos,
  chapeau: () => (hat.worn ? gardener.pos : hat.pos),
  chapeauEau: () => (fox.held === hat ? FOUNTAIN : hat.worn ? gardener.pos : hat.pos),
  baguette: () => (fox.held === baguette ? BURROW : baguette.gone ? null : baguette.pos),
  pots: () => props.find(p => p.kind === 'pot' && !p.knocked && !p.goal && !p.region)?.pos,
  mug: () => (mug.gone ? null : fox.held === mug ? FOUNTAIN : mug.pos),
  cafe: () => COFFEE.mouth,
  boue: () => MUD,
  serveur: () => plug.pos,
  imprimante: () => PRINT,
  diversion: () => PRINT,
  reunion: () => MEET,
};
setHintPicker(todo => {
  let best = null, bd = Infinity;
  for (const g of todo) {
    const p = WHERE[g.id]?.(); if (!p) continue;
    const d = Math.hypot(p.x - fox.pos.x, p.z - fox.pos.z); if (d < bd) { bd = d; best = g; }
  }
  if (best) S.hintDest = { id: best.id, until: performance.now() + 9000 };
  return best;
});
const _p = new THREE.Vector3();
/** Destination montrée par l'indice (main.js), tant qu'elle est utile : 9 s au plus, jusqu'à l'arrivée sur place. */
export function hintDest() {
  const h = S.hintDest; if (!h) return null;
  const p = WHERE[h.id]?.();
  if (!p || run.done[h.id] || performance.now() > h.until || Math.hypot(p.x - fox.pos.x, p.z - fox.pos.z) < 2.5) { S.hintDest = null; return null; }
  return { key: 'indice', pos: _p.set(p.x, 0, p.z), r: 1 };
}
