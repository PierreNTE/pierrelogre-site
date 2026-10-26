<?php
/* =====================================================================
   Modèle de configuration de l'API (pierrelogre.com).
   1. Copier ce fichier sous le nom config.php, dans le dossier pierrelogre-api/ de l'hébergement
      (à côté de www/, JAMAIS dans www/).
   2. Remplir les valeurs avec celles de l'espace client OVH (Hébergements > Bases de données).
   config.php n'est jamais dans le dépôt Git (.gitignore) et le déploiement automatique n'y touche pas.
   ===================================================================== */
return [
  'db_host' => '',   // nom d'hôte du serveur MySQL (ex. xxxxx.mysql.db)
  'db_port' => 3306,
  'db_name' => '',   // nom de la base
  'db_user' => '',   // utilisateur
  'db_pass' => '',   // mot de passe
  // Clé secrète pour l'empreinte des adresses IP (limite anti-abus) : 64 caractères au hasard,
  // par exemple le résultat de « php -r "echo bin2hex(random_bytes(32));" ».
  'ip_key'  => '',
];
