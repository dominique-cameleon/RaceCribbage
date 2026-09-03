# TODO — RaceCribbage

Backlog technique et dette. Ne contient pas de règles (voir RULES.md) ni d'état structurel détaillé (voir sysmap-racecribbage.md).

## Dette technique connue

`dealQualifRound` (js/deck.js) et `scoreShow` (js/scoring.js) supposent l'ancien modèle Qualif (distribution par round/colonne, 5 mains scorées). Le modèle canonique (RULES.md §2) est une grille 4×4 à distribution séquentielle de 20 cartes, positions %5==0 → crib, 9 mains scorées (4 rangées + 4 colonnes + crib). Réécriture complète nécessaire, pas une simple généralisation.

## Prochaines tâches (ordre logique)

1. Réécrire `dealQualifRound` + `scoreShow` pour le modèle grille 4×4 (9 mains)
2. Implémenter `dealRace` (primitive de distribution 13×4)
3. Construire `track.js` (géométrie, adjacences, effet Valet-draft, algorithme de déplacement en ligne droite, chicane de départ 4 voies)
4. `game-engine.js` — orchestration Qualif + Course
5. UI plateau + main — inclure le tracé du chemin de déplacement (ligne/couleur) lors du choix de destination
6. Stats — tracker les points perdus pour blocage total
7. Déploiement Netlify (premier build)

## Différé (V2+, ne pas coder maintenant)

- Comptes joueurs
- Ligues / tournois / classement
- Niveaux / paliers de difficulté (débutant, prospect, intermédiaire, pro...)
- Personnalisation des pions (voitures, équipes)
- Multijoueur en ligne (12 joueurs connectés)
- Backend (BDD + auth + matchmaking)
