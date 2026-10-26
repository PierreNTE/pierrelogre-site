-- =====================================================================
-- À exécuter dans phpMyAdmin juste après l'import des données (classement-donnees.sql) :
-- chaque compteur d'auto-incrément repart après le plus grand id importé.
-- (InnoDB le fait déjà de lui-même après un import avec des id explicites ; ceci le garantit.)
-- =====================================================================

SET @n = (SELECT COALESCE(MAX(id), 0) + 1 FROM scores);
SET @q = CONCAT('ALTER TABLE scores AUTO_INCREMENT = ', @n); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @n = (SELECT COALESCE(MAX(id), 0) + 1 FROM daily_times);
SET @q = CONCAT('ALTER TABLE daily_times AUTO_INCREMENT = ', @n); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @n = (SELECT COALESCE(MAX(id), 0) + 1 FROM events);
SET @q = CONCAT('ALTER TABLE events AUTO_INCREMENT = ', @n); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- Vérification : le nombre de lignes de chaque table (attendu : 13 scores, 0 temps du jour, 435 événements)
SELECT 'scores' AS table_, COUNT(*) AS lignes, MAX(id) AS plus_grand_id FROM scores
UNION ALL SELECT 'daily_times', COUNT(*), MAX(id) FROM daily_times
UNION ALL SELECT 'events', COUNT(*), MAX(id) FROM events;
