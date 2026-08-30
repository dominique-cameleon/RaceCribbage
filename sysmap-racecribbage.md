<!-- SYSMAP -->
# SYSMAP — RaceCribbage
Version : 2.1 | 2026-08-29
Cible : PWA JS pur (HTML/CSS/JS, ES modules), déploiement Netlify — PAS un Cloudflare Worker

---

## Statut global
Modèle de jeu v2 figé (pivot Qualif). Implémentation MVP en cours.
- Phase 1 ✅ `cards.js` + `scoring.js` (12 tests verts)
- Phase 2 ✅ `deck.js` (9 tests verts)
- Phase 3 ⏳ `pegging.js` (régulier) — à venir
- Phase 4 ⏳ `game-engine.js` (orchestration régulier + Qualif)

Le sysmap est la **seule doc de conception du repo** : RULES.md / ARCHITECTURE.md /
TODO.md / README.md ne sont plus versionnés — tout le modèle validé est ici.

MVP actuel : Mode régulier 1v1 + Mode Qualif solo.
V2 différé : La Course à 12 joueurs (piste 3 voies), alimentée par le score Qualif.

---

## Arborescence

### Actuelle
```
RaceCribbage/
├── package.json              "type": "module" · script test : node --test "tests/**/*.test.js"
├── sysmap-racecribbage.md    seule doc de conception
├── js/
│   ├── cards.js     ✅  modèle carte + cardValue + cardId + SUITS/RANKS
│   ├── scoring.js   ✅  scoreShow + heels
│   └── deck.js      ✅  createDeck · shuffle · dealRegular · cut · dealQualifRound · allDistinct
└── tests/
    ├── scoring.test.js  ✅  12 cas
    └── deck.test.js     ✅  9 cas
```

### Cible

MVP (reste à faire) :
```
RaceCribbage/
├── js/
│   ├── pegging.js      séquence de pose régulier · legalPlay · playCard · go · comptage runtime
│   └── game-engine.js  createGame + reduce(state, action) + phases (régulier + Qualif, sans track)
├── tests/
│   ├── pegging.test.js · game-engine.test.js
├── index.html · manifest.json · service-worker.js   (phase UI, plus tard)
└── css/ · assets/cards/
```

V2 différé (à ajouter plus tard) :
```
├── js/track.js        géométrie 3 voies config · adjacences · applyMove · draft · checkWin
├── tests/track.test.js
```

---

## Dépendances
- Runtime : ES modules natifs — navigateur + Node 18+, PAS de bundler
- Zéro dépendance externe (contrainte bootstrap) — `package.json` : `"type": "module"`, aucune `dependencies`
- Tests : `node --test` (natif), un fichier par module. Script : `node --test "tests/**/*.test.js"`
  (glob explicite requis — `node --test tests/` est interprété comme un chemin de module en Node 22)
- RNG : injectable en paramètre, défaut `Math.random` (déterminisme des tests ; PRNG mulberry32 côté tests)
- Nommage : camelCase, identifiants anglais, commentaires français
- Conception : fonctions pures `(état, action) → nouvel état`, aucun accès DOM/UI

---

## Modèle de jeu

### Vue d'ensemble
- **MVP** : Mode régulier 1v1 (RULES.md §1) + Mode Qualif solo (solitaire à 4 colonnes)
- **V2 différé** : La Course à 12 joueurs sur piste 3 voies — le score Qualif détermine la grille de départ

---

### Mode régulier 1v1 (RULES.md §1) — MVP, confirmé
- 2 joueurs, plateau linéaire 121 trous (2×30 + trou final), pas de piste 3 voies
- Donne 6 → garde 4 / défausse 2 au crib · starter par coupe · pegging alterné (max 31)
- His heels = +2 au donneur si starter = Valet
- Muggins : le moteur signale les points non réclamés (`missed`), sans auto-réclamation
- Victoire à 121

---

### Mode Qualif — solitaire à 4 colonnes (MVP)
Solo (1 joueur). Produit un score qui déterminera la grille de départ de la 1ère manche
de Course (V2).

Déroulé :
1. Mélange 52 cartes (rng).
2. **4 manches.** Chaque manche : tirer 5 cartes du paquet une à une →
   - **4 cartes visibles** : le joueur les place librement dans l'une des 4 colonnes.
     Placement libre — plusieurs cartes d'une même manche peuvent aller dans la même
     colonne. Seule contrainte : plafond de 4 cartes par colonne.
   - **1 carte cachée** : va automatiquement et invisiblement au crib.
3. Après 4 manches : **4 colonnes de 4 cartes** + **crib de 4 cartes cachées**
   (20 cartes utilisées, 32 restantes).
4. **Coupe** du paquet restant → **1 carte universelle**.
5. La carte universelle est ajoutée aux 4 colonnes **et** au crib → **5 mains de 5 cartes**.
6. Comptage identique au régulier (15 / paires / suites / flush / nobs) sur les 5 mains.
   Pas de his heels (pas de donneur en solo — la coupe ne rapporte aucun bonus).
   Nobs s'applique normalement si Valet en main de la couleur de la carte universelle.
