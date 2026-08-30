<!-- SYSMAP -->
# SYSMAP — RaceCribbage
Version : 2.5 | 2026-08-30
Cible : PWA JS pur (HTML/CSS/JS, ES modules), déploiement Netlify — PAS un Cloudflare Worker

---

## Statut global

Le concept canonique est **RaceCribbage : une course de cribbage à 12 joueurs sur une piste à 3 voies**.
La Course n'est pas une V2 optionnelle : elle fait partie du produit principal.

Le projet comprend aussi une **qualification de type cribbage chinois**, jouée avec **au moins 4 colonnes + un cheapcrib de 4 cartes**. Le total le plus élevé obtient la position de départ la plus avancée.

Le cribbage régulier 1v1 n'est **pas un mode produit prioritaire**. Les modules déjà développés à partir du cribbage régulier sont conservés comme briques techniques, références de scoring et base de tests. Un autre format pourra éventuellement servir un futur mode DragRace, mais ce point peut attendre.

### Implémentation réelle actuelle
- Phase 1 ✅ `cards.js` + `scoring.js` — 12 tests verts
- Phase 2 ✅ `deck.js` — 9 tests verts
- Phase 3 ✅ `pegging.js` — 23 tests verts, **actuellement limité à 2 joueurs**
- 44 tests verts au total (`node --test`)
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
│   └── pegging.js   ✅ moteur pegging 2 joueurs uniquement
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

## 2. Qualification — cribbage chinois

La qualification sert à déterminer l'ordre de départ de la Course.

### ÉTABLI

- Il s'agit du **cribbage chinois**.
- Chaque qualification utilise **au moins 4 colonnes** de cartes plus un crib.
- L'implémentation actuelle est basée sur **4 colonnes** ; l'éventuelle variation du nombre de colonnes peut être traitée plus tard.
- Le crib de qualification est un **cheapcrib : 4 cartes seulement**.
- Le total obtenu par chaque participant sert au classement de qualification.
- **Total le plus élevé = position la plus en avant sur la grille de départ.**

### Mécanique actuellement implémentée comme base de travail

`deck.js` contient déjà `dealQualifRound(deck)` :
- 4 cartes visibles ;
- 1 carte cachée ;
- paquet restant.

Le modèle existant de 4 manches permettant d'obtenir 4 colonnes de 4 cartes + 4 cartes de crib peut être conservé comme base, mais doit respecter la règle canonique suivante :

> **Le cheapcrib est compté avec ses 4 cartes seulement. La carte universelle n'est pas ajoutée au crib comme cinquième carte.**

La carte universelle peut servir de 5e carte aux colonnes selon la logique de cribbage chinois déjà retenue ; son intégration exacte dans le moteur doit être vérifiée lors de l'adaptation de `scoring.js` / `game-engine.js`.

### PROVISOIRE / à préciser plus tard

- départage d'égalité en qualification ;
- nombre de colonnes supérieur à 4 ;
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
- le pivot actuel de **plancher 1 point par carte lorsqu'aucune combinaison ne marque** est conservé comme règle de travail, sauf révision ultérieure explicite ;
- les détails exacts du `go`, de la remise à zéro et de l'ouverture du cumul suivant à 12 joueurs restent à formaliser dans le projet de développement.

### Comptage des mains

- chaque joueur compte ses 4 cartes avec la carte universelle ;
- le crib est compté séparément en **cheapcrib de 4 cartes seulement** ;
- ordre de comptage : selon l'ordre de piste ;
- le crib est compté en dernier par le donneur ;
- donneur suivant : joueur en dernière position après le comptage des 12 mains, sous réserve de définir le premier donneur de la première manche.

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

### ÉTABLI

- la qualification produit un score pour chaque participant ;
- classement décroissant ;
- **score le plus élevé = départ le plus en avant** ;
- les pions sont initialement placés sur les voies extérieures, regroupés près de la ligne de départ.

### PEUT ATTENDRE

- alternance exacte entre voie extérieure haute et basse ;
- position exacte de la pole ;
- départage des égalités.

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

La règle détaillée des combinaisons applicables au cheapcrib doit être explicitée dans le moteur sans réintroduire implicitement les règles du crib standard à 5 cartes.

---

# Modules & état technique

| Module | État réel | Conséquence pour RaceCribbage |
|---|---|---|
| `cards.js` | ✅ implémenté | réutilisable |
| `scoring.js` | ✅ implémenté pour scoring standard 4+5e | à adapter pour cheapcrib 4 cartes |
| `deck.js` | ✅ implémenté | ajouter donne Course 13×4 ; conserver/adapt. Qualif |
| `pegging.js` | ✅ 2 joueurs uniquement | généralisation ou moteur dédié 12 joueurs nécessaire |
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

## BLOQUANT AVANT IMPLÉMENTATION DES SOUS-SYSTÈMES CONCERNÉS

1. **Pegging à 12 joueurs** : règle exacte du `go`, de la fermeture d'une séquence et du joueur qui ouvre la suivante.
2. **Cheapcrib 4 cartes** : préciser exactement les règles de flush/nobs et toute différence de scoring par rapport à une main normale.
3. **Déplacement multi-points** : résolution lorsqu'un joueur marque plusieurs points avec obstacles et possibilités diagonales.
4. **Points non dépensables** : perdus, reportés ou autre comportement.

Ces questions n'empêchent pas de conserver les briques existantes ; elles doivent être tranchées avant de coder les modules concernés.

## PEUT ATTENDRE

- départage des égalités de qualification ;
- premier donneur de la première manche ;
- répartition exacte de la grille entre les deux voies extérieures ;
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
