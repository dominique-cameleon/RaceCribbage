<!-- SYSMAP -->
# SYSMAP — RaceCribbage
Version : 1.0 | 2026-08-29
Cible : PWA JS pur (HTML/CSS/JS, ES modules), déploiement Netlify — PAS un Cloudflare Worker

---

## Statut global
Conception validée, implémentation non démarrée.
Commit repo : d020943 (docs initiaux uniquement).
Ce sysmap fige le modèle de jeu v1 issu de la session de cadrage (protocode).

---

## Arborescence

### Actuelle
```
RaceCribbage/
├── README.md
├── RULES.md          §1 régulier · §2 chinois · §3 comparatif · §4 mécanique piste
├── ARCHITECTURE.md   stack PWA, modules, structure fichiers
├── TODO.md           bloquants (tous cochés) · V2+ hors scope
└── sysmap-racecribbage.md
```

### Cible (à créer)
```
RaceCribbage/
├── js/
│   ├── cards.js        modèle carte + valeurs
│   ├── scoring.js      comptage pur 5 cartes (commun)
│   ├── deck.js         shuffle(rng) · dealChinese · dealRegular · cut
│   ├── track.js        géométrie 3 voies config · adjacences · applyMove · draft · checkWin
│   ├── pegging.js      séquence de pose · legalPlay · playCard · go · comptage runtime
│   └── game-engine.js  createGame + reduce(state, action) + phases
├── tests/
│   ├── scoring.test.js · deck.test.js · track.test.js · pegging.test.js · game-engine.test.js
├── index.html · manifest.json · service-worker.js   (phase UI, plus tard)
└── css/ · assets/cards/
```

---

## Dépendances
- Runtime : ES modules natifs — navigateur + Node 18+, PAS de bundler
- Zéro dépendance externe (contrainte bootstrap)
- Tests : `node --test` (natif), un fichier par module
- RNG : injectable en paramètre, défaut `Math.random` (déterminisme des tests)
- Nommage : camelCase, identifiants anglais, commentaires français
- Conception : fonctions pures `(état, action) → nouvel état`, aucun accès DOM/UI

---

## Modèle de jeu

### RaceCribbage = course à 12 joueurs sur piste 3 voies

#### Brique 1 — Qualification (« cribbage chinois »), one-shot
- Mélange 52 cartes (rng) → 13 mains de 4 (12 joueurs + 1 crib), aucune carte de côté
- Carte universelle = dernière carte distribuée (crib[3])
- Chaque joueur score : 4 cartes + carte universelle → 15 / paires / suites / flush 4 / nobs
- Mains ouvertes, PAS de pegging
- Classement par score décroissant → grille de départ
- Pions placés voies extérieures (0 et 2), packés sans écart depuis la ligne de départ,
  ordre = classement (meilleur score = pole)

#### Brique 2 — La Course (manches répétées jusqu'au bouclage)
Par manche :
1. Donne : 13 mains de 4 + carte universelle (dernière carte)
2. Pegging : ordre = position sur la piste (1er de la piste joue en 1er).
   Comptage runtime : 15=2, 31=2, paires, suites, go=1, dernière carte=1, max 31.
   Points → avancement immédiat du pion.
3. Comptage des mains dans l'ordre de piste ; crib scoré en dernier par le donneur.
4. Carte universelle = Valet → effet draft (§2), une seule fois par manche.
   REMPLACE his heels. Sinon : rien.
5. Points de comptage → avancement (voir Règles de déplacement).
6. Donneur suivant = dernière position de piste après comptage des 12 mains.
- Victoire : premier pion à boucler le parcours (track.checkWin).

#### Comptage de combinaisons (commun, scoring.js)
- 15 = 2 pts par combinaison sommant à 15
- Paire 2 / brelan 6 / carré 12 (par dénombrement des paires)
- Suite = 1 pt/carte × multiplicité
- Flush = 4 (les 4 cartes en main) / 5 (main + 5e carte) ; crib = 5 obligatoires
- Nobs = 1 pt si Valet en main de la couleur de la 5e carte
- His heels = 2 pts au donneur si 5e carte = Valet (mode régulier 1v1 uniquement)

