/* =====================================================================
   Configuration : liens, réglages de jeu, mesure d'audience
   (les URL viennent de src/site.config.json, partagé avec le build)
   ===================================================================== */
import SITE from '../site.config.json';

export const CONFIG = {
  linkedin: SITE.linkedin,
  github: SITE.github,
  site: SITE.site,
  cvPdf: '',              // ex. 'cv-pierre-logre.pdf' pour réafficher un bouton PDF
  expressSeconds: 180,    // succès « Renard express »
  hintAfter: 45,          // premier indice automatique après N secondes sans progrès…
  hintAgain: 75,          // … puis un autre toutes les N secondes
};

/** Événement d'audience (Umami ou Plausible, s'ils sont chargés). Sans effet sinon. */
export function track(name, props) {
  try {
    if (window.umami && window.umami.track) window.umami.track(name, props);
    else if (window.plausible) window.plausible(name, props ? { props } : undefined);
  } catch (e) { /* audience facultative */ }
}

/** Vue figée pour générer l'image d'aperçu (pierrelogre.com/#og). */
export const OG = location.hash === '#og';
