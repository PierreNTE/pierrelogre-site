/* =====================================================================
   Classement partagé du mini-jeu « Tir au renard ».
   - Si src/site.config.json contient leaderboard.supabaseUrl + publishableKey : classement en ligne
     (table publique « scores », lecture et ajout seulement, vue « leaderboard », voir supabase/leaderboard.sql).
     La clé « publishable » est publique par conception : la sécurité vient des règles RLS côté base.
     Ne JAMAIS mettre une clé secrète (sb_secret_… ou « service_role ») ici : elle serait refusée.
   - Sinon (ou si le réseau échoue) : classement local, gardé dans ce navigateur.
   ===================================================================== */
import SITE from '../site.config.json';
import { store } from './state.js';

const CFG = SITE.leaderboard || {};
/** Clé publique : « publishable » (sb_publishable_…, recommandée) ou ancienne clé « anon » (JWT). Jamais de clé secrète. */
const KEY = CFG.publishableKey || CFG.anonKey || '';
export const ONLINE = !!(CFG.supabaseUrl && KEY && /^https:\/\//.test(CFG.supabaseUrl) && !/^sb_secret_/.test(KEY));
const API = ONLINE ? CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' : '';
// La clé publishable n'est pas un jeton : elle va seulement dans « apikey » (un en-tête Authorization la ferait refuser)
const HEAD = ONLINE ? Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, /^eyJ/.test(KEY) ? { Authorization: 'Bearer ' + KEY } : {}) : {};
const LKEY = 'fox-leaderboard';

/** Pseudo propre : 2 à 16 caractères, lettres / chiffres / espace / - _ . */
export function cleanPseudo(s) {
  return String(s || '').normalize('NFC').replace(/[^\p{L}\p{N} _.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
}
/**
 * Pseudos abusifs : racines d'insultes et d'injures (FR / EN), cherchées sans accents, sans espaces
 * ni ponctuation et en défaisant le « l33t » (0→o, 1→i, 3→e, 4→a, 5→s, @→a, $→s). Liste volontairement
 * courte et sans mots qui piégeraient des prénoms courants (Monique, Dickens…). La même règle existe côté base.
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
      // vue « leaderboard » : le meilleur score de chaque pseudo (supabase/leaderboard.sql)
      const r = await withTimeout(fetch(`${API}leaderboard?select=pseudo,score&game=eq.${encodeURIComponent(game)}&order=score.desc&limit=10`, { headers: HEAD, credentials: 'omit' }));
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
    const r = await withTimeout(fetch(API + 'scores', { method: 'POST', headers: { ...HEAD, Prefer: 'return=minimal' }, body: JSON.stringify({ pseudo, score, game }), credentials: 'omit' }));
    return r.ok;
  } catch (e) { return false; }
}
