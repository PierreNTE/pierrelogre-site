<?php
/* =====================================================================
   API du classement et de la mesure d'audience de pierrelogre.com (PHP 8.3+, MySQL 8.4).
   Ce dossier (pierrelogre-api/) est HORS du dossier public www : seuls les trois petits fichiers de www/api/
   sont joignables depuis le web, et ils ne font qu'appeler les fonctions ci-dessous.
   - Requêtes préparées uniquement (PDO, préparation côté serveur), réponses JSON, dates en UTC.
   - Seulement depuis pierrelogre.com (CORS), méthodes et tailles de requête limitées.
   - Aucune lecture de la table events ni des statistiques : elles se lisent dans phpMyAdmin.
   ===================================================================== */
declare(strict_types=1);

require __DIR__ . '/regles.php';

/** Messages d'erreur, en français et en anglais comme le site. */
const FOX_MSG = [
  'bad_request'     => ['Requête invalide.', 'Invalid request.'],
  'bad_json'        => ['Le contenu doit être du JSON valide.', 'The body must be valid JSON.'],
  'bad_type'        => ['Le contenu doit être envoyé en JSON (Content-Type: application/json).', 'The body must be sent as JSON (Content-Type: application/json).'],
  'bad_pseudo'      => ['Pseudo refusé : 2 à 16 caractères (lettres, chiffres, espace, _ . -), sans insulte.', 'Nickname rejected: 2 to 16 characters (letters, digits, space, _ . -), no insults.'],
  'bad_score'       => ['Score invalide : un nombre entier entre 0 et 20 000.', 'Invalid score: a whole number between 0 and 20,000.'],
  'bad_game'        => ['Jeu inconnu.', 'Unknown game.'],
  'bad_day'         => ['Jour invalide : hier, aujourd’hui ou demain, au format AAAA-MM-JJ.', 'Invalid day: yesterday, today or tomorrow, as YYYY-MM-DD.'],
  'bad_secs'        => ['Temps invalide : entre 10 et 7 200 secondes.', 'Invalid time: between 10 and 7,200 seconds.'],
  'bad_event'       => ['Événement invalide.', 'Invalid event.'],
  'too_many_scores' => ['Trop de scores, réessaie plus tard.', 'Too many scores, try again later.'],
  'too_many_times'  => ['Trop de temps envoyés, réessaie plus tard.', 'Too many times sent, try again later.'],
  'method'          => ['Méthode non autorisée.', 'Method not allowed.'],
  'too_large'       => ['Requête trop grosse.', 'Request too large.'],
  'origin'          => ['Origine non autorisée.', 'Origin not allowed.'],
  'unavailable'     => ['Classement momentanément indisponible.', 'Leaderboard temporarily unavailable.'],
  'server'          => ['Erreur du serveur.', 'Server error.'],
];

