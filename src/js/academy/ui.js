/* =====================================================================
   Académie Dell Storage : la fenêtre d'apprentissage (#acad). Une seule fenêtre, plusieurs écrans :
   salle (formateur), point clé, quiz (QCM, associations, schémas), missions client, simulation commerciale,
   défi chronométré, laboratoire, évaluation finale, tableau de progression.
   Accessible au clavier (dialogs.js : focus, Tab, inert), Échap ferme, le jeu est en pause pendant ce temps.
   ===================================================================== */
import { SFX } from '../audio.js';
import { canvas } from '../engine.js';
import { HOOKS } from '../hooks.js';
import { $ } from '../hud.js';
import { keys } from '../input.js';
import { S, modalOpen } from '../state.js';
import { E } from './engine.js';
import { KINDS, KIND_IDS, ROOM, ROOMS, RULES } from './meta.js';

const el = $('#acad'), body = $('#acadBody'), kick = $('#acadKick'), ttl = $('#acadTitle'), foot = $('#acadFoot');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const T = o => esc(E.tx(o));
const U = () => E.ui();
const pct = v => Math.round(Math.max(0, Math.min(1, v)) * 100);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** Liens vers le décor (laboratoire) : remplis par regions/academie.js. */
export const world = { labState: null, labReset: null };

let acts = {}, keyFn = null, wasPaused = false, timer = null;

/* ---------- Ouverture, fermeture ---------- */
export const acadOpen = () => !el.hidden;
export function openAcad(what, a, b) {
  if (!S.started) return;
  if (el.hidden) { wasPaused = S.paused; S.paused = true; for (const k in keys) keys[k] = false; }
  el.hidden = false; HOOKS.leaveAcad?.();   // la plaque d'aide du décor s'efface
  if (!E.C()) {
    frame({ k: U().title, t: U().loading, html: `<p class="ac-load" role="status">${esc(U().loading)}</p>`, noFoot: true });
    E.loadContent().then(() => { if (!el.hidden) route(what, a, b); }, () => { if (!el.hidden) frame({ k: U().title, t: U().title, html: `<p class="ac-load" role="alert">${esc(U().loadFail)}</p>`, actions: { retry: () => openAcad(what, a, b) }, extra: `<button class="big" data-act="retry">${esc(U().retry)}</button>` }); });
    return;
  }
  route(what, a, b);
}
export function closeAcad() {
  if (el.hidden) return;
  stopTimer(); el.hidden = true; keyFn = null;
  S.paused = wasPaused || !!S.cine || modalOpen(); canvas.focus();
}
function route(what, a, b) {
  const roomScreens = { room: home, fact, quiz, client, mission, sim };
  if (roomScreens[what]) { if (!E.roomOpen(a)) return locked(a); return roomScreens[what](a, b); }
  ({ flash, board, lab, labDone, final, locked })[what]?.(a, b);
}
$('#acadClose').addEventListener('click', closeAcad);
el.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || !el.contains(b) || b.disabled) return; const f = acts[b.dataset.act]; if (f) { e.preventDefault(); f(b.dataset.v, b); } });
addEventListener('keydown', e => {
  if (el.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeAcad(); return; }
  if (keyFn && !e.ctrlKey && !e.metaKey && !e.altKey && keyFn(e)) e.preventDefault();
}, true);

