/* =====================================================================
   Glands dorés : 5 objets cachés, chacun révèle une anecdote vraie sur Pierre
   (gardés d'une partie à l'autre dans saved.acorns)
   ===================================================================== */
import * as THREE from 'three';
import { SFX } from './audio.js';
import { track } from './config.js';
import { blob, blockedAt, cyl, flat2, mergeRig, noShadowCast, scene, sph } from './engine.js';
import { fox } from './fox.js';
import { emit } from './fx.js';
import { renderGoals } from './hud.js';
import { pick, rnd, saved, store } from './state.js';

// Derrière la maison bleue · haie ouest · salle de réunion · derrière la baie serveur · près de l'épouvantail
const SPOTS = [[-11, -16.2], [-31.2, 9.5], [25.8, 9], [27.6, -13], [-17.6, -7.9]];

export const acorns = SPOTS.map(([x, z], i) => {
  const p = new THREE.Vector3(x, 0, z);
  for (let k = 0; k < 40 && blockedAt(p.x, p.z, .3); k++) { const a = k * 2.4, r = .3 + k * .08; p.set(x + Math.cos(a) * r, 0, z + Math.sin(a) * r); }
  const g = new THREE.Group();
  sph(.15, '#e8b23a', 0, 0, 0, g, 1).scale.set(1, 1.25, 1);
  sph(.165, '#8a5a3b', 0, .14, 0, g, 1).scale.set(1, .5, 1);
  cyl(.02, .025, .1, '#6b4429', 0, .24, 0, 5, g, false);
  noShadowCast(g); scene.add(g); mergeRig(g, [g]); g.position.set(p.x, .4, p.z);
  const got = saved.acorns.includes(i); g.visible = !got;
  const sh = blob(.22); sh.position.set(p.x, .03, p.z); sh.visible = !got;
  return { i, g, pos: p, got, sh };
});

/** Animation, scintillement et ramassage. onPick(i) ouvre la carte de l'anecdote. */
export function updateAcorns(dt, now, onPick) {
  for (const a of acorns) {
    if (a.got) continue;
    a.g.position.y = .42 + Math.sin(now * 2.4 + a.i) * .08; a.g.rotation.y = now * 1.6 + a.i;
    if (Math.random() < dt * 2.5) emit(new THREE.Vector3(a.pos.x + rnd(-.2, .2), .5, a.pos.z + rnd(-.2, .2)), pick(['#ffe9a8', '#f6d36b']), { n: 1, spd: .2, up: .8, life: 1.2, grav: -.4, size: .5 });
    if (flat2(fox.pos, a.pos) < .8) {
      a.got = true; a.g.visible = false; a.sh.visible = false;
      if (!saved.acorns.includes(a.i)) saved.acorns.push(a.i);
      store.set(saved); SFX.acorn(); track('Gland', { n: saved.acorns.length });
      emit(new THREE.Vector3(a.pos.x, .6, a.pos.z), '#f6d36b', { n: 18, spd: 1.8, up: 3, life: .9 });
      renderGoals(); onPick(a.i);
    }
  }
}