/** Réponse JSON puis fin du script. */
function fox_reply(int $status, array $data): never {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
/** Erreur : code HTTP, code court et message FR / EN. */
function fox_fail(int $status, string $code): never {
  [$fr, $en] = FOX_MSG[$code] ?? FOX_MSG['server'];
  fox_reply($status, ['ok' => false, 'error' => $code, 'message' => ['fr' => $fr, 'en' => $en]]);
}

/** Configuration (pierrelogre-api/config.php, jamais dans le dépôt). */
function fox_config(): array {
  static $cfg = null;
  if ($cfg !== null) return $cfg;
  $file = getenv('FOX_API_CONFIG') ?: dirname(__DIR__) . '/config.php';
  $c = is_file($file) ? require $file : null;
  if (!is_array($c) || empty($c['db_host']) || empty($c['db_name']) || empty($c['db_user']) || !isset($c['db_pass'])
      || !is_string($c['ip_key'] ?? null) || strlen($c['ip_key']) < 32) {
    error_log('pierrelogre-api : config.php absent ou incomplet');
    fox_fail(503, 'unavailable');
  }
  $c['origins'] ??= ['https://pierrelogre.com', 'https://www.pierrelogre.com'];
  return $cfg = $c;
}

/** Connexion MySQL : utf8mb4, exceptions, vraies requêtes préparées, fuseau UTC. */
function fox_db(): PDO {
  static $db = null;
  if ($db) return $db;
  $c = fox_config();
  try {
    $dsn = 'mysql:host=' . $c['db_host'] . ';port=' . (int) ($c['db_port'] ?? 3306) . ';dbname=' . $c['db_name'] . ';charset=utf8mb4';
    $db = new PDO($dsn, $c['db_user'], $c['db_pass'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_EMULATE_PREPARES => false,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_TIMEOUT => 5,
    ]);
    $db->exec("SET time_zone = '+00:00'");
  } catch (PDOException $e) {
    error_log('pierrelogre-api : connexion MySQL impossible (' . $e->getCode() . ')');
    fox_fail(503, 'unavailable');
  }
  return $db;
}

/**
 * Début de chaque requête : en-têtes, origine, méthode, taille. Renvoie la méthode.
 * $methods : méthodes acceptées (GET, POST) ; $maxBody : taille maximale du corps en octets.
 */
function fox_start(array $methods, int $maxBody): string {
  ini_set('display_errors', '0');   // jamais de message technique dans une réponse (ils vont dans le journal d'erreurs)
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  header('Vary: Origin');
  set_exception_handler(function (Throwable $e) {
    error_log('pierrelogre-api : ' . get_class($e) . ' ' . $e->getCode());
    fox_fail(500, 'server');
  });
  $c = fox_config();
  // Origine : un navigateur l'envoie pour tout POST (même depuis le site) ; absente pour une simple lecture du site
  $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
  if ($origin !== null) {
    if (!in_array($origin, $c['origins'], true)) fox_fail(403, 'origin');
    header('Access-Control-Allow-Origin: ' . $origin);
  }
  $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  if ($method === 'OPTIONS') {   // pré-vérification CORS
    header('Access-Control-Allow-Methods: ' . implode(', ', $methods));
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
  }
  if (!in_array($method, $methods, true)) { header('Allow: ' . implode(', ', $methods)); fox_fail(405, 'method'); }
  if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > $maxBody) fox_fail(413, 'too_large');
  return $method;
}

/** Corps JSON d'un POST (objets en stdClass : un objet {} reste distinct d'une liste []). */
function fox_body(int $maxBody): mixed {
  $type = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
  if ($type !== 'application/json') fox_fail(415, 'bad_type');
  $raw = file_get_contents('php://input', false, null, 0, $maxBody + 1);
  if ($raw === false || strlen($raw) > $maxBody) fox_fail(413, 'too_large');
  try { return json_decode($raw, false, 16, JSON_THROW_ON_ERROR); } catch (JsonException) { fox_fail(400, 'bad_json'); }
}

/** Empreinte de l'adresse IP (jamais l'adresse elle-même). */
function fox_ip_hash(): string {
  return hash_hmac('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? ''), fox_config()['ip_key'], true);
}

/** Exécute $fn dans une transaction, un seul envoi du même type à la fois (les limites se comptent sans course). */
function fox_locked(PDO $db, string $lock, callable $fn): mixed {
  $st = $db->prepare('SELECT GET_LOCK(?, 5)'); $st->execute([$lock]);
  if ((int) $st->fetchColumn() !== 1) fox_fail(503, 'unavailable');
  try {
    $db->beginTransaction();
    $r = $fn();
    $db->commit();
    return $r;
  } catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    throw $e;
  } finally {
    $db->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]);
  }
}

/** Nombre de lignes d'une requête COUNT(*) préparée. */
function fox_count(PDO $db, string $sql, array $args = []): int {
  $st = $db->prepare($sql); $st->execute($args); return (int) $st->fetchColumn();
}

/** Une contrainte CHECK de la base a refusé la ligne : c'est une requête invalide, pas une panne. */
function fox_is_check_error(PDOException $e): bool {
  return in_array((int) ($e->errorInfo[1] ?? 0), [3819, 1264, 1265, 1292, 1366, 1406, 3140], true);
}

/* =====================================================================
   www/api/scores.php : GET classement du mini-jeu, POST un score
   ===================================================================== */
