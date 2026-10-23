/* Contrôle de toutes les bêtises (tests/run_all.py, test_rings) :
   1. chaque déclencheur (zone, glapir, ramassage, action, objet, carte postale, gland) est atteignable à pied ;
   2. chaque anneau de dépôt : un objet qui tombe dans l'anneau compte, et lâché face au centre depuis l'anneau aussi. */
(async () => {
  const F = window.__fox, f = F.fox, wait = ms => new Promise(r => setTimeout(r, ms));
  F.start('libre', false); await wait(400); F.dev.skipTuto(); await wait(200);
  for (const R of F.REGIONS) { try { F.unlockRegion(R, false); } catch (e) {} }
  for (const R of F.REGIONS) { try { F.ensureBuilt(R); } catch (e) {} await wait(30); }
  // Académie : toutes les salles ouvertes (sinon leurs portes vitrées ferment l'intérieur, comme prévu)
  if (F.dev.academy) { F.dev.academy.unlockAll(); await wait(300); }
  await wait(500);
  // Porte du datacenter ouverte (badge) : le robot et la clim sont derrière ; le terrier (salle cachée) a son propre test
  { const badge = F.items.find(i => i.kind === 'badge'); if (badge) { f.pos.set(-18, 0, -110.2); f.yaw = Math.PI; f.held = badge; badge.held = true; F.dropHeld(); await wait(800); } }
  // --- Grilles praticables (flood depuis l'arrivée de chaque région) ---
  const STEP = .25, inWalk = (x, z) => F.WALK.some(w => x >= w.minX && x <= w.maxX && z >= w.minZ && z <= w.maxZ);
  const ok = (x, z) => inWalk(x, z) && !F.blockedAt(x, z, f.r);
  const grids = [];
  for (const R of F.REGIONS) {
    const b = R.bounds; if (!b || !R.spawn) continue;
    const x0 = b.minX - 2, z0 = b.minZ - 2, nx = Math.ceil((b.maxX - b.minX + 4) / STEP), nz = Math.ceil((b.maxZ - b.minZ + 4) / STEP);
    const seen = new Uint8Array(nx * nz), q = [];
    const cell = (x, z) => [Math.round((x - x0) / STEP), Math.round((z - z0) / STEP)];
    let [sx, sz] = cell(R.spawn.x, R.spawn.z), found = false;
    for (let rr = 0; rr < 12 && !found; rr++) for (let dx = -rr; dx <= rr && !found; dx++) for (let dz = -rr; dz <= rr && !found; dz++) { const i = sx + dx, j = sz + dz; if (i >= 0 && j >= 0 && i < nx && j < nz && ok(x0 + i * STEP, z0 + j * STEP)) { sx = i; sz = j; found = true; } }
    if (!found) { grids.push({ id: R.id, err: 'arrivée bloquée' }); continue; }
    seen[sx + sz * nx] = 1; q.push(sx, sz);
    for (let h = 0; h < q.length; h += 2) {
      const i = q[h], j = q[h + 1];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, c = j + dj; if (a < 0 || c < 0 || a >= nx || c >= nz || seen[a + c * nx]) continue; if (ok(x0 + a * STEP, z0 + c * STEP)) { seen[a + c * nx] = 1; q.push(a, c); } else seen[a + c * nx] = 2; }
      if (h % 20000 === 0) await wait(0);
    }
    grids.push({ id: R.id, x0, z0, nx, nz, seen, cells: q.length / 2 });
  }
  const reach = (x, z) => grids.some(g => { if (!g.seen) return false; const i = Math.round((x - g.x0) / STEP), j = Math.round((z - g.z0) / STEP); return i >= 0 && j >= 0 && i < g.nx && j < g.nz && g.seen[i + j * g.nx] === 1; });
  const reachWithin = (p, r) => { for (let dx = -r; dx <= r; dx += STEP) for (let dz = -r; dz <= r; dz += STEP) if (dx * dx + dz * dz <= r * r && reach(p.x + dx, p.z + dz)) return true; return false; };
  const rnd2 = v => Math.round(v * 100) / 100;
  // --- Déclencheurs atteignables ? ---
  const bad = [];
  for (const R of F.REGIONS) {
    if (R.id === 'terrier') continue;
    for (const z of R.zones || []) { const okz = z.rect ? (() => { for (let x = z.rect.minX; x <= z.rect.maxX; x += STEP) for (let y = z.rect.minZ; y <= z.rect.maxZ; y += STEP) if (reach(x, y)) return true; return false; })() : reachWithin(z.pos, z.r - .02); if (!okz) bad.push({ type: 'zone', region: R.id, pos: z.rect ? z.rect : [rnd2(z.pos.x), rnd2(z.pos.z)], r: z.r, fn: String(z.fn).slice(0, 140) }); }
    for (const y of R.yaps || []) { const p = typeof y.pos.x === 'number' ? y.pos : null; if (p && !reachWithin(p, y.r - .02)) bad.push({ type: 'glapir', region: R.id, pos: [rnd2(p.x), rnd2(p.z)], r: y.r, fn: String(y.fn).slice(0, 140) }); }
    for (const p of R.pickups || []) if (!reachWithin(p.pos, p.r - .02)) bad.push({ type: 'ramassage', region: R.id, goal: p.goal, key: p.key, pos: [rnd2(p.pos.x), rnd2(p.pos.z)], r: p.r });
    if (R.card && !reachWithin(R.card.pos, .88)) bad.push({ type: 'carte postale', region: R.id, pos: [rnd2(R.card.pos.x), rnd2(R.card.pos.z)] });
  }
  const T = F.RG.terrier && F.RG.terrier.bounds, inT = p => T && p.x >= T.minX && p.x <= T.maxX && p.z >= T.minZ && p.z <= T.maxZ;
  for (const ia of F.interacts) if (!inT(ia.pos) && !reachWithin(ia.pos, ia.r - .02)) bad.push({ type: 'action E', pos: [rnd2(ia.pos.x), rnd2(ia.pos.z)], r: ia.r, fn: String(ia.action).slice(0, 140) });
  for (const it of F.items) if (!it.gone && !reachWithin(it.pos, 2.5)) bad.push({ type: 'objet', kind: it.kind, region: it.region, pos: [rnd2(it.pos.x), rnd2(it.pos.z)] });
  for (const p of F.props) if (p.goal && !reachWithin(p.pos, p.r + f.r + .05)) bad.push({ type: 'à renverser', goal: p.goal, region: p.region, pos: [rnd2(p.pos.x), rnd2(p.pos.z)] });
  for (const a of F.acorns) if (!reachWithin(a.pos, .78)) bad.push({ type: 'gland', i: a.i, pos: [rnd2(a.pos.x), rnd2(a.pos.z)] });
  // --- Anneaux de dépôt : là où l'anneau dit « ici », est-ce que ça compte ? ---
  const snap = it => ({ done: Object.keys(F.run.done).filter(k => F.run.done[k]), prog: Object.fromEntries(Object.entries(F.run.progress || {}).map(([k, v]) => [k, [...v]])), gone: !!it.gone, sink: !!it.sinking });
  const drops = [];
  const seenKinds = new Set();
  for (const it of F.items) {
    if (it.gone || seenKinds.has(it.kind + (it.kind === 'baton' ? '' : it.region))) continue;
    f.pos.set(it.pos.x, 0, it.pos.z); f.held = it; it.held = true;
    let d = F.destinationFor(it);
    if (d && it.kind === 'baguette' && it.region === 'paris') { f.pos.set(d.pos.x, 0, d.pos.z); }
    if (!d) { // la baguette de Paris : l'anneau n'apparaît qu'au village
      f.pos.set(-5, 0, 5); d = F.destinationFor(it);
    }
    f.held = null; it.held = false;
    if (!d) continue;
    seenKinds.add(it.kind + (it.kind === 'baton' ? '' : it.region));
    f.pos.set(d.pos.x, 0, d.pos.z); f.held = it; it.held = true; d = F.destinationFor(it) || d; f.held = null; it.held = false;
    const C = { x: d.pos.x, z: d.pos.z }, r = d.r, home = it.pos.clone();
    const res = { kind: it.kind, region: it.region, ring: [rnd2(C.x), rnd2(C.z), r], n: 0, fail: 0, landInRingFail: 0, faceFail: 0, faceN: 0, ex: [] };
    const pts = [[0, 0]]; for (const k of [.35, .7, .95]) for (let a = 0; a < 8; a++) pts.push([Math.cos(a * Math.PI / 4) * k * r, Math.sin(a * Math.PI / 4) * k * r]);
    for (const [dx, dz] of pts) {
      const x = C.x + dx, z = C.z + dz; if (!reach(x, z)) continue;
      const face = Math.atan2(C.x - x, C.z - z);
      const yaws = [0, 1, 2, 3, 4, 5, 6, 7].map(i => i * Math.PI / 4); if (dx || dz) yaws.push(face);
      yaws.forEach((yaw, yi) => {
        const isFace = yi === 8;
        it.pos.copy(home); it.gone = false; it.sinking = 0; it.inWater = false; it.mesh.visible = true;
        f.pos.set(x, 0, z); f.yaw = yaw; f.vel.set(0, 0, 0); f.held = it; it.held = true;
        const before = snap(it);
        try { F.dropHeld(); } catch (e) { res.err = String(e); }
        const after = snap(it);
        const success = after.done.length > before.done.length || Object.keys(after.prog).some(k => (after.prog[k] || []).length > (before.prog[k] || []).length) || (after.gone && !before.gone) || (after.sink && !before.sink);
        const land = [rnd2(it.pos.x), rnd2(it.pos.z)], inRing = Math.hypot(it.pos.x - C.x, it.pos.z - C.z) <= r;
        if (isFace) { res.faceN++; if (!success) res.faceFail++; } else { res.n++; if (!success) { res.fail++; if (inRing) res.landInRingFail++; if (res.ex.length < 4) res.ex.push({ renard: [rnd2(x), rnd2(z)], cap: rnd2(yaw), objet: land, dansAnneau: inRing }); } }
        // remise à zéro
        for (const k of after.done) if (!before.done.includes(k)) delete F.run.done[k];
        for (const k of Object.keys(after.prog)) { const s = F.run.progress[k]; if (s) for (const v of after.prog[k]) if (!(before.prog[k] || []).includes(v)) s.delete(v); }
        f.held = null; it.held = false;
      });
    }
    it.pos.copy(home); it.gone = false; it.sinking = 0; it.mesh.visible = true;
    drops.push(res);
  }
  return { grids: grids.map(g => ({ id: g.id, cells: g.cells, err: g.err })), bad, drops };
})