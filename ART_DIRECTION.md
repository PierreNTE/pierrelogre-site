# Direction artistique · pierrelogre.com

Le monde doit donner envie de regarder autour de soi. Riche ne veut pas dire chaotique : chaque élément a une raison d'être.

## Principes

- **Formes simples, finition soignée.** Volumes simples, contour sombre (`#3a2f27`) sur les objets et personnages, aucun matériau réaliste.
- **Ombrage lisse pour ce qui est organique** (choix de la version 5.6, dans l'esprit d'Untitled Goose Game) : renard, habitants, animaux, feuillages, haies et troncs sont lissés ; bâtiments, mobilier et rochers taillés gardent des faces nettes. La netteté vient de la géométrie (une boîte, un rocher à faces), pas du matériau : seuls les brins d’herbe et les fleurs du sol gardent `flatShading`.
- **Rien ne flotte, rien ne traverse.** Chaque objet touche le sol ou ce qui le porte (pieds de chaise, potence de lanterne, tiges d'un panneau suspendu). Le contrôle automatique de la géométrie (composantes non reliées au sol) sert de garde-fou.
- **Plusieurs plans de profondeur.**
  - Premier plan : herbes, fleurs, petits objets.
  - Plan intermédiaire : chemins, bâtiments, personnages, bêtises.
  - Arrière-plan : lisières denses, puis une seconde rangée d'arbres hors des limites.
  - Lointain : brouillard teinté selon la zone.
- **Regrouper plutôt que saupoudrer.** On place les décors par petites histoires : la réserve du boulanger, le tas de bois de la maison, le paddock d'une équipe.
- **Varier.** Rien n'est jamais identique : position par taches naturelles, rotation, taille, inclinaison et légère variation de teinte (HSL).
- **Bouger presque sans qu'on le remarque.** Vent dans l'herbe et les fleurs, fumée, nuages, papillons, poussières. Rien de rapide ni de flashy.

## Palette

| Usage | Couleurs |
|---|---|
| Prairie | `#a9cc86` (sol), touffes `#79a856` à `#9cc06a` |
| Feuillages d'automne | `#6f9e4f` `#d98b3a` `#c9a33d` `#7fb05c` `#e2a548` |
| Forêt | sapins `#4f7f45` à `#6b9c52`, mousse `#93b873`, litière orangée |
| Renard | `#e8742a` (couleur d'accent de toute l'interface) |
| Bois | `#8a5a3b` `#a8764a` `#c9a074` |
| Pierre | `#9a958c` `#b5ad9e` |
| Fleurs | `#f5f0e6` `#f2b8c6` `#f6d36b` `#b9a5e8` `#f6a07a` |

Le papier de l'interface (`#fbf6e6`) et l'encre (`#2f2a24`) ne changent pas.

## Lumière et atmosphère

- Lumière de fin d'après-midi : soleil chaud, ciel clair, sol vert (hémisphère).
- Tone mapping « Neutral », exposition 1,04 : on garde les pastels sans brûler les blancs.
- Ombres de nuages qui glissent sur le sol. Elles sont calculées dans le shader et ne touchent que la lumière directe.
- Ombres de contact : une tache douce au pied des arbres, rochers, maisons et bancs (`aoBlob`).
- **Chaque zone a son humeur** (`mood` dans la région) :
  - ciel `bg` et brouillard `fog`, `near` et `far` ;
  - couleurs `sun`, `sky` et `ground` ;
  - quantité de vie `life` ;
  - musique `music`.
  En marchant d'une zone à l'autre, ces couleurs glissent doucement ; après un voyage (terrier, train, bateau, carte) ou une reprise de partie, elles sont appliquées d'un coup.
- Feuilles qui tombent selon le lieu : aucune sous terre, peu en ville et à la plage, des flocons en montagne (`LEAF_K` dans `main.js`).
- Rais de lumière de la forêt : dégradé doux (bords et pied fondus), plus discrets le soir et sous la pluie.

## Caméra

- Vue plongeante à environ 45° (fov 38 en paysage, 52 en portrait).
- Plan proche à 1 m (en jeu, la caméra reste à plus de 17 m du renard ; dans le mini-jeu, à environ 7 m) : dix fois plus de précision de profondeur qu'à 10 cm, donc moins de scintillement entre sols proches.
- Elle anticipe un peu la course et « respire » à peine quand le renard reste immobile.
- À l'ouverture d'une zone : plan large sur le passage pendant que la vague de réveil se propage.
- Aucun roulis ni secousse.

## Prise en main (première minute, téléphone)

- La carte d'accueil s'affiche dès le premier affichage, dans la langue du visiteur (les textes anglais de la carte sont glissés dans `boot.js` au build), pendant que le jeu se charge derrière : l'interface de jeu reste cachée, un petit rond tourne sur les boutons. Un clic pendant ce temps est retenu : la partie démarre dès que le jeu est prêt. Si le jeu tarde (8 s), un lien propose la fiche sans jeu.
- Première partie libre d'un nouveau visiteur (`tutorial.js`) : trois bêtises guidées, sans rien lire avant de jouer — faire sursauter le jardinier, voler son chapeau, le jeter dans la fontaine (environ 24 m de chemin jusqu'au jardinier : 5 s au pas). Un post-it jaune prend la place du carnet (« Bêtise 1/3 », ce qu'il faut faire, la touche ou le bouton), un chevron sautille au-dessus de la cible, l'anneau au sol et la flèche de bord d'écran sont ceux du jeu. Le renard regarde déjà vers le jardinier. Pendant la visite, le jardinier met 2,6 s à réagir (au lieu de 0,7 s) et court un peu moins vite (×0,8) : on doit réussir du premier coup.
- Récompenses : à chaque étape, un « ding » et le post-it qui rebondit (en plus de la coche du carnet et du petit saut du renard) ; à la fin, une fanfare, des confettis, le post-it orange « Bien joué, petit renard ! », puis le carnet revient avec « La suite est ici ! » (déplié sur grand écran ; sur téléphone il reste replié, pour ne pas couvrir le joystick, mais il s'allume). La rumeur du terrier arrive ensuite. « Passer » à tout moment ; vue une fois (ou passée), la visite ne revient plus. Rien pour les habitués (record déjà fait) ni pour le défi du jour.
- Joystick flottant : toute la moitié basse gauche de l'écran répond ; si le pouce se pose hors du cercle, le cercle vient sous le pouce. Petite zone morte au centre (12 %), course près du bord.
- Boutons en arc sous le pouce droit : Glapir dans le coin, Attraper juste à côté, Discret et Zoom au-dessus ; ils s'enfoncent au toucher. Attraper s'allume (anneau orange qui pulse) quand quelque chose est à portée et devient « Poser » quand le renard porte un objet ; portée un peu plus large au doigt (2,3 m contre 1,9 m au clavier). Pendant la visite, le bouton à toucher se signale (il grossit doucement).
- Contre un obstacle, le renard glisse le long : il garde la part de sa vitesse qui longe le mur ; de face, il s'arrête au lieu de courir sur place (animation, pas et caméra suivent la vraie vitesse).
- Sur Android, une courte vibration salue chaque bêtise (l'iPhone ne le permet pas dans un navigateur).

## Animation

- Végétation : vent permanent faible, et les herbes et fleurs se couchent au passage du renard.
- Ambiance : papillons (plus nombreux à mesure que le monde avance), vols en V, fumée des cheminées, pollens.
- Petites bêtes qui réagissent au renard : lapins, hérisson, grenouille.
- Faune (`src/js/fauna.js`) : poules et coq qui picorent devant leur poulailler et s'enfuient en caquetant, cane et canetons sur la rivière qui filent vers l'autre rive, vaches maraîchines au pré de la gare qui suivent le renard du regard, crabes de l'île qui rentrent dans l'eau, hirondelles autour des toits, écureuils roux qui grimpent aux chênes de la forêt, et un chat qui dort sur la margelle du puits, crache si on le dérange et va se recoucher ailleurs.
- Bêtises avec les animaux : semer la panique dans la basse-cour, faire chanter le coq, déloger le chat de ses trois siestes (secrètes, au village), se faire suivre par les canetons (en se faufilant), faire meugler tout le troupeau, renvoyer les six crabes à la mer, faire grimper les trois écureuils. Succès « Ami des bêtes ».
- Habitants du village : une dame qui fait le tour du village (avec une pause devant la boulangerie) et un vieux monsieur au béret qui s'assied un moment sur le banc ; ils tournent la tête vers le renard et lui lancent un mot de temps en temps.
- Rare : une montgolfière traverse le ciel.
- Heure du jour (`src/js/daytime.js`) : un cycle d'environ 9 minutes de jeu. Matin doux, journée, fin d'après-midi dorée (soleil plus bas, ombres plus longues), soir bleu où les lanternes et les fenêtres s'allument et où des lucioles flottent dans les prés et la forêt, puis l'aube. De temps en temps, une petite averse (jamais en montagne ni dans le centre de données, jamais avec « réduire les animations »).
- Sons d'ambiance continus par lieu (vent dans les feuilles, eau qui court, ressac, rumeur du stade, ville, pluie), oiseaux variés le jour (mésange, merle, coucou, ramier), grillons et hibou le soir, cris des animaux plus doux au loin.
- Progression : les fleurs éclosent là où une bêtise vient d'être faite, et restent. Les zones fermées « dorment » (désaturées, vides), puis une vague chaude les réveille.

## Identité des lieux

- **Le village (scène étalon)** : maisons vendéennes (murs chaulés, socle de pierre, chaînes d'angle, tuiles canal, génoise, volets peints, jardinières), chemins de terre qui serpentent, talus de bocage plantés de haies et de chênes têtards qui ferment l'horizon, hortensias, linge qui sèche, puits. Le terrier est une butte herbeuse fleurie, coiffée d'un jeune chêne.
- **La rivière** : un vrai lit sous le niveau de la prairie (berges en pente, vase, pierres à fleur d'eau, roseaux et massettes) et un pont en dos d'âne une fois réparé.
- **La plage** : cordon de dunes avec trois passages, ganivelles en châtaignier, oyats, promenade en planches.
- **La forêt** : sous-bois d'automne (tapis de feuilles, mousse, buttes), sentiers de terre qui serpentent, ruisseau qui descend de la colline de la grotte jusqu'à l'étang (berge de vase, fond sombre, eau animée, roseaux, nénuphars, petit ponton), grotte dans une colline boisée (éperon moussu, entrée profonde, stalactites, lierre), camp du bûcheron (cabane fumante, clairière de coupe, chevalet), affût perché du photographe, champignons au pied des souches, chêne du hibou avec sa branche et son trou.
- **Paris** : pavés, Champ-de-Mars bordé d'allées de platanes, parterres à la française, fontaines Wallace, kiosque à journaux, colonne Morris, vélos en libre-service, immeubles à balcons filants et toits de zinc à lucarnes.
- **Nantes** : pavés de l'île, platanes du quai, jardins de graminées et de bouleaux, abris de tram.
- **Le terrier de Pierre** (salle souterraine, `regions/terrier.js`) : vue en coupe comme une maquette (bloc de terre en couches, murs de terre moussus, racines, lanternes aux halos chauds, tapis, lit du renard). Le long du mur, un socle par étape du parcours (porte-voix, tablette, tableau blanc, téléphone, baie de serveurs, badge), reliés par des empreintes de renard ; cadres des certifications, toque sur une pile de livres, ordinateur portable, ardoise des chiffres, baguette volée sur la table basse. En s'approchant, une plaque raconte l'étape (textes de la fiche, rien d'inventé). Le tableau de liège ouvre la fiche complète et le lien LinkedIn. On ressort par le tunnel.
- **Le fil rouge** (`story.js`) : Gaston, pigeon voyageur à casquette de facteur, attend le renard dans chaque zone et lui souffle où chercher. Neuf souvenirs (plume de hibou, ballon de hand, casque de motocross, galet, coquillage, billet Nantes ⇄ Paris, toque d'Euridis, tour Eiffel de poche, clé « cloud souverain ») rejoignent l'étagère du terrier ; les neuf rentrés, la visite suivante au terrier tourne à la petite fête (succès « Grand déménagement »).
- **Le complexe sportif** : vrai terrain de handball (zones des 6 m en demi-disques, 9 m en pointillés, dégagement en résine verte), salle omnisports à toit en voûte avec son enseigne, mur du club derrière les tribunes, filets pare-ballons, buvette avec auvent et terrasse, parking avec les camionnettes du club et arceaux à vélos, allée de platanes, talus de bocage au sud, spectateurs debout qui suivent le ballon.
- **La gare** : petite gare de campagne sous une marquise à colonnettes de fonte et lambrequins, château d'eau, halle à marchandises au toit d'ardoise avec son quai (sacs, caisses, tonneaux), chariot à bagages, café de la gare avec auvent et terrasse, place pavée, platanes ; le tout fermé par des talus de bocage et un rideau de pins, avec un pré à vaches derrière la clôture.
- **Le motocross** : piste de terre brune striée de traces, virages relevés, bottes de foin et pneus à l'intérieur des courbes, grille de départ dont les barrières tombent au départ, panneaux, paddock (motos, bidons, caisse à outils) et buvette ; collines en fond.
- **La montagne** : sommets enneigés à plusieurs pointes, sapins et rochers poudrés, lac gelé, sentiers de neige tracés, pylônes en treillis reliés par un câble, et le centre de données (bandes de neige, antenne, parabole) avec son panneau.
- **L'île** : contour de sable irrégulier, ourlet d'écume qui respire, palmiers penchés (un avec ses noix de coco), hibiscus, rochers baignés d'écume, ponton en planches et sentier de sable.

## Personnages

- **Le renard** : lisible vu d'en haut. Grosse tête au crâne rond, museau effilé au dessous blanc, joues blanches en pointe vers l'arrière, grandes oreilles en feuille à pointe noire, yeux noirs à reflet, dos plus sombre, plastron blanc, cuisses rondes fondues dans la croupe, jarrets articulés, « chaussettes » noires et pattes ovales, queue touffue d'un seul tenant au bout blanc. Son matériau n'est jamais rendu transparent par l'effet « voir à travers ».
- **Ses animations** (`animateFox` dans `foxupdate.js`) :
  - allures : trot en diagonale à la marche, bond à la course (pattes avant puis arrière ensemble, corps qui se cabre et plonge), pas feutrés en se faufilant (corps et tête bas, oreilles couchées, queue basse) ;
  - la patte qui avance se soulève et le jarret se plie ; le corps roule un peu, penche dans les virages et se cabre en accélérant ; la tête compense le balancement ;
  - il cligne des yeux toutes les 2 à 5 s, respire au repos, s'assoit après 4 s (pattes avant droites, pattes arrière repliées, queue enroulée sur le côté), se gratte et bâille ;
  - la tête plonge pour prendre ou poser un objet et se relève en le portant ; la queue traîne dans les virages (ressort amorti) ; il s'étire à la course, s'écrase à l'atterrissage, soulève de la poussière, tourne la tête vers ce qui l'intéresse et fait un saut avec un tour sur lui-même après chaque bêtise (simple saut si les animations sont réduites).
- **Les habitants** (PNJ et foules partagent les mêmes volumes, `torsoGeo`, `legParts`, `armParts` dans `npc.js`) : buste en poire tourné (hanches, taille, épaules arrondies), bras et jambes ronds, chaussures ovales, grosse tête ronde ; tablier et salopette épousent le buste. Silhouettes variées (mince, trapu, rond, carré, grand), coiffures variées (courte, chignon, queue de cheval, bouclée, longue, en épis, dégarnie), sourcils, moustache ou lunettes pour quelques-uns. Ils respirent au repos, roulent légèrement des épaules en marchant, finissent leur pas au lieu de s'arrêter net et tournent la tête vers le renard quand il passe près d'eux.

## Ajouter du décor

- `src/js/regions/kit.js` : les objets (arbres, rochers, bancs, bâtiments, objets de plage, de ville, de montagne…). Le standard v2 :
  - `cottage` (maison vendéenne), `building` (socle, fenêtres encadrées, porte, toit à deux pans, croupe, plat ou mansardé avec lucarnes ; options `tiles`, `slate`, `shutter`, `chimney`, `snow`, `balcony`), `gableRoof` et `windowUnit` pour composer ;
  - `oak`, `fir`, `pine`, `pollard` (chêne têtard), `tree` (même signature qu'avant), `hedgeRow`, `bocageBank` ;
  - `path(points, largeur, { style, closed })` : chemin lissé aux bords fondus (styles `lane`, `foot`, `track`, `forest`, `sand`, `stone`, `mx` pour la terre striée du motocross, `snow` pour les sentiers de neige, `brook` pour un ruisseau ; `closed` pour une boucle ; le bruit des pas suit le style) ; `W.path` dans une région (la végétation l'évite) ;
  - `hydrangea`, `well`, `laundry`, `stoneWall`, `lantern`, `wheelbarrow`, `wallace`, `newsKiosk`, `bikeRack`, `tramShelter`, `flowerBed` ;
  - `snowPine`, `snowRock`, `mound` (butte ou talus doux), `waterTower`, `palm` (tronc annelé courbé, palmes retombantes ; renvoie la position de la couronne) ;
  - `bistroChair` et `bistroTable` (chaise de bistrot à quatre pieds et dossier, guéridon à socle), `standCart` (carriole de marchand), `carousel` (manège de chevaux de bois animé : `W.rig(root, [deck, ...horses])`), `gorse` (touffe d'ajonc piquée de jaune) ;
  - `boat` : coque taillée (proue en pointe), liston de couleur, pont et voile ; `wheelbarrow` : roue tenue par son axe et la fourche des brancards ; `lamp` : lanterne à vitres, la lumière se voit entre les montants.
- `src/js/fauna.js` : animaux en troupeaux dessinés en instances (`addHens`, `addDucks`, `addCows`, `addCrabs`, `addSwallows`, `addSquirrels`) et le chat (`addCat`). Une pièce animée = 2 appels de dessin (1 sans contour), quel que soit le nombre de bêtes. Les fonctions acceptent des rappels (`onPanic`, `onImprint`, `onSea`, `onClimb`, `cat.onWake`, `cows.chorus()`, `hens.crow()`) pour brancher des bêtises.
- `lamp`, `lantern`, la petite lanterne des maisons et `windowUnit` enregistrent leur position (`LIGHTS`, `WINDOWS`) : elles s'allument d'elles-mêmes le soir.
- Sols superposés : l'ordre est fixé à la fin de la construction de chaque zone (`rankFlats` dans `regions.js`), toujours le même quel que soit le chemin du joueur. De bas en haut : grandes taches `W.patch` (hauteur 0,014 par défaut), variations `W.mottle`, puis les chemins (ruban transparent à 12 mm), puis `W.ground` et `W.disc` (rangés par hauteur demandée, puis par ordre de création), le tout sous les ombres portées. Un chemin passe donc sous un terrain ou un quai qu'il rejoint, et une flaque posée sur un chemin reste visible. Pour qu'une tache passe au-dessus des chemins (terre nue, boue), lui donner une hauteur au-dessus de 0,014.
- Chemins : dans les virages serrés, le bord intérieur est resserré selon la courbure (plus de dents de scie) ; deux chemins de styles différents qui se suivent (terre de la forêt → neige) se recouvrent sur un mètre avec un fondu aux deux bouts.
- Varier avec `hash(n)` (pseudo-hasard stable : même résultat à chaque chargement) et `shade(couleur, dl, ds)` (teinte voisine).
- `W.patch` : sol organique. `W.mottle` : variations de teinte du sol (rester à quelques pour cent de la teinte de base : elles sont toutes visibles).
- `veg: { biome, density, rect, avoid }` dans `defineRegion` : végétation. Biomes disponibles : `meadow`, `forest`, `beach`, `reedbank`, `dry`, `mountain`, `city`, `tropical`.
- `W.dyn` : objet animé. `W.update` : animation.
- `src/js/ambient.js` : petites bêtes et événements.

## Performance

- Mesurer sur un vrai appareil : adresse terminée par `#perf` (ou Maj+P) pour le compteur à l'écran ; `#bench`, Maj+B ou cinq tapes rapides sur le chrono du carnet pour le tour automatique des zones (`src/js/bench.js`). Le test ne sauvegarde rien et affiche un texte à copier.

- Tuiles fusionnées (décor et végétation) découpées par leur boîte englobante, arrêtée juste sous le sol, plutôt que par leur sphère (`boxCull` / `cullBaked` dans `engine.js`) : une tuile dont tout le contenu est sous le bord de l'écran n'est plus dessinée (environ 30 à 45 % de triangles en moins selon l'endroit). Les contours des personnages et des troupeaux s'effacent au-delà de 17 à 18 m.
- Décor statique fusionné : le village en un seul bloc (peu d'appels de dessin), les zones par tuiles de 56 unités ; tout ce qui est hors champ n'est pas dessiné. Végétation fusionnée par tuiles de 64 unités : 1 appel de dessin par tuile visible, quelle que soit la densité (ce qui ne bouge pas, cailloux ou feuilles mortes, est simplement « non pliable »).
- Seuls les volumes principaux (ceux qui ont un contour) projettent une ombre : les petits détails (tuiles, encadrements, fleurs) n'en projettent pas.
- La caméra ne dessine rien au-delà du brouillard (`camera.far` = fin du brouillard + 14).
- Vignettage en CSS (aucun coût de rendu). Pas de post-traitement 3D : le contour, la lumière et le brouillard suffisent, et un passage plein écran coûterait cher sur mobile.
- Foules, oiseaux et animaux en instances. Les contours au loin sont masqués. Foules et troupeaux recalculent à chaque image une sphère englobante : hors champ, ils ne sont pas dessinés. Un chapeau que personne ne porte dans une foule n'est pas dessiné.
- Heure du jour : lanternes (points), flaques de lumière, fenêtres, lucioles et pluie = 1 appel de dessin chacune, et aucun quand elles sont éteintes (journée sans pluie).
- Version 5.6 (rendu lisse, renard et habitants plus ronds, nouveaux objets) mesurée aux mêmes endroits que la 5.5.2 : +4 à +11 appels de dessin (renard : 14 pièces au lieu de 11 ; manège : 3 pièces), triangles +3 % au village, +9 % en forêt, +34 % au motocross (rubalise, ajoncs), +36 à +50 % à Paris et Nantes (platanes plus fournis, manège, jardin), soit de 113 000 (Nantes) à 418 000 triangles (basse-cour du village, déjà 407 000 en 5.5.2) en vue d'ordinateur. À vérifier sur l'iPhone avec #bench.
- Écrans à 120 Hz et plus (`pacer.js`) : reconnus à leurs appels d'image très rapprochés (sous 9,6 ms), ils sont plafonnés à 60 i/s réguliers (on ne dessine que si 12,5 ms ont passé depuis la dernière image) : plus d'hésitation entre 8 et 17 ms, moins de chauffe et de batterie, et aucune perte quand l'image est lourde. Rien ne change à 60 ou 90 Hz. Le renard et la caméra avancent au temps réel. Le test #bench mesure sans ce plafond (la ligne « Écran » donne la fréquence estimée et le signale).
- Qualité Auto, Haute ou Basse (menu). En Auto, la fluidité se mesure en jeu seulement, hors construction de zone et hors pause (les à-coups du chargement ne comptent plus) ; un appareil fluide au palier moyen retente la pleine résolution, et la garde s'il reste au-dessus de 48 i/s. Mesuré sur l'iPhone de Pierre avant ce réglage : 60 i/s partout, mais au palier moyen (résolution ×1) ; après (5.5.1, le 10 octobre 2026) : pleine qualité gardée partout (Q0, ×1,75), 60 i/s dans le village et 82 à 85 i/s ailleurs (écran 120 Hz), 95 % des images sous 19 ms. En basse qualité : densité de végétation × 0,35, pas de poussières, ombres en 512.
