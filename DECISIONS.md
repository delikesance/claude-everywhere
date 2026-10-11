# Journal des décisions

| Réf. | Sujet |
|---|---|
| [D-001](#d-001-direction-artistique) | Direction artistique |
| [D-002](#d-002-pile-technique) | Pile technique |
| [D-003](#d-003-client-api) | Client API |
| [D-004](#d-004-modèles) | Modèles |
| [D-005](#d-005-page-dévénements-en-arrière-plan) | Arrière-plan |
| [D-006](#d-006-permissions) | Permissions |
| [D-007](#d-007-politique-de-sécurité-du-contenu) | CSP |
| [D-008](#d-008-stockage) | Stockage |
| [D-009](#d-009-limite-de-claudeai) | Limite claude.ai |
| [D-010](#d-010-extraction) | Extraction |
| [D-011](#d-011-budget-de-contexte) | Budget de contexte |
| [D-012](#d-012-confidentialité) | Confidentialité |
| [D-013](#d-013-rendu-markdown) | Rendu Markdown |
| [D-014](#d-014-internationalisation) | i18n |
| [D-015](#d-015-commandes) | Commandes |
| [D-016](#d-016-tests) | Tests |

## D-001 Direction artistique

**Choix**

Marginalia, avec deux greffes : l'infrastructure de « Banc de mesure » (jetons, états, mesures) et la voix et la pédagogie de « Vareuse » (textes de l'interface, accueil). Les paires de couleurs sous le seuil AA ont été corrigées.

**Alternatives écartées**

- Banc de mesure : aspect d'instrument de développeur, trop dense (base 13 px, mono 11 px) ; trois teintes chaudes qui affaiblissent la loi « une seule orange = envoi » ; colore le contrôle d'envoi au lieu du contenu envoyé.
- Vareuse : squelette de conversation générique, signal de confidentialité faible, accessibilité fragile, surcouche qui suit le thème de la page hôte et charge des polices dans les pages, dérive vers le bleu-violet « IA ».

**Raison**

- Règle de départage : retenir la direction dont les avantages ne se greffent pas, puis y greffer ceux de l'autre.
- Exigence de distinction : une page de lettré ne ressemble pas à un chat générique.
- Produit centré sur la lecture : prose en empattement, réponse en marge.
- Signal de confidentialité littéral : le surligneur jaune désigne exactement le texte qui quitte la machine.
- Défauts corrigeables sans refonte : contrastes ajustés, aucune réécriture de la direction.

## D-002 Pile technique

**Choix**

TypeScript strict, esbuild (script `scripts/build.mjs`), Preact et `@preact/signals` pour les pages d'extension (panneau, fenêtre, bibliothèque, réglages, accueil). La surcouche de sélection est en TypeScript sans framework, dans un shadow DOM fermé.

**Alternatives écartées**

- Vite : plus lourd, plugins nécessaires pour les entrées HTML d'extension.
- React : taille.
- Vanilla partout : l'état du panneau (flux, pastilles, bordereau) devient difficile à tenir.

**Raison**

- Build rapide et déterministe, une seule configuration pour les entrées ESM, IIFE et worker.
- Preact couvre le besoin réactif pour une fraction du poids de React ; la surcouche, injectée dans des pages tierces, reste minimale et sans dépendance.

## D-003 Client API

**Choix**

SDK officiel `@anthropic-ai/sdk` avec `dangerouslyAllowBrowser: true`, appelé uniquement depuis la page d'événements en arrière-plan : la clé n'atteint jamais un script de contenu. `baseURL` vient de la constante de build `__API_BASE_URL__` (production `https://api.anthropic.com`, build de test `http://127.0.0.1:<port>`). Flux via `client.messages.stream`, annulation par abandon, erreurs typées du SDK (401, 429 avec retry-after, 529, réseau) converties en union `ApiError`. `stop_reason` vérifié (`refusal`, `max_tokens`). Ni `temperature`, ni `top_p`, ni `budget_tokens` ; réflexion omise.

**Alternatives écartées**

- `fetch` brut avec analyse SSE maison : réimplémente analyse, nouvelles tentatives et erreurs déjà fournies et testées par le SDK.

**Raison**

- Moins de code à maintenir et à auditer ; comportement d'erreur aligné sur l'API.
- Isoler les appels dans le seul contexte de confiance garde la clé hors des pages hôtes.

## D-004 Modèles

**Choix**

`claude-haiku-5-5` (« Rapide »), `claude-sonnet-5-5` (« Équilibré », par défaut), `claude-opus-5-5` (« Le plus capable »). Identifiants exacts, sans suffixe de date. `max_tokens` par défaut : 4096.

**Alternatives écartées**

- Identifiants datés : ils figent une version et obligent à des mises à jour sans gain pour l'utilisateur.
- Liste de modèles récupérée dynamiquement : appel réseau non demandé (voir D-012).

**Raison**

- Trois niveaux lisibles par un non-spécialiste, un défaut raisonnable en coût et en qualité, une constante unique à maintenir.

## D-005 Page d'événements en arrière-plan

**Choix**

`background.scripts` (page d'événements), `"type": "module"`, non persistante. Le flux passe par un `runtime.Port` à longue durée de vie par tour de conversation (`port.name = "chat"`). L'état utile après déchargement est dans `storage.session` ou IndexedDB ; rien n'est gardé uniquement dans des variables globales.

**Alternatives écartées**

- Page persistante : consomme de la mémoire en continu, déconseillée en MV3.
- Messages ponctuels répétés pour le flux : pas de canal d'annulation ni de détection de fermeture.

**Raison**

- Le Port garde la page vivante pendant le flux et signale la fermeture du client, ce qui permet d'abandonner l'appel.
- Une page qui peut être déchargée à tout moment impose un état externalisé.

## D-006 Permissions

**Choix**

Permissions : `storage`, `activeTab`, `scripting`, `contextMenus` (alias `menus` si le linter le préfère). `host_permissions` : `https://api.anthropic.com/*`. Firefox rend les permissions d'hôte MV3 révocables par l'utilisateur : l'accueil et les réglages vérifient `permissions.contains` et appellent `permissions.request` depuis un clic quand elle manque. `optional_host_permissions: ["<all_urls>"]`, demandée seulement si l'utilisateur active « surcouche sur tous les sites » ou « le panneau lit directement l'onglet actif » (un clic dans le panneau n'accorde pas `activeTab`). Sans elle, la capture passe par un clic dans la fenêtre rapide, un raccourci ou le menu contextuel (qui accordent `activeTab`) et est transmise au panneau. Aucun `content_scripts` statique : tout est injecté par `scripting.executeScript` (la surcouche « tous les sites » utilise `scripting.registerContentScripts` après autorisation). Ni `tabs`, ni `unlimitedStorage`, ni `webRequest`. `browser_specific_settings.gecko` : id `claude-everywhere@angelo.clauin`, `strict_min_version` « 140.0 », `data_collection_permissions: { required: ["websiteContent"] }`.

**Alternatives écartées**

- `<all_urls>` obligatoire à l'installation : avertissement d'installation disproportionné pour un usage à la demande.
- Scripts de contenu statiques : s'exécuteraient sur chaque page sans action de l'utilisateur.
- `tabs` : donnerait accès aux URL de tous les onglets sans nécessité.
- `data_collection_permissions: none` : inexact, le contenu de page est transmis à l'API d'Anthropic sur action explicite ; déclarer `websiteContent` est le choix honnête.

**Raison**

- Moindre privilège, chaque permission justifiée par une fonction visible ; l'élargissement est volontaire, réversible et demandé au moment du besoin.
- La déclaration de collecte reflète le comportement réel, cohérent avec D-012.
- Précision issue de `web-ext lint` : `data_collection_permissions` exige Firefox Android 142 ; `browser_specific_settings.gecko_android.strict_min_version` vaut donc « 142.0 » (bureau inchangé à 140). `contextMenus` est accepté tel quel par le linter.

## D-007 Politique de sécurité du contenu

**Choix**

`extension_pages` : `script-src 'self'; object-src 'none'; style-src 'self'; img-src 'self' data:; connect-src https://api.anthropic.com; base-uri 'none'; form-action 'none'`. Le build de test ajoute l'origine locale. `'wasm-unsafe-eval'` n'est ajouté que si `pdfjs-dist` l'exige ; vérification : test E2E sur un PDF de test contre cette CSP, ajout seulement sur violation constatée en console, puis consigné ici. Aucun code distant, aucun script en ligne, polices embarquées.

**Alternatives écartées**

- `wasm-unsafe-eval` par précaution : élargit la surface sans preuve de besoin.
- Polices servies par un CDN : requête tierce et fuite d'adresse IP.

**Raison**

- Surface d'exécution minimale ; tout ce qui s'exécute est dans le paquet audité.

## D-008 Stockage

**Choix**

Clé API et réglages dans `storage.local` (jamais `sync`, jamais journalisés, masqués dans tout objet d'erreur). Bibliothèque dans IndexedDB via `idb` : magasins `artifacts` (id, title, url, sourceType page|selection|pdf|note, tags[], createdAt, updatedAt, currentVersionId, excerpt, charCount), `versions` (id, artifactId, createdAt, markdown, contentHash), `conversations` (avec messages). Recherche par index de jetons en mémoire sur titre, étiquettes et Markdown, insensible aux accents (français). Export Markdown (en-tête YAML) et JSON (champ de version de schéma) ; import JSON.

**Alternatives écartées**

- `storage.sync` pour la clé : copie la clé vers un service tiers.
- `storage.local` pour la bibliothèque : quotas et sérialisation inadaptés à des documents volumineux et à l'historique de versions.
- Moteur de recherche embarqué (lunr, flexsearch) : dépendance de plus pour un volume personnel.

**Raison**

- Tout reste sur la machine ; IndexedDB gère volume et transactions ; l'index maison est simple et suffit.
- Le champ de version de schéma permet des migrations d'export et d'import.

## D-009 Limite de claude.ai

**Choix**

Il n'existe pas d'API publique pour écrire des artefacts ou des Projets claude.ai. Le passage se fait par export `.md`, copie dans le presse-papiers, ou lot de plusieurs artefacts en un seul fichier Markdown à déposer dans un Projet claude.ai ou un dépôt Claude Code (`@fichier`). Piste future : serveur MCP exposant la bibliothèque.

**Alternatives écartées**

- Automatiser l'interface web de claude.ai : fragile, contraire aux conditions d'usage probables, demande des permissions larges.

**Raison**

- Une solution robuste avec les moyens publics ; la limite est dite à l'utilisateur plutôt que contournée.

## D-010 Extraction

**Choix**

`@mozilla/readability` sur un document cloné, dans le script injecté, puis `turndown` vers Markdown ; repli sur `document.body.innerText` ; capture de sélection. Applications monopages : l'extraction a toujours lieu à la demande, au moment du clic, jamais en cache au chargement, avec URL et titre relus à chaque fois. Pages privilégiées ou restreintes (about:, AMO, view-source, mode lecture, visionneuse PDF intégrée) : le rejet d'`executeScript` devient une `ExtractionError{kind:"restricted"}` typée, avec un état d'interface propre et la voie « coller le texte ». PDF : l'arrière-plan télécharge l'URL de l'onglet quand elle finit par .pdf ou que le type de contenu est PDF (permission d'hôte pour cette origine, demandée par `permissions.request` depuis un clic) et l'analyse avec `pdfjs-dist` embarqué dans une page ou un worker d'extension ; sinon état « illisible ».

**Alternatives écartées**

- Extraction au chargement de chaque page : lecture sans action de l'utilisateur, données périmées sur les applications monopages.
- Envoi du HTML brut à l'API : volume, bruit et fuite de données non pertinentes.
- Service d'extraction distant : contraire à D-012.

**Raison**

- Contenu propre et compact, toujours frais, et échec explicite plutôt que silencieux.

## D-011 Budget de contexte

**Choix**

Budget en caractères par modèle (constante documentée, estimation d'environ 4 caractères par jeton). En cas de dépassement : conserver début, fin et sections correspondant aux termes de la question. Toujours afficher « N car. envoyés / M total » (le bordereau de la maquette) ; jamais de troncature silencieuse. Le même calcul alimente l'aperçu et l'envoi.

**Alternatives écartées**

- Comptage exact de jetons par appel API : requête supplémentaire avant chaque envoi.
- Troncature en queue seule : perd souvent la partie utile.

**Raison**

- Prévisible, sans réseau, et fidèle à la loi de transparence du design : l'utilisateur voit exactement ce qui part.

## D-012 Confidentialité

**Choix**

Rien ne quitte la machine sans action explicite de l'utilisateur ; chaque envoi affiche le bordereau (éléments et nombres de caractères) ; aucune télémétrie ; ni clé ni contenu dans les journaux.

**Alternatives écartées**

- Statistiques d'usage anonymes : incompatibles avec le signal de confidentialité central du produit (D-001).
- Journal de débogage détaillé : risque de contenu sensible en clair.

**Raison**

- La promesse du produit est la confiance ; elle doit être vérifiable par la liste de contrôle de sécurité de `ARCHITECTURE.md`.

## D-013 Rendu Markdown

**Choix**

`marked` puis `DOMPurify` (liste blanche stricte, sans style, iframe ni formulaire ; liens forcés en `rel="noopener noreferrer" target="_blank"` ; seuls href http, https et mailto ; images bloquées ou remplacées par un lien), inséré par l'unique fonction `renderSafeMarkdown()`. Rendus de flux regroupés par `requestAnimationFrame`.

**Alternatives écartées**

- `innerHTML` direct sur la sortie du modèle : XSS via contenu de page injecté dans la réponse.
- Rendu Markdown maison : sécurité et couverture de syntaxe plus faibles.
- Images distantes : requêtes automatiques vers des tiers, fuite de données.

**Raison**

- Le texte du modèle est non fiable ; un seul point d'entrée vers le DOM est auditable.

## D-014 Internationalisation

**Choix**

`default_locale: "fr"`, `_locales/{fr,en}/messages.json` générés par le build à partir de `src/<module>/locales/{fr,en}.json` (préfixe de clé = nom du module ; le build échoue sur clé dupliquée ou absente d'une langue). Choix de langue de l'interface dans les réglages, avec chargeur maison et pas seulement `browser.i18n`.

**Alternatives écartées**

- Un fichier de messages unique édité à la main : conflits entre implémenteurs.
- `browser.i18n` seul : suit la langue du navigateur, sans réglage propre.

**Raison**

- Chaque module possède ses chaînes sans conflit ; les deux langues restent synchronisées par construction.
- Précision d'implémentation : le préfixe est le nom du dossier avec `-` remplacé par `_`, suivi de `_` (`shared_`, `library_ui_`), car les noms de messages.json n'admettent pas le point.

## D-015 Commandes

**Choix**

`_execute_sidebar_action` (Ctrl+Shift+Y, comme dans les maquettes), `_execute_action` (fenêtre rapide), `explain-selection`, `save-page`. `sidebarAction.open()` n'est appelé que de façon synchrone dans les gestionnaires d'action utilisateur.

**Alternatives écartées**

- Ouverture du panneau depuis un message de la surcouche : refusée par Firefox hors geste utilisateur.

**Raison**

- Précision : les raccourcis suggérés sont Alt+Shift+C (fenêtre rapide), Alt+Shift+E (expliquer la sélection) et Alt+Shift+S (enregistrer la page).
- Respecte la contrainte de Firefox ; la surcouche affiche le raccourci à la place.

## D-016 Tests

**Choix**

vitest avec jsdom (happy-dom écarté : DOMPurify n'y assainit pas correctement) pour l'unitaire et l'intégration (fake-indexeddb, simulacre `webextension`) ; E2E avec `selenium-webdriver` et `geckodriver` sur Firefox sans interface, `driver.installAddon(xpi, true)`, pages d'extension ouvertes en onglet via `moz-extension://<uuid>/` (uuid lu dans la préférence `extensions.webextensions.uuids`) ; serveur local simulant l'API Messages (SSE) utilisé par un build TEST (`dist-test/`, permission d'hôte et CSP locales en plus). `web-ext lint` et le script d'audit des permissions ne s'exécutent que sur le build de PRODUCTION (`dist/`).

**Alternatives écartées**

- Appels réels à l'API en test : coût, instabilité, clé à manipuler.
- Playwright : support des extensions Firefox limité.
- Linter le build de test : il contient volontairement des permissions locales.

**Raison**

- Tests déterministes, sans réseau ni secret ; le paquet publié est celui qui est audité.
