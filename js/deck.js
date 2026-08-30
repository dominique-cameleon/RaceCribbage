// Paquet, melange et distribution pour RaceCribbage.
//
// Deux modes de distribution (voir sysmap-racecribbage.md, section "Modele de jeu") :
//   - regulier : dealRegular() + cut() pour le starter
//   - Qualif   : dealQualifRound() par manche + cut() pour la carte universelle
//
// Toutes les fonctions sont pures : elles copient leurs entrees et ne les mutent
// jamais. Le hasard passe toujours par un `rng` injectable (defaut Math.random)
// pour rendre les tests deterministes.

import { SUITS, RANKS, cardId } from './cards.js';

/**
 * @typedef {{ rank: number, suit: string }} Card
 */

/**
 * Paquet ordonne de 52 cartes : pour chaque couleur, les rangs 1..13.
 * deck[0] = As de pique ... deck[51] = Roi de trefle.
 *
 * @returns {Card[]}
 */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/**
 * Melange Fisher-Yates sur une copie du paquet. L'entree n'est pas mutee.
 *
 * @param {Card[]} deck
 * @param {() => number} [rng] generateur dans [0, 1)
 * @returns {Card[]} nouveau tableau, permutation de `deck`
 */
export function shuffle(deck, rng = Math.random) {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

/**
 * Distribution du mode regulier (2 joueurs), a la maniere traditionnelle :
 * cartes distribuees en alternance en commencant par le non-donneur (`pone`),
 * 6 cartes chacun. Le reste forme le `stock` (ordre conserve).
 *
 * L'appelant fournit un paquet deja melange (deck.js ne melange pas ici).
 *
 * @param {Card[]} deck 52 cartes
 * @returns {{ hands: { dealer: Card[], pone: Card[] }, stock: Card[] }}
 */
export function dealRegular(deck) {
  if (!Array.isArray(deck) || deck.length !== 52) {
    throw new Error('dealRegular : le paquet doit contenir 52 cartes');
  }
  const pone = [];
  const dealer = [];
  for (let i = 0; i < 12; i++) {
    (i % 2 === 0 ? pone : dealer).push(deck[i]);
  }
  return {
    hands: { dealer, pone },
    stock: deck.slice(12),
  };
}

/**
 * Coupe : retire une carte au hasard du `stock` pour servir de carte revelee.
 * Utilise pour le starter du mode regulier ET pour la carte universelle du
 * mode Qualif (appliquee au paquet restant apres les 4 manches).
 *
 * @param {Card[]} stock
 * @param {() => number} [rng]
 * @returns {{ starter: Card, stock: Card[] }} `stock` = les cartes restantes, ordre conserve
 */
export function cut(stock, rng = Math.random) {
  if (!Array.isArray(stock) || stock.length === 0) {
    throw new Error('cut : stock vide');
  }
  const index = Math.floor(rng() * stock.length);
  const starter = stock[index];
  const rest = [...stock.slice(0, index), ...stock.slice(index + 1)];
  return { starter, stock: rest };
}

/**
 * Tirage d'une manche du mode Qualif solo.
 *
 * Choix de signature : deck.js expose uniquement le TIRAGE d'une manche.
 * Le placement des 4 cartes visibles dans les colonnes depend d'une decision
 * du joueur (colonne au choix, plafond de 4 par colonne) : ce n'est pas une
 * operation pure et cela releve de game-engine.js. L'orchestration des 4
 * manches, la construction des colonnes + crib, puis `cut()` pour la carte
 * universelle, seront faites par game-engine.js.
 *
 * Une manche = 5 cartes tirees du dessus du paquet :
 *   - `visible` : les 4 premieres, retournees une a une, a placer par le joueur
 *   - `hidden`  : la 5e, versee au crib face cachee
 *
 * @param {Card[]} deck paquet courant (>= 5 cartes)
 * @returns {{ visible: Card[], hidden: Card, stock: Card[] }}
 */
export function dealQualifRound(deck) {
  if (!Array.isArray(deck) || deck.length < 5) {
    throw new Error('dealQualifRound : au moins 5 cartes requises');
  }
  return {
    visible: deck.slice(0, 4),
    hidden: deck[4],
    stock: deck.slice(5),
  };
}

/**
 * Verifie qu'un ensemble de cartes ne contient aucun doublon (par identifiant).
 * Utilitaire de coherence, utile aux tests et a game-engine.js.
 *
 * @param {Card[]} cards
 * @returns {boolean}
 */
export function allDistinct(cards) {
  return new Set(cards.map(cardId)).size === cards.length;
}