/** Dessine un écran : surtitre, titre, contenu, actions (data-a), pied (niveau, points, boutons). */
function frame({ k, t, html, actions = {}, color, onKey = null, noFoot = false, extra = '', boardBtn = true }) {
  stopTimer();
  el.style.setProperty('--ac', color || '#2563c9');
  kick.textContent = k || ''; ttl.textContent = t || '';
  body.innerHTML = html; acts = { board: () => board(), close: closeAcad, ...actions }; keyFn = onKey;
  if (noFoot) foot.innerHTML = '';
  else {
    const lv = E.levelOf(), span = lv.next ? (E.A.xp - lv.base) / (lv.next - lv.base) : 1;
    foot.innerHTML = `<div class="ac-lv"><b>${esc(U().level)} ${esc(lv.name)}</b><span>${E.A.xp} ${esc(U().xp)}</span><i class="ac-bar"><i data-w="${pct(span)}"></i></i></div>`
      + `<div class="ac-fbtn">${extra}${boardBtn ? `<button class="alt" data-act="board">📊 ${esc(U().board)}</button>` : ''}<button class="alt" data-act="close">${esc(U().close)}</button></div>`;
  }
  for (const n of el.querySelectorAll('[data-w]')) n.style.width = n.dataset.w + '%';
  for (const n of el.querySelectorAll('[data-c]')) n.style.setProperty('--c', n.dataset.c);
  body.scrollTop = 0;
  const f = body.querySelector('[data-autofocus]') || body.querySelector('button:not([disabled]),select,a[href]');
  (f || body).focus({ preventScroll: true });
}
const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };
const rk = r => `${esc(U().room(r.n))} · ${T(r.tag)}`;
const kindTag = k => `<span class="ac-kind" data-k="${k}">${KINDS[k].icon} ${T(KINDS[k].name)}</span>`;
const bar = (v, cls = '') => `<i class="ac-bar ${cls}"><i data-w="${pct(v)}"></i></i>`;
const srcList = ids => { const S_ = E.C().SOURCES; return `<ul class="ac-src">${ids.map(id => S_[id]).filter(Boolean).map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a> <small>(${esc(s.d)})</small></li>`).join('')}</ul>`; };

/* ---------- Salle fermée ---------- */
function locked(id) {
  const r = ROOM[id], prev = ROOMS[E.roomIndex(id) - 1];
  frame({ k: rk(r), t: `🔒 ${U().locked}`, color: r.color, html: `<p>${esc(U().lockedWhy(E.tx(prev.name)))}</p>`, extra: `<button class="big" data-act="prev">${esc(U().quiz)} ${T(prev.name)}</button>`, actions: { prev: () => quiz(prev.id) } });
}

/* ---------- La salle (le formateur) ---------- */
function home(id) {
  const r = ROOM[id], c = E.roomContent(id), m = E.mastery(id), A = E.A;
  const nSeen = c.facts.filter(f => A.seen[f.id]).length, misOk = c.missions.filter(x => (A.mis[x.id] || 0) >= .5).length;
  const facts = c.facts.map(f => `<li><button class="ac-row${A.seen[f.id] ? ' seen' : ''}" data-act="fact" data-v="${f.id}"><span>${KINDS[f.kind].icon}</span><b>${T(f.title)}</b><em>${A.seen[f.id] ? '✓ ' + esc(U().seen) : esc(U().toSee)}</em></button></li>`).join('');
  const html = `<p class="ac-say"><b>${T(r.trainer)}</b> · ${T(c.intro)}</p>
    <div class="ac-mast"><span>${esc(U().mastery)} <b>${pct(m.total)} %</b></span>${bar(m.total)}<small>${A.badges[id] ? '🏅 ' + esc(U().badgeGot) : esc(U().badgeHow)}</small></div>
    <h3>${esc(U().facts)} <small>${nSeen}/${c.facts.length}</small></h3><ul class="ac-list">${facts}</ul>
    <div class="ac-acts">
      <button class="ac-card" data-act="quiz"><b>❓ ${esc(U().quiz)}</b><span>${c.quiz.length} questions${A.tries[id] ? ' · ' + esc(U().best(`${Math.round((A.quiz[id] || 0) * 10) / 10}/${c.quiz.length}`)) : ''}</span></button>
      <button class="ac-card" data-act="client"><b>🧑‍💼 ${esc(U().missions)}</b><span>${misOk}/${c.missions.length} · ${esc(U().sim)}${A.sim[id] !== undefined ? ' ' + pct(A.sim[id]) + ' %' : ''}</span></button>
    </div>`;
  frame({ k: rk(r), t: E.tx(r.name), color: r.color, html, actions: { fact: v => fact(id, v), quiz: () => quiz(id), client: () => client(id) } });
}

/* ---------- Un point clé ---------- */
function fact(id, fid) {
  const r = ROOM[id], c = E.roomContent(id), i = c.facts.findIndex(f => f.id === fid), f = c.facts[i]; if (!f) return home(id);
  E.seeFact(id, f); SFX.scribble?.();
  const nxt = c.facts.slice(i + 1).find(x => !E.A.seen[x.id]) || c.facts[(i + 1) % c.facts.length];
  const html = `${kindTag(f.kind)}<p class="ac-text">${T(f.text)}</p>
    ${f.simple ? `<p class="ac-note simple"><b>💡 ${esc(U().simple)}</b> ${T(f.simple)}</p>` : ''}
    ${f.limit ? `<p class="ac-note limit"><b>⚠️ ${esc(U().limit)}</b> ${T(f.limit)}</p>` : ''}
    <details class="ac-det"><summary>${esc(U().sources)}</summary>${srcList(f.src)}<small>${esc(U().checked(E.C().CHECKED))}</small></details>`;
  frame({ k: `${rk(r)} · ${i + 1}/${c.facts.length}`, t: E.tx(f.title), color: r.color, html,
    extra: `<button class="alt" data-act="home">← ${esc(U().facts)}</button>${nxt && nxt !== f ? `<button class="big" data-act="next" data-autofocus>${esc(U().next)} →</button>` : ''}`,
    actions: { home: () => home(id), next: () => fact(id, nxt.id) } });
}

/* ---------- Quiz : QCM, associations, schémas ---------- */
function quiz(id) {
  const r = ROOM[id], c = E.roomContent(id);
  const qs = c.quiz.map(q => q.type === 'match' ? { ...q, order: shuffle(q.pairs.map((_, k) => k)) } : { ...q, order: shuffle(q.opts.map((_, k) => k)) });
  const st = { i: 0, pts: 0, per: {}, missed: [] };
  const show = () => {
    const q = qs[st.i]; let inner = '';
    if (q.type === 'match') {
      inner = `<p class="ac-hint">${esc(U().matchHint)}</p><div class="ac-match">${q.pairs.map((p, k) => `<label class="ac-mrow"><span>${T(p[0])}</span><select data-k="${k}"><option value="">${esc(U().choose)}</option>${q.order.map(j => `<option value="${j}">${T(q.pairs[j][1])}</option>`).join('')}</select></label>`).join('')}</div>
        <button class="big" data-act="check">${esc(U().validate)}</button>`;
    } else {
      inner = (q.type === 'archi' ? `<p class="ac-hint">${esc(U().archiHint)}</p>` : '') + `<div class="ac-opts">${q.order.map(j => `<button class="ac-opt${q.type === 'archi' ? ' chain' : ''}" data-act="ans" data-v="${j}">${q.type === 'archi' ? q.opts[j].map(s => `<span>${T(s)}</span>`).join('<i aria-hidden="true">→</i>') : T(q.opts[j])}</button>`).join('')}</div>`;
    }
    frame({ k: `${esc(U().quiz)} · ${E.tx(r.name)}`, t: U().qOf(st.i + 1, qs.length), color: r.color,
      html: `<p class="ac-q">${T(q.q)}</p>${inner}<div class="ac-fb" role="status"></div>`,
      actions: { ans: v => answer(q, +v), check: () => checkMatch(q), next: () => { st.i++; if (st.i < qs.length) show(); else end(); } },
      onKey: e => { if (q.type === 'match') return false; const n = +e.key; if (n >= 1 && n <= q.opts.length && !body.querySelector('.ac-opt[disabled]')) { answer(q, q.order[n - 1]); return true; } return false; } });
  };
  const feedback = (ok, why, partial = false) => {
    const fb = body.querySelector('.ac-fb'); fb.className = 'ac-fb ' + (ok ? 'ok' : partial ? 'mid' : 'ko');
    fb.innerHTML = `<b>${ok ? '✓ ' + esc(U().right) : partial ? '≈ ' + esc(U().half) : '✗ ' + esc(U().wrong)}</b> ${T(why)}<br><button class="big" data-act="next" data-autofocus>${esc(U().next)} →</button>`;
    (ok ? SFX.ding : SFX.question)?.();
    fb.querySelector('button').focus({ preventScroll: true });
  };
  const answer = (q, j) => {
    const ok = j === q.ok;
    for (const b of body.querySelectorAll('.ac-opt')) { b.disabled = true; const v = +b.dataset.v; if (v === q.ok) b.classList.add('ok'); else if (v === j) b.classList.add('ko'); }
    st.pts += ok ? 1 : 0; st.per[q.id] = ok ? 1 : 0; if (!ok) st.missed.push(q);
    feedback(ok, q.why);
  };
  const checkMatch = q => {
    const sel = [...body.querySelectorAll('.ac-match select')];
    if (sel.some(s => s.value === '')) { const s = sel.find(x => x.value === ''); s.focus(); s.classList.add('need'); return; }
    let good = 0;
    sel.forEach(s => { const k = +s.dataset.k, ok = +s.value === k; good += ok; s.disabled = true; const row = s.closest('.ac-mrow'); row.classList.add(ok ? 'ok' : 'ko');
      if (!ok) row.insertAdjacentHTML('beforeend', `<em>→ ${T(q.pairs[k][1])}</em>`); });
    body.querySelector('[data-act="check"]').remove();
    const v = good / q.pairs.length; st.pts += v; st.per[q.id] = v; if (v < 1) st.missed.push(q);
    feedback(v === 1, q.why, v > 0 && v < 1);
  };
  const end = () => {
    const res = E.recordQuiz(id, st.pts, st.per), n = qs.length, s = Math.round(st.pts * 10) / 10;
    if (st.pts / n >= .7) SFX.tada?.();
    const miss = st.missed.map(q => `<li><b>${T(q.q)}</b><br><span>${T(q.why)}</span></li>`).join('');
    const nxt = ROOMS[E.roomIndex(id) + 1];
    frame({ k: `${esc(U().quiz)} · ${E.tx(r.name)}`, t: U().quizEnd(s, n), color: r.color,
      html: `<p class="ac-big">${pct(st.pts / n)} %</p><p>${esc(U().best(`${Math.round(res.best * 10) / 10}/${n}`))}${res.x ? ` · <b>${esc(U().gained(res.x))}</b>` : ''}</p>
        ${miss ? `<h3>${esc(U().missed)}</h3><ul class="ac-miss">${miss}</ul>` : ''}`,
      extra: `<button class="alt" data-act="again">${esc(U().again)}</button><button class="alt" data-act="home">← ${T(r.name)}</button>${res.unlocked ? `<button class="big" data-act="nextRoom" data-autofocus>🔓 ${T(nxt.name)}</button>` : ''}`,
      actions: { again: () => quiz(id), home: () => home(id), nextRoom: () => { closeAcad(); HOOKS.notebookClick?.(nxt.id); } } });
  };
  show();
}

/* ---------- Le client : missions et simulation ---------- */
function client(id) {
  const r = ROOM[id], c = E.roomContent(id), A = E.A;
  const st = x => A.mis[x.id] === undefined ? U().misTodo : A.mis[x.id] >= 1 ? '✓ ' + U().misSolved : A.mis[x.id] >= .5 ? '≈ ' + U().misLate : '✗ ' + U().misTodo;
  const html = `<ul class="ac-list">${c.missions.map(x => `<li><button class="ac-row${(A.mis[x.id] || 0) >= .5 ? ' seen' : ''}" data-act="mis" data-v="${x.id}"><span>🧑‍💼</span><b>${T(x.client)}</b><em>${esc(st(x))}</em></button></li>`).join('')}
    <li><button class="ac-row${(A.sim[id] || 0) >= RULES.badgeSim ? ' seen' : ''}" data-act="sim"><span>🤝</span><b>${esc(U().sim)} · ${T(c.sim.client)}</b><em>${A.sim[id] !== undefined ? pct(A.sim[id]) + ' %' : esc(U().misTodo)}</em></button></li></ul>`;
  frame({ k: rk(r), t: U().missions, color: r.color, html, extra: `<button class="alt" data-act="home">← ${T(r.name)}</button>`,
    actions: { mis: v => mission(id, v), sim: () => sim(id), home: () => home(id) } });
}
function mission(id, mid) {
  const r = ROOM[id], c = E.roomContent(id), m = c.missions.find(x => x.id === mid); if (!m) return client(id);
  const order = shuffle(m.choices.map((_, k) => k)), fresh = E.A.mis[mid] === undefined; let tries = 0, solved = false;
  frame({ k: `${esc(U().missions)} · ${E.tx(r.name)}`, t: E.tx(m.client), color: r.color,
    html: `<blockquote class="ac-need">${T(m.need)}</blockquote><p class="ac-q">${esc(U().misPick)}</p>
      <div class="ac-opts">${order.map(k => `<button class="ac-opt" data-act="pick" data-v="${k}">${T(m.choices[k].t)}</button>`).join('')}</div><div class="ac-fb" role="status"></div>`,
    extra: `<button class="alt" data-act="back">← ${esc(U().missions)}</button>`,
    actions: { back: () => client(id), pick: (v, b) => {
      if (solved) return; const ch = m.choices[+v]; tries++;
      E.recordMission(id, mid, ch.ok, fresh && tries === 1);
      b.disabled = true; b.classList.add(ch.ok >= 1 ? 'ok' : ch.ok > 0 ? 'mid' : 'ko');
      const fb = body.querySelector('.ac-fb'); fb.className = 'ac-fb ' + (ch.ok >= 1 ? 'ok' : ch.ok > 0 ? 'mid' : 'ko');
      solved = ch.ok >= 1;
      const nx = c.missions[c.missions.indexOf(m) + 1];
      fb.innerHTML = `<b>${ch.ok >= 1 ? '✓ ' + esc(U().right) : ch.ok > 0 ? '≈ ' + esc(U().partial) : '✗ ' + esc(U().wrong)}</b> ${T(ch.why)}`
        + (solved ? `<br><button class="big" data-act="${nx ? 'nextM' : 'back'}" data-autofocus>${nx ? esc(U().next) + ' →' : '← ' + esc(U().missions)}</button>` : `<br><small>${esc(U().retry)} : ${esc(U().misPick).toLowerCase()}</small>`);
      if (solved) { for (const o of body.querySelectorAll('.ac-opt')) o.disabled = true; SFX.ding?.(); fb.querySelector('button').focus({ preventScroll: true }); }
      else { SFX.question?.(); (body.querySelector('.ac-opt:not([disabled])') || fb).focus({ preventScroll: true }); }
      acts.nextM = () => mission(id, nx.id);
    } } });
}
/** Simulation commerciale : qualifier (choisir les questions), proposer, justifier. */
function sim(id) {
  const r = ROOM[id], c = E.roomContent(id), s = c.sim, pick = s.pick || 3;
  runSim({ k: `${esc(U().sim)} · ${E.tx(r.name)}`, color: r.color, s, pick,
    done: (score, parts) => {
      const x = E.recordSim(id, score); if (score >= RULES.badgeSim) SFX.tada?.();
      frame({ k: `${esc(U().sim)} · ${E.tx(r.name)}`, t: U().simTotal(pct(score)), color: r.color,
        html: `<p class="ac-big">${pct(score)} %</p><p>${esc(U().simScore(pct(parts.q), pct(parts.s), pct(parts.a)))}${x ? ` · <b>${esc(U().gained(x))}</b>` : ''}</p>`,
        extra: `<button class="alt" data-act="again">${esc(U().again)}</button><button class="big" data-act="back" data-autofocus>← ${esc(U().missions)}</button>`,
        actions: { again: () => sim(id), back: () => client(id) } });
    } });
}
/** Déroulé commun (simulation de salle et qualification de l'évaluation finale). */
function runSim({ k, color, s, pick, done, sol = true, title }) {
  const chosen = new Set(), qs = shuffle(s.questions.map((_, i) => i));
  const ask = () => frame({ k, t: title || E.tx(s.client), color,
    html: `<blockquote class="ac-need">${T(s.brief)}</blockquote><p class="ac-q">${esc(U().simQ(pick))} <b class="ac-count">0/${pick}</b></p>
      <div class="ac-opts">${qs.map(i => `<button class="ac-opt tog" aria-pressed="false" data-act="tog" data-v="${i}">${T(s.questions[i].q)}</button>`).join('')}</div>
      <button class="big" data-act="go" disabled>${esc(U().simAsk)}</button>`,
    actions: { tog: (v, b) => { const i = +v; if (chosen.has(i)) chosen.delete(i); else if (chosen.size < pick) chosen.add(i); b.setAttribute('aria-pressed', String(chosen.has(i)));
        body.querySelector('.ac-count').textContent = `${chosen.size}/${pick}`; body.querySelector('[data-act="go"]').disabled = chosen.size !== pick; },
      go: answers } });
  const answers = () => {
    const list = [...chosen].map(i => s.questions[i]), q = list.filter(x => x.good).length / pick;
    frame({ k, t: title || E.tx(s.client), color,
      html: `<ul class="ac-ans">${list.map(x => `<li class="${x.good ? 'ok' : 'ko'}"><b>${T(x.q)}</b><span>${T(x.reveal)}</span><em>${x.good ? '✓ ' + esc(U().simGood) : '✗ ' + esc(U().simBad)}</em></li>`).join('')}</ul>
        <button class="big" data-act="on" data-autofocus>${esc(U().next)} →</button>`,
      actions: { on: () => (sol ? choose(s.solutions, U().simSol, v => choose(s.args, U().simArg, a => done(.3 * q + .4 * v + .3 * a, { q, s: v, a }))) : done(q, { q })) } });
  };
  const choose = (opts, prompt, then) => {
    const order = shuffle(opts.map((_, i) => i));
    frame({ k, t: title || E.tx(s.client), color,
      html: `<p class="ac-q">${esc(prompt)}</p><div class="ac-opts">${order.map(i => `<button class="ac-opt" data-act="c" data-v="${i}">${T(opts[i].t)}</button>`).join('')}</div><div class="ac-fb" role="status"></div>`,
      actions: { c: v => { const o = opts[+v]; for (const b of body.querySelectorAll('.ac-opt')) { b.disabled = true; const w = opts[+b.dataset.v]; if (w.ok >= 1) b.classList.add('ok'); else if (+b.dataset.v === +v) b.classList.add(o.ok > 0 ? 'mid' : 'ko'); }
        const fb = body.querySelector('.ac-fb'); fb.className = 'ac-fb ' + (o.ok >= 1 ? 'ok' : o.ok > 0 ? 'mid' : 'ko');
        fb.innerHTML = `<b>${o.ok >= 1 ? '✓ ' + esc(U().right) : o.ok > 0 ? '≈ ' + esc(U().partial) : '✗ ' + esc(U().wrong)}</b> ${T(o.why)}<br><button class="big" data-act="on" data-autofocus>${esc(U().next)} →</button>`;
        (o.ok >= 1 ? SFX.ding : SFX.question)?.(); acts.on = () => then(o.ok); fb.querySelector('button').focus({ preventScroll: true }); } } });
  };
  ask();
}

/* ---------- Défi chronométré : « Classe-le ! » ---------- */
function flash() {
  const pool = E.C().TERMS.filter(x => E.roomOpen(x.room));
  const intro = `<p>${esc(U().flashRules)}</p><p>${esc(U().flashBest(E.A.flash.best || 0))}</p>`;
  if (pool.length < 4) return frame({ k: U().title, t: U().flash, html: intro + `<p class="ac-note limit">${esc(U().flashNeed)}</p>` });
  frame({ k: U().title, t: U().flash, html: intro + `<button class="big" data-act="go" data-autofocus>${esc(U().start)}</button>`, actions: { go: play } });
  function play() {
    let deck = shuffle(pool), i = 0, good = 0, left = 60, cur = null; const errs = [];
    frame({ k: U().title, t: U().flash, noFoot: true,
      html: `<div class="ac-flash"><p class="ac-timer" aria-live="off"><b>60</b> s · <span class="ac-score">0</span> ✓</p><p class="ac-term" role="status"></p>
        <div class="ac-kinds">${KIND_IDS.map((k, n) => `<button class="ac-opt" data-act="k" data-v="${k}"><kbd>${n + 1}</kbd> ${KINDS[k].icon} ${T(KINDS[k].name)}</button>`).join('')}</div></div>`,
      actions: { k: v => pickK(v) }, onKey: e => { const n = +e.key; if (n >= 1 && n <= 5) { pickK(KIND_IDS[n - 1]); return true; } return false; } });
    const term = body.querySelector('.ac-term'), tm = body.querySelector('.ac-timer b'), sc = body.querySelector('.ac-score'), box = body.querySelector('.ac-flash');
    const nextT = () => { if (i >= deck.length) { deck = shuffle(pool); i = 0; } cur = deck[i++]; term.textContent = E.tx(cur.t); };
    const pickK = k => { if (!cur || left <= 0) return; const ok = k === cur.k; if (ok) { good++; SFX.coin?.(); } else { errs.push(cur); SFX.question?.(); }
      sc.textContent = good; box.classList.remove('ok', 'ko'); void box.offsetWidth; box.classList.add(ok ? 'ok' : 'ko'); nextT(); };
    nextT();
    const t0 = performance.now();
    timer = setInterval(() => { left = Math.max(0, 60 - (performance.now() - t0) / 1000); tm.textContent = Math.ceil(left); if (left <= 0) { stopTimer(); finish(); } }, 200);
    function finish() {
      const x = E.recordFlash(good); SFX.tada?.();
      const seen = new Set(), rec = errs.filter(e => !seen.has(e) && seen.add(e)).map(e => `<li><b>${T(e.t)}</b> → ${KINDS[e.k].icon} ${T(KINDS[e.k].name)}<br><span>${T(e.why)}</span></li>`).join('');
      frame({ k: U().title, t: U().flashEnd(good), html: `<p class="ac-big">${good} ✓</p><p>${esc(U().flashBest(E.A.flash.best))}${x ? ` · <b>${esc(U().gained(x))}</b>` : ''}</p>${rec ? `<h3>${esc(U().missed)}</h3><ul class="ac-miss">${rec}</ul>` : ''}`,
        extra: `<button class="big" data-act="go" data-autofocus>${esc(U().again)}</button>`, actions: { go: play } });
    }
  }
}

/* ---------- Tableau de progression ---------- */
export function boardHTML(compact = false) {
  const A = E.A, lv = E.levelOf(), L_ = E.lang();
  const rows = ROOMS.map(r => {
    const open = E.roomOpen(r.id), m = E.mastery(r.id);
    return `<li class="ac-brow${open ? '' : ' locked'}" data-c="${r.color}"><span class="ac-dot"></span><b>${esc(U().room(r.n))} · ${T(r.name)}</b>
      <em>${!open ? '🔒' : A.badges[r.id] ? '🏅' : m.started ? pct(m.total) + ' %' : esc(U().notStarted)}</em>${open ? bar(m.total) : ''}
      ${open && m.started && !compact ? `<small>${L_ === 'fr' ? 'Découverte' : 'Discovery'} ${pct(m.explore)} % · ${esc(U().quiz)} ${pct(m.quiz)} % · ${esc(U().missions)} ${pct(m.missions)} % · ${esc(U().sim)} ${pct(m.sim)} %</small>` : ''}</li>`;
  }).join('');
  const weak = E.weakAreas(), ns = E.nextStep();
  const nsTxt = ns.act === 'lab' ? `🧪 ${U().lab}` : ns.act === 'final' ? `🎓 ${U().final}` : ns.act === 'done' ? (L_ === 'fr' ? '🎉 Tout est validé. Bravo !' : '🎉 Everything is complete. Well done!')
    : ns.room ? `${U().room(ns.room.n)} · ${E.tx(ns.room.name)} : ${{ facts: U().facts, quiz: U().quiz, missions: U().missions, sim: U().sim }[ns.act]}` : U().nbHint;
  return `<div class="ac-level"><b>${esc(U().level)} ${esc(lv.name)}</b><span>${A.xp} ${esc(U().xp)}${lv.next ? ` / ${lv.next}` : ''}</span>${bar(lv.next ? (A.xp - lv.base) / (lv.next - lv.base) : 1)}</div>
    <p class="ac-next"><b>${esc(U().nextStep)} :</b> ${esc(nsTxt)}</p>
    <ul class="ac-board">${rows}</ul>
    <p class="ac-extra">🧪 ${esc(U().lab)} : ${A.lab ? '✓ ' + esc(U().labDone) : E.labOpen() ? esc(U().misTodo) : '🔒'} · 🎓 ${esc(U().final)} : ${A.final.passed ? '✓ ' + pct(A.final.best) + ' %' : E.finalOpen() ? (A.final.n ? pct(A.final.best) + ' %' : esc(U().misTodo)) : '🔒'} · ⏱️ ${esc(U().flashBest(A.flash.best || 0))}</p>
    ${compact ? '' : `<h3>${esc(U().weak)}</h3>${weak.length ? `<ul class="ac-weak">${weak.map(w => `<li><b>${T(w.room.name)}</b> · ${esc(w.why.join(' · '))}${w.missed.length ? `<br><small>${w.missed.slice(0, 2).map(q => '« ' + T(q) + ' »').join(' ')}</small>` : ''}</li>`).join('')}</ul>` : `<p>${esc(U().weakNone)}</p>`}`}`;
}
function board() {
  const C_ = E.C(), src = Object.values(C_.SOURCES).map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a> <small>(${esc(s.d)})</small></li>`).join('');
  let armed = false;
  frame({ k: U().title, t: U().board, boardBtn: false,
    html: boardHTML() + `<details class="ac-det"><summary>${esc(U().sources)}</summary><ul class="ac-src">${src}</ul><small>${esc(U().checked(C_.CHECKED))}</small></details>
      <p class="ac-disc">${esc(U().unofficial)}</p><button class="alt ac-reset" data-act="reset">${esc(U().reset)}</button>`,
    actions: { reset: (v, b) => { if (!armed) { armed = true; b.textContent = U().resetSure; b.classList.add('armed'); return; } E.resetAcademy(); world.labReset?.(); board(); } } });
}

