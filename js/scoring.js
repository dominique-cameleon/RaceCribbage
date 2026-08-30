// Comptage des combinaisons de cribbage (le "show").
//
// Regles communes au mode regulier et au mode Qualif (voir sysmap-racecribbage.md,
// section "Comptage de combinaisons") :
//   - 15         : 2 pts par sous-ensemble dont la somme des valeurs fait 15
//   - paires     : 2 pts par paire (brelan = 6, carre = 12, par denombrement)
//   - suites     : 1 pt/carte pour toute sequence de 3+ rangs consecutifs,
//                  multipliee par le nombre de combinaisons reelles de cartes
//   - flush      : 4 (main seule) ou 5 (main + 5e carte) ; en crib, 5 obligatoires
//   - nobs       : 1 pt si un Valet en main a la couleur de la 5e carte
//
// Module pur : aucun effet de bord, aucune mutation des cartes recues.
// Les objets Card places dans le breakdown sont les references d'origine.

import { cardValue } from './cards.js';

/**
 * @typedef {{ rank: number, suit: string }} Card
 * @typedef {{ type: string, cards: Card[], points: number }} ScoreEntry
 * @typedef {{ total: number, breakdown: ScoreEntry[] }} ScoreResult
 */

/**
 * Compte les points du "show" d'une main.
 *
 * @param {Card[]} handCards   exactement 4 cartes
 * @param {Card}   fifthCard   5e carte (starter au regulier, carte universelle en Qualif)
 * @param {{ isCrib?: boolean }} [options]
 * @returns {ScoreResult}
 */
export function scoreShow(handCards, fifthCard, { isCrib = false } = {}) {
  if (!Array.isArray(handCards) || handCards.length !== 4) {
    throw new Error('scoreShow : handCards doit contenir exactement 4 cartes');
  }
  if (!fifthCard || typeof fifthCard.rank !== 'number') {
    throw new Error('scoreShow : fifthCard est requise');
  }

  const allCards = [...handCards, fifthCard];

  // Ordre de comptage conventionnel du cribbage : 15, paires, suites, flush, nobs.
  const breakdown = [
    ...scoreFifteens(allCards),
    ...scorePairs(allCards),
    ...scoreRuns(allCards),
    ...scoreFlush(handCards, fifthCard, isCrib),
    ...scoreNobs(handCards, fifthCard),
  ];

  const total = breakdown.reduce((sum, entry) => sum + entry.points, 0);
  return { total, breakdown };
}

/**
 * Bonus "his heels" : 2 pts au donneur si la carte coupee est un Valet.
 * Utilise uniquement par le mode regulier — le mode Qualif n'a pas de bonus
 * de coupe (pas de donneur en solo).
 *
 * @param {Card} fifthCard
 * @returns {number} 0 ou 2
 */
export function heels(fifthCard) {
  return fifthCard.rank === 11 ? 2 : 0;
}

// --- Combinaisons individuelles ---------------------------------------------

/** Combinaisons de 15 : tout sous-ensemble d'au moins 2 cartes sommant a 15. */
function scoreFifteens(cards) {
  const entries = [];
  for (const subset of nonEmptySubsets(cards)) {
    if (subset.length < 2) continue;
    const sum = subset.reduce((acc, card) => acc + cardValue(card), 0);
    if (sum === 15) {
      entries.push({ type: 'fifteen', cards: subset, points: 2 });
    }
  }
  return entries;
}

/** Paires : chaque couple de cartes de meme rang vaut 2 pts. */
function scorePairs(cards) {
  const entries = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].rank === cards[j].rank) {
        entries.push({ type: 'pair', cards: [cards[i], cards[j]], points: 2 });
      }
    }
  }
  return entries;
}

/**
 * Suites : pour chaque sequence maximale de rangs consecutifs de longueur >= 3,
 * on emet une entree par combinaison reelle de cartes (produit cartesien des
 * cartes de chaque rang). Une double suite de 3 donne donc 2 entrees de 3 cartes.
 * L'As vaut toujours 1 (pas de bouclage Roi-As).
 */
function scoreRuns(cards) {
  const byRank = new Map();
  for (const card of cards) {
    if (!byRank.has(card.rank)) byRank.set(card.rank, []);
    byRank.get(card.rank).push(card);
  }
  const ranks = [...byRank.keys()].sort((a, b) => a - b);

  const entries = [];
  let i = 0;
  while (i < ranks.length) {
    // Etend une plage de rangs consecutifs a partir de i.
    let j = i;
    while (j + 1 < ranks.length && ranks[j + 1] === ranks[j] + 1) j++;
    const sequence = ranks.slice(i, j + 1);

    if (sequence.length >= 3) {
      let combos = [[]];
      for (const rank of sequence) {
        const next = [];
        for (const combo of combos) {
          for (const card of byRank.get(rank)) {
            next.push([...combo, card]);
          }
        }
        combos = next;
      }
      for (const combo of combos) {
        entries.push({ type: 'run', cards: combo, points: combo.length });
      }
    }
    i = j + 1;
  }
  return entries;
}

/**
 * Flush :
 *   - hors crib : 4 pts si les 4 cartes de main partagent la couleur,
 *                 5 pts si la 5e carte partage aussi cette couleur ;
 *   - en crib   : 5 pts uniquement si les 5 cartes partagent la couleur,
 *                 sinon rien (4 cartes seules ne comptent pas).
 */
function scoreFlush(handCards, fifthCard, isCrib) {
  const suit = handCards[0].suit;
  const handIsFlush = handCards.every((card) => card.suit === suit);
  if (!handIsFlush) return [];

  const fifthMatches = fifthCard.suit === suit;

  if (fifthMatches) {
    return [{ type: 'flush', cards: [...handCards, fifthCard], points: 5 }];
  }
  if (isCrib) return [];
  return [{ type: 'flush', cards: [...handCards], points: 4 }];
}

/** Nobs : 1 pt pour un Valet en main dont la couleur est celle de la 5e carte. */
function scoreNobs(handCards, fifthCard) {
  const jack = handCards.find(
    (card) => card.rank === 11 && card.suit === fifthCard.suit,
  );
  return jack ? [{ type: 'nobs', cards: [jack], points: 1 }] : [];
}

// --- Utilitaires ------------------------------------------------------------

/**
 * Tous les sous-ensembles non vides d'un tableau, via masque de bits.
 * @template T
 * @param {T[]} items
 * @returns {T[][]}
 */
function nonEmptySubsets(items) {
  const result = [];
  const total = 1 << items.length;
  for (let mask = 1; mask < total; mask++) {
    const subset = [];
    for (let i = 0; i < items.length; i++) {
      if (mask & (1 << i)) subset.push(items[i]);
    }
    result.push(subset);
  }
  return result;
}
