// Phase de pose (le "pegging") pour RaceCribbage.
//
// Deux modes, choisis a la creation via `options.mode` :
//
//   - 'regular' (defaut) : cribbage 1v1 classique. Comportement historique
//     inchange. Prevu pour 2 joueurs, pose alternee.
//
//   - 'course' : pegging de la Course RaceCribbage, 2 a 12 joueurs. Meme
//     comptage que 'regular'. En plus : un joueur ayant epuise sa main reste
//     dans la rotation et marque automatiquement 1 point plancher a chaque
//     fois que le tour repasse sur lui (evenement `autoFloor`), jusqu'a ce que
//     TOUTES les mains soient vides -- y compris a travers plusieurs remises a
//     0 sur "31 pile" ou "go".
//
// Regles de comptage, communes aux deux modes (voir sysmap-racecribbage.md
// section 3, et le pivot v2.2) :
//   - cumul des valeurs (As=1 ... figures=10), jamais > 31 ;
//   - un joueur sans coup legal dit "go" (sayGo) ;
//   - points de la carte posee = combinaisons reelles completees :
//       15 -> 2 ; paire -> 2 / brelan -> 6 / carre -> 12 ;
//       suite -> 1 pt/carte pour les K dernieres cartes (K >= 3) de rangs
//                consecutifs distincts, quel que soit l'ordre de pose ;
//     + bonus de fin de sequence :
//       "31 pile" -> 2 (remplace le "go", s'ajoute aux combinaisons) ;
//       "go"      -> 1 a la derniere carte posee quand plus personne ne peut
//                    alimenter le cumul ;
//     + PLANCHER : si une carte ne declenche RIEN (0 combinaison, pas de "go",
//       pas de 31), elle rapporte quand meme 1 pt (filet, jamais cumule).
//   - relance apres "go" ou "31 pile" (les DEUX modes) : le prochain a ouvrir
//     le cumul a 0 est le joueur SUIVANT DANS L'ORDRE INITIAL apres celui qui
//     a ferme la sequence -- index (i + 1) % N. Les joueurs sans carte sont
//     sautes (en 'course' ils marquent leur plancher auto au passage), donc la
//     reouverture revient toujours a un joueur qui a effectivement une carte.
//     A 2 joueurs c'est l'autre joueur : 'regular' identique a l'historique.
//   - fin de la phase quand toutes les mains sont vides.
//
// `state.lastEvent` = dernier evenement issu d'une action de l'appelant
// ('play' ou 'go'). Les evenements passifs 'autoFloor' du mode Course sont
// ajoutes a `state.log` mais ne deviennent jamais `lastEvent`, pour que
// l'appelant retrouve toujours sur `lastEvent` le resultat de la carte qu'il
// vient de poser (dont `pointKind`).
//
// L'ORDRE des joueurs est fourni par l'appelant (position sur la piste, ou
// classement de qualification pour la 1re manche). pegging.js ne le calcule
// jamais.
//
// Module pur : chaque fonction copie l'etat recu et ne le mute jamais. Aucun
// RNG, aucun acces DOM. Les objets Card de `pile` / `log` sont les references
// d'origine.

import { cardValue } from './cards.js';

/**
 * @typedef {'regular' | 'course'} PeggingMode
 * @typedef {{ rank: number, suit: string }} Card
 * @typedef {{ type: string, points: number }} ScoreEntry
 * @typedef {{
 *   action: 'play' | 'go' | 'autoFloor',
 *   player: string,
 *   card: Card | null,
 *   count: number,
 *   points: number,
 *   breakdown: ScoreEntry[],
 *   pointKind: 'real' | 'floor' | null
 * }} PlayEvent
 * @typedef {{
 *   order: string[],
 *   mode: PeggingMode,
 *   hands: Record<string, Card[]>,
 *   turn: string,
 *   count: number,
 *   pile: { player: string, card: Card }[],
 *   saidGo: string[],
 *   scores: Record<string, number>,
 *   log: PlayEvent[],
 *   lastEvent: PlayEvent | null,
 *   complete: boolean
 * }} PeggingState
 */

const MODES = ['regular', 'course'];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 12;

/**
 * Cree l'etat initial d'une phase de pose.
 *
 * @param {string[]} order  2 a 12 identifiants distincts ; `order[0]` ouvre
 * @param {Record<string, Card[]>} hands  une main par identifiant, meme taille non nulle
 * @param {{ mode?: PeggingMode }} [options]  `mode` : 'regular' (defaut) ou 'course'
 * @returns {PeggingState}
 */
