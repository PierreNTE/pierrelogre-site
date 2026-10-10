/* =====================================================================
   Le terrier de Pierre : une salle souterraine (vue en coupe, comme une maquette).
   Le renard y entre par le terrier du village. Au mur, le parcours de Pierre : un souvenir par étape,
   posé sur un socle ; en s'approchant, une plaque raconte l'étape (textes de la fiche, T.trail…).
   Le tableau de liège ouvre la fiche complète (lien LinkedIn). On ressort par le tunnel.
   Les souvenirs rapportés des autres zones (story.js) s'alignent sur l'étagère.
   ===================================================================== */
import * as THREE from 'three';
import { cam, flat2, textTex } from '../engine.js';
import { fox } from '../fox.js';
import { HOOKS } from '../hooks.js';
import { defineRegion, openHidden, teleport } from '../regions.js';
import { S, run, t } from '../state.js';
import { BURROW } from '../world.js';
import { hash, lantern, rock } from './kit.js';

export const DEN = { x: 0, z: 262 };
const X = v => DEN.x + v, Z = v => DEN.z + v;
const TUNNEL = { x: X(-6.9), z: Z(3.1) };

defineRegion({
  id: 'terrier', hidden: true, always: true, hasCard: false, notebook: 'village',
  bounds: { minX: X(-10), maxX: X(10), minZ: Z(-8), maxZ: Z(8) },
  walk: [{ minX: X(-7.2), maxX: X(7.2), minZ: Z(-4.2), maxZ: Z(4.6) }],
  spawn: new THREE.Vector3(X(-5.6), 0, Z(3)), spawnYaw: Math.PI * .75,
  mood: { bg: '#21180f', fog: '#2a1e14', near: 30, far: 60, sun: '#ffd8a6', sky: '#ffd3a0', ground: '#6a4a32', life: 0, music: 'terrier' },
  i18n: {
    fr: { regions: { terrier: 'Le terrier de Pierre' }, eggs: { denExit: 'Le tunnel remonte au village.' },
      den: { board: 'Tableau de liège : toute la fiche, et le lien pour dire bonjour sur LinkedIn.', boardHint: 'E : ouvrir la fiche complète',
        stats: 'Le tableau de chasse', loot: 'Butin du terrier', welcome: 'Bienvenue dans le terrier. Approche-toi des souvenirs.', shelf: 'L’étagère aux souvenirs', shelfText: n => n >= 9 ? 'Les neuf souvenirs sont rentrés. Le terrier est complet !' : `Souvenirs rapportés : ${n}/9. Les autres attendent quelque part dans le monde (Gaston, le pigeon facteur, sait où).` } },
    en: { regions: { terrier: 'Pierre’s den' }, eggs: { denExit: 'The tunnel leads back up to the village.' },
      den: { board: 'Cork board: the full profile, and the link to say hi on LinkedIn.', boardHint: 'E: open the full profile',
        stats: 'The trophy board', loot: 'Den loot', welcome: 'Welcome to the den. Walk up to the souvenirs.', shelf: 'The souvenir shelf', shelfText: n => n >= 9 ? 'All nine souvenirs are home. The den is complete!' : `Souvenirs brought home: ${n}/9. The others are waiting somewhere out there (Gaston the postman pigeon knows where).` } },
  },
  build(W) {
    const { box, cyl, sph, cone, solidBox, solidCircle } = W;
    // Maquette : un bloc de terre en coupe (couches), le sol tassé, un tapis
    box(18, 2.2, 13.4, '#4f3a28', X(0), -1.1, Z(0)); box(18.04, .5, 13.44, '#6b4a32', X(0), -.25, Z(0), undefined, false); box(18.06, .3, 13.46, '#3f2e20', X(0), -1.6, Z(0), undefined, false);
    for (let i = 0; i < 16; i++) { const s = sph(.18 + hash(i) * .2, ['#8d877c', '#7f796f', '#9a958c'][i % 3], X(-8.6 + i * 1.15), -.5 - hash(i * 3) * 1.2, Z(6.72), undefined, 0, false); s.scale.set(1.2, .8, .4); }
    W.patch(17.4, 12.6, '#7a5a3c', X(0), Z(0), { round: .3, jitter: .4 }); W.mottle({ minX: X(-7), maxX: X(7), minZ: Z(-4), maxZ: Z(4.5) }, ['#80603f', '#735435', '#86663f'], 10);
    W.disc(2.3, '#b9573a', X(.4), Z(1.2), .03, 1.25, 1); W.disc(1.75, '#e0a050', X(.4), Z(1.2), .032, 1.25, 1); W.disc(1.1, '#c96a3a', X(.4), Z(1.2), .034, 1.25, 1);
    // Murs de terre (nord, ouest, est) : buttes serrées, cailloux et racines qui pendent ; muret bas au sud
    const wall = (x0, z0, x1, z1, h, n) => { for (let i = 0; i <= n; i++) { const k = i / n, x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k, s = 1.1 + hash(x * 3 + z) * .5;
      const m = sph(1, ['#6b4a32', '#5f4230', '#74513a'][i % 3], x, h * .45, z, undefined, 1); m.scale.set(s * 1.1, h * (.85 + hash(i + x) * .3), s); } };
    wall(X(-8), Z(-5.6), X(8), Z(-5.6), 2.8, 16); wall(X(-8.3), Z(-5), X(-8.3), Z(1.2), 2.6, 6); wall(X(8.3), Z(-5), X(8.3), Z(5.6), 2.6, 10); wall(X(-8.3), Z(5.2), X(-8.3), Z(5.8), 2.4, 1);
    for (let i = 0; i < 9; i++) { const x = X(-7 + i * 1.75), r = box(.06, .8 + hash(i) * .9, .06, '#8a6a3a', x, 2.2, Z(-4.75), undefined, false); r.rotation.z = (hash(i * 7) - .5) * .5; }
    for (let i = 0; i < 6; i++) rock(X(-7.4 + hash(i) * 14.8), Z(-4.6 + hash(i + 9) * .3), .35 + hash(i * 2) * .25, '#8d877c', false);
    for (let x = -7.6; x <= 7.6; x += 1.4) { const m = sph(.6, '#6b4a32', X(x), .1, Z(6), undefined, 1); m.scale.set(1.3, .5, .9); }
    solidBox(X(0), Z(-5.4), 18, 1.6, 3); solidBox(X(-8.2), Z(0), 1.6, 13, 3); solidBox(X(8.2), Z(0), 1.6, 13, 3); solidBox(X(0), Z(6), 18, 1.4, 1);
    // Tunnel (sortie) : bouche sombre dans le mur ouest
    { [[1.35, '#3a2a1e', .02], [1.05, '#1d150e', .05], [.7, '#0f0a07', .08]].forEach(([r, c, dx]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: c })); m.position.set(X(-7.55) + dx, .95, TUNNEL.z); m.rotation.y = Math.PI / 2; m.scale.y = 1.1; W.R.group.add(m); });
      for (let i = 0; i < 5; i++) { const a = Math.PI * (.15 + i * .17), s = sph(.3, '#5f4230', X(-7.45), .95 + Math.sin(a) * 1.3, TUNNEL.z + Math.cos(a) * 1.3, undefined, 1, false); s.scale.set(.6, 1, 1); } }
    W.zone(new THREE.Vector3(TUNNEL.x, 0, TUNNEL.z), .9, () => teleport(BURROW.x, BURROW.z - 1.9, Math.PI, () => { cam.zoomT = 1; }));
    W.egg('denExit', TUNNEL.x + 1.2, TUNNEL.z, 2.2, 1.3);
    // Lanternes (toujours allumées sous terre : halos doux), lit du renard, table basse, étagère à livres
    lantern(X(-4.6), Z(-4.2), 1.9); lantern(X(4.6), Z(-4.2), 1.9); lantern(X(6.9), Z(3.6), 1.7);
    { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      const pts = [[-4.6, 2.1, -4.2, 2.4], [4.6, 2.1, -4.2, 2.4], [6.9, 1.9, 3.6, 2.2], [-2.2, .75, 1.4, 1.1]], geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap(([x, y, z]) => [X(x), y, Z(z)]), 3));
      const glow = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(c), color: '#ffcf86', size: 2.4, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending })); glow.frustumCulled = false; W.dyn(glow, false);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: '#ffb760', transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending })); pool.rotation.x = -Math.PI / 2; pool.scale.set(7.5, 5, 1); pool.position.set(X(.4), .05, Z(.4)); W.dyn(pool, false); }
    // Mousse et champignons au pied des murs
    for (let i = 0; i < 14; i++) { const x = X(-7.4 + i * 1.12), m = sph(.3 + hash(i) * .2, ['#6f8f48', '#5f8040'][i % 2], x, .08, Z(-4.75 + hash(i * 5) * .2), undefined, 1, false); m.scale.set(1.4, .35, .8);
      if (i % 3 === 0) { cyl(.03, .04, .14, '#f3e6d2', x + .3, .07, Z(-4.5), 5, undefined, false); sph(.08, '#d6402f', x + .3, .15, Z(-4.5), undefined, 1, false).scale.set(1, .5, 1); } }
    { const bx = X(5.6), bz = Z(2.9); const ring = new THREE.Mesh(new THREE.TorusGeometry(.75, .2, 6, 14), W.M('#b88a4a')); ring.rotation.x = -Math.PI / 2; ring.position.set(bx, .2, bz); ring.castShadow = true; W.R.group.add(ring);
      cyl(.72, .72, .12, '#e8742a', bx, .12, bz, 14); sph(.28, '#f6efe0', bx + .3, .28, bz - .2, undefined, 1, false).scale.set(1.2, .5, .8); solidCircle(bx, bz, .95, .5); }
    { const tx = X(-2.6), tz = Z(1.6); cyl(.75, .75, .08, '#a8764a', tx, .5, tz, 12); cyl(.1, .14, .48, '#7a5236', tx, .24, tz, 6); solidCircle(tx, tz, .8, .6);
      box(.6, .01, .42, '#efe3c2', tx - .1, .55, tz + .05, undefined, false).rotation.y = .3; cyl(.05, .05, .14, '#f6efe0', tx + .4, .62, tz - .2, 6, undefined, false); sph(.05, '#ffcf6a', tx + .4, .72, tz - .2, undefined, 0, false); }
    { const sx = X(-6.6), sz = Z(-3.6); box(.5, 2, 1.8, '#8a5a3b', sx, 1, sz); for (let r = 0; r < 3; r++) { box(.52, .06, 1.82, '#6b4a2f', sx + .01, .4 + r * .6, sz, undefined, false); for (let k = 0; k < 6; k++) box(.3, .42 + hash(r * 9 + k) * .1, .16, ['#d6402f', '#2563c9', '#7fb05c', '#f6d36b', '#8a7cc2', '#e8742a'][(r + k) % 6], sx + .02, .66 + r * .6, sz - .7 + k * .27, undefined, false); } solidBox(sx, sz, .6, 1.9, 2); }
    // Empreintes de renard qui relient les souvenirs (le « parcours du renard »)
    for (let i = 0; i < 22; i++) { const x = X(-5.8 + i * .5), z = Z(-2.6 + Math.sin(i * .7) * .25 + (i % 2 ? .12 : -.12)), m = sph(.07, '#4a3626', x, .036, z, undefined, 0, false); m.scale.set(1, .12, 1.3); }

    /* ---------- Les souvenirs du parcours (socle + objet + plaque) ---------- */
    const SP = [];   // { x, z, kind, i }
    const plinth = (x, z) => { box(.9, .72, .9, '#9a6b42', x, .36, z); box(1, .06, 1, '#7a5236', x, .74, z, undefined, false); box(.42, .16, .03, '#d9b84a', x, .45, z + .46, undefined, false); solidBox(x, z, .95, .95, 1); };
    const step = (i, x, z, make) => { plinth(x, z); make(x, .77, z); SP.push({ x, z: z + .9, kind: 'trail', i }); };
    // 2019 Gulfstream Communication : porte-voix et page web
    step(5, X(-5.2), Z(-4.1), (x, y, z) => { const m = cone(.22, .5, '#f6d36b', x - .1, y + .3, z, 10); m.rotation.z = Math.PI / 2 + .3; cyl(.06, .06, .2, '#2f3640', x + .18, y + .12, z, 6); box(.34, .26, .03, '#f6efe0', x + .2, y + .2, z - .25, undefined, false).rotation.x = -.3; });
    // 2020 Metsys : tablette et ses applis
    step(4, X(-3.4), Z(-4.1), (x, y, z) => { const tb = box(.5, .36, .04, '#2f3640', x, y + .22, z, undefined, true); tb.rotation.x = -.35; for (let k = 0; k < 6; k++) { const c = box(.1, .08, .02, ['#e8742a', '#2563c9', '#7fb05c', '#f6d36b', '#8a7cc2', '#d6402f'][k], x - .14 + (k % 3) * .14, y + .2 + (k < 3 ? .07 : -.04), z + .03, undefined, false); c.rotation.x = -.35; } });
    // 2022 Atos : petit tableau blanc sur chevalet
    step(3, X(-1.6), Z(-4.1), (x, y, z) => { box(.7, .5, .04, '#f6f6f2', x, y + .42, z, undefined, true); [[-.15, .5, '#2563c9'], [.12, .42, '#d6402f'], [-.05, .34, '#7fb05c']].forEach(([dx, yy, c]) => box(.26, .03, .02, c, x + dx, y + yy, z + .03, undefined, false)); for (const s of [-1, 1]) { const l = box(.04, .5, .04, '#7a5236', x + s * .25, y + .2, z + .08, undefined, false); l.rotation.x = .2; } });
    // 2022–2023 TGS France : le téléphone des appels à froid
    step(2, X(.2), Z(-4.1), (x, y, z) => { box(.42, .14, .32, '#d6402f', x, y + .07, z); const h = cyl(.05, .05, .44, '#b8331f', x, y + .2, z - .02, 6); h.rotation.z = Math.PI / 2; sph(.07, '#b8331f', x - .22, y + .2, z - .02, undefined, 0, false); sph(.07, '#b8331f', x + .22, y + .2, z - .02, undefined, 0, false); cyl(.1, .1, .02, '#f6efe0', x, y + .15, z + .1, 10, undefined, false).rotation.x = -.6; });
    // 2023–2025 Sopra Steria : baie de serveurs (cloud souverain), croix d'hôpital (marchés santé)
    step(1, X(2), Z(-4.1), (x, y, z) => { box(.42, .62, .36, '#2f3640', x, y + .31, z); for (let k = 0; k < 4; k++) { box(.36, .03, .02, '#5d6670', x, y + .12 + k * .13, z + .19, undefined, false); box(.03, .03, .02, k % 2 ? '#7fd36b' : '#6fb8ff', x + .14, y + .12 + k * .13, z + .2, undefined, false); }
      box(.16, .05, .03, '#d6402f', x - .3, y + .5, z + .1, undefined, false); box(.05, .16, .03, '#d6402f', x - .3, y + .5, z + .1, undefined, false); });
    // 2026 Dell Technologies : le badge et son cordon
    step(0, X(3.8), Z(-4.1), (x, y, z) => { cyl(.05, .07, .5, '#5d6670', x, y + .25, z, 6); box(.34, .46, .03, '#f6efe0', x, y + .5, z + .03); box(.34, .1, .035, '#2563c9', x, y + .68, z + .03, undefined, false); box(.14, .14, .035, '#d9d4c8', x - .06, y + .48, z + .04, undefined, false);
      const lan = new THREE.Mesh(new THREE.TorusGeometry(.26, .02, 4, 16, Math.PI), W.M('#2563c9')); lan.position.set(x, y + .73, z + .03); W.R.group.add(lan); });
    // Certifications : quatre cadres au mur, au-dessus des socles
    for (let k = 0; k < 4; k++) { const x = X(-3.9 + k * 1.95); box(.66, .5, .05, '#7a5236', x, 2.05, Z(-4.6)); box(.54, .38, .06, '#f6efe0', x, 2.05, Z(-4.6), undefined, false); box(.12, .12, .07, '#d9b84a', x + .15, 1.95, Z(-4.6), undefined, false); }
    SP.push({ x: X(0), z: Z(-3.2), kind: 'certs', r: 1.1 });
    // Formation (toque sur une pile de livres) et loisirs (ballon de hand, casque de motocross), côté est
    { const x = X(6.4), z = Z(-1.4); plinth(x, z); [['#2563c9', .1], ['#7fb05c', .22], ['#d6402f', .34]].forEach(([c, y], k) => box(.5 - k * .04, .1, .36, c, x, .77 + y - .05, z, undefined, false)); box(.4, .03, .4, '#2f2a24', x, 1.2, z, undefined, true).rotation.y = .5; cyl(.13, .15, .1, '#2f2a24', x, 1.14, z, 8, undefined, false); cyl(.01, .01, .2, '#f6d36b', x + .18, 1.1, z + .1, 3, undefined, false); SP.push({ x: x - .9, z, kind: 'edu' }); }
    { const x = X(6.4), z = Z(.6); plinth(x, z);   // ordinateur portable (développement web) ; le ballon et le casque sont des souvenirs à rapporter (story.js)
      box(.56, .03, .4, '#5d6670', x, .79, z + .05); const sc = box(.56, .36, .03, '#2f3640', x, .97, z - .15); sc.rotation.x = -.25; for (let k = 0; k < 4; k++) box(.18 + (k % 2) * .12, .025, .01, ['#7fd36b', '#6fb8ff', '#f6d36b', '#f2b8c6'][k], x - .12 + (k % 2) * .06, 1.06 - k * .06, z - .13, undefined, false).rotation.x = -.25;
      SP.push({ x: x - .9, z, kind: 'hobbies' }); }
    // Le tableau de chasse (chiffres de la fiche) : ardoise sur pied
    { const x = X(-2.2), z = Z(-1.1), tx = textTex(512, 320, (g, w, h) => { g.fillStyle = '#2f3a33'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a8764a'; g.lineWidth = 18; g.strokeRect(0, 0, w, h); g.fillStyle = '#f6efe0'; g.textAlign = 'center';
        g.font = 'bold 70px "Patrick Hand",sans-serif'; ['650 k€+', '115+', '500'].forEach((s, i) => g.fillText(s, w / 2, 98 + i * 92)); });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .7), new THREE.MeshLambertMaterial({ map: tx })); p.position.set(x, 1.15, z); p.rotation.x = -.15; W.R.group.add(p);
      box(1.2, .8, .05, '#a8764a', x, 1.15, z - .03).rotation.x = -.15; for (const s of [-1, 1]) box(.05, 1.2, .05, '#7a5236', x + s * .5, .6, z - .1); solidBox(x, z, 1.2, .3, 1.5); SP.push({ x, z: z + .8, kind: 'stats' }); }
    // Le butin (la baguette volée), sur la table basse
    const loot = W.dyn((() => { const g = new THREE.Group(); cyl(.32, .3, .03, '#f6efe0', 0, 0, 0, 12, g); const bg = cyl(.07, .08, .62, '#d9a35c', 0, .07, 0, 7, g); bg.rotation.z = Math.PI / 2; bg.rotation.y = .5; return g; })());
    loot.position.set(X(-2.4), .56, Z(1.9)); SP.push({ x: X(-2.4), z: Z(2.7), kind: 'loot', r: 1 });
    // Tableau de liège (fiche complète + LinkedIn)
    { const x = X(-7.25), z = Z(-.6); const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 2; W.R.group.add(g);
      box(1.7, 1.1, .06, '#c9935a', 0, 1.45, 0, g); box(1.82, 1.22, .05, '#7a5236', 0, 1.45, -.02, g, false);
      [[-.5, 1.7, '#f6efe0'], [.1, 1.62, '#f6d36b'], [.55, 1.75, '#8fc9df'], [-.35, 1.2, '#f2b8c6'], [.35, 1.18, '#f6efe0']].forEach(([dx, y, c], k) => { const n = box(.36, .28, .02, c, dx, y, .05, g, false); n.rotation.z = (hash(k) - .5) * .3; sph(.025, '#d6402f', dx, y + .1, .07, g, 0, false); });
      box(.5, .18, .02, '#0a66c2', 0, .95, .05, g, false);
      for (const s of [-1, 1]) box(.06, 1.5, .06, '#7a5236', s * .8, .75, -.04, g, false); }
    const board = W.interact({ x: X(-6.4), y: 1.4, z: Z(-.6) }, 1.6, () => HOOKS.openProfile?.());
    board.den = 'board'; SP.push({ x: X(-6.2), z: Z(-.6), kind: 'board', r: 1.4 });
    // Étagère aux souvenirs (rapportés des autres zones, voir story.js)
    { const x = X(4.2), z = Z(3.9); for (let r = 0; r < 2; r++) box(3.2, .06, .5, '#7a5236', x, .55 + r * .55, z); for (const s of [-1.6, 1.6]) box(.08, 1.2, .5, '#6b4a2f', x + s, .6, z); solidBox(x, z, 3.3, .6, 1.3); SP.push({ x, z: z - .9, kind: 'shelf', r: 1.5 }); }
    const shelf = { x: X(4.2), z: Z(3.9), slots: Array.from({ length: 9 }, (_, k) => ({ x: X(4.2 - 1.3 + (k % 5) * .65), y: .6 + (k < 5 ? 0 : .55), z: Z(3.9) })) };

    /* ---------- Plaque d'information (au bas de l'écran) ---------- */
    const el = document.createElement('div'); el.className = 'den-plaque'; el.hidden = true; el.setAttribute('aria-live', 'polite'); document.body.append(el);
    let shown = null;
    const html = sp => {
      const T_ = t(), d = T_.den;
      if (sp.kind === 'trail') { const [y, co, role, txt] = T_.trail[sp.i]; return `<small>${y}</small><b>${co}</b><i>${role}</i><p>${txt}</p>`; }
      if (sp.kind === 'certs') return `<b>${T_.bCerts}</b><p>${T_.certs.join(' · ')}</p>`;
      if (sp.kind === 'edu') return `<b>${T_.bEdu}</b><p>${T_.edu.join('<br>')}</p>`;
      if (sp.kind === 'hobbies') return `<b>${T_.bOut}</b><p>${T_.hobbies.join(' · ')}</p>`;
      if (sp.kind === 'stats') return `<b>${d.stats}</b><p>${T_.stats.filter(s => !s[0].includes('{')).map(s => `<strong>${s[0]}</strong> ${s[1]}`).join('<br>')}</p>`;
      if (sp.kind === 'loot') return `<b>${d.loot}</b><p>${run.loot ? T_.loot1 : T_.loot0}</p>`;
      if (sp.kind === 'board') return `<b>${d.boardHint}</b><p>${d.board}</p>`;
      if (sp.kind === 'shelf') return `<b>${d.shelf}</b><p>${d.shelfText(HOOKS.souvenirs?.() ?? 0)}</p>`;
      return '';
    };
    HOOKS.leaveDen = () => { shown = null; el.hidden = true; };   // au départ en voyage (la mise à jour du lieu s'arrête avec lui)
    W.update(() => {
      loot.visible = !!run.loot && W.R.active;
      const here = S.region === 'terrier' && !S.paused;
      let best = null, bd = 1e9; if (here) for (const sp of SP) { const d = flat2(fox.pos, sp); if (d < (sp.r || 1.25) && d < bd) { bd = d; best = sp; } }
      if (best !== shown) { shown = best; el.hidden = !best; if (best) { el.innerHTML = html(best); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); } }
    });
    return { shelf };
  },
});

/** Entrée par le terrier du village : ouvre la salle (construite à la première visite) et y emmène le renard. */
HOOKS.enterDen = () => {
  openHidden('terrier');
  teleport(X(-5.6), Z(3), Math.PI * .75, () => { cam.zoomT = Math.min(cam.zoomT, .9); });
};
