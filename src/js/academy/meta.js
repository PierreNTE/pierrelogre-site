/* =====================================================================
   Académie Dell Storage : ce qui est petit et toujours chargé (noms des salles, couleurs, catégories,
   niveaux, barème des points, textes de l'interface). Le contenu pédagogique est dans academy/content/.
   ===================================================================== */
import { L } from './content/l.js';

/** Les sept salles, dans l'ordre du parcours (chacune s'ouvre quand on a tenté le quiz de la précédente). */
export const ROOMS = [
  { id: 'powervault', n: 1, color: '#2f8f9d', name: L("PowerVault", "PowerVault"), tag: L("Stockage d'entrée de gamme", "Entry-level storage"),
    trainer: L("Margaux, formatrice stockage", "Margaux, storage trainer"), hello: L("Bienvenue en salle PowerVault ! Le bloc, simplement.", "Welcome to the PowerVault room! Block, made simple.") },
  { id: 'powerstore', n: 2, color: '#2563c9', name: L("PowerStore", "PowerStore"), tag: L("Stockage d'entreprise unifié", "Unified enterprise storage"),
    trainer: L("Karim, architecte solutions", "Karim, solutions architect"), hello: L("Bloc, fichier, vVols : tout sous un même toit.", "Block, file, vVols: all under one roof.") },
  { id: 'apex', n: 3, color: '#6b5bd2', name: L("APEX", "APEX"), tag: L("Consommation flexible", "Flexible consumption"),
    trainer: L("Sofia, experte des modèles de consommation", "Sofia, consumption models expert"), hello: L("Ici, on ne vend pas une baie : on vend une façon de la payer.", "Here we don't sell an array: we sell a way to pay for it.") },
  { id: 'datadomain', n: 4, color: '#3d9a5b', name: L("PowerProtect Data Domain", "PowerProtect Data Domain"), tag: L("Protection des données", "Data protection"),
    trainer: L("Paul, spécialiste de la sauvegarde", "Paul, backup specialist"), hello: L("Regarde la machine : les blocs en double disparaissent !", "Watch the machine: duplicate blocks vanish!") },
  { id: 'software', n: 5, color: '#e08a2a', name: L("Logiciels de sauvegarde", "Backup software"), tag: L("Politiques, rétention, restauration", "Policies, retention, restore"),
    trainer: L("Léa, consultante logiciels de protection", "Léa, protection software consultant"), hello: L("Le logiciel décide, l'appliance range.", "Software decides, the appliance stores.") },
  { id: 'dr', n: 6, color: '#d6563a', name: L("Reprise après sinistre", "Disaster recovery"), tag: L("RPO, RTO, continuité", "RPO, RTO, continuity"),
    trainer: L("Thomas, architecte continuité d'activité", "Thomas, business continuity architect"), hello: L("Deux sites, deux chiffres : RPO et RTO.", "Two sites, two numbers: RPO and RTO.") },
  { id: 'cyber', n: 7, color: '#3b4a5e', accent: '#c9a33d', name: L("Cyber-résilience", "Cyber resilience"), tag: L("Immuable, isolé, intelligent", "Immutable, isolated, intelligent"),
    trainer: L("Inès, experte cyber-résilience", "Inès, cyber resilience expert"), hello: L("Le coffre ne s'ouvre qu'aux bons identifiants.", "The vault only opens for the right credentials.") },
];
export const ROOM = Object.fromEntries(ROOMS.map(r => [r.id, r]));

/** Natures distinguées partout dans l'académie (un produit n'est pas un logiciel, ni un service, ni un modèle de paiement). */
export const KINDS = {
  produit: { icon: '📦', name: L("Produit (matériel)", "Product (hardware)") },
  logiciel: { icon: '💿', name: L("Logiciel ou fonction", "Software or feature") },
  service: { icon: '🤝', name: L("Service", "Service") },
  conso: { icon: '💳', name: L("Modèle de consommation", "Consumption model") },
  concept: { icon: '💡', name: L("Concept", "Concept") },
};
export const KIND_IDS = Object.keys(KINDS);

/** Niveaux (points d'expérience cumulés). */
export const LEVELS = [[0, L("Stagiaire", "Intern")], [300, L("Junior", "Junior")], [900, L("Confirmé", "Proficient")], [1700, L("Expert", "Expert")], [2500, L("Ambassadeur", "Ambassador")]];
/** Barème : points gagnés une fois (un quiz rejoué ne rapporte que les points au-dessus du meilleur score). */
export const XP = { fact: 10, quizPt: 10, mission: 40, missionLate: 15, sim: 60, badge: 100, lab: 150, final: 300, flashPt: 5 };
/** Seuils : badge de la salle, réussite de la simulation, ouverture du labo (après la salle n°…). */
export const RULES = { badgeQuiz: .7, badgeSim: .6, labAfter: 'software', finalPass: .75 };