7. **Score final = somme des 5 mains.**

---

### La Course à 12 joueurs — V2, DIFFÉRÉ (conservé pour référence)
Hors scope immédiat. Documenté ici pour la reprise future. Alimenté par le classement Qualif.

#### Grille de départ (V2)
- Classement des joueurs par score Qualif décroissant
- Pions placés voies extérieures (0 et 2), packés sans écart depuis la ligne de départ,
  ordre = classement (meilleur score = pole)

#### Manche de Course (V2) — répétée jusqu'au bouclage
1. Donne : 13 mains de 4 + carte universelle (dernière carte distribuée = crib[3])
2. Pegging : ordre = position sur la piste (1er de la piste joue en 1er).
   Comptage runtime : 15=2, 31=2, paires, suites, go=1, dernière carte=1, max 31.
   Points → avancement immédiat du pion.
3. Comptage des mains dans l'ordre de piste ; crib scoré en dernier par le donneur.
4. Carte universelle = Valet → effet draft, une seule fois par manche.
   REMPLACE his heels. Sinon : rien.
5. Points de comptage → avancement (voir Règles de déplacement).
6. Donneur suivant = dernière position de piste après comptage des 12 mains.
- Victoire : premier pion à boucler le parcours (track.checkWin).

#### Règles de déplacement sur piste (V2 — track.js)
- 1 point marqué = 1 trou avancé
- Avance dans sa propre voie
- Dépassement UNIQUEMENT par changement de voie en diagonale vers un trou adjacent libre
- Jamais de saut par-dessus un pion — SAUF effet Valet
- Semi-auto : obligation d'avancer au maximum de points disponibles ;
  si le résultat final présente 2-3 positions possibles → choix final au joueur
- Effet Valet-draft : tous les pions d'une chaîne collée (trous adjacents, sans écart,
  même voie) avancent de 1 trou, MENEUR INCLUS. Une seule fois par manche.
- Victoire = boucler le parcours complet (pas de score fixe)

#### Géométrie piste (V2 — track.js, 100 % config, zéro constante en dur)
| Paramètre | Défaut | Rôle |
|---|---|---|
| holesPerLap | 40 | trous par tour (voie de référence) |
| laneCount | 3 | nombre de voies |
| middleLane | 1 | index de la voie centrale (décalée) |
| stagger | 0.5 | décalage quinconce de la voie centrale (demi-pas) |
| curveExtra | 4 | trous supplémentaires voie extérieure par virage |
| curvesPerLap | 2 | nombre de virages par tour |
| laps | 1 | tours à boucler pour gagner |

---

### Comptage de combinaisons (commun, scoring.js)
- 15 = 2 pts par combinaison sommant à 15
- Paire 2 / brelan 6 / carré 12 (par dénombrement des paires)
- Suite = 1 pt/carte × multiplicité
- Flush = 4 (les 4 cartes en main) / 5 (main + 5e carte) ; crib = 5 obligatoires
- Nobs = 1 pt si Valet en main de la couleur de la 5e carte
- His heels = 2 pts au donneur si 5e carte = Valet — mode régulier 1v1 uniquement
  (jamais en Qualif : pas de donneur)

---

## Modules & API prévue

### Ordre d'implémentation MVP
`cards.js` ✅ → `scoring.js` ✅ → `deck.js` ✅ → `pegging.js` (régulier) →
`game-engine.js` (orchestration régulier + Qualif, sans track)

`track.js` : V2 différé — pas dans l'ordre immédiat.

### Table

| Module | Exports (réels si ✅) | Dépend de | Statut |
|---|---|---|---|
| cards.js | `SUITS`, `RANKS`, `cardValue(card)` → 1..10, `cardId(card)` → "AS"/"TD"/"JH" | — | ✅ Phase 1 |
| scoring.js | `scoreShow(handCards[4], fifthCard, {isCrib=false})` → `{total, breakdown:[{type,cards,points}]}` (type ∈ `fifteen`\|`pair`\|`run`\|`flush`\|`nobs`) ; `heels(fifthCard)` → 0\|2 | cards | ✅ Phase 1 |
| deck.js | `createDeck()` → `Card[52]` ordonné ; `shuffle(deck, rng=Math.random)` → nouveau `Card[52]` ; `dealRegular(deck)` → `{hands:{dealer:Card[6],pone:Card[6]}, stock:Card[40]}` ; `cut(stock, rng=Math.random)` → `{starter:Card, stock:Card[n-1]}` ; `dealQualifRound(deck)` → `{visible:Card[4], hidden:Card, stock:Card[n-5]}` ; `allDistinct(cards)` → bool | cards | ✅ Phase 2 |
| pegging.js | `createPegging(order, hands)`, `legalPlay()`, `playCard()`, `sayGo()`, `isComplete()` | cards | MVP (régulier) |
| game-engine.js | `createGame({variant, players, rng, options})`, `reduce(state, action)` | cards, scoring, deck, pegging | MVP (régulier + Qualif) |
| track.js | `createTrack(config)`, `placePegs()`, `legalMoves()`, `applyMove()`, `draft()`, `checkWin()` | config seule | V2 différé |

