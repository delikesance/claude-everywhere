# Marginalia v1.0 — système de design de Claude Everywhere

Source de vérité visuelle. Fichiers : `tokens.css` (valeurs), `components.css` (styles), `index.html` et `screens/*.html` (maquettes en français, à ouvrir en `file://`, sans réseau).

## 1. Direction artistique

Une page de lettré : prose en empattement, trois encres seulement.

| Encre | Jeton | Sens |
|---|---|---|
| Noir chaud | `--text`, `--primary` | contenu, bouton principal |
| Rubrique vermillon | `--accent` | numéros de réponse, soulignement des liens, curseur de rédaction ; jamais un fond de bouton |
| Surligneur jaune | `--sent-bg`, `--sent-edge` | uniquement `.sent` : ce texte quitte la machine |

Raison : produit centré sur la lecture ; le signal de confidentialité est littéral (le texte envoyé est surligné, comme sur une page annotée). Thèmes : Papier (clair) et Édition de nuit (sombre).

### Lois

1. Seul `.sent` utilise `--sent-bg` / `--sent-edge`.
2. L'icône d'envoi (flèche sortante) n'apparaît que sur les contrôles qui transmettent du contenu.
3. Bord plein = inclus dans le prochain envoi ; pointillé = disponible, non inclus ; un état désactivé n'est jamais en pointillé.
4. L'accent n'est jamais un fond de bouton ; le bouton principal est encre.
5. Tout statut porte une icône et un texte.
6. Ni toast, ni bulle, ni avatar, ni dégradé, ni action visible au survol seulement ; aucun texte sous 12 px, sauf le chiffre décoratif `aria-hidden`.

## 2. Jetons (`tokens.css`)

Clair sur `:root` ; sombre sous `:root[data-theme="dark"]` et sous `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`.

| Jeton | Clair | Sombre | Contraste (clair / sombre) |
|---|---|---|---|
| `--bg` | #F6F1E7 | #171512 | fond |
| `--surface` | #FBF8F1 | #1E1B17 | |
| `--raised` | #FFFDF8 | #27231E | |
| `--sunken` | #EEE7D9 | #100E0C | |
| `--border` | #D9D0BF | #3A352D | décoratif |
| `--border-strong` | #877C69 | #857B6B | 3,65 / 4,38 (bords de contrôle) |
| `--text` | #1F1B16 | #ECE5D8 | 15,21 / 14,55 |
| `--muted` | #5E564A | #A89F90 | 6,42 / 6,97 |
| `--accent` | #A33A1E | #EC8163 | 5,86 / 6,84 |
| `--accent-hover` | #7E2A14 | #F4A088 | 8,37 / 8,88 |
| `--on-accent` | #FFFDF8 | #1A0E0A | 6,49 / 7,10 |
| `--primary` / `--primary-hover` | #1F1B16 / #3A342B | #ECE5D8 / #F7F2E8 | |
| `--on-primary` | #F6F1E7 | #171512 | 15,21 / 14,55 |
| `--disabled-bg` | #D9D0BF | #3A352D | texte muted 4,72 / 4,65 |
| `--success` | #2C6A3E | #7FBF8E | 5,76 / 8,46 |
| `--warning` | #855600 | #E0B255 | 5,60 / 9,26 |
| `--danger` / `--danger-hover` | #8A1B52 / #741545 | #F28DB5 / #F7A6C6 | 7,91 / 8,03 |
| `--on-danger` | #FFFDF8 | #171512 | 8,76 / 8,03 |
| `--danger-tint` | #F6E0EA | #301B26 | danger dessus 7,11 / 7,06 |
| `--focus` | #1D4E8F | #9CC3F5 | 7,35 / 10,01 |
| `--sent-bg` | #F2E3A6 | #3A300E | texte dessus 13,30 / 10,42 |
| `--sent-edge` | #7A6A1F | #C2A53C | 4,77 / 7,58 |
| `--selection-bg` | #CFDDF0 | #27456E | texte dessus 12,44 / 7,75 |
| `--scrim` | rgba(31,27,22,.32) | rgba(0,0,0,.55) | |

Autres jetons : polices `--font-serif` (Source Serif 4), `--font-sans` (Inter), `--font-mono` (JetBrains Mono), chacune avec repli système ; échelle `--fs-*` / `--lh-*` (display 28/34, h1 22/28, h2 18/24, h3 15/20, row-title 17/24, reading 16/26, reading-compact 15/23, ui 14/20, label 13/18, caption 12/16, mono 12,5/18, numeral 11/16) ; `--measure: 62ch` ; espacement `--s-2` à `--s-72`, `--section-gap` (3,5 rem) pour l'espace au-dessus de chaque section titrée (`h2`) ; rayons `--r-0`, `--r-1` (2 px), `--r-2` (4 px), `--r-pill` ; ombres `--shadow-1` (menus), `--shadow-2` (dialogue) ; couches `--z-sticky`, `--z-menu`, `--z-dialog` ; durées `--t-1` 80 ms, `--t-2` 120, `--t-3` 180, `--t-4` 260, `--t-5` 320 ; courbes `--ease-out`, `--ease-in`, `--ease-standard`.

## 3. Composants et états

