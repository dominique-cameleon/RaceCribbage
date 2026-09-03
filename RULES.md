# Règles — RaceCribbage

**Version 13** — 1 septembre 2026 (Clarification pegging Régulier — le point plancher, déjà en prod dans `pegging.js` sous le nom "pivot v5", n'avait jamais été documenté ici. Découvert lors de la revue CC de la généralisation N joueurs.)

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
- **Point plancher (v13 — comportement en prod depuis "pivot v5", documenté ici pour la première fois)** : une carte jouée qui ne déclenche aucune combinaison marque quand même 1 point plancher ("faux"). Ne se cumule jamais avec une combinaison réelle, ni avec le go. Ce comportement est partagé avec le mode Course (§3) — ce n'est pas une règle exclusive à 12 joueurs, contrairement à ce qui avait été supposé lors du chantier de généralisation de `pegging.js`.
- Score de victoire : 121 pts

## 2. Qualif solo (pré-course) ✅ Validé

Mode solo, joué par chacun des 12 joueurs indépendamment. Alimente la grille de départ Course (§6). Modèle "grille 4×4" (Cribbage Squares) — distinct de la "grille de départ" du plateau Course (§6), qui est une notion différente malgré le nom similaire.

- Joueurs : 1 (solo), joué 12 fois (une fois par participant à la Course)
- **Grille de jeu 4×4** (16 cases), aucune contrainte d'adjacence entre cartes.
- **Distribution séquentielle** : 20 cartes révélées une à la fois, pas de notion de round.
  - Positions 1-4, 6-9, 11-14, 16-19 (16 cartes) : le joueur place librement chacune dans une case vide de son choix (ligne + colonne).
  - Positions 5, 10, 15, 20 (4 cartes) : automatiquement envoyées au crib, aucun choix du joueur.
- **Coupe finale** : une carte universelle est ajoutée comme 5e carte à chacune des 9 mains (4 rangées + 4 colonnes + crib).
- **Comptage** : standard (15 / paires / suites / flush / nobs) sur chaque main de 5 cartes.
- **Score final** = somme des 9 mains. Détermine la position de départ en Course (§6).

### Départage égalité Qualif (résolu — #8)
Deux joueurs à score final identique. Le départage s'applique **uniquement aux 4 colonnes** — les rangées et le crib ne sont jamais utilisés pour le départage (sauf mention contraire ci-dessous).

1. Retirer la colonne la plus haute + la colonne la plus basse + le crib. Comparer la somme des 2 colonnes médianes restantes. Le plus haut score gagne.
2. Égalité persiste → comparer la colonne la plus haute (celle exclue à l'étape 1). Le plus haut gagne.
3. Égalité persiste → comparer la colonne la plus basse (celle exclue à l'étape 1). Le plus haut gagne.
4. Égalité persiste → coupe du paquet, la carte la plus haute gagne.

### Premier donneur manche 1 Course (résolu — #7)
Le joueur en **dernière position sur la grille de départ Qualif** (§6) devient le donneur de la manche 1 de Course. C'est l'extension de la règle standard de rotation du donneur ("dernière position après comptage = prochain donneur", §3) appliquée au classement Qualif, en l'absence de manche de Course précédente pour établir ce classement autrement.

## 3. Cribbage chinois (variante — 12 joueurs) ✅ Validé

- Joueurs : 12
- Distribution : le paquet de 52 cartes est distribué en 13 mains de 4 cartes (12 joueurs + 1 main "crib"), aucune carte de côté. Pas de défausse : chaque joueur garde ses 4 cartes.
- Carte universelle : la dernière carte distribuée (4e carte du crib) — compte dans chaque main des 12 joueurs ET dans le crib au comptage.
- Comptage : identique au régulier (15 / paires / suites / flush / nobs) sur les 4 cartes + carte universelle
- **Comptage du crib** *(v7)* : le crib se compte sur ses **4 cartes telles quelles** — la carte universelle en fait partie nativement (c'est la 4e carte physiquement distribuée dans le crib), aucune reconstruction artificielle en "3 cartes réelles + universelle en 5e position" pour coller à la structure `hand4+fifthCard` du régulier. Flush crib = **4 pts** si les 4 cartes sont de la même couleur (contrairement au régulier où le crib exige 5 cartes assorties pour scorer un flush — ici 4 est le maximum physique du crib dans ce mode, la règle est transposée à ce plafond).
- **Muggins : sans objet** *(résolu — #9)* : le moteur (`scoreShow`/`scoreHand`, fonctions pures) calcule et affiche le score de chaque main automatiquement — aucune étape de déclaration manuelle par le joueur, donc aucune omission possible à réclamer. Contrairement au régulier (§1), où muggins reste actif. Rien à coder côté engine pour cette règle : son absence est le comportement par défaut.

- **Pegging — point réel vs point plancher ("faux")** *(v8, comportement partagé avec le Régulier — voir §1)* : à chaque tour de pegging, un joueur marque soit un **point réel** (15 = 2, paire = 2/6/12, suite = 1/carte, go = 1, 31 pile = 2), soit, à défaut, un **point plancher de 1 ("faux")**. Ce qui est **spécifique au mode Course** : le plancher ne s'arrête jamais avant la fin de la manche — un joueur ayant déjà joué ses 4 cartes avant la fin continue de marquer 1pt faux à chaque tour restant, jusqu'à ce que les 12 joueurs aient tous joué leurs 4 cartes (même à travers plusieurs remises à 0 sur 31 pile). C'est voulu, ça récompense de finir vite. *Cette continuation automatique post-main n'existe pas en Régulier — voir §1, la mécanique s'arrête naturellement quand un des 2 joueurs n'a plus de carte.*
- **Ordre de pegging** (avant la manche) : déterminé par la position sur la piste avant la manche — le 1er de la piste joue en premier, puis 2e, etc. Égalité de position (quinconce, voies différentes) → départagée par l'ordre de comptage des mains de la manche **précédente**. *Exception manche 1 : voir §2, "Premier donneur manche 1", le classement Qualif fait office de "manche précédente".*
- **Relance après "go" / 31** : le joueur **suivant dans l'ordre initial** de la manche relance le compte à 0 (pas le dernier à avoir joué). Équivalent au comportement Régulier à 2 joueurs (le seul autre joueur) — généralise sans rupture.
- **Joueur ayant joué ses 4 cartes avant la fin du pegging** : reste dans la manche, continue de marquer 1pt faux à chaque tour restant (voir plancher ci-dessus). La rotation de pegging (qui a une carte à jouer activement) continue entre joueurs actifs restants.
- **Règle "dernier arrivé avec point réel"** *(tie-break général, s'applique à la piste comme à l'ordre de comptage des mains)* : quand deux pions se retrouvent à égalité de position, seul un **point réel** déclenche la priorité — celui arrivé en dernier avec un point réel passe devant (simule un dépassement en cours). Le comptage de main est toujours considéré comme un point réel (le plancher n'existe qu'au pegging). Si les deux pions sont arrivés uniquement par point plancher (faux/faux), aucun dépassement n'est simulé — le pion déjà en place garde la priorité.
- **Ordre de comptage des mains** (après le pegging) : nouvelle position piste post-pegging, même règle de tie-break que ci-dessus ("dernier arrivé avec point réel").
- Donneur / crib : le joueur en **dernière position sur la piste après le comptage des 12 mains** devient le prochain donneur — il reçoit et compte le crib (compté en dernier, après les 12 mains individuelles). *Pour la manche 1, voir §2 "Premier donneur manche 1".*
- Effet Valet (remplace "his heels") : si la carte universelle est un Valet, tous les pions **directement collés (trou adjacent, sans écart) derrière un autre pion sur la même piste** avancent de 1 trou (effet draft façon course automobile). Le pion de tête du groupe ne bouge pas. Ne se déclenche que si la carte universelle est un Valet, une seule fois par manche.
- Score de victoire : 1 point marqué = 1 trou avancé (identique au régulier)

## 4. Tableau comparatif (Régulier vs Course)

*Ce tableau ne couvre pas Qualif solo (§2), qui n'a pas d'équivalent structurel direct côté Régulier.*

| Aspect | Régulier | Chinois (Course) |
|---|---|---|
| Joueurs | 2 | 12 |
| Cartes en main | 4 (+ starter) | 4 (+ carte universelle) |
| Crib | 2 défausses/joueur + starter (5 cartes) | 13e main distribuée, 4 cartes (universelle incluse nativement) |
| Pegging | Alternance stricte | Ordre = position piste, tie-break "dernier arrivé avec point réel" |
| Point plancher (non-combo) | Actif — 1 pt (v13) | Actif — 1 pt, identique |
| Plancher post-main (fini tôt) | N/A — la mécanique s'arrête, pas de continuation | Actif — continue jusqu'à la fin de la manche |
| Donneur | Alterne à chaque manche | Dernière position après comptage des 12 mains (manche 1 : voir §2) |
| Comptage combinaisons | 15/paires/suites/flush/nobs | Identique |
| Muggins | Activé (réclamation manuelle) | **Sans objet** — moteur auto-compte (#9) |
| Flush crib | 5 pts (exige 5 cartes assorties) | 4 pts (exige 4 cartes assorties — max physique) |
| "Valet" spécial | His heels = 2 pts au donneur | Draft collectif : pions collés avancent de 1 |
| Score de victoire | 121 pts | Boucler le parcours |

## 5. Mécanique "Race" (plateau) ✅ Validé — géométrie, dépassement, déplacement

- 3 pistes parallèles ; la piste du milieu est décalée d'un demi-pas par rapport aux 2 pistes extérieures, créant des trous adjacents en diagonale (motif quinconce)
- Dépassement : uniquement par changement de piste en diagonale vers un trou adjacent libre — jamais de saut par-dessus un pion (sauf effet Valet, §3)

**Algorithme de déplacement** *(v9)* :
- Un déplacement de N points progresse toujours vers l'avant — jamais de recul.
- À chaque pas, le pion change de voie en diagonale une seule voie à la fois (pas de saut de 2 voies dans le même pas). Une diagonale compte comme un pas d'avancement normal, pas un mouvement latéral gratuit.
- Un pas (même voie ou diagonale) n'est légal que si le trou visé est libre.
- Si plusieurs chemins distincts existent, mais qu'ils mènent à la **même** case finale → une seule option présentée au joueur. Le chemin réellement emprunté reste affiché visuellement (ligne ou trou de couleur différente) pour référence — *note UI, hors moteur pur*.
- Si plusieurs chemins mènent à des cases finales **différentes** → le joueur choisit sa destination parmi les options valides.

**Pion totalement bloqué (#4)** *(v9)* : si aucune destination valide n'existe pour les N points (bloqué sur les 3 voies), les points sont **perdus, sans compensation ni avancement partiel**. Cet événement est comptabilisé dans les statistiques de la manche — *note stats, hors moteur pur, voir TODO.md*.

- Piste avec courbes, nombre de trous différent entre courbe intérieure et courbe extérieure (comme une piste d'athlétisme)
- Victoire : boucler le parcours complet (pas un score fixe comme 121)

**[Ouvert / non-bloquant]** Piste à courbes : reporté à un chantier séparé. Le moteur de base (algorithme de déplacement, #3/#4) est développé et testé en ligne droite (nombre de trous identique sur les 3 voies) en premier.

**[Ouvert / non-bloquant]** Plusieurs tours et pistes différentes selon niveaux de difficulté — à définir dans une itération future, ne bloque pas le développement du moteur de base.

## 6. Grille de départ (Course) ✅ Résolu — v10

Chicane à **4 voies** juste avant la ligne de départ/arrivée (élargissement temporaire du tracé, pour loger les 12 pions sans provoquer de blocage/dépassement forcé dès le premier tour) :

- **Voie a** (extérieure gauche) — vide au départ, dépassement immédiat possible depuis les voies voisines.
- **Voie b** (centrale, décalée d'un demi-pas) — reçoit les rangs **pairs**.
- **Voie c** (extérieure droite) — reçoit les rangs **impairs**, c'est la voie la plus avancée (rang1 y est collé à la ligne).
- **Voie d** (temporaire, au-delà de c) — vide au départ, n'existe que sur 1 trou après la ligne.

**Répartition des rangs Qualif** (le classement vient de §2) : alternance stricte c/b, 6 rangs de profondeur derrière la ligne.
`rang1 → c1` (le plus avancé, collé à la ligne) · `rang2 → b1` · `rang3 → c2` · `rang4 → b2` · `rang5 → c3` · `rang6 → b3` · `rang7 → c4` · `rang8 → b4` · `rang9 → c5` · `rang10 → b5` · `rang11 → c6` · `rang12 → b6`.

**Fusion voie d → format 3 voies standard** : la voie d se prolonge d'**1 seul trou après la ligne**, puis disparaît. La fusion suit le dépassement diagonal classique (§5, mêmes règles que le reste de la piste — dépend de la disponibilité du trou visé sur la voie c). Si le trou de fusion est occupé au moment de le franchir : points perdus, aucune compensation (règle du pion totalement bloqué, §5/#4 — rien de nouveau à inventer, la règle générale s'applique telle quelle).

**Profondeur totale de la zone grille** : 6 rangs avant la ligne + 1 rang après = 7.

## 7. Mode(s) de jeu — OUVERT, bloquant
- [ ] Solo vs IA (impliquerait ~11 IA à 12 joueurs — à confirmer si pertinent)
- [ ] Local, pass-and-play (tous les joueurs sur le même appareil)
- [ ] En ligne (multijoueur réseau, 12 joueurs connectés)