/* ---------- Laboratoire ---------- */
function lab() {
  const LB = E.C().LAB, st = world.labState?.() || {};
  if (!E.labOpen()) return frame({ k: U().title, t: `🔒 ${U().lab}`, html: `<p>${esc(U().labLocked)}</p>` });
  frame({ k: `🧪 ${U().lab}`, t: E.tx(LB.title), color: '#2f8f9d',
    html: `<p>${T(LB.brief)}</p><h3>${esc(U().labSlots)}</h3><ul class="ac-list">${LB.slots.map(s => { const b = st[s.id] && LB.blocks.find(x => x.id === st[s.id]); return `<li class="ac-slot${b ? ' ok' : ''}"><b>${T(s.label)}</b><em>${b ? '✓ ' + T(b.name) : esc(U().labEmpty)}</em></li>`; }).join('')}</ul>
      ${E.A.lab ? `<p class="ac-note simple">✓ ${T(LB.done)}</p>` : ''}`,
    extra: `<button class="alt" data-act="reset">${esc(U().labReset)}</button>`, actions: { reset: () => { world.labReset?.(); closeAcad(); } } });
}
function labDone() {
  const LB = E.C().LAB, x = E.completeLab(); SFX.fanfare?.();
  frame({ k: `🧪 ${U().lab}`, t: `✓ ${U().labDone}`, color: '#2f8f9d', html: `<p class="ac-big">🧪</p><p>${T(LB.done)}</p>${x ? `<p><b>${esc(U().gained(x))}</b></p>` : ''}` });
}

