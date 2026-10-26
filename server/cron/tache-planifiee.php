<?php
/* =====================================================================
   Tâche planifiée OVH (toutes les heures) :
   1. applique les migrations de la base en attente (server/migrations, voir lib/migrations.php) ;
   2. nettoie :
   - événements d'audience de plus de 13 mois ;
   - temps du défi du jour de plus de 30 jours ;
   - empreintes d'adresses IP de plus de 24 heures.
   Uniquement en ligne de commande : ce dossier est hors de www et bloqué au web, et le script refuse de toute façon
   de s'exécuter autrement.
   ===================================================================== */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require dirname(__DIR__) . '/lib/api.php';
require dirname(__DIR__) . '/lib/migrations.php';

$db = fox_db();
[$log, $ok] = fox_migrate($db, getenv('FOX_MIGRATIONS_DIR') ?: dirname(__DIR__) . '/migrations');
foreach ($log as $l) echo gmdate('Y-m-d H:i:s') . " UTC · $l\n";

$jobs = [
  'événements de plus de 13 mois'    => 'DELETE FROM events WHERE at < UTC_TIMESTAMP(6) - INTERVAL 13 MONTH LIMIT 5000',
  'temps du jour de plus de 30 jours' => 'DELETE FROM daily_times WHERE created_at < UTC_TIMESTAMP(6) - INTERVAL 30 DAY LIMIT 5000',
  'empreintes IP de plus de 24 h'     => 'DELETE FROM api_ip WHERE at < UTC_TIMESTAMP(6) - INTERVAL 1 DAY LIMIT 5000',
];
foreach ($jobs as $label => $sql) {
  $st = $db->prepare($sql); $total = 0;
  do { $st->execute(); $n = $st->rowCount(); $total += $n; } while ($n === 5000);   // par paquets, sans bloquer la table
  echo gmdate('Y-m-d H:i:s') . " UTC · $label : $total supprimé(s)\n";
}
exit($ok ? 0 : 1);   // une migration en échec : code d'erreur, pour que la tâche planifiée le signale