export function createPegging(order, hands, options = {}) {
  if (
    !Array.isArray(order) ||
    order.length < MIN_PLAYERS ||
    order.length > MAX_PLAYERS
  ) {
    throw new Error(
      `createPegging : order doit lister de ${MIN_PLAYERS} a ${MAX_PLAYERS} joueurs`,
    );
  }
  if (new Set(order).size !== order.length) {
    throw new Error('createPegging : les identifiants de joueurs doivent etre distincts');
  }

  const mode = options.mode ?? 'regular';
  if (!MODES.includes(mode)) {
    throw new Error(`createPegging : mode inconnu "${mode}"`);
  }

  for (const id of order) {
    if (!Array.isArray(hands?.[id])) {
      throw new Error(`createPegging : main manquante ou invalide pour "${id}"`);
    }
  }
  const handSize = hands[order[0]].length;
  if (handSize === 0 || order.some((id) => hands[id].length !== handSize)) {
    throw new Error('createPegging : toutes les mains doivent avoir la meme taille non nulle');
  }

  return {
    order: [...order],
    mode,
    hands: Object.fromEntries(order.map((id) => [id, [...hands[id]]])),
    turn: order[0],
    count: 0,
    pile: [],
    saidGo: [],
    scores: Object.fromEntries(order.map((id) => [id, 0])),
    log: [],
    lastEvent: null,
    complete: false,
  };
}

/**
 * Cartes que le joueur courant peut legalement poser (cumul <= 31).
 * Tableau vide si la phase est terminee ou si le joueur ne peut pas jouer
 * (il doit alors annoncer "go" via sayGo).
 *
 * @param {PeggingState} state
 * @returns {Card[]}
 */
export function legalPlays(state) {
  if (state.complete) return [];
  return playableCards(state.hands[state.turn], state.count);
}

/**
 * Le joueur courant pose une carte de sa main.
 *
 * @param {PeggingState} state
 * @param {Card} card  reference exacte d'une carte de la main du joueur courant
 * @returns {PeggingState} nouvel etat ; `lastEvent.pointKind` vaut 'real'
 *   (combinaison / go / 31), 'floor' (plancher pur) ou null (aucun point).
 */
export function playCard(state, card) {
  if (state.complete) {
    throw new Error('playCard : la phase de pose est terminee');
  }
  const player = state.turn;
  const hand = state.hands[player];
  const index = hand.indexOf(card);
  if (index === -1) {
    throw new Error('playCard : la carte n est pas dans la main du joueur courant');
  }
  if (state.count + cardValue(card) > 31) {
    throw new Error('playCard : la carte ferait depasser 31');
  }

  const next = cloneState(state);
  next.hands[player] = hand.slice(0, index).concat(hand.slice(index + 1));
  next.count += cardValue(card);
  next.pile = next.pile.concat({ player, card });

  const breakdown = scoreCombos(next.pile, next.count);
  const combos = totalPoints(breakdown);

  let closed = false;
  let pointKind;
  if (next.count === 31) {
    breakdown.push({ type: 'thirtyOne', points: 2 });
    closed = true;
    pointKind = 'real';
  } else if (countIsDead(next)) {
    // Plus personne ne peut alimenter le cumul : on ferme sans exiger de sayGo.
    breakdown.push({ type: 'go', points: 1 });
    closed = true;
    pointKind = 'real';
  } else if (combos === 0) {
    breakdown.push({ type: 'floor', points: 1 });
    pointKind = 'floor';
  } else {
    pointKind = 'real';
  }

  const points = totalPoints(breakdown);
  next.scores[player] += points;
  recordEvent(next, {
    action: 'play',
    player,
    card,
    count: next.count,
    points,
    breakdown,
    pointKind,
  });

  if (closed) resetCount(next);
  advanceTurnFrom(next, player);
  next.complete = next.complete || allHandsEmpty(next);
  return next;
}

/**
 * Le joueur courant annonce "go" (il a des cartes mais aucun coup legal).
 *
 * @param {PeggingState} state
 * @returns {PeggingState} nouvel etat
 */
export function sayGo(state) {
  if (state.complete) {
    throw new Error('sayGo : la phase de pose est terminee');
  }
  const player = state.turn;
  if (state.hands[player].length === 0) {
    throw new Error('sayGo : le joueur courant n a plus de cartes');
  }
  if (playableCards(state.hands[player], state.count).length > 0) {
    throw new Error('sayGo : le joueur courant peut encore jouer');
  }

  const next = cloneState(state);
  if (!next.saidGo.includes(player)) {
    next.saidGo = next.saidGo.concat(player);
  }

  if (countIsDead(next)) {
    // Plus personne ne peut repondre : la sequence se ferme, 1 pt "go" a la
    // derniere carte posee.
    const lastPlayer = next.pile[next.pile.length - 1].player;
    next.scores[lastPlayer] += 1;
    recordEvent(next, {
      action: 'go',
      player: lastPlayer,
      card: null,
      count: next.count,
      points: 1,
      breakdown: [{ type: 'go', points: 1 }],
      pointKind: 'real',
    });
    resetCount(next);
    advanceTurnFrom(next, lastPlayer);
  } else {
    recordEvent(next, {
      action: 'go',
      player,
      card: null,
      count: next.count,
      points: 0,
      breakdown: [],
      pointKind: null,
    });
    advanceTurnFrom(next, player);
  }

  next.complete = next.complete || allHandsEmpty(next);
  return next;
}

/**
 * @param {PeggingState} state
 * @returns {boolean} vrai quand toutes les mains sont vides
 */
