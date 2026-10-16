/* =====================================================================
   Mentions légales et confidentialité (pages /legal/ et /fr/mentions-legales/, générées par build.mjs).
   Site personnel édité à titre non professionnel : LCEN art. 1-1 (II), RGPD, art. 82 loi Informatique et Libertés,
   recommandations CNIL sur la mesure d'audience exemptée de consentement. À relire à chaque nouvelle donnée collectée.
   ===================================================================== */
export const LEGAL_UPDATED = { fr: '16 octobre 2026', en: 'October 16, 2026' };

export const LEGAL = {
  fr: {
    path: 'fr/mentions-legales/', home: '/fr/', other: '/legal/', otherLabel: 'English version',
    title: 'Mentions légales et confidentialité · Pierre Logre',
    desc: "Mentions légales de pierrelogre.com : éditeur, hébergeur, cookies (aucun), mesure d'audience anonyme, classement du mini-jeu, droits RGPD, accessibilité.",
    h1: 'Mentions légales <em>et confidentialité</em>', updated: 'Dernière mise à jour', back: '← Retour au jeu',
    sections: li => [
      ['Éditeur', `<p>pierrelogre.com est le site personnel de Pierre Logre, édité à titre non professionnel : ni publicité, ni vente, ni aucune contrepartie économique. Directeur de la publication : Pierre Logre. Contact : par message sur <a href="${li}" rel="noopener">LinkedIn</a>.</p>
<p>Conformément à l'article 1-1 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), l'éditeur a communiqué ses éléments d'identification à l'hébergeur.</p>`],
      ['Hébergement', `<ul><li>Site : OVH SAS, SAS au capital de 50 000 000 €, RCS Lille Métropole 424 761 419, 2 rue Kellermann, 59100 Roubaix, France. Téléphone : 1007 (depuis la France) ou +33 9 72 10 10 07.</li>
<li>Classement du mini-jeu et mesure d'audience : base de données Supabase (Supabase, Inc.), hébergée dans la région de Paris (France).</li></ul>`],
      ['Cookies et stockage dans ton navigateur', `<p>Le site ne dépose <strong>aucun cookie</strong> et n'utilise aucun traceur publicitaire ni service d'un tiers : pas de Google Analytics, pas de bouton de réseau social, polices de caractères hébergées sur le site.</p>
<p>Pour que le jeu fonctionne, il garde quelques informations dans le stockage de ton navigateur. Elles restent sur ton appareil et ne sont jamais envoyées :</p>
<ul><li>ta langue, le son, la musique et la qualité graphique ;</li>
<li>ta partie en cours, celle du défi du jour, tes succès, tes glands dorés, tes meilleurs temps et les jours où tu as joué (pour un succès) ;</li>
<li>le dernier pseudo utilisé au classement, et une copie des scores si le classement en ligne ne répond pas ;</li>
<li>si la présentation du renard a déjà été vue, et ton choix sur la mesure d'audience (ci-dessous) ;</li>
<li>le temps d'un rechargement seulement, la partie à relancer (après « Rejouer » ou un changement de qualité).</li></ul>
<p>Ces informations sont nécessaires au service que tu demandes (jouer, retrouver ta partie) : elles ne demandent pas de consentement (article 82 de la loi Informatique et Libertés). Pour tout effacer : supprime les données du site dans les réglages de ton navigateur.</p>`],
      ['Mesure d\'audience', `<p>Pour savoir si le site est utilisé, il envoie des statistiques anonymes : le nom de l'étape (visite, partie lancée, terrier trouvé, clic vers LinkedIn…), la langue, la page, le type d'appareil (téléphone, tablette ou ordinateur), la largeur d'écran arrondie, le nom du site d'où tu viens, le temps de chargement et la fluidité du jeu. Un numéro de visite est tiré au hasard à chaque chargement de page et n'est gardé nulle part : impossible de te reconnaître d'une visite à l'autre. Aucun cookie, aucun stockage, aucune adresse IP enregistrée dans ces statistiques.</p>
<p>Elles servent uniquement à l'éditeur, ne sont ni croisées avec d'autres données ni transmises à quiconque, et sont effacées automatiquement au bout de 13 mois. La mesure est coupée si ton navigateur envoie le signal « Do Not Track » ou « Global Privacy Control ».</p>
<div class="opt"><p id="statsState" class="muted" role="status"></p><button type="button" id="statsBtn" hidden></button></div>
<p class="muted">Si tu lances le test de performance (pierrelogre.com/#bench), ses résultats sont envoyés de la même façon, avec en plus le modèle de carte graphique, la taille d'écran et le navigateur.</p>`],
      ['Classement du mini-jeu', `<p>Si tu choisis d'envoyer ton score, ton pseudo (16 caractères au plus) et ton score sont enregistrés et publiés dans le classement, visible par tous. Choisis un pseudo qui ne t'identifie pas si tu préfères rester discret. Les pseudos injurieux sont refusés. Ils sont conservés tant que le classement existe ; pour en faire retirer un, écris-moi sur LinkedIn.</p>`],
      ['Tes données et tes droits', `<p>Responsable du traitement : Pierre Logre. Fondements : l'intérêt légitime pour la mesure d'audience anonyme ; ton consentement pour le classement (tu choisis d'y envoyer un score).</p>
<p>Prestataires : OVH (hébergement du site) et Supabase (base de données, hébergée à Paris). Comme tout hébergeur, ils tiennent des journaux techniques (dont l'adresse IP) pour la sécurité ; ils ne servent pas à la mesure d'audience. Supabase, Inc. est une société américaine : ses équipes peuvent intervenir depuis l'extérieur de l'Union européenne pour le support, un accès encadré par les clauses contractuelles types de la Commission européenne.</p>
<p>Tu peux demander l'accès, la rectification ou l'effacement de tes données, ou t'opposer à leur traitement, en m'écrivant sur <a href="${li}" rel="noopener">LinkedIn</a>. Les statistiques étant anonymes, elles ne peuvent pas être rattachées à toi. Tu peux aussi adresser une réclamation à la CNIL (<a href="https://www.cnil.fr" rel="noopener">cnil.fr</a>).</p>`],
      ['Accessibilité', `<p>Le site vise le niveau AA des règles d'accessibilité WCAG 2.1, vérifié automatiquement à chaque version : tout se fait au clavier, les fenêtres sont annoncées aux lecteurs d'écran, les contrastes sont contrôlés. Le monde en 3D ne peut pas être décrit à un lecteur d'écran : la fiche « Qui est le renard ? » reprend tout le contenu en texte. Un problème ? Écris-moi sur LinkedIn.</p>`],
      ['Propriété intellectuelle et crédits', `<p>Le jeu, ses textes et ses graphismes sont la création de Pierre Logre ; toute reproduction demande son accord. Le jeu utilise Three.js (licence MIT) et les polices Baloo 2 et Patrick Hand (licence SIL Open Font License 1.1, fournie avec les polices). LinkedIn et GitHub sont des marques de leurs propriétaires ; leurs sites ont leurs propres règles de confidentialité.</p>`],
    ],
    js: { on: 'Tes visites sont comptées, anonymement.', off: 'Tes visites ne sont pas comptées sur ce navigateur.', dnt: 'Ton navigateur demande à ne pas être suivi : tes visites ne sont pas comptées.',
      stop: 'Ne pas compter mes visites sur ce navigateur', again: 'Compter à nouveau mes visites' },
  },
  en: {
    path: 'legal/', home: '/', other: '/fr/mentions-legales/', otherLabel: 'Version française',
    title: 'Legal notice and privacy · Pierre Logre',
    desc: 'Legal notice for pierrelogre.com: publisher, host, cookies (none), anonymous audience measurement, mini-game leaderboard, GDPR rights, accessibility.',
    h1: 'Legal notice <em>and privacy</em>', updated: 'Last updated', back: '← Back to the game',
    sections: li => [
      ['Publisher', `<p>pierrelogre.com is the personal website of Pierre Logre, published on a non-professional basis: no advertising, no sales, no economic consideration of any kind. Publication director: Pierre Logre. Contact: by message on <a href="${li}" rel="noopener">LinkedIn</a>.</p>
<p>In accordance with article 1-1 of French law no. 2004-575 of 21 June 2004 (LCEN), the publisher has provided his identification details to the host.</p>`],
      ['Hosting', `<ul><li>Website: OVH SAS, simplified joint-stock company with a share capital of €50,000,000, RCS Lille Métropole 424 761 419, 2 rue Kellermann, 59100 Roubaix, France. Phone: +33 9 72 10 10 07.</li>
<li>Mini-game leaderboard and audience measurement: Supabase database (Supabase, Inc.), hosted in the Paris region (France).</li></ul>`],
      ['Cookies and browser storage', `<p>The site sets <strong>no cookies</strong> and uses no advertising trackers or third-party services: no Google Analytics, no social media buttons, fonts served from the site itself.</p>
<p>For the game to work, it keeps a few things in your browser's storage. They stay on your device and are never sent:</p>
<ul><li>your language, sound, music and graphics quality settings;</li>
<li>your current game, today's challenge, your achievements, golden acorns, best times and the days you played (for an achievement);</li>
<li>the last nickname you used on the leaderboard, and a copy of the scores if the online leaderboard is unreachable;</li>
<li>whether you have already seen the fox's introduction, and your choice about audience measurement (below);</li>
<li>for one page reload only, the game to restart (after "Play again" or a graphics quality change).</li></ul>
<p>This storage is needed for the service you ask for (playing, getting your game back), so it does not require consent (article 82 of the French Data Protection Act). To erase everything: clear this site's data in your browser settings.</p>`],
      ['Audience measurement', `<p>To know whether the site is used, it sends anonymous statistics: the name of the step (visit, game started, den found, click to LinkedIn…), the language, the page, the device type (phone, tablet or computer), the rounded screen width, the name of the site you came from, the loading time and how smoothly the game runs. A visit number is drawn at random on each page load and is not kept anywhere: there is no way to recognise you from one visit to the next. No cookies, no storage, no IP address recorded in these statistics.</p>
<p>They are used by the publisher only, never combined with other data or shared with anyone, and automatically deleted after 13 months. Measurement is turned off if your browser sends the "Do Not Track" or "Global Privacy Control" signal.</p>
<div class="opt"><p id="statsState" class="muted" role="status"></p><button type="button" id="statsBtn" hidden></button></div>
<p class="muted">If you run the performance test (pierrelogre.com/#bench), its results are sent the same way, plus the graphics card model, screen size and browser.</p>`],
      ['Mini-game leaderboard', `<p>If you choose to send your score, your nickname (16 characters at most) and your score are stored and published on the leaderboard, visible to everyone. Pick a nickname that doesn't identify you if you prefer to stay discreet. Offensive nicknames are refused. Scores are kept as long as the leaderboard exists; to have one removed, message me on LinkedIn.</p>`],
      ['Your data and your rights', `<p>Data controller: Pierre Logre. Legal bases: legitimate interest for the anonymous audience measurement; your consent for the leaderboard (you choose to send a score).</p>
<p>Service providers: OVH (website hosting) and Supabase (database, hosted in Paris). Like any host, they keep technical logs (including IP addresses) for security; these are not used for audience measurement. Supabase, Inc. is a US company: its staff may access the service from outside the European Union for support, under the European Commission's standard contractual clauses.</p>
<p>You can ask to access, correct or delete your data, or object to its processing, by messaging me on <a href="${li}" rel="noopener">LinkedIn</a>. Since the statistics are anonymous, they cannot be linked back to you. You can also lodge a complaint with the CNIL, the French data protection authority (<a href="https://www.cnil.fr" rel="noopener">cnil.fr</a>).</p>`],
      ['Accessibility', `<p>The site aims for WCAG 2.1 level AA, checked automatically with every release: everything works with a keyboard, windows are announced to screen readers, contrast is checked. The 3D world itself cannot be described to a screen reader: the "Who's the fox?" profile gives all the content as text. Found a problem? Message me on LinkedIn.</p>`],
      ['Intellectual property and credits', `<p>The game, its texts and its graphics are Pierre Logre's creation; reproduction requires his permission. The game uses Three.js (MIT licence) and the Baloo 2 and Patrick Hand fonts (SIL Open Font License 1.1, included with the fonts). LinkedIn and GitHub are trademarks of their owners; their sites have their own privacy rules.</p>`],
    ],
    js: { on: 'Your visits are counted, anonymously.', off: 'Your visits are not counted in this browser.', dnt: 'Your browser asks not to be tracked: your visits are not counted.',
      stop: "Don't count my visits in this browser", again: 'Count my visits again' },
  },
};
