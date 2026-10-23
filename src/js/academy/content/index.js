/* =====================================================================
   Académie Dell Storage : tout le contenu pédagogique (chargé à la demande, fichier à part sur le site).
   Un fichier par salle : faits (facts), quiz, missions, simulation commerciale (sim).
   Pour corriger un contenu, on ne touche qu'à ces fichiers : le moteur (academy/engine.js) et le décor
   (regions/academie.js) n'en dépendent pas. Les tests vérifient la cohérence (bonnes réponses, sources).
   ===================================================================== */
import apex from './apex.js';
import cyber from './cyber.js';
import datadomain from './datadomain.js';
import dr from './dr.js';
import FINAL from './final.js';
import LAB from './lab.js';
import powerstore from './powerstore.js';
import powervault from './powervault.js';
import software from './software.js';
import TERMS from './terms.js';
export { CHECKED, SOURCES } from './sources.js';

export const ROOM_CONTENT = { powervault, powerstore, apex, datadomain, software, dr, cyber };
export { FINAL, LAB, TERMS };
