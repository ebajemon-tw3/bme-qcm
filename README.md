# Révision BME, QCM

Site de révision par QCM pour le semestre d'échange à BME, automne 2026. Une page par matière,
un moteur de QCM (entraînement ou examen blanc), l'historique des sessions et les points faibles
par chapitre, topic et section. Utilisable au téléphone.

Site : https://ebajemon-tw3.github.io/bme-qcm/

Le site est public mais son contenu est chiffré. Sans le mot de passe, on ne voit que l'écran de
déverrouillage. Le mot de passe n'est ni dans ce dépôt, ni dans ce README.

## Ce que contient ce dépôt

| Chemin | Rôle |
|---|---|
| `app/` | Pages Next.js : tableau de bord, matière, QCM, historique, revue de session, points faibles, réglages |
| `components/` | Coquille (`app-shell-5`), composants Grok de brainless, moteur de QCM |
| `lib/crypto.ts` | Chiffrement et déchiffrement du bundle, partagé entre navigateur et scripts |
| `lib/history.ts` | Historique des sessions dans le `localStorage`, export et import JSON |
| `lib/stats.ts` | Calculs de l'historique : taux par chapitre, topic, section, questions ratées, série |
| `scripts/build-bundle.ts` | Lit le dépôt cours et écrit `public/data.enc` |
| `scripts/verify-bundle.ts` | Vérifie que `public/data.enc` se déchiffre avec `SITE_PASSWORD` |
| `public/data.enc` | Le bundle chiffré : questions, fiches matières, échéances |
| `.github/workflows/deploy.yml` | Build et publication sur GitHub Pages à chaque push sur `main` |

Aucun contenu de cours n'est versionné en clair. Le JSON en clair produit par le script de bundle
est écrit dans `data/bundle.json`, qui est gitignoré.

## Chiffrement

| Point | Mise en oeuvre |
|---|---|
| Algorithme | AES-256-GCM, Web Crypto API du navigateur, aucune bibliothèque tierce |
| Dérivation de clé | PBKDF2-SHA256, 600 000 itérations, sel aléatoire de 16 octets tiré à chaque build |
| Contenu chiffré | Banques de questions, fiches `CLAUDE.md` lues (identité, créneaux, enseignants, planning), échéances de `calendrier.md` |
| En clair | Le code de l'application, sans aucune donnée de cours |
| Format | Un seul fichier `public/data.enc` : `BMQ1`, itérations, sel, IV, texte chiffré et tag GCM. L'en-tête est authentifié par GCM |
| Compression | Le JSON est compressé en gzip avant chiffrement : 86 Ko pour 567 questions |
| Mot de passe faux | Message « Mot de passe incorrect. », rien d'autre ne s'affiche |
| Mémorisation | Case « Retenir le mot de passe sur cet appareil ». Il est alors stocké dans le `localStorage` du navigateur. Réglages, « Oublier le mot de passe et verrouiller » le retire |

Le mot de passe est fourni au script de bundle par la variable d'environnement `SITE_PASSWORD`. Côté
GitHub, il est enregistré comme secret de dépôt `SITE_PASSWORD`. Le workflow s'en sert pour vérifier
que le `data.enc` poussé se déchiffre bien avec lui avant de publier : un bundle chiffré avec un
autre mot de passe fait échouer le déploiement au lieu de publier un site impossible à ouvrir.

### Limite

Le fichier chiffré est public : sa solidité repose entièrement sur le mot de passe, attaquable hors
ligne par force brute. Les 600 000 itérations de PBKDF2 ralentissent chaque essai, elles ne rendent
pas l'attaque impossible. Un mot de passe de 8 caractères, comme celui du premier déploiement, fait
de ce chiffrement une barrière contre l'indexation et le passant, pas une protection contre un
attaquant motivé. Le renforcement passe par une phrase de passe plus longue, pas par un autre
algorithme.

Le mot de passe actuel est court, choisi pour être retenu facilement : cette limite s'applique.
Les `data.enc` des commits précédents restent dans l'historique git, chiffrés avec les mots de passe
précédents.

Changer de mot de passe :

```bash
gh secret set SITE_PASSWORD           # saisie masquée du nouveau mot de passe
SITE_PASSWORD=... bun run bundle      # rechiffre data.enc avec le nouveau
git add public/data.enc && git commit -m "Re-encrypt bundle with new password" && git push
```

