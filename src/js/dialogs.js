/* =====================================================================
   Fenêtres accessibles au clavier et aux lecteurs d'écran
   - à l'ouverture : le focus entre dans la fenêtre (bouton principal, sinon premier élément) ;
   - Tab et Maj+Tab tournent en boucle dans la fenêtre ;
   - le reste de la page devient « inert » (ni focus, ni lecture par le lecteur d'écran) ;
   - à la fermeture : le focus revient là où il était (bouton qui a ouvert la fenêtre, ou le jeu).
   Fonctionne pour toutes les fenêtres sans toucher à leur code : on observe l'attribut hidden.
   ===================================================================== */
import { canvas } from './engine.js';

const SEL = '#burrow,#factCard,#journal,#travel,#endCard,#mgEnd,#benchCard,#acad';
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
const stack = [];                 // fenêtres ouvertes, la dernière au-dessus : { el, back, kb }
let inerted = [];
let outside = null;               // dernier élément qui a eu le focus hors des fenêtres
let kbd = false;                  // dernière action au clavier (sinon souris ou doigt)

const shown = e => !!e && e.isConnected && !e.hidden && !e.closest('[hidden]') && e.getClientRects().length > 0;
export const focusables = d => [...d.querySelectorAll(FOCUSABLE)].filter(e => shown(e) && getComputedStyle(e).visibility !== 'hidden');
const focus = e => { try { e.focus({ preventScroll: true }); } catch (err) { /* élément retiré entre-temps */ } };

function applyInert() {
  for (const e of inerted) e.inert = false;
  inerted = [];
  const top = stack[stack.length - 1]; if (!top) return;
  for (const e of document.body.children) {
    if (e === top.el || e.contains(top.el) || e.inert || e.tagName === 'SCRIPT') continue;
    e.inert = true; inerted.push(e);
  }
}

function opened(el) {
  const a = document.activeElement;
  const back = a && a !== document.body && !el.contains(a) ? a : outside;
  stack.push({ el, back, kb: kbd });
  applyInert();
  if (el.contains(document.activeElement)) return;   // la fenêtre a déjà placé le focus (ex. carnet de voyage)
  const f = focusables(el);
  const first = f.find(b => b.matches('[data-autofocus]')) || f.find(b => b.classList.contains('big')) || f[0];
  if (first) focus(first); else { el.tabIndex = -1; focus(el); }
}

function closed(i) {
  const [{ back, kb }] = stack.splice(i, 1);
  applyInert();
  const top = stack[stack.length - 1];
  if (top) {
    if (!top.el.contains(document.activeElement)) focus(back && top.el.contains(back) && shown(back) ? back : focusables(top.el)[0] || top.el);
    return;
  }
  // Ouverte au clavier : retour sur le bouton qui l'a ouverte. Ouverte à la souris ou au doigt : retour au jeu, comme avant
  // (sinon Espace, qui fait glapir le renard, rouvrirait la fenêtre par ce bouton).
  if (back && shown(back) && !back.inert && (kb || back === canvas)) focus(back);
  else if (back && back !== canvas && !kb && shown(canvas)) focus(canvas);
  else if (!document.activeElement || document.activeElement === document.body) { if (shown(canvas)) focus(canvas); }
}

function sync() {
  const now = [...document.querySelectorAll(SEL)].filter(shown);
  for (let i = stack.length - 1; i >= 0; i--) if (!now.includes(stack[i].el)) closed(i);
  for (const el of now) if (!stack.some(s => s.el === el)) opened(el);
}

const mo = new MutationObserver(sync);
for (const el of document.querySelectorAll(SEL)) mo.observe(el, { attributes: true, attributeFilter: ['hidden'] });
mo.observe(document.body, { childList: true });     // fenêtres ajoutées ou retirées (résultats du test de performance)
addEventListener('keydown', e => { if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) kbd = true; }, true);
addEventListener('pointerdown', () => { kbd = false; }, true);
document.addEventListener('focusin', e => { if (!(e.target instanceof Element) || !e.target.closest(SEL)) outside = e.target; }, true);

// Tab et Maj+Tab restent dans la fenêtre du dessus
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const top = stack[stack.length - 1]; if (!top) return;
  const f = focusables(top.el);
  if (!f.length) { e.preventDefault(); return; }
  const i = f.indexOf(document.activeElement);
  if (e.shiftKey ? i <= 0 : i < 0 || i === f.length - 1) { e.preventDefault(); focus(f[e.shiftKey ? f.length - 1 : 0]); }
}, true);

sync();
/** Pour les tests : fenêtres ouvertes, de bas en haut. */
export const openDialogs = () => stack.map(s => s.el.id);
