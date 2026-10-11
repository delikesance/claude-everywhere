# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- Réglage « Répondre via » : Claude Code (local, utilise votre compte Claude, Firefox de bureau, via `npm run install:native-host`) ou clé API. Test de connexion de l'hôte natif.

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