/* ---------- Évaluation finale ---------- */
function final() {
  const F = E.C().FINAL;
  if (!E.finalOpen()) return frame({ k: U().title, t: `🔒 ${U().final}`, html: `<p>${esc(U().finalLocked)}</p>` });
  frame({ k: `🎓 ${U().final}`, t: E.tx(F.client), color: '#c9a33d', html: `<p>${esc(U().finalIntro)}</p>${E.A.final.n ? `<p>${esc(U().best(pct(E.A.final.best) + ' %'))}</p>` : ''}<button class="big" data-act="go" data-autofocus>${esc(U().start)}</button>`,
    actions: { go: () => runSim({ k: `🎓 ${U().final}`, color: '#c9a33d', s: { ...F.qualify, client: F.client, brief: F.brief }, pick: F.qualify.pick, sol: false, done: q => steps(q) }) } });
  function steps(q) {
    let i = 0, sum = 0; const fails = [];
    const show = () => {
      const st = F.steps[i], order = shuffle(st.opts.map((_, k) => k));
      frame({ k: `🎓 ${U().final} · ${i + 1}/${F.steps.length}`, t: E.tx(st.title), color: '#c9a33d',
        html: `<p class="ac-q">${T(st.q)}</p><div class="ac-opts">${order.map(k => `<button class="ac-opt" data-act="c" data-v="${k}">${T(st.opts[k].t)}</button>`).join('')}</div><div class="ac-fb" role="status"></div>`,
        actions: { c: v => { const o = st.opts[+v]; sum += o.ok; if (o.ok < 1) fails.push(st);
          for (const b of body.querySelectorAll('.ac-opt')) { b.disabled = true; const w = st.opts[+b.dataset.v]; if (w.ok >= 1) b.classList.add('ok'); else if (+b.dataset.v === +v) b.classList.add(o.ok > 0 ? 'mid' : 'ko'); }
          const fb = body.querySelector('.ac-fb'); fb.className = 'ac-fb ' + (o.ok >= 1 ? 'ok' : o.ok > 0 ? 'mid' : 'ko');
          fb.innerHTML = `<b>${o.ok >= 1 ? '✓ ' + esc(U().right) : o.ok > 0 ? '≈ ' + esc(U().partial) : '✗ ' + esc(U().wrong)}</b> ${T(o.why)}<br><button class="big" data-act="on" data-autofocus>${esc(U().next)} →</button>`;
          (o.ok >= 1 ? SFX.ding : SFX.question)?.(); fb.querySelector('button').focus({ preventScroll: true }); },
        on: () => { i++; if (i < F.steps.length) show(); else end(); } } });
    };
    const end = () => {
      const score = .2 * q + .8 * (sum / F.steps.length), pass = score >= F.pass, x = E.recordFinal(score);
      (pass ? SFX.fanfare : SFX.question)?.();
      frame({ k: `🎓 ${U().final}`, t: U().finalScore(pct(score)), color: '#c9a33d',
        html: `<p class="ac-big">${pass ? '🎓' : '📚'} ${pct(score)} %</p><p><b>${esc(pass ? U().finalPass : U().finalFail)}</b>${x ? ` · ${esc(U().gained(x))}` : ''}</p>
          ${fails.length ? `<h3>${esc(U().missed)}</h3><ul class="ac-miss">${fails.map(s => `<li><b>${T(s.title)}</b><br><span>${T(s.opts.find(o => o.ok >= 1).why)}</span></li>`).join('')}</ul>` : ''}`,
        extra: `<button class="alt" data-act="again">${esc(U().again)}</button>`, actions: { again: final } });
    };
    show();
  }
}
