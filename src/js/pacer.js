/* =====================================================================
   Cadence d'affichage : sur les écrans à 120 Hz et plus, on dessine 60 images par seconde régulières.
   Reconnu aux appels d'image très rapprochés (sous 9,6 ms) ; on ne dessine que si 12,5 ms ont passé
   depuis la dernière image dessinée. Une image lourde n'est jamais retardée (si 12,5 ms ont déjà passé,
   on dessine tout de suite). Rien ne change à 60 ou 90 Hz. Le test #bench mesure sans ce plafond.
   ===================================================================== */
export const PACE = { cap: false, fast: 0, last: 0, lastDraw: -1e9, ivs: [] };

/** Appelée au début de chaque requestAnimationFrame ; false = sauter cette image. */
export function pace(ts, uncapped = false) {
  if (ts == null) return true;
  const iv = ts - PACE.last; PACE.last = ts;
  if (iv > 0 && iv < 50) {
    PACE.ivs.push(iv); if (PACE.ivs.length > 90) PACE.ivs.shift();
    PACE.fast = iv < 9.6 ? Math.min(60, PACE.fast + 1) : Math.max(0, PACE.fast - 2);
    if (PACE.fast >= 30) PACE.cap = true; else if (PACE.fast === 0) PACE.cap = false;
  }
  if (PACE.cap && !uncapped && ts - PACE.lastDraw < 12.5) return false;
  PACE.lastDraw = ts; return true;
}
/** Fréquence de l'écran estimée (Hz), d'après les appels d'image les plus rapprochés. */
export function refreshHz() {
  if (PACE.ivs.length < 20) return 0;
  const s = [...PACE.ivs].sort((a, b) => a - b), iv = s[Math.floor(s.length * .2)];
  return Math.round(1000 / iv);
}