const UI_FR = {
  title: "Académie Dell Storage", close: "Fermer", back: "Retour", next: "Suivant", again: "Recommencer", start: "Commencer", validate: "Valider", retry: "Réessayer",
  loading: "Chargement des cours…", loadFail: "Le contenu de l'académie n'a pas pu être chargé. Vérifie ta connexion, puis réessaie.",
  unofficial: "Projet personnel non officiel, construit à partir de sources publiques Dell Technologies. Dell, PowerVault, PowerStore, APEX, PowerProtect et les autres noms cités sont des marques de Dell Inc. ou de ses filiales. Vérifie toujours les informations à jour avant un engagement client.",
  room: n => `Salle ${n}`, xp: "XP", level: "Niveau", mastery: "Maîtrise", badge: "Badge", badgeGot: "Badge obtenu", badgeHow: "Badge : tous les faits vus, quiz ≥ 70 %, missions résolues, simulation ≥ 60 %.",
  discover: "Découverte", facts: "Les points clés", quiz: "Quiz", missions: "Missions client", sim: "Simulation commerciale", flash: "Défi chronométré : Classe-le !", board: "Tableau de progression", lab: "Laboratoire", final: "Évaluation finale",
  seen: "vu", toSee: "à découvrir", simple: "Simplification pédagogique", limit: "À vérifier / limite", sources: "Sources", checked: d => `Sources vérifiées le ${d}.`,
  kind: "Nature", qOf: (i, n) => `Question ${i} / ${n}`, right: "Bonne réponse !", wrong: "Pas tout à fait.", partial: "Défendable, mais pas le meilleur choix.", half: "En partie juste.",
  matchHint: "Choisis, pour chaque élément, la proposition qui lui correspond.", choose: "Choisir…", archiHint: "Quel schéma est le bon ?",
  quizEnd: (s, n) => `Score : ${s} / ${n}`, best: b => `Meilleur score : ${b}`, gained: x => `+${x} XP`, missed: "À revoir",
  misPick: "Que proposes-tu ?", misSolved: "Mission réussie", misLate: "Réussie après correction", misTodo: "À faire",
  simQ: n => `Qualifie le besoin : choisis ${n} questions à poser.`, simAsk: "Poser ces questions", simSol: "Quelle solution proposes-tu ?", simArg: "Comment la justifies-tu ?",
  simScore: (q, s, a) => `Qualification ${q} % · Solution ${s} % · Argument ${a} %`, simGood: "Bonne question", simBad: "Question peu utile", simTotal: p => `Score de la simulation : ${p} %`,
  flashRules: "60 secondes. Un nom apparaît : est-ce un produit, un logiciel, un service, un modèle de consommation ou un concept ? Touches 1 à 5 au clavier.",
  flashNeed: "Ouvre d'abord au moins une salle (le défi tire ses mots dans les salles ouvertes).", flashEnd: n => `${n} bonne${n > 1 ? 's' : ''} réponse${n > 1 ? 's' : ''}`, flashBest: b => `Record : ${b}`,
  locked: "Salle fermée", lockedWhy: prev => `Elle s'ouvre quand tu as tenté le quiz de la salle précédente (${prev}).`,
  labLocked: "Le laboratoire s'ouvre quand tu as tenté le quiz « Logiciels de sauvegarde » (salle 5).", labReset: "Remettre les blocs sur l'étagère", labDone: "Laboratoire réussi",
  labSlots: "Les socles", labEmpty: "vide",
  finalLocked: "L'évaluation finale s'ouvre quand tu as tenté les sept quiz.", finalIntro: "Une mission client complète : qualifie, puis prends six décisions. Réussite à partir de 75 %.",
  finalQ: n => `Choisis ${n} questions pour qualifier le besoin.`, finalScore: p => `Score final : ${p} %`, finalPass: "Diplôme obtenu : Ambassadeur·rice Dell Storage de l'académie !", finalFail: "Pas encore : revois les salles signalées, puis retente ta chance.",
  weak: "À retravailler", weakNone: "Rien à signaler pour l'instant : continue l'exploration !", nextStep: "Prochaine étape", notStarted: "pas commencée",
  reset: "Remettre l'académie à zéro", resetSure: "Confirmer : tout effacer ?", resetDone: "Académie remise à zéro.",
  nbHint: "Approche-toi d'un formateur, d'un équipement ou d'une borne, puis appuie sur E.", nbMode: (lv, xp) => `📍 Académie · ${lv} · ${xp} XP`,
  levelUp: lv => `Nouveau niveau : ${lv} !`, toastXp: (x, why) => `+${x} XP · ${why}`, toastBadge: r => `🏅 Badge ${r} obtenu !`, unlockRoom: r => `🔓 Nouvelle salle ouverte : ${r}`,
  shuttle: "Navette de l'académie", shuttleTo: "Prendre la navette vers l'académie", shuttleBack: "Retour au village",
};
const UI_EN = {
  title: "Dell Storage Academy", close: "Close", back: "Back", next: "Next", again: "Try again", start: "Start", validate: "Check", retry: "Retry",
  loading: "Loading the lessons…", loadFail: "The academy content couldn't be loaded. Check your connection, then try again.",
  unofficial: "Unofficial personal project, built from public Dell Technologies sources. Dell, PowerVault, PowerStore, APEX, PowerProtect and the other names mentioned are trademarks of Dell Inc. or its subsidiaries. Always check up-to-date information before committing to a customer.",
  room: n => `Room ${n}`, xp: "XP", level: "Level", mastery: "Mastery", badge: "Badge", badgeGot: "Badge earned", badgeHow: "Badge: all key points seen, quiz ≥ 70%, missions solved, simulation ≥ 60%.",
  discover: "Discovery", facts: "Key points", quiz: "Quiz", missions: "Customer missions", sim: "Sales simulation", flash: "Timed challenge: Sort it!", board: "Progress board", lab: "Lab", final: "Final assessment",
  seen: "seen", toSee: "to discover", simple: "Teaching simplification", limit: "To check / limit", sources: "Sources", checked: d => `Sources checked on ${d}.`,
  kind: "Type", qOf: (i, n) => `Question ${i} / ${n}`, right: "Correct!", wrong: "Not quite.", partial: "Defensible, but not the best choice.", half: "Partly right.",
  matchHint: "For each item, choose the matching statement.", choose: "Choose…", archiHint: "Which diagram is right?",
  quizEnd: (s, n) => `Score: ${s} / ${n}`, best: b => `Best score: ${b}`, gained: x => `+${x} XP`, missed: "To review",
  misPick: "What do you propose?", misSolved: "Mission solved", misLate: "Solved after correction", misTodo: "To do",
  simQ: n => `Qualify the need: pick ${n} questions to ask.`, simAsk: "Ask these questions", simSol: "Which solution do you propose?", simArg: "How do you justify it?",
  simScore: (q, s, a) => `Qualification ${q}% · Solution ${s}% · Argument ${a}%`, simGood: "Good question", simBad: "Not a useful question", simTotal: p => `Simulation score: ${p}%`,
  flashRules: "60 seconds. A name appears: is it a product, software, a service, a consumption model or a concept? Keys 1 to 5 on a keyboard.",
  flashNeed: "Open at least one room first (the challenge draws its words from open rooms).", flashEnd: n => `${n} correct answer${n > 1 ? 's' : ''}`, flashBest: b => `Record: ${b}`,
  locked: "Room locked", lockedWhy: prev => `It opens once you have tried the previous room's quiz (${prev}).`,
  labLocked: "The lab opens once you have tried the “Backup software” quiz (room 5).", labReset: "Put the blocks back on the shelf", labDone: "Lab completed",
  labSlots: "The plinths", labEmpty: "empty",
  finalLocked: "The final assessment opens once you have tried all seven quizzes.", finalIntro: "A complete customer mission: qualify, then make six decisions. Pass mark 75%.",
  finalQ: n => `Pick ${n} questions to qualify the need.`, finalScore: p => `Final score: ${p}%`, finalPass: "Diploma earned: academy Dell Storage Ambassador!", finalFail: "Not yet: review the flagged rooms, then try again.",
  weak: "To work on", weakNone: "Nothing to flag yet: keep exploring!", nextStep: "Next step", notStarted: "not started",
  reset: "Reset the academy", resetSure: "Confirm: erase everything?", resetDone: "Academy reset.",
  nbHint: "Walk up to a trainer, a piece of equipment or a kiosk, then press E.", nbMode: (lv, xp) => `📍 Academy · ${lv} · ${xp} XP`,
  levelUp: lv => `New level: ${lv}!`, toastXp: (x, why) => `+${x} XP · ${why}`, toastBadge: r => `🏅 ${r} badge earned!`, unlockRoom: r => `🔓 New room open: ${r}`,
  shuttle: "Academy shuttle", shuttleTo: "Take the shuttle to the academy", shuttleBack: "Back to the village",
};
export const UI = { fr: UI_FR, en: UI_EN };
