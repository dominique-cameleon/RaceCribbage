<!-- SYSMAP -->
# SYSMAP — RaceCribbage
Version : 2.7 | 2026-09-03
Cible : PWA JS pur (HTML/CSS/JS, ES modules), déploiement Netlify — PAS un Cloudflare Worker

**Règles du jeu : `RULES.md` fait autorité.** Ce sysmap ne reproduit plus le détail des
règles — il en donne un résumé court et renvoie à la section concernée de `RULES.md`.
Backlog technique et dette : `TODO.md`.

---

## Statut global

Le concept canonique est **RaceCribbage : une course de cribbage à 12 joueurs sur une piste à 3 voies**.
La Course n'est pas une V2 optionnelle : elle fait partie du produit principal.

Le projet comprend aussi une **Qualif solo** (modèle grille 4×4 + cheapcrib de 4 cartes, voir RULES.md §2). Le total le plus élevé obtient la position de départ la plus avancée.

Le cribbage régulier 1v1 n'est **pas un mode produit prioritaire**. Les modules déjà développés à partir du cribbage régulier sont conservés comme briques techniques, références de scoring et base de tests. Un autre format pourra éventuellement servir un futur mode DragRace, mais ce point peut attendre.

### Implémentation réelle actuelle
- Phase 1 ✅ `cards.js` + `scoring.js` — 12 tests verts
- Phase 2 ✅ `deck.js` — 9 tests verts
- Phase 3 ✅ `pegging.js` — 29 tests verts, **généralisé 2 à 12 joueurs** (modes `regular` + `course`)
- 50 tests verts au total (`node --test`)
- `game-engine.js` ⏳ absent
- `track.js` ⏳ absent
- UI/PWA ⏳ absente
- Prototype de piste disponible dans `tools/course-prototype.html`

**Important :** les modules existants reflètent en partie un ancien pivot vers « régulier 1v1 + Qualif solo ». Ils ne doivent pas être considérés comme la définition canonique du produit lorsque leur comportement contredit le présent sysmap.

Le présent fichier est la **documentation de conception canonique vivante** du dépôt.

---

## Arborescence actuelle

```text
RaceCribbage/
├── package.json
├── .gitattributes
├── sysmap-racecribbage.md
├── js/
│   ├── cards.js     ✅ modèle carte + utilitaires
│   ├── scoring.js   ✅ scoring show standard, actuellement conçu pour 4 + 5e carte
│   ├── deck.js      ✅ donne régulière + primitive Qualif actuelle
│   └── pegging.js   ✅ moteur pegging 2 à 12 joueurs — modes `regular` / `course`
├── tests/
│   ├── scoring.test.js  ✅
│   ├── deck.test.js     ✅
│   └── pegging.test.js  ✅
└── tools/
    ├── course-prototype.html
    └── ouvrir-prototype.bat
```

### Cible fonctionnelle

Le développement doit converger vers :

```text
RaceCribbage/
├── js/
│   ├── game-engine.js   orchestration RaceCribbage
│   └── track.js         piste 3 voies, déplacements, draft, victoire
├── tests/
│   ├── game-engine.test.js
│   └── track.test.js
├── index.html
├── manifest.json
├── service-worker.js
├── css/
└── assets/
```

Le phasage exact appartient au projet de développement. Il ne faut toutefois plus traiter `track.js` ou la Course à 12 comme « hors scope V2 ».

---

## Principes techniques établis

- PWA installable mobile + desktop
- HTML/CSS/JavaScript pur, ES modules natifs
- zéro framework / zéro dépendance runtime externe au bootstrap
- Node 18+ pour les tests
- tests natifs `node --test`
- RNG injectable pour permettre les tests déterministes
- moteur séparé de l'UI
- fonctions de moteur aussi pures que possible : `(état, action) → nouvel état`
- aucun accès DOM dans les modules du moteur
- cette séparation doit permettre plus tard un multijoueur réseau sans réécrire les règles fondamentales

---

# Modèle de jeu canonique

## 1. Produit principal : RaceCribbage

### ÉTABLI

