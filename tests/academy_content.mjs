// Contrôle du contenu de l'Académie Dell Storage (sans navigateur) : node tests/academy_content.mjs
// Vérifie que chaque fait cite des sources connues, que chaque question a une bonne réponse valide, que chaque mission
// et chaque simulation ont une meilleure réponse unique, que tout existe dans les deux langues, et que les sources sont
// des pages Dell (une exception signalée : la fiche Data Protection Suite de décembre 2025, diffusée par TechTarget).
import { CHECKED, FINAL, LAB, ROOM_CONTENT, SOURCES, TERMS } from '../src/js/academy/content/index.js';
import { KIND_IDS, ROOMS } from '../src/js/academy/meta.js';

const errs = [], ids = new Set();
const bad = (where, msg) => errs.push(`${where} : ${msg}`);
const txt = (o, where) => { if (!o || typeof o.fr !== 'string' || typeof o.en !== 'string' || !o.fr.trim() || !o.en.trim()) bad(where, 'texte manquant en français ou en anglais'); };
const uniq = (id, where) => { if (!id) return bad(where, 'identifiant manquant'); if (ids.has(id)) bad(where, `identifiant en double : ${id}`); ids.add(id); };
const best = (list, where) => { const top = list.filter(c => c.ok >= 1).length; if (top !== 1) bad(where, `il faut exactement une meilleure réponse (${top})`); for (const [i, c] of list.entries()) { txt(c.t, `${where} choix ${i}`); txt(c.why, `${where} explication ${i}`); if (!(c.ok >= 0 && c.ok <= 1)) bad(where, 'score de choix hors de [0, 1]'); } };
const OFFICIAL = /^https:\/\/((www\.|investors\.)?dell(technologies)?\.com|dell\.com)\//;

