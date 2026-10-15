/* Régions présentes dès le démarrage : le village (on y commence) et le terrier (caché dans le village).
   Les autres sont dans lazy.js : sur le site en ligne, elles arrivent dans un fichier à part, téléchargé juste après
   la première image (le jeu démarre sans les attendre). Pour ajouter un monde : créer le fichier, l'importer dans
   lazy.js et l'ajouter à ORDER (regions.js), qui fixe l'ordre de la carte. */
import './village.js';
import './terrier.js';
