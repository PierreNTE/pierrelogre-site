/* Le laboratoire (bac à sable d'architecture) : on pose des blocs sur des socles, dans la cour de l'académie. */
import { L } from './l.js';

export default {
  title: L("Le bac à sable d'architecture", "The architecture sandbox"),
  brief: L("Une entreprise de taille moyenne héberge des VM, des bases SQL et des partages de fichiers. Monte sa chaîne de protection de bout en bout : porte le bon bloc sur chaque socle (E pour prendre, E pour poser). Tu peux te tromper : le labo t'explique pourquoi.",
    "A mid-sized company runs VMs, SQL databases and file shares. Build its end-to-end protection chain: carry the right block onto each plinth (E to pick up, E to drop). You may get it wrong: the lab explains why."),
  slots: [
    { id: 'prod', want: 'ps', label: L("1 · Stockage de production", "1 · Production storage") },
    { id: 'orch', want: 'ppdm', label: L("2 · Orchestration des sauvegardes", "2 · Backup orchestration") },
    { id: 'copy', want: 'dd', label: L("3 · Copies dédupliquées", "3 · Deduplicated copies") },
    { id: 'vault', want: 'vault', label: L("4 · Copie isolée", "4 · Isolated copy") },
  ],
  blocks: [
    { id: 'ps', color: '#2563c9', name: L("PowerStore", "PowerStore"), role: L("stockage primaire unifié (bloc + fichier)", "unified primary storage (block + file)") },
    { id: 'pv', color: '#2f8f9d', name: L("PowerVault ME5", "PowerVault ME5"), role: L("stockage primaire bloc uniquement", "block-only primary storage") },
    { id: 'ppdm', color: '#e08a2a', name: L("PowerProtect Data Manager", "PowerProtect Data Manager"), role: L("logiciel qui orchestre les sauvegardes", "software that orchestrates backups") },
    { id: 'dd', color: '#3d9a5b', name: L("PowerProtect Data Domain", "PowerProtect Data Domain"), role: L("appliance qui stocke des copies dédupliquées", "appliance that stores deduplicated copies") },
    { id: 'vault', color: '#c9a33d', name: L("Coffre Cyber Recovery", "Cyber Recovery vault"), role: L("copie isolée, immuable et analysée", "isolated, immutable, analysed copy") },
    { id: 'apex', color: '#6b5bd2', name: L("APEX Subscriptions", "APEX Subscriptions"), role: L("un modèle de consommation, pas un composant", "a consumption model, not a component") },
  ],
  /** Erreurs expliquées (bloc → socle) ; sinon un message construit à partir des rôles. */
  wrong: {
    'pv>prod': L("PowerVault est bien du stockage de production, mais bloc uniquement : ici il y a aussi des partages de fichiers. Une baie unifiée convient mieux.", "PowerVault is production storage, but block only: here there are file shares too. A unified array fits better."),
    'apex>*': L("APEX n'est pas un composant d'architecture : c'est une façon d'acquérir et de payer. Il pourrait financer n'importe quel bloc de ce schéma, mais n'en remplace aucun.", "APEX is not an architecture component: it is a way to acquire and pay. It could fund any block in this diagram, but replaces none."),
    'dd>orch': L("Data Domain stocke les copies ; il ne décide pas quoi sauvegarder ni quand. C'est le rôle du logiciel.", "Data Domain stores the copies; it does not decide what to back up or when. That's the software's job."),
    'ppdm>copy': L("Le logiciel orchestre, mais les copies doivent être rangées sur un stockage de protection dédié.", "The software orchestrates, but copies must live on dedicated protection storage."),
    'dd>vault': L("Presque ! Le coffre utilise bien des appliances Data Domain, mais ce socle attend la solution d'isolement complète (réseau, identifiants et administration séparés, analyse).", "Almost! The vault does use Data Domain appliances, but this plinth wants the full isolation solution (separate network, credentials and management, analysis)."),
    'vault>copy': L("Le coffre garde une copie isolée des données critiques ; les sauvegardes courantes vont d'abord sur un Data Domain de production.", "The vault keeps an isolated copy of critical data; everyday backups first go to a production Data Domain."),
    'ps>copy': L("Garder les sauvegardes sur une baie de production, c'est partager son sort : panne, sinistre ou attaque emportent tout.", "Keeping backups on a production array means sharing its fate: a failure, disaster or attack takes everything."),
  },
  generic: L("Ce socle attend : {slot}. Or {block} est {role}.", "This plinth wants: {slot}. But {block} is {role}."),
  done: L("Chaîne complète : PowerStore fait tourner les applications, PowerProtect Data Manager décide quoi sauvegarder et quand, Data Domain range des copies dédupliquées (et peut les répliquer), et le coffre Cyber Recovery garde une copie isolée, immuable et analysée. APEX, lui, pourrait financer l'ensemble.",
    "Complete chain: PowerStore runs the applications, PowerProtect Data Manager decides what to back up and when, Data Domain stores deduplicated copies (and can replicate them), and the Cyber Recovery vault keeps an isolated, immutable, analysed copy. APEX could fund the whole thing."),
};