Les appareils qui avaient retenu l'ancien mot de passe redemandent le nouveau à l'ouverture.

## Source des données

Le script lit le dépôt cours, par défaut `~/Documents/erasmus/cours` (variable `COURS_DIR` pour un
autre chemin). Il ne le modifie jamais.

| Donnée | Source |
|---|---|
| Liste des matières | Dossiers `<CODE>_<slug>/` qui contiennent un `CLAUDE.md`, dans l'ordre du tableau « Matières » du `CLAUDE.md` racine |
| Identité, créneau, enseignants | Tableaux des sections « Identité de la matière », « Créneau et salle », « Enseignants » du `CLAUDE.md` de la matière |
| Planning et blocs de séance | Tableau « Planning des séances ». Une colonne « Chapitres » (« 4 à 6 », « 11 et 12 ») définit les blocs de séance proposés dans le QCM |
| Échéances | Tableaux « Échéances, ordre chronologique » et « Échéances non datées » de `calendrier.md`, rattachés aux matières par la légende des sigles |
| Questions | `<CODE>_<slug>/exams/questions.ts`, sinon `<CODE>_<slug>/exams/questions.json` |
| Titres de chapitre | Topic de synthèse de chaque module Cisco (« ... Summary ») |

Les textes des questions, options et justifications sont repris tels quels. Le site restitue
seulement le gras et l'italique que le récupérateur NetAcad a notés `**...**` et `*...*`.

## Ajouter une matière ou des questions

Tout se fait dans le dépôt cours, puis par un rebuild du bundle. Le code du site ne change pas.

**Une nouvelle matière** : créer son dossier `<CODE>_<slug>/` avec un `CLAUDE.md` qui suit la
convention du dépôt cours. Elle apparaît dans la navigation au prochain bundle, avec une page qui
indique qu'elle n'a pas encore de questions.

**De nouveaux chapitres CyberOps** : relancer le récupérateur NetAcad dans le dépôt cours, qui
régénère `exams/questions.ts`.

```bash
cd ~/Documents/erasmus/cours
node tools/netacad-scrape/scrape.mjs 7-9
```

**Des questions pour une autre matière** : déposer `exams/questions.ts` (qui exporte `questions`) ou
`exams/questions.json` (un tableau) dans le dossier de la matière, au même schéma :

```ts
interface Question {
  id: string;             // identifiant stable, unique dans la matière
  chapter: number;
  section: string;        // "4.8.2"
  sectionTitle: string;
  topic: string;          // "4.8"
  topicTitle: string;
  origin: "check" | "quiz" | "other";
  kind: "single" | "multiple";
  prompt: string;
  choices: { id: string; text: string; correct: boolean }[];
  explanation: string;
}
```

Le script refuse un fichier incohérent (id manquant ou en double, aucune bonne réponse, choix unique
avec plusieurs bonnes réponses) et indique la question fautive.

**Publier** :

```bash
cd ~/Documents/erasmus/dashboard
SITE_PASSWORD=... bun run bundle      # relit le dépôt cours, réécrit public/data.enc
git add public/data.enc
git commit -m "Update encrypted bundle"
git push                              # le workflow vérifie, construit et publie
```

## Développement

```bash
bun install
SITE_PASSWORD=... bun run bundle
bun run dev                  # http://localhost:3000
bun run lint
BASE_PATH=/bme-qcm bun run build   # export statique dans out/, comme en production
```

## Historique et changement d'appareil

L'historique vit dans le `localStorage` du navigateur. Il n'y a ni serveur ni service tiers. Pour
passer d'un appareil à l'autre : Réglages, « Exporter en JSON », puis sur l'autre appareil
« Importer un JSON ». L'import fusionne : les sessions déjà présentes sont ignorées, rien n'est
effacé. Le fichier exporté contient des identifiants de questions et les réponses données, pas de
texte de cours.

Une session de QCM en cours est sauvegardée après chaque réponse. Si l'onglet se recharge, la page
QCM propose de la reprendre.

## Décisions prises en autonomie