| Composant | Classes | États |
|---|---|---|
| Bouton | `.btn` + `--primary`, `--secondary`, `--quiet`, `--danger`, `--danger-solid`, `--compact`, `--large`, `--icon-only`, `--stop`, `--send` | repos, survol, focus, actif, `aria-disabled`, `aria-busy` (points animés) |
| Bouton icône | `.icon-btn`, `--sm` | repos, survol, focus ; infobulle `.tip` |
| Champ | `.field`, `.input`, `.textarea`, `.select`, `.input-group`, `.help` | repos, focus, `aria-invalid`, désactivé, aide ok / erreur |
| Contrôle segmenté | `.seg`, `.seg__cell` (`role=radio`, `aria-checked`) | sélectionné, désactivé |
| Interrupteur, case | `.switch`, `.check` | off, on, focus, désactivé |
| Pastille de contexte | `.chip` + `--off`, `--unreadable`, `--loading` | incluse (plein, `.sent`), non incluse (pointillé), illisible (icône cadenas), chargement |
| Étiquette, badge, genre, statut | `.tag`, `.badge`, `.badge--local`, `.kind`, `.status-tag` | |
| Bordereau | `.slip`, `.preview`, `.receipt` | fermé, ouvert (`data-open`), aperçu exact ; lignes sans retour à la ligne (le titre seul se tronque, « 4 812 car. » reste entier) |
| Messages | `.msg-user`, `.msg-ai`, `.md`, `.msg-footer`, `.caret`, `.codeblock`, `.scroll-down` | en cours, terminé, interrompu |
| Avis | `.notice` + `--success`, `--warning`, `--error` ; `.inline-confirm` | |
| Squelette | `.ghost` | chargement de la bibliothèque, attente du premier jeton (`role=status`, texte lisible, barres `aria-hidden`) |
| Menu, onglets, dialogue | `.menu`, `.tabs`, `.dialog`, `.scrim` | sélectionné, focus |
| Surcouche | `.toolbar`, `.overlay-card` | |
| Coquilles de surfaces | `.sidebar`, `.popup`, `.toc`, `.lib`, `.page`, `.section`, `.folio` | |

## 4. Mouvement

Durées : 80 ms couleur, 120 ms pression, 180 ms menus et bordereau, 260 ms dialogue, 320 ms page. Un balayage (`.sent.is-new`) marque l'inclusion d'un élément au contexte. Curseur de rédaction et points de chargement sont décoratifs. Dans les maquettes (`.frame`), les animations d'entrée de `.overlay-card` et `.notice--error` sont désactivées pour que chaque état soit visible en capture statique. Avec `prefers-reduced-motion: reduce`, durées ramenées à 80 ms de fondu au plus, curseur et points statiques, aucun balayage.

## 5. Accessibilité

- Contraste AA sur chaque paire texte / fond (voir le tableau) ; les bords de contrôle atteignent 3:1.
- Focus visible : anneau 2 px `--focus`, décalage 2 px, sur tout élément interactif.
- HTML sémantique : `button`, `nav`, `main`, `section` titrées, `role=radiogroup/switch/tablist` avec états ARIA, `role=alert` pour les erreurs, `role=status` pour les progressions.
- La couleur ne porte jamais seule un statut : icône et texte.
- Cibles tactiles et souris d'au moins 24 px ; `--compact` garde 24 px.
- Bloc `forced-colors` : bords et focus en couleurs système, `.sent` reste distinct par son bord.
- Les chiffres de marge sont `aria-hidden` ; la réponse a un `aria-label` explicite.

## 6. Notes par surface

- Panneau latéral (360 px, variante 280 px) : en-tête, conversation, pied avec bordereau « Ce qui part », pastilles, champ, modèle, Envoyer / Arrêter. Le bordereau résume le prochain envoi et ouvre l'aperçu exact. États montrés : vide, réponse en cours, élément de bibliothèque joint, erreurs (clé refusée et limite de débit ; réseau et interruption, en deux maquettes), page protégée, page tronquée (avis chiffré « N car. envoyés sur M », bordereau et pastille idem), contexte PDF (pastille `PDF`), attente du premier jeton (squelette), sans clé API.
- Fenêtre rapide (320 px) : sommaire de pointillés guidés, une action principale, lien vers le panneau ; états résumé en cours, réponse, sans clé API (action unique « Ajouter une clé API »), page protégée.
- Surcouche : barre flottante et carte de réponse sur la page hôte ; la carte a les états en cours, terminée, erreur (clé manquante) et page tronquée. Racine : shadow root fermé, `popover="manual"`, unités en px, piles de polices système uniquement (aucune police chargée dans les pages), thème du système. Documentation de `:host` : `all: initial`, `color-scheme: light dark`, les jetons y sont redéclarés en px via `tokens.css` embarqué ; z-index maximal géré par le popover.
- Bibliothèque : liste, recherche (surlignage `mark.hit`, ni jaune d'envoi), état sans résultat, état vide (aucune entrée encore), chargement (squelette), détail avec éditions, étiquettes, export, jonction au contexte. Marque « local » sur toute action qui n'envoie rien.
- Réglages : sections numérotées en folios, rail de navigation.
- Accueil : trois étapes, clé API validée avant de continuer.

## 7. Consommation par l'implémentation

1. Pages d'extension (panneau, fenêtre, options, bibliothèque, accueil) : `<link rel="stylesheet" href="tokens.css">` puis `components.css` ; tailles en rem.
2. Surcouche : construire un `CSSStyleSheet` à partir des deux fichiers et l'adopter dans le shadow root fermé ; convertir rem en px à la génération ; ne charger aucune police.
3. Thème : poser `data-theme="light|dark"` sur `:root` pour forcer ; l'absence d'attribut suit le système. Les pages de cette maquette partagent `theme.js` (sélecteur Système / Clair / Sombre) et acceptent `?theme=light|dark` dans l'URL.
4. Jamais de couleur codée en dur dans le code de l'extension : ajouter un jeton ici d'abord.
5. Toute évolution de valeur passe par `tokens.css` et par un contrôle de contraste.