function fox_scores(): never {
  $method = fox_start(['GET', 'POST'], 1024);
  $db = fox_db();
  if ($method === 'GET') {
    $game = $_GET['game'] ?? 'handball';
    if (!is_string($game) || strlen($game) > 16) fox_fail(400, 'bad_game');
    // Le meilleur score de chaque pseudo, du plus haut au plus bas, 10 au plus (même lecture que sur Supabase)
    $st = $db->prepare('SELECT pseudo, score FROM leaderboard WHERE game = ? ORDER BY score DESC, pseudo ASC LIMIT 10');
    $st->execute([$game]);
    fox_reply(200, array_map(fn($r) => ['pseudo' => $r['pseudo'], 'score' => (int) $r['score']], $st->fetchAll()));
  }
  $b = fox_body(1024);
  if (!$b instanceof stdClass) fox_fail(400, 'bad_request');
  $d = get_object_vars($b);
  if (array_diff(array_keys($d), ['pseudo', 'score', 'game'])) fox_fail(400, 'bad_request');
  $pseudo = $d['pseudo'] ?? null; $score = $d['score'] ?? null; $game = $d['game'] ?? 'handball';
  if (!fox_pseudo_valid($pseudo)) fox_fail(400, 'bad_pseudo');
  if (!is_int($score) || $score < 0 || $score > 20000) fox_fail(400, 'bad_score');
  if ($game !== 'handball') fox_fail(400, 'bad_game');
  $ip = fox_ip_hash();
  fox_locked($db, 'pierrelogre_scores', function () use ($db, $pseudo, $score, $game, $ip) {
    if (fox_count($db, "SELECT COUNT(*) FROM api_ip WHERE ip_hash = ? AND kind = 'score' AND at > UTC_TIMESTAMP(6) - INTERVAL 1 MINUTE", [$ip]) >= FOX_LIMITS['ip_minute']
        || fox_count($db, 'SELECT COUNT(*) FROM scores WHERE pseudo = ? AND created_at > UTC_TIMESTAMP(6) - INTERVAL 1 MINUTE', [$pseudo]) >= FOX_LIMITS['pseudo_minute']
        || fox_count($db, 'SELECT COUNT(*) FROM scores WHERE created_at > UTC_TIMESTAMP(6) - INTERVAL 1 MINUTE') >= FOX_LIMITS['all_minute']
        || fox_count($db, 'SELECT COUNT(*) FROM scores WHERE created_at > UTC_TIMESTAMP(6) - INTERVAL 1 DAY') >= FOX_LIMITS['all_day']) {
      fox_fail(429, 'too_many_scores');
    }
    try {
      $db->prepare('INSERT INTO scores (pseudo, score, game, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(6))')->execute([$pseudo, $score, $game]);
    } catch (PDOException $e) { if (fox_is_check_error($e)) fox_fail(400, 'bad_request'); throw $e; }
    $db->prepare("INSERT INTO api_ip (ip_hash, kind, at) VALUES (?, 'score', UTC_TIMESTAMP(6))")->execute([$ip]);
  });
  fox_reply(201, ['ok' => true]);
}

/* =====================================================================
   www/api/daily.php : GET classement d'un jour (?day=AAAA-MM-JJ), POST un temps du défi du jour
   ===================================================================== */