- **12 joueurs** participent à la course.
- Une **13e main de 4 cartes** sert de crib pendant une manche de Course.
- Le crib ne constitue jamais un 13e joueur.
- Le crib **ne participe pas au pegging**.
- Le jeu se déroule sur une **piste à 3 voies**.
- 1 point marqué = 1 trou d'avancement, sous réserve des règles de déplacement et de blocage.
- La victoire se fait par **bouclage du parcours**, et non à 121 points.
- Le classement sur la piste influence l'ordre de jeu.

### Joueurs humains et NPC

La première version doit permettre :
- jusqu'à 12 humains en local / hotseat ;
- un ou plusieurs humains avec des NPC pour compléter les places ;
- les deux approches.

L'usage attendu sera probablement souvent **1 ou plusieurs humains + NPC**.

Le niveau d'intelligence, les stratégies et la sophistication des NPC sont **PEUT ATTENDRE**.

---

## 2. Qualification — Qualif solo

La qualification sert à déterminer l'ordre de départ de la Course.

### Résumé — voir RULES.md §2

Mode **solo**, joué une fois par chacun des 12 participants. Modèle **grille 4×4**
(Cribbage Squares) : 20 cartes révélées une à une (les positions %5==0 vont au crib),
puis coupe d'une carte universelle en 5e carte ; **9 mains** scorées (4 rangées + 4 colonnes
+ cheapcrib de 4 cartes). Score final = somme des 9 mains → position de départ Course
(score le plus élevé = le plus en avant). Départage d'égalité : **résolu, voir RULES.md §2 (#8)**.

### Dette technique

`dealQualifRound` (`deck.js`) et `scoreShow` (`scoring.js`) suivent encore l'ancien modèle
(distribution par round/colonne, 5 mains). Réécriture complète nécessaire pour le modèle
grille 4×4. **Voir `TODO.md` — « Dette technique connue ».**

### PROVISOIRE / à préciser plus tard

- nombre de colonnes supérieur à 4 (le canonique est 4×4) ;
- modalités exactes d'enchaînement des qualifications pour les 12 participants dans l'UI.

---

## 3. Manche de Course — 12 joueurs + crib

### Distribution

- paquet standard de 52 cartes ;
- distribution complète en **13 mains de 4 cartes** :
  - 12 mains joueurs ;
  - 1 main crib ;
- aucune carte mise de côté ;
- la **dernière carte distribuée**, soit la 4e carte du crib, est la **carte universelle** ;
- cette carte universelle est utilisée avec les mains des 12 joueurs pour le comptage ;
- le crib demeure un **cheapcrib de 4 cartes seulement** : sa 4e carte est déjà l'universelle et n'est pas comptée une deuxième fois comme 5e carte.

### Pegging

- seuls les **12 joueurs** participent ;
- la 13e main / crib n'y participe pas ;
- ordre de départ du pegging : ordre de position sur la piste, le joueur le plus avancé jouant en premier ;
- cumul maximum : 31 ;
- scoring de base : 15, 31, paires, suites, go ;
- le pivot actuel de **plancher 1 point par carte lorsqu'aucune combinaison ne marque** est conservé comme règle de travail, sauf révision ultérieure explicite ; ce calcul réel/plancher est **identique** entre `regular` et `course`.

#### Formalisé (RULES.md v13 §3, implémenté dans `pegging.js` — mode `course`)

- **Fermeture d'une séquence** : `go` = 1 point à la dernière carte posée dès que plus
  aucun joueur ne peut alimenter le cumul (main vide, `go` déjà annoncé, ou aucun coup légal) ;
  `31 pile` = 2 points et remplace le `go`. `pegging.js` ferme automatiquement sans exiger
  un `sayGo` explicite lorsque le double blocage est certain.
- **Ouverture du cumul suivant** : après un `go` ou un `31 pile`, le prochain à ouvrir le
  cumul à 0 est le joueur **suivant dans l'ordre initial de la manche** — index `(i + 1) % N`
  où `i` est l'index du joueur qui a fermé. Les joueurs sans carte sont sautés (ils marquent
  leur plancher auto au passage, voir ci-dessous), donc la réouverture revient toujours à un
  joueur qui a effectivement une carte. À 2 joueurs = l'autre joueur (mode `regular` inchangé).
- **Joueur ayant épuisé sa main** : il reste dans la rotation et marque **automatiquement
  1 point plancher à chaque fois que le tour repasse sur lui**, sans action, jusqu'à ce que
  **toutes les mains soient vides** — y compris à travers plusieurs remises à 0. Le mode
  `regular` ne fait pas cela (le joueur fini est simplement sauté).
