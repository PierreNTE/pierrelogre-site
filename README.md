# pierrelogre.com · le renard fait des bêtises

Site personnel de Pierre Logre : un jeu 3D (Three.js, sans framework) façon *Untitled Goose Game*.
Un renard fait des bêtises dans un village vendéen et dans un bureau… puis dans tout un monde qui s'ouvre au fil
des bêtises : forêt, complexe sportif (handball), motocross, rivière, plage de Vendée, gare, Nantes (l'éléphant),
Paris (la tour Eiffel), montagne et datacenter souverain, île secrète. Son terrier est une salle souterraine
où le parcours de Pierre est exposé, souvenir par souvenir ; un tableau ouvre la fiche complète et renvoie vers
LinkedIn. Un fil rouge (Gaston le pigeon facteur, neuf souvenirs à rapporter) relie les zones.

## Commandes

```
npm ci            # dépendances
npm run build     # src/ → site/www (OVH) + dist/artifact.html (aperçu en une page)
npm run lint      # vérifie les imports manquants et les erreurs simples
npm test          # build + tests dans Chromium (CSP stricte, partie complète, mobile, versions de secours)
python3 tests/og.py   # régénère l'image d'aperçu LinkedIn (serveur tests/csp_server.py lancé sur :8766)
```

Les tests demandent Python 3 avec `playwright` et `pillow` (`pip install playwright pillow && python -m playwright install chromium`).

Contrôles visuels (outils de développement, sans effet en jeu) :
- `window.__foxCam = (camera, now) => { … }` : appelée juste avant chaque rendu si elle est définie, elle permet de placer la
  caméra pour des captures rapprochées (renard sous plusieurs angles, objets, personnages).
- `window.__foxAudit = (id, group) => { … }` : appelée avec le groupe de décor de chaque lieu juste avant sa fusion ; sert au
  contrôle automatique de la géométrie (objets qui flottent, NaN, échelles nulles).
- `window.__fox.dev.KIT` et `setBuild` : construire n'importe quel objet du kit dans un groupe à part (galerie d'objets).
- `window.__fox.THREE` ne contient que `Vector3` : exposer tout l'espace de noms empêcherait esbuild d'alléger Three.js.
- `window.__fox.dev.resolve` (collision du jeu), `pace` / `PACE` (cadence d'affichage), `stick` (joystick), `nearestTarget`
  (portée d'attraper), `TUTO` / `skipTuto` (visite guidée) : utilisés par les tests.
- Le monde est construit avec un hasard rejouable (graine par lieu, `seeded` dans `state.js`) : deux chargements donnent
  le même décor, donc des captures comparables.

## Structure

```
src/
  body.html, style.css, boot.js   page, styles, détection WebGL (version sans jeu)
  site.config.json                liens LinkedIn/GitHub, image d'aperçu, Umami (facultatif)
  htaccess.conf                   devient site/www/.htaccess (HTTPS, CSP stricte, en-têtes, cache)
                                  (JS et CSS gardés 7 jours : le build ajoute ?v=empreinte à leur adresse,
                                  une mise à jour est donc vue tout de suite par les visiteurs déjà venus)
  assets/                         og-image.jpg (FR), og-image-en.jpg (EN)
  js/
    main.js       boucle, démarrage (libre / défi du jour / reprise), fin de partie
    config.js     réglages, mesure d'audience (track)
    i18n.js       tous les textes FR/EN (bêtises, répliques, indices, terrier, glands)
    state.js      préférences, liste des bêtises, partie en cours
    persist.js    sauvegarde de la partie (localStorage)
    daily.js      défi du jour (tirage avec la date comme graine)
    engine.js     rendu, shaders (vent, herbe, transparence devant le renard), fusion, ombres, collisions
    world.js      décor (village, potager, boulangerie, bureau), fusion du décor
    fox.js        modèle du renard          foxupdate.js  déplacement, discrétion, animations
    npc.js        modèles des PNJ, oiseaux  npclogic.js   A*, vue/ouïe, états (recherche, repêchage, glissade…)
    items.js      objets, pots, chaises     actions.js    glapir, attraper, lâcher, bêtises en chaîne, terrier
    hud.js        carnet, indices, bulles, écran de fin, cartes des glands
    acorns.js     glands dorés              audio.js      sons et musique synthétisés
    fx.js         particules, feuilles      quality.js    qualité adaptative
    input.js      clavier, tactile (joystick flottant : toute la moitié basse gauche répond, il vient sous le pouce)
    tutorial.js   première visite : trois bêtises guidées (jardinier → chapeau → fontaine), post-it, chevron, « Passer »
    pacer.js      écrans 120 Hz et plus : 60 images par seconde régulières (sauf pendant #bench)
    nudge.js      indices qui montrent l'endroit (anneau + flèche « Indice ») quand on tourne en rond au village
    regions.js    système de régions : déclaration, construction à la demande, ouverture, voyages, zones, objets
    regions/      une région par fichier (village, foret, sport, moto, riviere, plage, gare, nantes, paris,
                  montagne, ile, terrier = la salle souterraine) ; index.js = chargées d'emblée (village, terrier),
                  lazy.js = les autres, après la première image ; kit.js (décor partagé : maisons vendéennes, bâtiments, arbres, haies et talus
                  de bocage, chemins qui serpentent, mobilier urbain, objets de plage, sapins enneigés,
                  palmiers, château d'eau…)
    crowd.js      foules en instances (joueurs, supporters, touristes…) : ~10 appels de dessin par foule, rien hors champ
    fauna.js      faune en troupeaux : poules, canards, vaches, crabes, hirondelles, écureuils, chat ; réagissent au renard
    daytime.js    heure du jour (matin, fin d'après-midi dorée, soir avec lanternes et fenêtres) et petites averses
    story.js      fil rouge : Gaston le pigeon facteur, neuf souvenirs à rapporter au terrier, petite fête finale
    bench.js      test de performance intégré (#perf, #bench, Maj+P / Maj+B, 5 tapes sur le chrono)
    achievements.js  succès (chapitre 1, aventure, secrets)
    journal.js    carnet de voyage (touche M) : carte, succès, classement ; choix de destination du train
    minigame.js   mini-jeu « Tir au renard » (tirs au but de handball)
    leaderboard.js   classement partagé (Supabase, clé publique) avec repli local
    hooks.js      crochets partagés (glapir, objet posé, destination)
    vegetation.js végétation par biome fusionnée par tuiles, ombres de contact, fleurs qui éclosent après chaque bêtise
    ambient.js    vie ambiante : papillons, vols d'oiseaux, fumées, pollens, lapins, hérisson, grenouille, montgolfière
    hover.js      micro-interactions à la souris (survol, clic sur les habitants)
    dialogs.js    fenêtres accessibles : focus dedans, Tab en boucle, reste de la page inerte, retour du focus
    presentation.js  première visite : le renard se présente face au visiteur (4,8 s), puis la carte d'accueil revient
  legal.mjs, legal.js             mentions légales (FR / EN) et bouton « ne pas compter mes visites »
supabase/leaderboard.sql   table + règles de sécurité du classement
supabase/stats.sql         mesure d'audience sans cookie (table events, vues stats_*, effacement à 13 mois)
tests/            run_all.py (tests), og.py (image d'aperçu), csp_server.py (serveur local avec la CSP)
.github/workflows/deploy.yml   build + tests + envoi FTPS sur OVH à chaque push sur main
```

## Direction artistique

Voir `ART_DIRECTION.md` : palette, lumière, caméra, animation, règles pour ajouter du décor sans surcharger.

## Ajouter un monde

Exemple : « Ajoute un monde spatial ».

1. Créer `src/js/regions/espace.js` sur le modèle d'une région existante :
   ```js
   defineRegion({
     id: 'espace', bounds: { minX, maxX, minZ, maxZ },        // rectangle libre sur la carte
     walk: [ ... ],                                         // zones praticables (+ chemin d'accès)
     unlock: () => totalDone() >= 70, need: needTotal(70),  // quand elle s'ouvre
     spawn, gatePos, mood: { bg, fog, near, far, music },   // arrivée, plan d'ouverture, ambiance
     goals: [{ id: 'fusee' }, { id: 'etoiles', need: 5 }, { id: 'alien', secret: true }],
     i18n: { fr: { goals, hints, L, cards, … }, en: { … } },
     build(W) { /* décor + logique : W.npc, W.crowd, W.item, W.interact, W.zone, W.yap,
                   W.pickups, W.pushable, W.postcard, W.gate, W.update… */ },
   });
   ```
2. L'importer dans `src/js/regions/lazy.js` (chargée après le démarrage) et ajouter son id à `ORDER` (`regions.js`).
3. Pour y aller : un chemin depuis une région voisine (`walk` + `adj`), ou un transport
   (voir `trainMenu` dans `gare.js`, ou le bateau dans `plage.js`).

Carte, carnet, sauvegarde, succès « 100 % » et explorateur suivent automatiquement.
Une ambiance musicale se choisit dans `STYLES` (`audio.js`).

## Classement partagé (Supabase)

Le classement du mini-jeu est commun à tous les visiteurs : projet Supabase gratuit « pierrelogre-classement »
(région Paris), table `scores` et vue `leaderboard` (meilleur score de chaque pseudo), règles dans
`supabase/leaderboard.sql` (lecture et ajout seulement, pseudo et score vérifiés, pseudos injurieux refusés,
anti-spam : 5 scores par pseudo et par minute, 300 par minute, 3 000 par jour). Le site n'a que la clé
**publishable** (`leaderboard.publishableKey` dans `src/site.config.json`), publique par conception ; le build
refuse une clé secrète et n'ajoute que ce domaine à la CSP. Si Supabase ne répond pas, le classement retombe
sur les scores du navigateur, et le carnet de voyage le signale.

- Les tests n'écrivent jamais dans le vrai classement : un faux serveur Supabase leur répond.
- Supabase met en pause un projet gratuit sans activité pendant 7 jours : le workflow
  `.github/workflows/keepalive.yml` le lit une fois par jour (une fois le dépôt sur GitHub).
- Vider le classement : Supabase > SQL Editor > `delete from public.scores;` (ou une ligne : `where pseudo = '…'`).

## Langues, référencement (SEO) et assistants IA (GEO)

- `/` : page en anglais (langue par défaut, quel que soit le navigateur) ; `/fr/` : la même page en français.
  Mêmes fichiers du jeu ; le bouton FR / EN change la langue en jeu et ce choix est retenu.
- Chaque page : titre, description, Open Graph (image d'aperçu dans sa langue), canonique, `hreflang`
  (en, fr, x-default), données structurées schema.org (ProfilePage, Person, WebSite, VideoGame).
- `llms.txt` : le profil en texte simple pour les assistants IA ; `sitemap.xml` bilingue ; `robots.txt` ouvert à tous.
- Textes : `META` dans `build.mjs` (référencement) et `i18n.js` (page et jeu).

## Ajouter une bêtise

1. Village : l'ajouter dans `GOALS` (`state.js`) et ses textes dans `i18n.js`.
   Autre région : l'ajouter dans `goals` et `i18n` de la région.
3. Appeler `completeGoal('mon-id')` au bon moment (souvent dans `actions.js`).
4. Compléter la partie scriptée dans `tests/run_all.py`.

## Mesure d'audience sans cookie (Supabase)

Même projet Supabase que le classement, règles dans `supabase/stats.sql`. Le collecteur est dans `boot.js`
(`window.__foxStats`), le jeu y passe par `track()` (`config.js`).

- Envoyé : le nom d'un événement (Visite, Jeu prêt, Partie lancée, Visite guidée finie, Terrier trouvé, Terrier
  ouvert, Clic LinkedIn, Qualité, Bench, Départ…), la langue, la page, le type d'appareil (téléphone, tablette,
  ordinateur), quelques chiffres (temps de chargement, qualité graphique, images par seconde, durée) et un numéro
  de visite tiré au hasard à chaque chargement, gardé seulement en mémoire. Ni cookie, ni stockage, ni adresse IP :
  impossible de reconnaître un visiteur d'une fois sur l'autre, d'où l'absence de bandeau de consentement.
- Coupé hors de pierrelogre.com (tests, aperçu) et si le navigateur demande « Do Not Track » ou GPC.
- La clé publique ne peut qu'ajouter des événements (ni lecture, ni modification). Anti-abus : 150 événements
  par visite et par heure, 30 000 par jour. Effacement automatique au bout de 13 mois.
- Lire les chiffres : Supabase > Table Editor (ou SQL Editor) > vues `stats_jour` (par jour), `stats_entonnoir`
  (de la visite au clic LinkedIn, 30 jours), `stats_appareils` (chargement, qualité, fluidité par appareil),
  `stats_sources` (d'où viennent les visites). Mesures détaillées des téléphones (#bench) :
  `select at, device, props from events where name = 'Bench' order by at desc;`
- Lien partagé sur LinkedIn : ajouter `?utm_source=linkedin` pour le voir dans `stats_sources`.
- Umami (facultatif, en plus) : renseigner `umami.src` et `umami.websiteId` dans `src/site.config.json` ; le build
  ajoute le script et autorise son domaine dans la CSP.

## Mentions légales et confidentialité

- Texte dans `src/legal.mjs` (FR et EN), pages générées par `build.mjs` : `/legal/` et `/fr/mentions-legales/`.
  Site édité à titre non professionnel (LCEN art. 1-1, II) : nom de l'éditeur, hébergeur complet, contact LinkedIn.
- À mettre à jour dès qu'une donnée nouvelle est collectée ou stockée (liste « stockage dans ton navigateur »),
  et la date `LEGAL_UPDATED`. Le résumé court de la fiche est `legal` dans `i18n.js`.
- `assets/legal.js` : bouton « ne pas compter mes visites » (clé `fox-nostats`, respectée par `boot.js`).

## Présentation du renard (première visite)

`presentation.js` : si rien n'est encore gardé dans le navigateur, quand le jeu est prêt, la caméra descend face au
renard qui se présente en trois bulles (textes `presHi`, `presMischief`, `presJoin` dans `i18n.js`), puis la carte
d'accueil revient : 4,8 s, sur l'horloge réelle à partir de la première image. Un clic, une touche ou « Jouer » la
passent ; jamais avec « réduire les animations » ni dans les tests qui posent `window.__foxNoCine`. Pendant ce temps,
la vue est raccourcie et les régions voisines attendent pour se construire. `F.dev.present()` la rejoue.

## Premier chargement

Le site en ligne charge d'abord `game.js` et ses morceaux partagés (moteur, Three.js, village, terrier). Les dix autres
régions (`src/js/regions/lazy.js`) sont dans un fichier à part, `lazy-<empreinte>.js`, demandé juste après la
première image : une partie neuve commence sans l'attendre ; « Reprendre » l'attend (bouton qui tourne). L'aperçu
`dist/artifact.html` garde un seul fichier. Les noms des morceaux portent leur empreinte : pas de souci de cache.

## Accessibilité

- Audit axe-core (WCAG 2.1 AA) dans `npm test` : accueil, jeu, carnet de voyage, fiche, page 404.
- Fenêtres (`dialogs.js`) : le focus entre dans la fenêtre, Tab y reste, le reste de la page est inerte pour le
  lecteur d'écran ; à la fermeture, le focus revient au bouton qui l'a ouverte (au clavier) ou au jeu (à la souris).
- Tout se fait au clavier : Tab parcourt le menu et les bêtises (de vrais boutons : Entrée ouvre l'indice),
  onglets du carnet aux flèches, Échap ferme les fenêtres. N replie le carnet (Tab ne le fait plus).
- Couleurs : `--fox-deep` pour le texte orange et les boutons à petit texte blanc, `--fox-text` pour les grands titres.