| Sujet | Décision | Raison |
|---|---|---|
| Nombre de matières | 9 pages, pas 7 | Le dépôt cours en recense 9 depuis le 2026-09-23. La liste est lue dans le dépôt, pas codée en dur |
| Taille de la banque | 567 questions, modules 1 à 28 | État réel de `questions.ts` au moment du build |
| Chiffrement au build | `bun run bundle` tourne en local, `data.enc` est versionné | Le runner GitHub n'a pas accès au dépôt cours. Le secret sert en CI à vérifier le bundle |
| Variante brainless | Grok seulement | Les blocs Claude et Codex n'auraient servi à rien. Les composants Grok utilisés ont été adaptés : couleurs du thème, texte fourni par l'appelant, raccourcis Grok sans objet retirés |
| Options d'une question | `GrokChoices`, dérivé de `GrokPermission` | Radiogroup pour le choix unique, cases à cocher pour le choix multiple, libellés texte en correction |
| Coquille `app-shell-5` | Recherche, avatar, notifications, sélecteur de thème, encart « latest change » et logo retirés | Contenus de démonstration sans fonction ici |
| Thème | Sombre uniquement | Les composants Grok sont dessinés pour un fond sombre |
| Palette | Neutres, vert (juste), rouge (faux), ambre (à surveiller) | Une couleur par sens, pas de couleur décorative |
| Police | JetBrains Mono partout, 4 tailles (12, 14, 16, 20 px) | Cohérence avec l'aspect terminal, échelle fixe |
| Graphique | SVG écrit à la main | Évite d'ajouter Recharts pour une seule courbe |
| Routage | `/matiere/?c=CODE`, `/session/?id=...` | Les codes de matière ne sont connus qu'après déchiffrement, une route statique par matière les exposerait |
| Notation | Tout ou rien : un choix multiple est juste seulement si l'ensemble coché est exact | Règle la plus stricte, pas de note partielle inventée |
| Temps par question | Compté seulement onglet visible. En entraînement, la lecture de la correction n'est pas comptée | Un onglet laissé ouvert fausserait la durée |
| Série en cours | Jours consécutifs avec au moins une session, jusqu'à aujourd'hui ou hier | Répond à « est-ce que je révise régulièrement ? » |
| Questions ratées | Toute question ratée au moins une fois, triée par nombre d'échecs. Option pour ne garder que celles dont la dernière réponse est fausse | Distingue ce qui a été rattrapé de ce qui reste faux |
| Seuil en rouge dans Points faibles | Moins de 50 % | Seuil d'échec du barème CyberOps (0 à 49 % : note 1) |
| Mémorisation du mot de passe | Cochée par défaut | Usage sur ses propres appareils. Décocher sur un poste partagé |
| Skill shadcn | Installé dans `.claude/skills/`, gitignoré, `skills-lock.json` versionné | Outil local d'agent. `npx skills experimental_install` le restaure |
| Linter | ESLint de `create-next-app` conservé | Détecte les erreurs de hooks React |

## Dépendances

Toutes viennent de la stack imposée ou des registres installés, aucune n'a été ajoutée en plus :
`next`, `react`, `react-dom`, `tailwindcss`, `shadcn`, `radix-ui`, `class-variance-authority`, `cn`
(fusion de classes de shadcn), `tw-animate-css`, `@phosphor-icons/react` (bibliothèque d'icônes du
preset shadcn, seule l'icône du bouton de navigation est utilisée), et en développement `typescript`,
`eslint`, `eslint-config-next`. `next-themes`, ajoutée par `app-shell-5`, a été retirée avec le
sélecteur de thème.

## Registres shadcn

`components.json` déclare `@brainless` (https://brainless.swerdlow.dev) et `@efferd`
(https://efferd.com). Installés : `@brainless/grok-session`, `@brainless/grok-thinking`,
`@efferd/app-shell-5`.

`@efferd/app-shell-5` a ajouté la coquille (`app-shell.tsx`, `app-sidebar.tsx`, `app-header.tsx`,
`custom-trigger.tsx`), les composants `sidebar`, `sheet`, `tooltip`, `breadcrumb`, `separator`,
`skeleton`, `input`, `button` et le hook `use-mobile`. La navigation porte les pages de révision puis
les matières, avec le nombre de questions de chaque banque.

## Reste à faire

- Questions des 8 autres matières : aucune banque n'existe encore dans le dépôt cours.
- Vérifier sur un vrai téléphone. Les tests automatisés tournent à 390 px de large, écran tactile
  simulé, et sur ordinateur.
