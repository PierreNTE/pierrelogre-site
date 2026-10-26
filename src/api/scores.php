<?php
// pierrelogre.com : point d'entrée public de l'API (scores). Tout le code est dans pierrelogre-api/ (hors du dossier www).
declare(strict_types=1);
$lib = (getenv('FOX_API_DIR') ?: dirname(__DIR__, 2) . '/pierrelogre-api') . '/lib/api.php';
if (!is_file($lib)) { http_response_code(503); header('Content-Type: application/json; charset=utf-8'); echo '{"ok":false,"error":"unavailable"}'; exit; }
require $lib;
fox_scores();
