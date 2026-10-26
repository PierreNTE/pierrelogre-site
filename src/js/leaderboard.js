/* =====================================================================
   Classement partagé du mini-jeu « Tir au renard ».
   - Si src/site.config.json contient leaderboard.api (ex. « /api/ ») : classement en ligne, servi par la petite API PHP
     du même hébergement OVH (www/api/, code dans server/), qui seule parle à la base MySQL. Même adresse que le site :
     aucune clé, aucun domaine extérieur. Lecture : meilleur score de chaque pseudo ; ajout contrôlé côté serveur.
   - Sinon (ou si le réseau échoue, ou si l'API refuse) : classement local, gardé dans ce navigateur.
   ===================================================================== */
import SITE from '../site.config.json';
import { store } from './state.js';

const CFG = SITE.leaderboard || {};
/** Adresse de l'API : un chemin du site lui-même (« /api/ »), jamais un autre domaine. */
export const ONLINE = typeof CFG.api === 'string' && /^\/[a-z0-9/_-]*\/$/.test(CFG.api);
const API = ONLINE ? CFG.api : '';
const HEAD = { 'Content-Type': 'application/json' };
const LKEY = 'fox-leaderboard';

/** Pseudo propre : 2 à 16 caractères, lettres / chiffres / espace / - _ . */
export function cleanPseudo(s) {
  return String(s || '').normalize('NFC').replace(/[^\p{L}\p{N} _.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
}
/**
 * Pseudos abusifs : racines d'insultes et d'injures (FR / EN), cherchées sans accents, sans espaces
 * ni ponctuation et en défaisant le « l33t » (0→o, 1→i, 3→e, 4→a, 5→s, @→a, $→s). Liste volontairement
 * courte et sans mots qui piégeraient des prénoms courants (Monique, Dickens…). La même règle existe côté serveur (server/lib/regles.php).
 */
const BANNED = ['connard', 'connasse', 'salope', 'salaud', 'encul', 'putain', 'merde', 'batard', 'couille', 'niquer', 'niktamer', 'fdp', 'ntm', 'tapette', 'bougnoul', 'youpin', 'nazi', 'hitler',
  'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'whore', 'slut', 'nigg', 'faggot', 'porn', 'violeur', 'pedophil', 'pedofil'];
const deleet = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[0134@$5]/g, c => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', '@': 'a', $: 's', 5: 's' })[c]).replace(/[^a-z]/g, '');
/** Vrai si le pseudo est acceptable (longueur et vocabulaire). */
export function pseudoOk(s) { const p = cleanPseudo(s); if (p.length < 2) return false; return ![deleet(p), deleet(String(s || ''))].some(n => BANNED.some(w => n.includes(w))); }
const local = () => (store.get(LKEY).list || []);
/** Meilleur score de chaque pseudo (un même joueur n'occupe pas tout le classement), du plus haut au plus bas. */
const best = list => { const m = new Map(); for (const x of list) if (!m.has(x.pseudo) || m.get(x.pseudo).score < x.score) m.set(x.pseudo, x); return [...m.values()].sort((a, b) => b.score - a.score); };
function addLocal(pseudo, score) {
  const list = local(); list.push({ pseudo, score, at: Date.now() });
  list.sort((a, b) => b.score - a.score); store.set({ list: list.slice(0, 20) }, LKEY);
}
let lastSend = 0;
const withTimeout = (p, ms = 5000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** Top 10 : { list: [{pseudo, score}], online: bool } */
export async function top(game = 'handball') {
  if (ONLINE) {
    try {
      // le meilleur score de chaque pseudo, 10 au plus (server/lib/api.php, fox_scores)
      const r = await withTimeout(fetch(`${API}scores.php?game=${encodeURIComponent(game)}`, { credentials: 'omit' }));
      if (r.ok) return { list: best((await r.json()).filter(x => pseudoOk(x.pseudo)).map(x => ({ pseudo: cleanPseudo(x.pseudo), score: x.score | 0 }))), online: true };
    } catch (e) { /* hors ligne : classement local */ }
  }
  return { list: best(local().filter(x => pseudoOk(x.pseudo))).slice(0, 10), online: false };
}
/** Envoie un score. Renvoie true si le classement en ligne l'a accepté. */
export async function submit(pseudo, score, game = 'handball') {
  pseudo = cleanPseudo(pseudo); score = Math.max(0, Math.min(20000, score | 0));
  if (!pseudoOk(pseudo)) return false;
  // Anti-spam côté navigateur : un envoi en ligne toutes les 20 secondes au plus (la base limite aussi)
  const now = Date.now(); if (now - lastSend < 20000) { addLocal(pseudo, score); return false; } lastSend = now;
  addLocal(pseudo, score);
  if (!ONLINE) return false;
  try {
    const r = await withTimeout(fetch(API + 'scores.php', { method: 'POST', headers: HEAD, body: JSON.stringify({ pseudo, score, game }), credentials: 'omit' }));
    return r.ok;
  } catch (e) { return false; }
}

/* ---------- Classement du défi du jour : le meilleur temps de chaque pseudo, jour par jour ----------
   API www/api/daily.php (table daily_times, vue daily_leaderboard : server/schema.sql) ; repli local si la base ne répond pas. */
const DKEY = 'fox-leaderboard-defi';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const fastest = list => { const m = new Map(); for (const x of list) if (!m.has(x.pseudo) || m.get(x.pseudo).secs > x.secs) m.set(x.pseudo, x); return [...m.values()].sort((a, b) => a.secs - b.secs); };
const localDaily = () => store.get(DKEY).list || [];
function addLocalDaily(day, pseudo, secs) {
  const days = [...new Set([...localDaily().map(x => x.day), day])].sort().slice(-7);   // une semaine au plus
  const list = localDaily().filter(x => days.includes(x.day)); list.push({ day, pseudo, secs });
  store.set({ list: list.slice(-80) }, DKEY);
}
let lastDaily = 0;
/** Top 10 du jour : { list: [{pseudo, secs}], online: bool } */
export async function topDaily(day) {
  if (ONLINE && DAY.test(day)) {
    try {
      const r = await withTimeout(fetch(`${API}daily.php?day=${day}`, { credentials: 'omit' }));
      if (r.ok) return { list: fastest((await r.json()).filter(x => pseudoOk(x.pseudo)).map(x => ({ pseudo: cleanPseudo(x.pseudo), secs: +x.secs }))).slice(0, 10), online: true };
    } catch (e) { /* hors ligne : classement local */ }
  }
  return { list: fastest(localDaily().filter(x => x.day === day && pseudoOk(x.pseudo))).slice(0, 10), online: false };
}
/** Envoie le temps du défi du jour. Renvoie true si le classement en ligne l'a accepté. */
export async function submitDaily(pseudo, secs, day) {
  pseudo = cleanPseudo(pseudo); secs = Math.round(Math.min(7200, Math.max(0, +secs || 0)) * 10) / 10;
  if (!pseudoOk(pseudo) || !DAY.test(day)) return false;
  addLocalDaily(day, pseudo, secs);
  const now = Date.now(); if (!ONLINE || secs < 10 || now - lastDaily < 20000) return false; lastDaily = now;
  try {
    const r = await withTimeout(fetch(API + 'daily.php', { method: 'POST', headers: HEAD, body: JSON.stringify({ day, pseudo, secs }), credentials: 'omit' }));
    return r.ok;
  } catch (e) { return false; }
}