Notes d'implémentation :
- Toutes les fonctions `deck.js` sont **pures** : copie systématique, l'entrée n'est jamais mutée.
- `cut()` sert au starter régulier **et** à la carte universelle Qualif (appliquée au paquet
  de 32 cartes restant après les 4 manches). Pas de fonction dédiée.
- `dealRegular` : distribution **alternée** traditionnelle (`pone` = `deck[0,2,4,6,8,10]`,
  `dealer` = `deck[1,3,5,7,9,11]`), l'appelant passe un paquet déjà mélangé.
- `dealQualifRound` = **primitive de tirage d'une manche** uniquement. Le placement des 4
  cartes visibles dans les colonnes (décision du joueur, plafond 4/colonne) et
  l'orchestration des 4 manches relèvent de `game-engine.js`.
- `scoreShow` : `handCards` doit contenir exactement 4 cartes (garde-fou → throw) ;
  les `Card` du `breakdown` sont les références reçues (aucune copie).
- `breakdown` ordonné : `fifteen → pair → run → flush → nobs`.

Phases game-engine :
- **régulier** : `deal → discard → cut → pegging → counting → (next deal | gameOver@121)`
- **Qualif** : `qualifRound ×4 (place 4 / crib 1) → cut universal → count 5 hands → finalScore`
- **Course (V2)** : `deal → pegging → counting → track → (next deal | gameOver@bouclage)`

---

## Points ouverts

| # | Point | Statut |
|---|---|---|
| 1 | Crib en qualif | RÉSOLU — 4 cartes cachées invisibles, versées automatiquement, comptées normalement avec la carte universelle (5e carte du crib) |
| 2 | Égalité de score en Qualif → départage | OUVERT — rng, ou position partagée sur la grille ? (n'impacte que la Course V2) |
| 3 | Mode régulier 1v1 maintenu/abandonné | RÉSOLU — maintenu, MVP |
| 4 | Phasage d'implémentation | REFORMULÉ — MVP = régulier + Qualif uniquement (`scoring` → `deck` → `pegging` → `game-engine`). Track + Course = hors scope immédiat, V2 |

---

## Hors scope (V2+, TODO.md)
La Course à 12 joueurs + piste 3 voies (`track.js`, effet Valet-draft, pegging par position) ·
comptes joueurs · ligues / tournois / classement · niveaux liés à des pistes différentes ·
personnalisation pions · multijoueur en ligne · backend (BDD/auth/matchmaking) ·
NPC / IA avancée · plusieurs tours & pistes par niveau de difficulté

---

## Changements v2.1
- **Phase 1 livrée** : `js/cards.js` (`cardValue`, `cardId`, `SUITS`, `RANKS`) +
  `js/scoring.js` (`scoreShow`, `heels`) + `tests/scoring.test.js` (12 cas verts).
- **Phase 2 livrée** : `js/deck.js` (`createDeck`, `shuffle`, `dealRegular`, `cut`,
  `dealQualifRound`, `allDistinct`) + `tests/deck.test.js` (9 cas verts).
- `dealQualifRound` tranché : **primitive de tirage par manche** (`{visible[4], hidden, stock}`),
  placement + orchestration renvoyés à `game-engine.js`.
- `deck.js` : ajout de `allDistinct(cards)` (contrôle de cohérence, utile aux tests et au futur engine).
- `package.json` ajouté (`"type": "module"`, script test avec glob explicite).
- Repo : RULES.md / ARCHITECTURE.md / TODO.md / README.md retirés du versionnement —
  le sysmap devient la doc de conception unique.
- Signatures réelles reportées dans la table Modules & API ; statuts ✅ Phase 1 / Phase 2.
- Points ouverts inchangés (#2 départage égalité Qualif toujours ouvert, sans impact MVP).

## Changements v2.0
- **Pivot majeur du mode Qualif** : n'est plus une donne chinoise à 12 joueurs mais un
  **solitaire solo à 4 colonnes** — 4 manches, 5 cartes/manche (4 placées librement + 1 au
  crib caché), puis coupe pour carte universelle, comptage des 5 mains, score = somme.
- **La Course à 12 joueurs passe en V2 différé** — conservée intégralement dans le sysmap,
  étiquetée différée, alimentée par le classement Qualif. Retirée du scope immédiat.
- **Mode régulier 1v1 confirmé MVP** — retrait de la mention « statut à confirmer ».
- Points ouverts #1 et #3 résolus ; #4 reformulé pour le scope MVP ; #2 reste ouvert.
- `deck.js` : ajout de `dealQualifRound(deck)`.
- `track.js` : marqué V2 différé, retiré de l'ordre d'implémentation immédiat.
- Ordre MVP figé : cards → scoring → deck → pegging → game-engine.

## Changements v1.0
- Création initiale
- Fige le modèle de jeu consolidé lors de la session de cadrage protocode
- Réponses verrouillées : ES modules, RNG injectable, node --test, donne de course
  (13×4 + universelle), effet Valet draft (meneur inclus), déplacement semi-auto,
  grille voies extérieures packées, muggins sans auto-réclamation
