# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage [SemVer](https://semver.org/lang/fr/).

## [Non publié]

## [0.1.4] - 2026-10-11

### Modifié

- Panneau latéral aligné sur la maquette : en-tête unique (titre de la conversation, nouvelle conversation, bibliothèque), pied de page réduit à une pastille « Part : … » et un champ à envoi en une flèche, modèle et ajouts de contexte dans le menu « + ».
- Avis de changement d'onglet en haut du panneau, sans décaler la conversation ; avis « Document long » ; page protégée.
- Le panneau occupe toute la hauteur de la barre latérale.
- Bibliothèque simplifiée (« Gardé », clic pour ouvrir dans la conversation) et réglages avancés repliés.

### Corrigé

- Tests de bout en bout adaptés au nouveau flux et exécutés dans Firefox.

## [0.1.3] - 2026-10-11

### Ajouté

- Réglage « Répondre via » : Claude Code (local, utilise votre compte Claude, Firefox de bureau, via `npm run install:native-host`) ou clé API. Test de connexion de l'hôte natif.
- Clé d'API saisie directement dans le panneau latéral, sans page d'accueil à l'installation.
- Surcouche unique « Demander » pour interroger une sélection sur la page.
- Animations sobres (glissement, balayage, apparition échelonnée, points de saisie), désactivées avec `prefers-reduced-motion`.

### Modifié

- Conversation d'abord : le clic sur l'icône de la barre d'outils ouvre ou ferme le panneau et transmet la page active au panneau.

### Supprimé

- Fenêtre rapide (popup) : la barre d'outils et le panneau la remplacent.
- Page d'accueil à l'installation (`onboarding.html`) et réglage interne `onboardingDone`, retiré sans migration (les valeurs stockées sont ignorées).

## [0.1.0] - 2026-10-11

### Ajouté

- Panneau latéral de conversation avec Claude sur la page active, réponses en flux rendues en Markdown.
- Fenêtre rapide, surcouche de sélection, menu contextuel et raccourcis clavier.
- Lecture des pages, des sélections et des PDF en `https`.
- Bordereau d'envoi : éléments transmis et nombre de caractères avant chaque requête.
- Bibliothèque locale : étiquettes, recherche, versions, export Markdown et JSON, artefacts joints comme contexte.
- Réglages : clé d'API Anthropic stockée dans `storage.local`, permissions d'hôte demandées à la demande.
- Interface en français, thèmes clair et sombre.
- Empaquetage reproductible (`npm run package`) : archive `.zip` et copie `.xpi`.
- Suite de tests unitaires et de bout en bout sous Firefox, avec une API factice.