- `playCard` expose sur l'événement le **type de point** (`pointKind` : `real` pour une
  combinaison / `go` / `31`, `floor` pour un plancher pur, `null` sinon) pour le futur
  `game-engine.js` (nature du point → règle de déplacement, cf. section 5).

**Note :** `createPegging` accepte 2 à 12 joueurs (souplesse du module, tests). La Course
canonique en utilise **12** ; l'ordre des joueurs est fourni par l'appelant, jamais calculé
par `pegging.js`.

#### Reste à formaliser côté Course

- interaction pegging ↔ avancement immédiat du pion (chaque point marqué déplace le pion
  pendant le pegging) : géré par `game-engine.js` / `track.js`, pas par `pegging.js`.

### Comptage des mains

- chaque joueur compte ses 4 cartes avec la carte universelle ;
- le crib est compté séparément en **cheapcrib de 4 cartes seulement** ;
- ordre de comptage : selon l'ordre de piste ;
- le crib est compté en dernier par le donneur ;
- donneur suivant : joueur en dernière position après le comptage des 12 mains ;
- premier donneur de la manche 1 : **résolu, voir RULES.md §2** (dernier au classement Qualif).

---

## 4. Carte universelle = Valet — effet draft

### ÉTABLI

Si la carte universelle est un Valet :
- l'effet `his heels` standard est remplacé ;
- une fois pendant la manche, les pions d'une chaîne directement collée avancent de 1 trou ;
- **toute la chaîne avance, MENEUR INCLUS** ;
- le crib ne constitue pas un pion et n'est évidemment pas concerné.

### PEUT ATTENDRE

L'interaction exacte du draft avec les obstacles, changements de voie, occupation des trous et cas limites sera validée avec le moteur de piste.

---

## 5. Piste et déplacement

### ÉTABLI

- 3 voies parallèles ;
- voie centrale décalée d'un demi-pas par rapport aux voies extérieures ;
- motif quinconce créant des adjacences diagonales ;
- dépassement par changement de voie diagonal vers un trou adjacent libre ;
- jamais de saut normal par-dessus un pion ;
- exception spéciale : effet Valet-draft ;
- obligation générale d'avancer au maximum des points disponibles ;
- si plusieurs positions finales légales subsistent, un choix final peut être laissé au joueur ;
- victoire = premier pion à boucler le parcours prévu.

### Nature des points — règle de travail actuelle

- points issus d'une combinaison réelle, `go` ou `31` : **points réels**, pouvant autoriser le changement de voie ;
- point de plancher pur : avance dans la même voie seulement, sans dépassement.

### Géométrie actuellement testée dans le prototype

Le prototype utilise :
- `top/bottom → mid` au même index ;
- `mid → top/bottom` à `index + 1`.

Cette géométrie est une **base de prototype utile**, pas encore une fermeture définitive de tous les cas de piste.

### PEUT ATTENDRE

- algorithme exact de déplacement de N trous dans un champ encombré ;
- traitement des points impossibles à consommer ;
- changement de voie volontaire hors dépassement ;
- comportement précis dans les courbes ;
- nombre de tours et variations de piste.

---

## 6. Grille de départ

### Résumé — voir RULES.md §6

**Résolu (RULES.md §6 v10).** Chicane à **4 voies** (a/b/c/d) juste avant la ligne
départ/arrivée, élargissement temporaire du tracé pour loger les 12 pions sans blocage forcé
au 1er tour. Rangs Qualif répartis en alternance stricte voie c (impairs) / voie b (pairs),
6 rangs de profondeur ; `rang1 → c1` (pole, collé à la ligne). La voie d se prolonge 1 trou
après la ligne puis fusionne vers le format 3 voies (dépassement diagonal classique, §5).
Détail complet + table de répartition des 12 rangs : **RULES.md §6**.

---

## 7. Comptage des combinaisons

### Mains joueurs avec carte universelle

Le moteur existant `scoreShow(hand4, fifth, {isCrib})` couvre actuellement :
- 15 = 2 points par combinaison ;
- paire = 2, brelan = 6, carré = 12 ;
- suites ;
- flush ;
- nobs.

Ce moteur reste une bonne base pour les mains joueurs de 4 + carte universelle.

