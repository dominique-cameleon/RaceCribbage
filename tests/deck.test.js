// Tests du paquet et de la distribution (node --test).

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDeck,
  shuffle,
  dealRegular,
  cut,
  dealQualifRound,
  allDistinct,
} from '../js/deck.js';
import { cardId } from '../js/cards.js';

// --- Helpers de test -------------------------------------------------------

/** PRNG deterministe (mulberry32) : meme seed => meme suite de nombres. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Empreinte ordonnee d'un paquet, pour comparer des ordres. */
function fingerprint(cards) {
  return cards.map(cardId).join(',');
}

// --- createDeck ----------------------------------------------------------

test('createDeck : 52 cartes uniques, 13 par couleur, 4 par rang', () => {
  const deck = createDeck();

  assert.equal(deck.length, 52);
  assert.ok(allDistinct(deck));

  const bySuit = {};
  const byRank = {};
  for (const card of deck) {
    bySuit[card.suit] = (bySuit[card.suit] ?? 0) + 1;
    byRank[card.rank] = (byRank[card.rank] ?? 0) + 1;
  }
  assert.deepEqual(Object.values(bySuit), [13, 13, 13, 13]);
  assert.ok(Object.values(byRank).every((n) => n === 4));
  assert.equal(Object.keys(byRank).length, 13);
});

// --- shuffle -----------------------------------------------------------

test('shuffle : deterministe a seed egale, permutation, entree non mutee', () => {
  const deck = createDeck();
  const before = fingerprint(deck);

  const a = shuffle(deck, mulberry32(42));
  const b = shuffle(deck, mulberry32(42));
  const c = shuffle(deck, mulberry32(99));

  // Meme seed => meme resultat.
  assert.equal(fingerprint(a), fingerprint(b));
  // Seed differente => resultat different (extremement probable).
  assert.notEqual(fingerprint(a), fingerprint(c));
  // Melange effectif.
  assert.notEqual(fingerprint(a), before);
  // Permutation : memes cartes.
  assert.deepEqual([...a].map(cardId).sort(), [...deck].map(cardId).sort());
  assert.equal(a.length, 52);
  // Entree intacte.
  assert.equal(fingerprint(deck), before);
});

// --- dealRegular -----------------------------------------------------

test('dealRegular : 6 + 6 + 40 sans chevauchement, entree non mutee', () => {
  const deck = shuffle(createDeck(), mulberry32(7));
  const before = fingerprint(deck);

  const { hands, stock } = dealRegular(deck);

  assert.equal(hands.dealer.length, 6);
  assert.equal(hands.pone.length, 6);
  assert.equal(stock.length, 40);

  const all = [...hands.dealer, ...hands.pone, ...stock];
  assert.equal(all.length, 52);
  assert.ok(allDistinct(all));
  assert.deepEqual(all.map(cardId).sort(), deck.map(cardId).sort());

  assert.equal(fingerprint(deck), before);
});

test('dealRegular : rejette un paquet incomplet', () => {
  assert.throws(() => dealRegular(createDeck().slice(0, 40)));
});

// --- dealQualifRound -------------------------------------------------

test('dealQualifRound x4 : 4 colonnes de 4 + crib de 4, sans doublon', () => {
  let deck = shuffle(createDeck(), mulberry32(2024));
  const before = fingerprint(deck);
  const sourceDeck = deck;

  const visibleAll = [];
  const hiddenAll = [];

  for (let round = 0; round < 4; round++) {
    const { visible, hidden, stock } = dealQualifRound(deck);
    assert.equal(visible.length, 4);
    assert.ok(hidden && typeof hidden.rank === 'number');
    assert.equal(stock.length, deck.length - 5);
    visibleAll.push(...visible);
    hiddenAll.push(hidden);
    deck = stock;
  }

  // 16 visibles (= 4 colonnes de 4) + 4 cachees (= crib) = 20 cartes distinctes.
  assert.equal(visibleAll.length, 16);
  assert.equal(hiddenAll.length, 4);
  const used = [...visibleAll, ...hiddenAll];
  assert.ok(allDistinct(used));

  // Paquet restant : 32 cartes, aucune deja utilisee, total 52.
  assert.equal(deck.length, 32);
  assert.ok(allDistinct([...used, ...deck]));
  assert.deepEqual(
    [...used, ...deck].map(cardId).sort(),
    sourceDeck.map(cardId).sort(),
  );

  // Entree d'origine intacte.
  assert.equal(fingerprint(sourceDeck), before);
});

test('dealQualifRound : rejette moins de 5 cartes', () => {
  assert.throws(() => dealQualifRound(createDeck().slice(0, 4)));
});

// --- cut -------------------------------------------------------------

test('cut : retire 1 carte du stock, deterministe, entree non mutee', () => {
  const stock = createDeck();
  const before = fingerprint(stock);

  const { starter, stock: rest } = cut(stock, () => 0);

  assert.deepEqual(starter, stock[0]);
  assert.equal(rest.length, 51);
  assert.ok(!rest.some((card) => cardId(card) === cardId(starter)));
  // Ordre du reste conserve.
  assert.deepEqual(fingerprint(rest), fingerprint(stock.slice(1)));
  // Entree intacte.
  assert.equal(fingerprint(stock), before);
});

test('cut : enchaine apres la Qualif pour la carte universelle', () => {
  let deck = shuffle(createDeck(), mulberry32(555));
  for (let round = 0; round < 4; round++) {
    deck = dealQualifRound(deck).stock;
  }
  assert.equal(deck.length, 32);

  const { starter: universalCard, stock: rest } = cut(deck, mulberry32(1));
  assert.ok(universalCard && typeof universalCard.rank === 'number');
  assert.equal(rest.length, 31);
  assert.ok(allDistinct([universalCard, ...rest]));
});

test('cut : rejette un stock vide', () => {
  assert.throws(() => cut([]));
});