if (!/^\d{4}-\d{2}-\d{2}$/.test(CHECKED)) bad('sources', 'date de vérification illisible');
for (const [k, s] of Object.entries(SOURCES)) {
  if (!s.t || !s.u || !s.d) bad(`source ${k}`, 'titre, adresse ou date manquants');
  if (!OFFICIAL.test(s.u) && k !== 'dps_ds') bad(`source ${k}`, `adresse hors des sites Dell : ${s.u}`);
}
const used = new Set();
const roomIds = ROOMS.map(r => r.id);
if (roomIds.join() !== Object.keys(ROOM_CONTENT).join()) bad('salles', `les salles de meta.js et du contenu diffèrent (${roomIds} / ${Object.keys(ROOM_CONTENT)})`);
for (const r of ROOMS) {
  const c = ROOM_CONTENT[r.id], w = `salle ${r.id}`; if (!c) { bad(w, 'contenu absent'); continue; }
  txt(r.name, w); txt(r.tag, w); txt(r.trainer, w); txt(r.hello, w); txt(c.intro, w);
  if (c.facts.length < 4) bad(w, 'moins de 4 points clés');
  for (const f of c.facts) { const fw = `${w} fait ${f.id}`; uniq(f.id, fw); txt(f.title, fw); txt(f.text, fw); if (f.simple) txt(f.simple, fw); if (f.limit) txt(f.limit, fw);
    if (!KIND_IDS.includes(f.kind)) bad(fw, `nature inconnue : ${f.kind}`);
    if (!f.src?.length) bad(fw, 'aucune source'); for (const s of f.src || []) { if (!SOURCES[s]) bad(fw, `source inconnue : ${s}`); used.add(s); } }
  if (c.quiz.length < 5) bad(w, 'moins de 5 questions');
  const types = new Set(c.quiz.map(q => q.type));
  for (const t of ['mcq', 'match', 'archi']) if (!types.has(t)) bad(w, `pas de question de type ${t}`);
  for (const q of c.quiz) { const qw = `${w} question ${q.id}`; uniq(q.id, qw); txt(q.q, qw); txt(q.why, qw);
    if (q.type === 'match') { if (q.pairs.length < 3) bad(qw, 'moins de 3 associations'); for (const [a, b] of q.pairs) { txt(a, qw); txt(b, qw); } const right = q.pairs.map(p => p[1].fr); if (new Set(right).size !== right.length) bad(qw, 'deux propositions identiques'); }
    else { if (!(q.opts.length >= 3)) bad(qw, 'moins de 3 options'); if (!(Number.isInteger(q.ok) && q.ok >= 0 && q.ok < q.opts.length)) bad(qw, `bonne réponse hors des options (${q.ok})`);
      for (const o of q.opts) { if (q.type === 'archi') { if (!Array.isArray(o) || o.length < 2) bad(qw, 'schéma à moins de 2 étapes'); else o.forEach(s => txt(s, qw)); } else txt(o, qw); } } }
  if (c.missions.length < 2) bad(w, 'moins de 2 missions');
  for (const m of c.missions) { const mw = `${w} mission ${m.id}`; uniq(m.id, mw); txt(m.client, mw); txt(m.need, mw); best(m.choices, mw); }
  const s = c.sim, sw = `${w} simulation`; txt(s.client, sw); txt(s.brief, sw);
  if (s.questions.filter(q => q.good).length < s.pick) bad(sw, 'pas assez de bonnes questions pour la qualification');
  if (!s.questions.some(q => !q.good)) bad(sw, 'aucune question piège (la qualification serait triviale)');
  for (const q of s.questions) { txt(q.q, sw); txt(q.reveal, sw); }
  best(s.solutions, sw + ' (solution)'); best(s.args, sw + ' (argument)');
}
for (const t of TERMS) { const tw = `défi « ${t.t?.fr} »`; txt(t.t, tw); txt(t.why, tw); if (!KIND_IDS.includes(t.k)) bad(tw, `catégorie inconnue : ${t.k}`); if (!roomIds.includes(t.room)) bad(tw, `salle inconnue : ${t.room}`); }
for (const k of KIND_IDS) if (!TERMS.some(t => t.k === k)) bad('défi', `aucun terme de catégorie ${k}`);
const blockIds = LAB.blocks.map(b => b.id);
for (const s of LAB.slots) { txt(s.label, `labo socle ${s.id}`); if (!blockIds.includes(s.want)) bad(`labo socle ${s.id}`, `bloc attendu inconnu : ${s.want}`); }
if (new Set(LAB.slots.map(s => s.want)).size !== LAB.slots.length) bad('labo', 'deux socles attendent le même bloc');
for (const b of LAB.blocks) { txt(b.name, `labo bloc ${b.id}`); txt(b.role, `labo bloc ${b.id}`); }
for (const [k, v] of Object.entries(LAB.wrong)) { const [b, s] = k.split('>'); if (!blockIds.includes(b) || (s !== '*' && !LAB.slots.some(x => x.id === s))) bad('labo', `erreur expliquée pour une combinaison inconnue : ${k}`); txt(v, `labo ${k}`); }
txt(LAB.generic, 'labo'); txt(LAB.done, 'labo'); txt(FINAL.client, 'évaluation'); txt(FINAL.brief, 'évaluation');
if (FINAL.qualify.questions.filter(q => q.good).length < FINAL.qualify.pick) bad('évaluation', 'pas assez de bonnes questions');
if (FINAL.steps.length < 5) bad('évaluation', 'moins de 5 étapes');
for (const s of FINAL.steps) { uniq(s.id, `évaluation ${s.id}`); txt(s.title, s.id); txt(s.q, s.id); best(s.opts, `évaluation ${s.id}`); }
for (const k of Object.keys(SOURCES)) if (!used.has(k)) bad(`source ${k}`, 'jamais citée');

const n = { facts: 0, quiz: 0, missions: 0 };
for (const c of Object.values(ROOM_CONTENT)) { n.facts += c.facts.length; n.quiz += c.quiz.length; n.missions += c.missions.length; }
if (errs.length) { console.log(JSON.stringify({ ok: false, errs })); process.exit(1); }
console.log(JSON.stringify({ ok: true, rooms: ROOMS.length, ...n, sims: ROOMS.length, terms: TERMS.length, sources: Object.keys(SOURCES).length, checked: CHECKED }));
