<?php
/* =====================================================================
   Migrations automatiques de la base (lancées par la tâche planifiée OVH, cron/tache-planifiee.php).
   Chaque fichier server/migrations/NNNN_description.sql est appliqué une seule fois, dans l'ordre des numéros,
   puis noté dans la table schema_migrations (nom, empreinte, date). Le déploiement envoie les nouveaux
   fichiers ; la tâche planifiée suivante les applique : plus besoin d'ouvrir phpMyAdmin.
   Règles d'écriture d'une migration : voir server/migrations/LISEZMOI.txt.
   ===================================================================== */
declare(strict_types=1);

const FOX_MIGRATION_NAME = '/^\d{4}_[a-z0-9_-]+\.sql$/';

/** Instructions d'un fichier SQL : séparées par « ; » en fin de ligne ; lignes « -- » ignorées. */
function fox_sql_statements(string $sql): array {
  $lines = array_filter(preg_split('/\R/', $sql), fn($l) => !preg_match('/^\s*--/', $l));
  $parts = preg_split('/;\s*(?:\R|$)/', implode("\n", $lines));
  return array_values(array_filter(array_map('trim', $parts), fn($s) => $s !== ''));
}

/**
 * Applique les migrations en attente. Renvoie [lignes du compte rendu, true si tout va bien].
 * S'arrête à la première erreur (les suivantes attendent la correction) ; une migration déjà appliquée
 * n'est jamais rejouée, même si son fichier a changé (signalé dans le compte rendu).
 */
function fox_migrate(PDO $db, string $dir): array {
  $log = []; $ok = true;
  $db->exec('CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(190) NOT NULL PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME(6) NOT NULL
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_bin');
  $st = $db->prepare('SELECT GET_LOCK(?, 30)'); $st->execute(['pierrelogre_migrations']);
  if ((int) $st->fetchColumn() !== 1) return [['migrations : une autre exécution est en cours, rien fait'], true];
  try {
    $done = [];
    foreach ($db->query('SELECT name, checksum FROM schema_migrations') as $r) $done[$r['name']] = $r['checksum'];
    $files = is_dir($dir) ? array_values(array_filter(scandir($dir), fn($f) => preg_match(FOX_MIGRATION_NAME, $f))) : [];
    sort($files, SORT_STRING);
    $applied = 0;
    foreach ($files as $f) {
      $sql = file_get_contents($dir . '/' . $f); $sum = hash('sha256', $sql);
      if (isset($done[$f])) {
        if ($done[$f] !== $sum) $log[] = "migrations : ⚠ $f a changé depuis son application (non rejouée ; écrire une nouvelle migration)";
        continue;
      }
      try {
        // MySQL valide chaque instruction de structure (CREATE, ALTER…) tout de suite : pas de retour en arrière possible.
        // D'où une migration = un petit changement, et des instructions qui peuvent être relancées sans dégât.
        foreach (fox_sql_statements($sql) as $q) $db->exec($q);
        $db->prepare('INSERT INTO schema_migrations (name, checksum, applied_at) VALUES (?, ?, UTC_TIMESTAMP(6))')->execute([$f, $sum]);
        $log[] = "migrations : $f appliquée"; $applied++;
      } catch (PDOException $e) {
        $log[] = "migrations : ✗ $f a échoué : " . ($e->errorInfo[2] ?? 'erreur') . ' (les suivantes attendent)';
        $ok = false; break;
      }
    }
    if ($ok && !$applied) $log[] = 'migrations : rien à appliquer';
  } finally {
    $db->prepare('SELECT RELEASE_LOCK(?)')->execute(['pierrelogre_migrations']);
  }
  return [$log, $ok];
}