function fox_daily(): never {
  $method = fox_start(['GET', 'POST'], 1024);
  $db = fox_db();
  if ($method === 'GET') {
    $day = $_GET['day'] ?? null;
    if (!fox_date_valid($day)) fox_fail(400, 'bad_day');
    // Le meilleur temps de chaque pseudo pour ce jour, du plus rapide au plus lent, 10 au plus
    $st = $db->prepare('SELECT pseudo, secs FROM daily_leaderboard WHERE day = ? ORDER BY secs ASC, pseudo ASC LIMIT 10');
    $st->execute([$day]);
    fox_reply(200, array_map(fn($r) => ['pseudo' => $r['pseudo'], 'secs' => (float) $r['secs']], $st->fetchAll()));
  }
  $b = fox_body(1024);
  if (!$b instanceof stdClass) fox_fail(400, 'bad_request');
  $d = get_object_vars($b);
  if (array_diff(array_keys($d), ['day', 'pseudo', 'secs'])) fox_fail(400, 'bad_request');
  $day = $d['day'] ?? null; $pseudo = $d['pseudo'] ?? null; $secs = $d['secs'] ?? null;
  if (!fox_date_valid($day)) fox_fail(400, 'bad_day');
  if (!fox_pseudo_valid($pseudo)) fox_fail(400, 'bad_pseudo');
  if (!(is_int($secs) || is_float($secs)) || !is_finite((float) $secs)) fox_fail(400, 'bad_secs');
  $secs = round((float) $secs, 1);   // DECIMAL(7,1), comme numeric(7,1)
  if ($secs < 10 || $secs > 7200) fox_fail(400, 'bad_secs');
  // Seulement hier, aujourd'hui ou demain (date UTC du serveur, comme current_date sur Supabase)
  if (fox_count($db, 'SELECT ? BETWEEN UTC_DATE() - INTERVAL 1 DAY AND UTC_DATE() + INTERVAL 1 DAY', [$day]) !== 1) fox_fail(400, 'bad_day');
  $ip = fox_ip_hash();
  fox_locked($db, 'pierrelogre_daily', function () use ($db, $day, $pseudo, $secs, $ip) {
    if (fox_count($db, "SELECT COUNT(*) FROM api_ip WHERE ip_hash = ? AND kind = 'daily' AND at > UTC_TIMESTAMP(6) - INTERVAL 1 MINUTE", [$ip]) >= FOX_LIMITS['ip_minute']
        || fox_count($db, 'SELECT COUNT(*) FROM daily_times WHERE pseudo = ? AND created_at > UTC_TIMESTAMP(6) - INTERVAL 1 MINUTE', [$pseudo]) >= FOX_LIMITS['pseudo_minute']
        || fox_count($db, 'SELECT COUNT(*) FROM daily_times WHERE created_at > UTC_TIMESTAMP(6) - INTERVAL 1 MINUTE') >= FOX_LIMITS['all_minute']
        || fox_count($db, 'SELECT COUNT(*) FROM daily_times WHERE created_at > UTC_TIMESTAMP(6) - INTERVAL 1 DAY') >= FOX_LIMITS['all_day']) {
      fox_fail(429, 'too_many_times');
    }
    try {
      $db->prepare('INSERT INTO daily_times (day, pseudo, secs, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(6))')->execute([$day, $pseudo, number_format($secs, 1, '.', '')]);
    } catch (PDOException $e) { if (fox_is_check_error($e)) fox_fail(400, 'bad_request'); throw $e; }
    $db->prepare("INSERT INTO api_ip (ip_hash, kind, at) VALUES (?, 'daily', UTC_TIMESTAMP(6))")->execute([$ip]);
  });
  fox_reply(201, ['ok' => true]);
}

/* =====================================================================
   www/api/events.php : POST un ou plusieurs événements d'audience (jamais de lecture)
   Un lot avec un seul événement invalide est refusé en entier (comme sur Supabase) ;
   au-delà des limites, les événements sont ignorés sans erreur.
   ===================================================================== */
function fox_events(): never {
  fox_start(['POST'], FOX_EVENTS_MAX_BODY);
  $b = fox_body(FOX_EVENTS_MAX_BODY);
  $list = $b instanceof stdClass ? [$b] : $b;
  if (!is_array($list) || !$list || count($list) > FOX_EVENTS_MAX_ROWS) fox_fail(400, 'bad_event');
  $rows = [];
  foreach ($list as $e) { $r = fox_event_row($e); if ($r === null) fox_fail(400, 'bad_event'); $rows[] = $r; }
  $db = fox_db();
  fox_locked($db, 'pierrelogre_events', function () use ($db, $rows) {
    $day = fox_count($db, 'SELECT COUNT(*) FROM events WHERE at > UTC_TIMESTAMP(6) - INTERVAL 1 DAY');
    $perVisit = [];
    $ins = $db->prepare('INSERT INTO events (at, name, visit, lang, page, device, props) VALUES (UTC_TIMESTAMP(6), ?, ?, ?, ?, ?, ?)');
    foreach ($rows as $r) {
      $perVisit[$r[1]] ??= fox_count($db, 'SELECT COUNT(*) FROM events WHERE visit = ? AND at > UTC_TIMESTAMP(6) - INTERVAL 1 HOUR', [$r[1]]);
      if ($perVisit[$r[1]] >= FOX_LIMITS['events_visit_hour'] || $day >= FOX_LIMITS['events_day']) continue;   // ignoré en silence
      try { $ins->execute($r); } catch (PDOException $e) { if (fox_is_check_error($e)) fox_fail(400, 'bad_event'); throw $e; }
      $perVisit[$r[1]]++; $day++;
    }
  });
  fox_reply(201, ['ok' => true]);
}