export function isComplete(state) {
  return state.complete;
}

// --- Comptage runtime ------------------------------------------------------

/**
 * Combinaisons reelles completees par la derniere carte de la pile.
 * N'inclut ni "31 pile", ni "go", ni le plancher (geres par playCard).
 *
 * @param {{ player: string, card: Card }[]} pile
 * @param {number} count
 * @returns {ScoreEntry[]}
 */
function scoreCombos(pile, count) {
  const cards = pile.map((entry) => entry.card);
  const breakdown = [];

  if (count === 15) {
    breakdown.push({ type: 'fifteen', points: 2 });
  }

  // Paires : cartes de meme rang en fin de pile, sans interruption.
  const lastRank = cards[cards.length - 1].rank;
  let sameRank = 0;
  for (let i = cards.length - 1; i >= 0 && cards[i].rank === lastRank; i--) {
    sameRank++;
  }
  if (sameRank === 2) breakdown.push({ type: 'pair', points: 2 });
  else if (sameRank === 3) breakdown.push({ type: 'pairRoyal', points: 6 });
  else if (sameRank >= 4) breakdown.push({ type: 'doublePairRoyal', points: 12 });

  // Suite : plus grand suffixe (K >= 3) de rangs consecutifs distincts.
  for (let k = cards.length; k >= 3; k--) {
    const ranks = cards.slice(cards.length - k).map((c) => c.rank);
    if (new Set(ranks).size !== k) continue;
    if (Math.max(...ranks) - Math.min(...ranks) === k - 1) {
      breakdown.push({ type: 'run', points: k });
      break;
    }
  }

  return breakdown;
}

// --- Utilitaires ---------------------------------------------------------

function playableCards(hand, count) {
  return hand.filter((card) => count + cardValue(card) <= 31);
}

/** `id` ne peut pas alimenter le cumul : main vide, "go" deja dit, ou aucun coup legal. */
function cannotPlay(state, id) {
  return (
    state.hands[id].length === 0 ||
    state.saidGo.includes(id) ||
    playableCards(state.hands[id], state.count).length === 0
  );
}

/** Plus aucun joueur ne peut alimenter le cumul courant (et au moins une carte est posee). */
function countIsDead(state) {
  return state.pile.length > 0 && state.order.every((id) => cannotPlay(state, id));
}

function allHandsEmpty(state) {
  return state.order.every((id) => state.hands[id].length === 0);
}

function totalPoints(breakdown) {
  return breakdown.reduce((sum, entry) => sum + entry.points, 0);
}

function resetCount(state) {
  state.count = 0;
  state.pile = [];
  state.saidGo = [];
}

/** Mode Course : un joueur sans carte marque 1 point plancher automatique (evenement passif). */
function autoFloor(state, id) {
  state.scores[id] += 1;
  state.log = state.log.concat({
    action: 'autoFloor',
    player: id,
    card: null,
    count: state.count,
    points: 1,
    breakdown: [{ type: 'floor', points: 1 }],
    pointKind: 'floor',
  });
}

/**
 * Place `state.turn` sur le prochain joueur actionnable a partir de `fromId`
 * (exclu), dans l'ordre initial et cycliquement. Un joueur actionnable a
 * encore des cartes et n'a pas dit "go" pour ce cumul.
 *
 * Les joueurs sans carte croises en chemin sont sautes ; en mode 'course' ils
 * marquent 1 plancher automatique au passage, tant que la manche n'est pas
 * finie. Sert aussi bien a l'alternance normale qu'a la reouverture du cumul
 * apres une fermeture (jamais de reouverture par un joueur sans carte).
 *
 * Si plus aucune main n'a de carte, la phase est marquee terminee.
 *
 * @param {PeggingState} state
 * @param {string} fromId
 */
function advanceTurnFrom(state, fromId) {
  const n = state.order.length;
  const start = state.order.indexOf(fromId);
  for (let step = 1; step <= n; step++) {
    const id = state.order[(start + step) % n];
    if (state.hands[id].length === 0) {
      if (state.mode === 'course' && !allHandsEmpty(state)) autoFloor(state, id);
      continue;
    }
    if (state.saidGo.includes(id)) continue;
    state.turn = id;
    return;
  }
  if (allHandsEmpty(state)) {
    state.complete = true;
    return;
  }
  // Tous les autres joueurs sont bloques ou ont dit "go" : `fromId` reprend la main.
  state.turn = fromId;
}

function recordEvent(state, event) {
  state.log = state.log.concat(event);
  state.lastEvent = event;
}

function cloneState(state) {
  return {
    order: [...state.order],
    mode: state.mode,
    hands: Object.fromEntries(state.order.map((id) => [id, [...state.hands[id]]])),
    turn: state.turn,
    count: state.count,
    pile: state.pile.map((entry) => ({ player: entry.player, card: entry.card })),
    saidGo: [...state.saidGo],
    scores: { ...state.scores },
    log: state.log.slice(),
    lastEvent: state.lastEvent,
    complete: state.complete,
  };
}
