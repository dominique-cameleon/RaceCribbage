// Phase de pose (le "pegging") du mode regulier 2 joueurs.
//
// Regles (voir sysmap-racecribbage.md, section "Mode regulier 1v1" et le pivot
// de regle v2.2) :
//   - pose alternee, cumul des valeurs (As=1 ... figures=10), jamais > 31 ;
//   - un joueur sans coup legal dit "go" (sayGo) ; l'autre continue tant qu'il peut ;
//   - points d'une carte posee = combinaisons reelles completees :
//       15    -> 2
//       paire -> 2, brelan -> 6, carre -> 12  (cartes de meme rang en fin de pile)
//       suite -> 1 pt/carte pour les K dernieres cartes (K >= 3) de rangs
//                consecutifs distincts, quel que soit l'ordre de pose ;
//     + bonus de fin de sequence :
//       "31 pile" -> 2  (remplace le "go", s'ajoute aux combinaisons)
//       "go"      -> 1  a la derniere carte posee quand l'adversaire ne peut
//                       plus repondre et que le joueur ne peut plus continuer ;
//     + PLANCHER : si une carte ne declenche RIEN (0 combinaison, pas de "go",
//       pas de 31), elle rapporte quand meme 1 pt (filet, jamais cumule).
//   - remise a 0 du cumul apres un "31 pile" ou un double "go" ; le joueur qui
//     n'a PAS pose la derniere carte ouvre le cumul suivant ;
//   - fin de la phase quand les 2 mains sont vides (4 cartes chacune au regulier).
//
// Module pur : chaque fonction copie l'etat recu et ne le mute jamais. Aucun
// RNG, aucun acces DOM. La representation des cartes suit cards.js (les objets
// Card places dans `pile` / `log` sont les references d'origine).

import { cardValue } from './cards.js';

/**
 * @typedef {{ rank: number, suit: string }} Card
 * @typedef {{ type: string, points: number }} ScoreEntry
 * @typedef {{
 *   action: 'play' | 'go',
 *   player: string,
 *   card: Card | null,
 *   count: number,
 *   points: number,
 *   breakdown: ScoreEntry[]
 * }} PlayEvent
 * @typedef {{
 *   order: string[],
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

/**
 * Cree l'etat initial d'une phase de pose.
 *
 * @param {[string, string]} order  2 identifiants distincts ; `order[0]` (le pone) ouvre
 * @param {Record<string, Card[]>} hands  une main par identifiant, meme taille non nulle
 * @returns {PeggingState}
 */
export function createPegging(order, hands) {
  if (!Array.isArray(order) || order.length !== 2 || order[0] === order[1]) {
    throw new Error('createPegging : order doit lister 2 joueurs distincts');
  }
  const [first, second] = order;
  for (const id of order) {
    if (!Array.isArray(hands?.[id])) {
      throw new Error(`createPegging : main manquante ou invalide pour "${id}"`);
    }
  }
  if (hands[first].length === 0 || hands[first].length !== hands[second].length) {
    throw new Error('createPegging : les 2 mains doivent avoir la meme taille non nulle');
  }

  return {
    order: [first, second],
    hands: { [first]: [...hands[first]], [second]: [...hands[second]] },
    turn: first,
    count: 0,
    pile: [],
    saidGo: [],
    scores: { [first]: 0, [second]: 0 },
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
 * @returns {PeggingState} nouvel etat
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
  const opp = opponentOf(next, player);
  const playerStuck = playableCards(next.hands[player], next.count).length === 0;

  let closed = false;
  if (next.count === 31) {
    breakdown.push({ type: 'thirtyOne', points: 2 });
    closed = true;
  } else if (cannotPlay(next, opp) && playerStuck) {
    // Double blocage deja certain : on ferme sans exiger de sayGo cote UI.
    breakdown.push({ type: 'go', points: 1 });
    closed = true;
  } else if (combos === 0) {
    breakdown.push({ type: 'floor', points: 1 });
  }

  const points = totalPoints(breakdown);
  next.scores[player] += points;
  recordEvent(next, { action: 'play', player, card, count: next.count, points, breakdown });

  if (closed) {
    resetCount(next);
    openNextCount(next, opp);
  } else if (next.saidGo.includes(opp) || next.hands[opp].length === 0) {
    // L'adversaire a deja dit "go" ou n'a plus de cartes : le joueur continue.
    next.turn = player;
  } else {
    // Alternance stricte : l'adversaire jouera, ou annoncera "go".
    next.turn = opp;
  }

  next.complete = bothHandsEmpty(next);
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
  const opp = opponentOf(next, player);

  if (cannotPlay(next, opp)) {
    // Filet : l'adversaire ne peut pas repondre non plus -> la sequence se ferme
    // ici (en pratique playCard ferme deja des que le double blocage est certain).
    const lastPlayer = next.pile[next.pile.length - 1].player;
    next.scores[lastPlayer] += 1;
    recordEvent(next, {
      action: 'go',
      player: lastPlayer,
      card: null,
      count: next.count,
      points: 1,
      breakdown: [{ type: 'go', points: 1 }],
    });
    resetCount(next);
    openNextCount(next, opponentOf(next, lastPlayer));
  } else {
    recordEvent(next, {
      action: 'go',
      player,
      card: null,
      count: next.count,
      points: 0,
      breakdown: [],
    });
    next.turn = opp;
  }

  next.complete = bothHandsEmpty(next);
  return next;
}

/**
 * @param {PeggingState} state
 * @returns {boolean} vrai quand les 2 mains sont vides
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

function opponentOf(state, id) {
  return state.order[0] === id ? state.order[1] : state.order[0];
}

function playableCards(hand, count) {
  return hand.filter((card) => count + cardValue(card) <= 31);
}

/** Le joueur `id` ne peut pas poser : main vide, "go" deja annonce, ou aucun coup legal. */
function cannotPlay(state, id) {
  return (
    state.hands[id].length === 0 ||
    state.saidGo.includes(id) ||
    playableCards(state.hands[id], state.count).length === 0
  );
}

function bothHandsEmpty(state) {
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

/** Assigne le tour apres une remise a 0 : `leader` ouvre s'il lui reste des cartes. */
function openNextCount(state, leader) {
  const other = opponentOf(state, leader);
  if (state.hands[leader].length > 0) state.turn = leader;
  else if (state.hands[other].length > 0) state.turn = other;
  else state.turn = leader; // les 2 mains vides : la phase est terminee
}

function recordEvent(state, event) {
  state.log = state.log.concat(event);
  state.lastEvent = event;
}

function cloneState(state) {
  return {
    order: [...state.order],
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
