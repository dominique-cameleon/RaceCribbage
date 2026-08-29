# Règles — RaceCribbage

## 1. Cribbage régulier (référence) ✅ Validé
Version standard anglo-saxonne, 2 joueurs.

- Nombre de joueurs : 2
- Cartes distribuées / gardées : 6 distribuées, 4 gardées, 2 défaussées au crib
- Composition de la main et du crib : main = 4 cartes + starter (carte coupée) ; crib = 2 défausses de chaque joueur + starter, appartient au donneur
- Comptage (15, paires, suites, flush, nobs) :
  - 15 (toute combinaison sommant à 15) = 2 pts chacune
  - Paire = 2 pts, brelan = 6 pts, carré = 12 pts
  - Suite (3+ cartes consécutives) = 1 pt/carte
  - Flush = 4 pts en main, 5 pts si le starter est de la même couleur (crib exige les 5 cartes de la même couleur)
  - Nobs = 1 pt si Valet en main de la même couleur que le starter
  - His heels = 2 pts au donneur si le starter est un Valet
  - Muggins activé : un joueur peut réclamer les points oubliés par l'adversaire
- Pegging (phase de jeu carte par carte) : alternance, total cumulé max 31 ; points en jouant (15 = 2, 31 = 2, paires, suites, "go" = 1 pt / 31 pile = 2 pts)
- Score de victoire : 121 pts

## 2. Cribbage chinois (variante — 12 joueurs) ✅ Validé

- Joueurs : 12
- Distribution : le paquet de 52 cartes est distribué en 13 mains de 4 cartes (12 joueurs + 1 main "crib"), aucune carte de côté. Pas de défausse : chaque joueur garde ses 4 cartes.
- Carte universelle : la dernière carte distribuée (4e carte du crib) — compte dans chaque main des 12 joueurs ET dans le crib au comptage.
- Comptage : identique au régulier (15 / paires / suites / flush / nobs) sur les 4 cartes + carte universelle
- Ordre de jeu (pegging) : déterminé par la position sur la piste avant la manche — le 1er de la piste joue en premier, puis 2e, etc.
- Donneur / crib : le joueur en **dernière position sur la piste après le comptage des 12 mains** devient le prochain donneur — il reçoit et compte le crib (compté en dernier, après les 12 mains individuelles)
- Effet Valet (remplace "his heels") : si la carte universelle est un Valet, tous les pions **directement collés (trou adjacent, sans écart) derrière un autre pion sur la même piste** avancent de 1 trou (effet draft façon course automobile). Le pion de tête du groupe ne bouge pas. Ne se déclenche que si la carte universelle est un Valet, une seule fois par manche.
- Score de victoire : 1 point marqué = 1 trou avancé (identique au régulier)

## 3. Tableau comparatif

| Aspect | Régulier | Chinois |
|---|---|---|
| Joueurs | 2 | 12 |
| Cartes en main | 4 (+ starter) | 4 (+ carte universelle) |
| Crib | 2 défausses/joueur + starter | 13e main distribuée (pas de défausse) |
| Pegging | Alternance stricte | Ordre = position sur piste (1er joue en 1er) |
| Donneur | Alterne à chaque manche | Dernière position après comptage des 12 mains |
| Comptage combinaisons | 15/paires/suites/flush/nobs/muggins | Identique |
| "Valet" spécial | His heels = 2 pts au donneur | Draft collectif : pions collés avancent de 1 |
| Score de victoire | 121 pts | Boucler le parcours |

## 4. Mécanique "Race" (plateau) ✅ Validé — géométrie et dépassement

- 3 pistes parallèles ; la piste du milieu est décalée d'un demi-pas par rapport aux 2 pistes extérieures, créant des trous adjacents en diagonale (motif quinconce)
- Dépassement : uniquement par changement de piste en diagonale vers un trou adjacent libre — jamais de saut par-dessus un pion (sauf effet Valet, §2)
- Piste avec courbes, nombre de trous différent entre courbe intérieure et courbe extérieure (comme une piste d'athlétisme)
- Victoire : boucler le parcours complet (pas un score fixe comme 121)

**[Ouvert / non-bloquant]** Plusieurs tours et pistes différentes selon niveaux de difficulté — à définir dans une itération future, ne bloque pas le développement du moteur de base.

## 5. Mode(s) de jeu — OUVERT, bloquant
- [ ] Solo vs IA (impliquerait ~11 IA à 12 joueurs — à confirmer si pertinent)
- [ ] Local, pass-and-play (tous les joueurs sur le même appareil)
- [ ] En ligne (multijoueur réseau, 12 joueurs connectés)
