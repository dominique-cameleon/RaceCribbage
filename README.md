# RaceCribbage

Cribbage à 12 joueurs sur piste à 3 voies (PWA, JS pur, zéro framework). Une 13e main sert de crib. Un mode Qualif solo (cribbage chinois, grille 4×4) détermine la grille de départ.

## Statut

Voir `sysmap-racecribbage.md` pour l'état d'implémentation réel (modules, tests, prochaines étapes).

## Règles

Voir `RULES.md` — source de vérité unique des règles du jeu.

## Backlog

Voir `TODO.md`.

## Développement

- Tests : `node --test "tests/**/*.test.js"`
- Prototype local : `tools/ouvrir-prototype.bat` (lance `py -m http.server` et ouvre le prototype de piste)

Node 18+. Zéro dépendance runtime, ES modules natifs.
