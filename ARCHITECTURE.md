# Architecture technique — RaceCribbage

## Stack
- Frontend : HTML/CSS/JS pur (PWA)
- Zéro framework (contrainte bootstrap)
- Service worker : cache offline
- Déploiement : Netlify

## Plateforme cible ✅ Validé
PWA installable — mobile (Android/iOS) et desktop.

## Portée MVP vs vision long terme
- **MVP (à coder maintenant)** : moteur de jeu (régulier + chinois) + plateau 3 pistes, mode hotseat local (12 joueurs sur le même appareil) ou NPC pour compléter une table. Zéro backend, zéro compte — reste dans le bootstrap pur.
- **V2+ (hors scope actuel)** : comptes joueurs, ligues, tournois, classement, personnalisation (pions/équipes), multijoueur en ligne 12 joueurs. Nécessite backend (BDD + auth + matchmaking) — casse la contrainte bootstrap pur, à traiter comme projet séparé une fois le moteur stable.
- Le split `game-engine.js` / UI protège justement cette transition : le moteur de scoring/pistes ne change pas selon hotseat ou en ligne.

## Modules prévus
- `game-engine` — règles, scoring, pegging (indépendant de l'UI, testable seul)
- `ui` — plateau, main, board de pegging
- `modes` — solo/IA, local, en ligne (selon réponse RULES.md §5)

## Structure de fichiers proposée
```
RaceCribbage/
├── README.md
├── RULES.md
├── ARCHITECTURE.md
├── TODO.md
├── index.html
├── manifest.json          (PWA)
├── service-worker.js
├── /js
│   ├── game-engine.js      (règles + scoring, sans DOM)
│   ├── game-engine.test.js (si tests)
│   ├── ui.js
│   ├── state.js
│   └── modes/
├── /css
│   └── style.css
└── /assets
    └── cards/
```

## Principe de conception
Moteur de jeu (`game-engine.js`) totalement séparé de l'UI.
→ Permet de coder et valider les règles régulier/chinois sans UI,
avant de brancher l'affichage.

## Workflow de développement
1. Chat Claude (ce projet) — RULES.md / ARCHITECTURE.md validés ici
2. `/cc-prompt` — génère le prompt de kickoff pour Claude Code à partir des .md
3. Claude Code, en local (`C:\CockpitsProjets\RaceCribbage`) — écrit le code
4. Test en local (navigateur / serveur local) avant tout commit
5. VS Code — commit + push vers GitHub
6. Netlify — déploiement, une fois le jeu stable (pas à l'étape actuelle)

## État
🚧 Rien codé — bloqué sur validation de `RULES.md`.
