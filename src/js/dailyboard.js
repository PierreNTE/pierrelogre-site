/* =====================================================================
   Défi du jour terminé : classement du jour (meilleur temps de chaque pseudo) et envoi de son temps.
   Affiché dans la carte de fin du défi (main.js) ; le carnet de voyage montre aussi le top du jour (journal.js).
   ===================================================================== */
import { $ } from './hud.js';
import { cleanPseudo, ONLINE, pseudoOk, submitDaily, topDaily } from './leaderboard.js';
import { saved, store, t } from './state.js';

/** 83.4 → « 1:23.4 » (au dixième : départage les ex æquo). */
export const fmtTime = s => { s = Math.max(0, +s || 0); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, '0')}`; };

/** Liste HTML d'un classement de temps (pseudos insérés en texte, jamais en HTML). */
export function fillTimes(ol, list, me) {
  ol.innerHTML = list.map((x, i) => `<li${x.pseudo === me ? ' class="me"' : ''}><b>${i + 1}</b><span></span><em>${fmtTime(x.secs)}</em></li>`).join('') || `<li class="empty">${t().dlEmpty}</li>`;
  ol.querySelectorAll('li span').forEach((sp, i) => { sp.textContent = list[i].pseudo; });
}

let cur = null;   // { day, secs }
async function render() {
  if (!cur) return;
  const { list, online } = await topDaily(cur.day);
  fillTimes($('#dlTop'), list, saved.pseudo);
  $('#dlOnline').textContent = online ? t().lbOnline : (ONLINE ? t().lbOffline : t().lbLocal);
}
/** Carte de fin du défi : formulaire (pseudo déjà rempli s'il est connu) et classement du jour. */
export function showDailyBoard(secs, day) {
  cur = { day, secs };
  $('#endLb').hidden = false;
  $('#dlPseudo').value = saved.pseudo || ''; $('#dlSend').disabled = false; $('#dlSent').textContent = '';
  $('#dlTop').innerHTML = `<li class="empty">${t().lbLoading}</li>`;
  render();
}
export function hideDailyBoard() { cur = null; $('#endLb').hidden = true; }

$('#dlSend').addEventListener('click', async () => {
  if (!cur) return;
  const p = cleanPseudo($('#dlPseudo').value);
  if (p.length < 2) { $('#dlSent').textContent = t().mgPseudoShort; return; }
  if (!pseudoOk($('#dlPseudo').value)) { $('#dlSent').textContent = t().mgPseudoBad; return; }
  saved.pseudo = p; store.set(saved); $('#dlSend').disabled = true;
  const ok = await submitDaily(p, cur.secs, cur.day);
  $('#dlSent').textContent = ok ? t().dlSentOnline : t().dlSentLocal;
  render();
});
// Le champ garde ses touches (pas de glapissement en tapant) ; Entrée envoie
$('#dlPseudo').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); $('#dlSend').click(); } });