### Cheapcrib

Le crib RaceCribbage et le crib de qualification sont **des mains de 4 cartes seulement**.

`scoring.js` est actuellement structuré autour de `hand4 + fifthCard`, et sa logique crib standard exige 5 cartes pour le flush. Une adaptation spécifique au **cheapcrib 4 cartes** sera donc nécessaire.

La règle est **figée : voir RULES.md §3 (v7)** — comptage sur les 4 cartes telles quelles, flush crib = 4 pts. Le moteur doit l'appliquer sans réintroduire implicitement les règles du crib standard à 5 cartes.

---

# Modules & état technique

| Module | État réel | Conséquence pour RaceCribbage |
|---|---|---|
| `cards.js` | ✅ implémenté | réutilisable |
| `scoring.js` | ✅ implémenté pour scoring standard 4+5e | à adapter pour cheapcrib 4 cartes |
| `deck.js` | ✅ implémenté | ajouter donne Course 13×4 ; conserver/adapt. Qualif |
| `pegging.js` | ✅ généralisé 2 à 12 joueurs, modes `regular` / `course` | prêt pour la Course ; branchement pegging ↔ piste à faire dans `game-engine.js` |
| `game-engine.js` | ⏳ absent | doit orchestrer Qualif + Course |
| `track.js` | ⏳ absent | nécessaire au produit principal |
| UI/PWA | ⏳ absente | après stabilisation suffisante du moteur |

### Attention sur le code existant

Le code régulier 1v1 reste utile comme :
- référence de règles ;
- banc de tests ;
- source de primitives réutilisables.

Il ne faut cependant plus laisser son existence orienter le produit vers un jeu de cribbage régulier 1v1. RaceCribbage est la cible.

---

# Points ouverts

1. ~~**Pegging à 12 joueurs** : règle exacte du `go`, de la fermeture d'une séquence et du
   joueur qui ouvre la suivante.~~ **RÉSOLU (v2.6)** — formalisé RULES.md v13 §3 et implémenté
   dans `pegging.js` (mode `course`) : voir section 3 « Pegging › Formalisé ». Reste au
   `game-engine.js` : brancher chaque point marqué sur l'avancement immédiat du pion.
2. ~~**Cheapcrib 4 cartes** : préciser exactement les règles de flush/nobs et toute différence
   de scoring par rapport à une main normale.~~ **RÉSOLU (v2.7)** — RULES.md §3 (v7) : comptage
   sur les 4 cartes telles quelles, flush crib = 4 pts. Reste à faire côté code : adapter
   `scoring.js` (voir table Modules & TODO.md).
3. ~~**Déplacement multi-points** : résolution lorsqu'un joueur marque plusieurs points avec
   obstacles et possibilités diagonales.~~ **RÉSOLU (v2.7)** — RULES.md §5 (v9) : algorithme
   de déplacement (pas à pas, diagonale = 1 pas d'avancement, une voie à la fois, trou visé
   libre ; choix du joueur seulement si destinations finales distinctes).
