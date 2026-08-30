// Modele de carte et helpers pour RaceCribbage.
//
// Une carte est un objet litteral, jamais une instance de classe :
//   { rank: 1..13, suit: 'S' | 'H' | 'D' | 'C' }
//
// rank : 1 = As, 2..10 = valeur faciale, 11 = Valet, 12 = Dame, 13 = Roi.
// suit : 'S' pique, 'H' coeur, 'D' carreau, 'C' trefle.
//
// Module pur : aucune dependance, aucun acces DOM.

/** Couleurs valides, dans un ordre stable (utilise par deck.js). */
export const SUITS = ['S', 'H', 'D', 'C'];

/** Rangs valides, du plus bas au plus haut (utilise par deck.js). */
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/**
 * Valeur d'une carte pour les combinaisons de 15 et pour le pegging.
 * As vaut 1, les figures (Valet, Dame, Roi) valent 10.
 *
 * @param {{ rank: number }} card
 * @returns {number} 1..10
 */
export function cardValue(card) {
  return Math.min(card.rank, 10);
}

// Caracteres non numeriques pour l'identifiant court.
const RANK_CHARS = {
  1: 'A',
  10: 'T',
  11: 'J',
  12: 'Q',
  13: 'K',
};

/**
 * Identifiant court d'une carte, pratique pour le debug et les tests.
 * Exemples : "AS", "TD", "JH", "9C".
 *
 * @param {{ rank: number, suit: string }} card
 * @returns {string}
 */
export function cardId(card) {
  const rankChar = RANK_CHARS[card.rank] ?? String(card.rank);
  return `${rankChar}${card.suit}`;
}
