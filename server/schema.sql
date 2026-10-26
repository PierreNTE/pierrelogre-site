-- =====================================================================
-- pierrelogre.com : classements et mesure d'audience (MySQL 8.4 de l'hébergement OVH)
-- À exécuter une fois dans phpMyAdmin (onglet SQL), sur la base de l'hébergement.
-- Ensuite : importer les données, puis server/apres-import.sql.
--
-- Seule l'API PHP (www/api/) écrit ici ; elle ne lit jamais les événements ni les statistiques.
-- Toutes les dates sont en UTC (l'API règle time_zone = '+00:00' à chaque connexion, et les vues
-- utilisent UTC_TIMESTAMP(), indépendant du fuseau de la session phpMyAdmin).
-- Les textes sont comparés à l'identique (collation utf8mb4_0900_bin : « Véro » ≠ « vero »), comme sur Supabase.
--
-- Règles vérifiées ici ET dans l'API : longueurs, caractères, bornes, liste des événements, JSON.
-- Règles vérifiées seulement dans l'API (MySQL ne les accepte pas dans un CHECK) : filtre d'insultes,
-- « jour entre hier et demain », limites anti-abus.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------- Scores du mini-jeu « Tir au renard » ----------
CREATE TABLE IF NOT EXISTS scores (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pseudo     VARCHAR(16)  NOT NULL,
  score      INT          NOT NULL,
  game       VARCHAR(16)  NOT NULL DEFAULT 'handball',
  created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT scores_pseudo_chk CHECK (CHAR_LENGTH(pseudo) BETWEEN 2 AND 16 AND REGEXP_LIKE(pseudo, '^[[:alnum:] _.-]+$')),
  CONSTRAINT scores_score_chk  CHECK (score BETWEEN 0 AND 20000),
  CONSTRAINT scores_game_chk   CHECK (game IN ('handball')),
  INDEX scores_game_score_idx (game, score DESC),
  INDEX scores_created_idx (created_at),
  INDEX scores_pseudo_created_idx (pseudo, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_bin;

-- ---------- Temps du défi du jour ----------
CREATE TABLE IF NOT EXISTS daily_times (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  day        DATE          NOT NULL,
  pseudo     VARCHAR(16)   NOT NULL,
  secs       DECIMAL(7, 1) NOT NULL,
  created_at DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT daily_pseudo_chk CHECK (CHAR_LENGTH(pseudo) BETWEEN 2 AND 16 AND REGEXP_LIKE(pseudo, '^[[:alnum:] _.-]+$')),
  CONSTRAINT daily_secs_chk   CHECK (secs BETWEEN 10 AND 7200),
  INDEX daily_times_day_secs_idx (day, secs),
  INDEX daily_times_pseudo_created_idx (pseudo, created_at),
  INDEX daily_times_created_idx (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_bin;

-- ---------- Mesure d'audience sans cookie ----------
-- Un numéro de visite tiré au hasard à chaque chargement de page ; ni cookie, ni adresse IP.
CREATE TABLE IF NOT EXISTS events (
  id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  name   VARCHAR(32) NOT NULL,
  visit  VARCHAR(16) NOT NULL,
  lang   VARCHAR(2)  NULL,
  page   VARCHAR(4)  NULL,
  device VARCHAR(8)  NULL,
  props  JSON        NOT NULL DEFAULT (JSON_OBJECT()),
  CONSTRAINT events_name_chk CHECK (name IN ('Visite', 'Jeu prêt', 'Partie lancée', 'Partie terminée', 'Tutoriel terminé', 'Tutoriel passé',
    'Terrier trouvé', 'Terrier ouvert', 'Clic LinkedIn', 'Clic GitHub', 'Indice', 'Gland', 'Région ouverte', 'Succès',
    'Mini-jeu lancé', 'Mini-jeu terminé', 'Qualité', 'Bench', 'Départ', 'Profil sans jeu')),
  CONSTRAINT events_visit_chk  CHECK (REGEXP_LIKE(visit, '^[a-z0-9]{8,16}$')),
  CONSTRAINT events_lang_chk   CHECK (lang IS NULL OR lang IN ('en', 'fr')),
  CONSTRAINT events_page_chk   CHECK (page IS NULL OR page IN ('/', '/fr/')),
  CONSTRAINT events_device_chk CHECK (device IS NULL OR device IN ('phone', 'tablet', 'desktop')),
  CONSTRAINT events_props_chk  CHECK (JSON_TYPE(props) = 'OBJECT' AND JSON_STORAGE_SIZE(props) < 800),
  INDEX events_at_idx (at),
  INDEX events_visit_at_idx (visit, at),
  INDEX events_name_at_idx (name, at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_bin;

-- ---------- Limite par adresse IP (scores et temps du jour) ----------
-- Jamais l'adresse elle-même : une empreinte HMAC-SHA256 calculée avec la clé secrète de config.php,
-- effacée au bout de 24 heures par la tâche planifiée (cron/tache-planifiee.php).
CREATE TABLE IF NOT EXISTS api_ip (
  id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip_hash BINARY(32)  NOT NULL,
  kind    VARCHAR(8)  NOT NULL,
  at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT api_ip_kind_chk CHECK (kind IN ('score', 'daily')),
  INDEX api_ip_hash_idx (ip_hash, kind, at),
  INDEX api_ip_at_idx (at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_bin;

-- ---------- Migrations déjà appliquées (server/migrations, tâche planifiée) ----------
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       VARCHAR(190) NOT NULL PRIMARY KEY,
  checksum   CHAR(64)     NOT NULL,
  applied_at DATETIME(6)  NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_bin;

-- ---------- Classements publics (lus par l'API) ----------
-- Le meilleur score de chaque pseudo, par jeu
CREATE OR REPLACE SQL SECURITY INVOKER VIEW leaderboard AS
  SELECT pseudo, MAX(score) AS score, game FROM scores GROUP BY game, pseudo;

-- Le meilleur temps de chaque pseudo, jour par jour
CREATE OR REPLACE SQL SECURITY INVOKER VIEW daily_leaderboard AS
  SELECT day, pseudo, MIN(secs) AS secs FROM daily_times GROUP BY day, pseudo;

-- ---------- Statistiques (lisibles seulement dans phpMyAdmin ; l'API n'y touche jamais) ----------
-- Heure de Paris calculée ici : les tables de fuseaux horaires de MySQL (CONVERT_TZ avec « Europe/Paris »)
-- ne sont pas chargées sur les hébergements mutualisés. Heure d'été (UTC+2) du dernier dimanche de mars
-- à 1 h UTC au dernier dimanche d'octobre à 1 h UTC ; sinon heure d'hiver (UTC+1).
CREATE OR REPLACE SQL SECURITY INVOKER VIEW events_paris AS
  SELECT e.*, DATE(e.at + INTERVAL IF(
      e.at >= TIMESTAMP(DATE(CONCAT(YEAR(e.at), '-03-31')) - INTERVAL (DAYOFWEEK(DATE(CONCAT(YEAR(e.at), '-03-31'))) - 1) DAY, '01:00:00')
      AND e.at < TIMESTAMP(DATE(CONCAT(YEAR(e.at), '-10-31')) - INTERVAL (DAYOFWEEK(DATE(CONCAT(YEAR(e.at), '-10-31'))) - 1) DAY, '01:00:00'),
      2, 1) HOUR) AS jour
  FROM events e;

-- Par jour (heure de Paris) : visites, parties, visite guidée finie, terrier trouvé, fiche ouverte, clics LinkedIn, durée moyenne
CREATE OR REPLACE SQL SECURITY INVOKER VIEW stats_jour AS
  SELECT jour,
    COUNT(DISTINCT CASE WHEN name = 'Visite' THEN visit END) AS visites,
    COUNT(DISTINCT CASE WHEN name = 'Partie lancée' THEN visit END) AS parties,
    COUNT(DISTINCT CASE WHEN name = 'Tutoriel terminé' THEN visit END) AS visite_guidee_finie,
    COUNT(DISTINCT CASE WHEN name = 'Terrier trouvé' THEN visit END) AS terrier_trouve,
    COUNT(DISTINCT CASE WHEN name = 'Terrier ouvert' THEN visit END) AS fiche_ouverte,
    COUNT(DISTINCT CASE WHEN name = 'Clic LinkedIn' THEN visit END) AS clic_linkedin,
    ROUND(AVG(CASE WHEN name = 'Départ' THEN CAST(props->>'$.secondes' AS DECIMAL(12, 2)) END)) AS secondes_moyennes
  FROM events_paris GROUP BY jour ORDER BY jour DESC;

-- Entonnoir des 30 derniers jours : combien de visites atteignent chaque étape
CREATE OR REPLACE SQL SECURITY INVOKER VIEW stats_entonnoir AS
  WITH v AS (
    SELECT visit,
      MAX(name = 'Visite') AS e1, MAX(name = 'Jeu prêt') AS e2, MAX(name = 'Partie lancée') AS e3, MAX(name = 'Tutoriel terminé') AS e4,
      MAX(name = 'Terrier trouvé') AS e5, MAX(name = 'Terrier ouvert') AS e6, MAX(name = 'Clic LinkedIn') AS e7
    FROM events WHERE at > UTC_TIMESTAMP(6) - INTERVAL 30 DAY GROUP BY visit
  ), s AS (
              SELECT 1 AS ordre, '1. Visite' AS etape, COALESCE(SUM(e1), 0) AS nombre FROM v
    UNION ALL SELECT 2, '2. Jeu prêt', COALESCE(SUM(e2), 0) FROM v
    UNION ALL SELECT 3, '3. Partie lancée', COALESCE(SUM(e3), 0) FROM v
    UNION ALL SELECT 4, '4. Visite guidée finie', COALESCE(SUM(e4), 0) FROM v
    UNION ALL SELECT 5, '5. Terrier trouvé', COALESCE(SUM(e5), 0) FROM v
    UNION ALL SELECT 6, '6. Fiche ouverte', COALESCE(SUM(e6), 0) FROM v
    UNION ALL SELECT 7, '7. Clic LinkedIn', COALESCE(SUM(e7), 0) FROM v
  )
  SELECT etape, CAST(nombre AS UNSIGNED) AS nombre, ROUND(100 * nombre / NULLIF(MAX(nombre) OVER (), 0)) AS pourcentage
  FROM s ORDER BY ordre;

-- Appareils des 30 derniers jours : temps de chargement (vraie médiane, comme percentile_cont(0.5) :
-- la valeur du milieu, ou la moyenne des deux valeurs du milieu), qualité retenue, fluidité
CREATE OR REPLACE SQL SECURITY INVOKER VIEW stats_appareils AS
  WITH e AS (SELECT * FROM events WHERE at > UTC_TIMESTAMP(6) - INTERVAL 30 DAY),
  ms AS (
    SELECT device, CAST(props->>'$.ms' AS DECIMAL(12, 2)) AS v,
      ROW_NUMBER() OVER (PARTITION BY device ORDER BY CAST(props->>'$.ms' AS DECIMAL(12, 2))) AS rn,
      COUNT(*) OVER (PARTITION BY device) AS n
    FROM e WHERE name = 'Jeu prêt' AND props->>'$.ms' IS NOT NULL
  ),
  med AS (SELECT device, AVG(v) AS m FROM ms WHERE rn IN (FLOOR((n + 1) / 2), CEIL((n + 1) / 2)) GROUP BY device),
  agg AS (
    SELECT device,
      COUNT(DISTINCT CASE WHEN name = 'Visite' THEN visit END) AS visites,
      SUM(name = 'Qualité' AND props->>'$.tier' = '0') AS qualite_pleine,
      SUM(name = 'Qualité' AND props->>'$.tier' = '1') AS qualite_reduite,
      SUM(name = 'Qualité' AND props->>'$.tier' = '2') AS qualite_basse,
      ROUND(AVG(CASE WHEN name = 'Qualité' THEN CAST(props->>'$.fps' AS DECIMAL(12, 2)) END)) AS images_par_seconde
    FROM e GROUP BY device
  )
  SELECT agg.device AS appareil, agg.visites, med.m AS chargement_ms_median,
    CAST(agg.qualite_pleine AS UNSIGNED) AS qualite_pleine, CAST(agg.qualite_reduite AS UNSIGNED) AS qualite_reduite,
    CAST(agg.qualite_basse AS UNSIGNED) AS qualite_basse, agg.images_par_seconde
  FROM agg LEFT JOIN med ON med.device <=> agg.device
  ORDER BY agg.visites DESC;

-- Provenance des 30 derniers jours (site d'où l'on vient, ou ?utm_source=… dans le lien), par langue
CREATE OR REPLACE SQL SECURITY INVOKER VIEW stats_sources AS
  SELECT COALESCE(NULLIF(props->>'$.utm', ''), NULLIF(props->>'$.ref', ''), '(direct)') AS source, lang AS langue, COUNT(*) AS visites
  FROM events WHERE name = 'Visite' AND at > UTC_TIMESTAMP(6) - INTERVAL 30 DAY
  GROUP BY source, langue ORDER BY visites DESC;