#### Règles de déplacement sur piste (track.js)
- 1 point marqué = 1 trou avancé
- Avance dans sa propre voie
- Dépassement UNIQUEMENT par changement de voie en diagonale vers un trou adjacent libre
- Jamais de saut par-dessus un pion — SAUF effet Valet
- Semi-auto : obligation d'avancer au maximum de points disponibles ;
  si le résultat final présente 2-3 positions possibles → choix final au joueur
- Effet Valet-draft : tous les pions d'une chaîne collée (trous adjacents, sans écart,
  même voie) avancent de 1 trou, MENEUR INCLUS. Une seule fois par manche.
- Victoire = boucler le parcours complet (pas de score fixe)

#### Géométrie piste — track.js, 100 % config (zéro constante en dur)
| Paramètre | Défaut | Rôle |
|---|---|---|
| holesPerLap | 40 | trous par tour (voie de référence) |
| laneCount | 3 | nombre de voies |
| middleLane | 1 | index de la voie centrale (décalée) |
| stagger | 0.5 | décalage quinconce de la voie centrale (demi-pas) |
| curveExtra | 4 | trous supplémentaires voie extérieure par virage |
| curvesPerLap | 2 | nombre de virages par tour |
| laps | 1 | tours à boucler pour gagner |

### Mode régulier 1v1 (RULES.md §1) — statut : à confirmer
- 2 joueurs, plateau linéaire 121 trous (2×30 + trou final), pas de piste 3 voies
- Donne 6 → garde 4 / défausse 2 au crib · starter par coupe · pegging alterné
- his heels · muggins · victoire à 121
- OUVERT : ce mode est-il maintenu, ou abandonné au profit de la course ?

---

## Modules & API prévue

| Module | Exports prévus | Dépend de |
|---|---|---|
| cards.js | `Card{rank,suit}`, `cardValue()`, `cardId()` | — |
| scoring.js | `scoreShow(hand4, fifth, {isCrib})` → {total, breakdown[]}, `heels(fifth)` | cards |
| deck.js | `createDeck()`, `shuffle(deck, rng)`, `dealChinese(deck)`, `dealRegular(deck)`, `cut(stock, rng)` | cards |
| track.js | `createTrack(config)`, `placePegs()`, `legalMoves()`, `applyMove()`, `draft()`, `checkWin()` | config seule |
| pegging.js | `createPegging(order, hands)`, `legalPlay()`, `playCard()`, `sayGo()`, `isComplete()` | cards |
| game-engine.js | `createGame({variant, players, rng, trackConfig, options})`, `reduce(state, action)` | tous |

Phases game-engine : `deal → [discard] → [cut] → pegging → counting → track → (next deal | gameOver)`

---

## Points ouverts (non tranchés au 2026-08-29)
1. Crib en qualification : scoré/attribué, ou ignoré ?
2. Égalité de score en qualif : départage rng, ou position partagée ?
3. Mode régulier 1v1 (121) : maintenu ou abandonné ?
4. Phasage d'implémentation : tout d'un coup, ou scoring+deck+qualif d'abord puis course+track ?

---

## Hors scope (V2+, TODO.md)
Comptes joueurs · ligues / tournois / classement · niveaux liés à des pistes différentes ·
personnalisation pions · multijoueur en ligne · backend (BDD/auth/matchmaking) ·
NPC / IA avancée · plusieurs tours & pistes par niveau de difficulté

---

## Changements v1.0
- Création initiale
- Fige le modèle de jeu consolidé lors de la session de cadrage protocode
- Réponses verrouillées : ES modules, RNG injectable, node --test, donne de course
  (13×4 + universelle), effet Valet draft (meneur inclus), déplacement semi-auto,
  grille voies extérieures packées, muggins sans auto-réclamation