4. ~~**Points non dépensables** : perdus, reportés ou autre comportement.~~ **RÉSOLU (v2.7)** —
   RULES.md §5 (v9, #4) : pion totalement bloqué → points **perdus, sans compensation** ;
   événement compté en statistiques de manche (détail moteur — voir `TODO.md` tâche 6).

**Les 4 points ci-dessus sont résolus** (règles figées dans `RULES.md`). Ce qui reste est du
travail de code, pas de décision de règle.

## PEUT ATTENDRE

- sophistication des NPC ;
- courbes réalistes et longueurs variables par voie ;
- plusieurs pistes / niveaux ;
- DragRace ;
- comptes joueurs ;
- ligues, tournois, classement global ;
- personnalisation ;
- multijoueur réseau ;
- backend, auth et matchmaking.

---

# Hors scope du bootstrap immédiat

Les éléments suivants restent des extensions futures et ne doivent pas bloquer le moteur local :
- comptes joueurs ;
- ligues / tournois ;
- classement en ligne ;
- personnalisation ;
- multijoueur réseau ;
- backend BDD/auth/matchmaking ;
- IA avancée.

**Attention : la Course à 12 joueurs, la piste 3 voies, le hotseat local et la possibilité de NPC de base ne sont PAS dans cette liste : ils appartiennent au produit RaceCribbage.**

---

# Décisions récentes — v2.7

**Resynchronisation documentaire — aucune fonctionnalité, aucun code touché, tests inchangés (50/50).**

- Création à la racine du dépôt de **`RULES.md`** (Version 13), **`TODO.md`** et **`README.md`**.
  Le dépôt devient autonome : règles, backlog et état d'implémentation ne dépendent plus de
  Claude Chat. `ARCHITECTURE.md` reste abandonné (contenu utile couvert ici).
- **`RULES.md` fait désormais autorité pour les règles.** Le sysmap cesse de reproduire le
  détail : il résume et renvoie à `RULES.md §X` — pattern déjà appliqué au pegging en v2.6,
  généralisé aux sections 2 (Qualif), 5 (piste), 6 (grille de départ).
- **Points ouverts #2, #3, #4 → RÉSOLUS** (RULES.md §3 v7 pour le cheapcrib ; RULES.md §5 v9
  pour l'algorithme de déplacement et les points non dépensables). Les 4 points ouverts sont
  désormais tous résolus au plan des règles.
- **Départage égalité Qualif** (RULES.md §2 #8) et **premier donneur manche 1** (RULES.md §2 #7)
  → résolus ; retirés des listes « à préciser » / « PEUT ATTENDRE ».
- **Grille de départ Course** : chicane à 4 voies avant la ligne (RULES.md §6 v10) ; section 6
  du sysmap réduite à un résumé + renvoi. L'ancienne mention « voies extérieures » était
  périmée (la voie centrale b reçoit les rangs pairs).
- **Modèle Qualif canonique = grille 4×4 séquentielle** (RULES.md §2). Le code actuel
  (`dealQualifRound`, `scoreShow`) suit l'ancien modèle → dette tracée dans `TODO.md`.
- Vérification des références `RULES.md` dans `js/` : **aucune** — `cards.js`, `scoring.js`,
  `deck.js`, `pegging.js` ne citent que `sysmap-racecribbage.md`. Rien à ajuster.

# Décisions récentes — v2.6

- `pegging.js` **généralisé de 2 à 12 joueurs**, deux modes cohabitant : `regular` (défaut,
  comportement historique strictement inchangé) et `course`. Signature :
  `createPegging(order, hands, { mode })`.
- **Formalisation du pegging à 12 joueurs** (RULES.md v13 §3) : fermeture `go` / `31 pile`,
  ouverture du cumul suivant = joueur suivant dans l'ordre initial `(i + 1) % N`, joueur
  ayant fini sa main qui reste dans la rotation et marque 1 plancher auto par tour jusqu'à
  ce que toutes les mains soient vides (à travers les remises à 0). Détail : section 3.
- `playCard` expose `pointKind` (`real` / `floor` / `null`) sur l'événement, pour la future
  distinction « nature du point » du déplacement sur piste.
- Le calcul réel/plancher est **identique** entre `regular` et `course` (pas de branche) —
  correction d'une hypothèse antérieure « 0 pt en régulier ».
- Tests : 23 cas `regular` inchangés + 6 cas `course` → **29 tests `pegging` verts, 50 au total**.
- Point ouvert BLOQUANT #1 (« pegging à 12 ») → **résolu**. `game-engine.js` / `track.js`
  restent à faire ; `pegging.js` ne calcule jamais l'ordre des joueurs ni n'avance de pion.

# Décisions récentes — v2.5

- Correction du pivot documentaire v2.0–v2.4 : **la Course à 12 joueurs redevient le produit principal et ne doit plus être classée V2 différée**.
- Qualification confirmée comme **cribbage chinois à au moins 4 colonnes + cheapcrib**.
- **Score de qualification le plus élevé = position de départ la plus avancée**.
- Cribbage régulier 1v1 : conservé comme base technique/référence, pas comme mode produit prioritaire.
- Jeu local : **hotseat 12 humains ET humains + NPC** doivent être possibles ; humains + NPC probablement fréquent.
- Effet Valet-draft : **meneur inclus**.
- Crib Course et Qualif : **cheapcrib de 4 cartes seulement**.
- La 13e main / crib **ne participe jamais au pegging**.
- Les anciens changements v2.0–v2.4 restent utiles pour comprendre l'historique du code, mais ne priment plus sur les décisions canoniques ci-dessus.
