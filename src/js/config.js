/* =====================================================================
   Configuration : liens, réglages de jeu, mesure d'audience
   (les URL viennent de src/site.config.json, partagé avec le build)
   ===================================================================== */
import SITE from '../site.config.json';
import { S } from './state.js';

export const CONFIG = {
  linkedin: SITE.linkedin,
  github: SITE.github,
  site: SITE.site,
  cvPdf: '',              // ex. 'cv-pierre-logre.pdf' pour réafficher un bouton PDF
  expressSeconds: 180,    // succès « Renard express »
  hintAfter: 45,          // premier indice automatique après N secondes sans progrès…
  hintAgain: 75,          // … puis un autre toutes les N secondes
};

/** Événement d'audience : mesure sans cookie du site (boot.js → www/api/events.php, voir server/schema.sql), et Umami ou
 * Plausible s'ils sont configurés. Sans effet en test, dans l'aperçu, ou si le navigateur demande « Do Not Track ». */
export function track(name, props) {
  if (S.bench && name !== 'Bench') return;   // le test de performance ouvre toutes les zones : il ne compte pas comme une partie
  try { window.__foxStats?.send(name, props); } catch (e) { /* audience facultative */ }
  try {
    if (window.umami && window.umami.track) window.umami.track(name, props);
    else if (window.plausible) window.plausible(name, props ? { props } : undefined);
  } catch (e) { /* audience facultative */ }
}

/** Vue figée pour générer l'image d'aperçu (pierrelogre.com/#og). */
export const OG = location.hash === '#og';
