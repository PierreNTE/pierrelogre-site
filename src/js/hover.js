/* =====================================================================
   Micro-interactions à la souris (ordinateur) : survoler un personnage ou un objet
   le fait réagir un peu ; cliquer sur un habitant le fait parler.
   Rien n'est indispensable au jeu : c'est du bonus pour les curieux.
   ===================================================================== */
import * as THREE from 'three';
import { SFX } from './audio.js';
import { camera, canvas, isTouch } from './engine.js';
import { say } from './hud.js';
import { items } from './items.js';
import { lines, npcs } from './npc.js';
import { S, pick } from './state.js';

const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let last = 0, hovered = null, mx = 0, my = 0, dirty = false;
function targets() {
  const list = [];
  for (const n of npcs) if (n.group.visible) list.push(n.group);
  for (const it of items) if (it.mesh.visible && !it.gone && !it.held) list.push(it.mesh);
  return list;
}
function owner(o) { while (o) { const n = npcs.find(n => n.group === o); if (n) return { npc: n }; const it = items.find(i => i.mesh === o); if (it) return { item: it }; o = o.parent; } return null; }
function pickAt() {
  const r = canvas.getBoundingClientRect(); ptr.set((mx - r.left) / r.width * 2 - 1, -(my - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ptr, camera); const hit = ray.intersectObjects(targets(), true).find(h => h.object.isMesh);
  return hit ? owner(hit.object) : null;
}
if (!isTouch) {
  canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; dirty = true; });
  canvas.addEventListener('click', e => {
    if (S.paused || S.mg || e.pointerType === 'touch') return;
    const h = pickAt(); if (!h) return;
    if (h.npc && !h.npc.seated && h.npc.state === 'idle') { const L = lines(h.npc); if (L?.idle) { h.npc.jump = .3; say(h.npc, pick(L.idle), '', 2.2); SFX.pop(); } }
    else if (h.item) { h.item.wobble = 1; SFX.pop(); }
  });
}
/** À chaque image : survol (au plus 10 fois par seconde) et petites réactions. */
export function updateHover(dt, now) {
  if (isTouch || S.mg) return;
  if (dirty && now - last > .1 && !S.paused) {
    last = now; dirty = false; const h = pickAt();
    const key = h ? (h.npc || h.item) : null;
    if (key !== hovered) { hovered = key; canvas.style.cursor = key ? 'pointer' : ''; if (h?.item) h.item.wobble = Math.max(h.item.wobble || 0, .6); if (h?.npc && h.npc.state === 'idle') h.npc.glanceT = 1.2; }
  }
  for (const it of items) if (it.wobble > 0) { it.wobble = Math.max(0, it.wobble - dt * 1.8); it.mesh.rotation.z = Math.sin(now * 22) * .18 * it.wobble; }
  for (const n of npcs) if (n.glanceT > 0) { n.glanceT -= dt; n.head.rotation.z = Math.sin(now * 8) * .08 * Math.min(1, n.glanceT); }
}
