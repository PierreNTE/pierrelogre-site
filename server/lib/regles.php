<?php
/* =====================================================================
   Règles de validation et limites anti-abus (les mêmes qu'avant sur Supabase).
   La même liste de mots refusés existe dans le site (src/js/leaderboard.js).
   ===================================================================== */
declare(strict_types=1);

const FOX_LIMITS = [
  'pseudo_minute'     => 5,      // scores (ou temps) d'un même pseudo par minute
  'all_minute'        => 300,    // tous pseudos, par minute
  'all_day'           => 3000,   // tous pseudos, sur 24 h
  'ip_minute'         => 20,     // par adresse IP (empreinte), par minute
  'events_visit_hour' => 150,    // événements d'une même visite sur une heure
  'events_day'        => 30000,  // événements sur 24 h
];
const FOX_EVENTS_MAX_ROWS = 50;          // le site en envoie 40 au plus à la fois
const FOX_EVENTS_MAX_BODY = 65536;       // 64 Ko (limite des envois « keepalive » des navigateurs)

const FOX_EVENT_NAMES = ['Visite', 'Jeu prêt', 'Partie lancée', 'Partie terminée', 'Tutoriel terminé', 'Tutoriel passé',
  'Terrier trouvé', 'Terrier ouvert', 'Clic LinkedIn', 'Clic GitHub', 'Indice', 'Gland', 'Région ouverte', 'Succès',
  'Mini-jeu lancé', 'Mini-jeu terminé', 'Qualité', 'Bench', 'Départ', 'Profil sans jeu'];

const FOX_BANNED = ['connard', 'connasse', 'salope', 'salaud', 'encul', 'putain', 'merde', 'batard', 'couille', 'niquer', 'niktamer',
  'fdp', 'ntm', 'tapette', 'bougnoul', 'youpin', 'nazi', 'hitler', 'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'whore', 'slut', 'nigg',
  'faggot', 'porn', 'violeur', 'pedophil', 'pedofil'];

/**
 * Filtre d'insultes (fonction pseudo_ok de Supabase) : minuscules, puis
 * « àâäáãåçéèêëíìîïñóòôöõúùûüýÿ0134@$5 » → « aaaaaaceeeeiiiinooooouuuuyyoieaass », puis tout ce qui n'est pas a-z est retiré.
 */
function fox_pseudo_ok(string $p): bool {
  static $map = null;
  if ($map === null) {
    $from = mb_str_split('àâäáãåçéèêëíìîïñóòôöõúùûüýÿ0134@$5');
    $to = str_split('aaaaaaceeeeiiiinooooouuuuyyoieaass');
    $map = array_combine($from, $to);
  }
  $n = preg_replace('/[^a-z]/', '', strtr(mb_strtolower($p, 'UTF-8'), $map));
  foreach (FOX_BANNED as $w) if (str_contains($n, $w)) return false;
  return true;
}

/** Pseudo : texte de 2 à 16 caractères, lettres / chiffres / espace / _ . - seulement, sans insulte. */
function fox_pseudo_valid(mixed $p): bool {
  if (!is_string($p) || !mb_check_encoding($p, 'UTF-8')) return false;
  $len = mb_strlen($p, 'UTF-8');
  return $len >= 2 && $len <= 16 && preg_match('/^[\p{L}\p{N} _.\-]+$/u', $p) === 1 && fox_pseudo_ok($p);
}

/** Date AAAA-MM-JJ qui existe vraiment. */
function fox_date_valid(mixed $d): bool {
  return is_string($d) && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m) === 1 && checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
}

/** Un événement validé → [name, visit, lang, page, device, props JSON], ou null s'il est invalide. */
function fox_event_row(mixed $e): ?array {
  if (!$e instanceof stdClass) return null;
  $d = get_object_vars($e);
  if (array_diff(array_keys($d), ['name', 'visit', 'lang', 'page', 'device', 'props'])) return null;
  $name = $d['name'] ?? null; $visit = $d['visit'] ?? null;
  $lang = $d['lang'] ?? null; $page = $d['page'] ?? null; $device = $d['device'] ?? null;
  $props = array_key_exists('props', $d) ? $d['props'] : new stdClass();
  if (!is_string($name) || !in_array($name, FOX_EVENT_NAMES, true)) return null;
  if (!is_string($visit) || preg_match('/^[a-z0-9]{8,16}$/', $visit) !== 1) return null;
  if ($lang !== null && !in_array($lang, ['en', 'fr'], true)) return null;
  if ($page !== null && !in_array($page, ['/', '/fr/'], true)) return null;
  if ($device !== null && !in_array($device, ['phone', 'tablet', 'desktop'], true)) return null;
  if ($props === null) $props = new stdClass();   // comme la valeur par défaut de la colonne
  if (!$props instanceof stdClass) return null;
  $json = json_encode($props, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
  if ($json === false || strlen($json) >= 800) return null;
  return [$name, $visit, $lang, $page, $device, $json];
}
