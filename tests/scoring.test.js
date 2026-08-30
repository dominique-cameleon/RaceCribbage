// Tests du comptage de combinaisons (node --test).
// Lance : npm test   ou   node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreShow, heels } from '../js/scoring.js';
import { cardValue, cardId } from '../js/cards.js';

// --- Helpers de test -------------------------------------------------------

const RANK_FROM_CHAR = { A: 1, T: 10, J: 11, Q: 12, K: 13 };

/** Construit une carte depuis un identifiant court : "5H", "TD", "JS", "AC". */
function c(id) {
  const suit = id.slice(-1);
  const rankChar = id.slice(0, -1);
  const rank = RANK_FROM_CHAR[rankChar] ?? Number(rankChar);
  return { rank, suit };
}

/** Somme des points d'un type donne dans le breakdown. */
function pointsOfType(result, type) {
  return result.breakdown
    .filter((entry) => entry.type === type)
    .reduce((sum, entry) => sum + entry.points, 0);
}

/** Nombre d'entrees d'un type donne dans le breakdown. */
function countType(result, type) {
  return result.breakdown.filter((entry) => entry.type === type).length;
}

// --- scoreShow ------------------------------------------------------------

test('main parfaite : 29 points', () => {
  // 4 cinq + Valet, carte coupee = cinq de la couleur du Valet.
  const result = scoreShow([c('5C'), c('5D'), c('5S'), c('JH')], c('5H'));

  assert.equal(result.total, 29);
  assert.equal(pointsOfType(result, 'fifteen'), 16);
  assert.equal(pointsOfType(result, 'pair'), 12);
  assert.equal(pointsOfType(result, 'nobs'), 1);
});

test('main sans combinaison : 0 point, breakdown vide', () => {
  const result = scoreShow([c('3C'), c('7H'), c('9S'), c('QD')], c('KC'));

  assert.equal(result.total, 0);
  assert.deepEqual(result.breakdown, []);
});

test('flush de 4 cartes en main, 5e carte d une autre couleur', () => {
  const result = scoreShow([c('2H'), c('4H'), c('JH'), c('KH')], c('7S'));

  assert.equal(result.total, 4);
  assert.equal(countType(result, 'flush'), 1);
  const flush = result.breakdown.find((entry) => entry.type === 'flush');
  assert.equal(flush.points, 4);
  assert.equal(flush.cards.length, 4);
});

test('flush de crib valide : les 5 cartes de la meme couleur', () => {
  const result = scoreShow(
    [c('2H'), c('4H'), c('TH'), c('KH')],
    c('8H'),
    { isCrib: true },
  );

  assert.equal(result.total, 5);
  const flush = result.breakdown.find((entry) => entry.type === 'flush');
  assert.equal(flush.points, 5);
  assert.equal(flush.cards.length, 5);
});

test('flush de crib invalide : 4 cartes en main mais 5e carte differente', () => {
  const result = scoreShow(
    [c('2H'), c('4H'), c('TH'), c('KH')],
    c('8S'),
    { isCrib: true },
  );

  assert.equal(countType(result, 'flush'), 0);
  assert.equal(result.total, 0);
});

test('double suite de trois avec une paire', () => {
  // Rangs 3-4-4-5 + 9 : suite 3-4-5 x2, paire de 4, aucun 15.
  const result = scoreShow([c('3C'), c('4H'), c('4S'), c('5D')], c('9C'));

  assert.equal(result.total, 8);
  const runs = result.breakdown.filter((entry) => entry.type === 'run');
  assert.equal(runs.length, 2);
  assert.ok(runs.every((run) => run.cards.length === 3));
  assert.equal(pointsOfType(result, 'pair'), 2);
});

test('nobs positif : Valet en main de la couleur de la 5e carte', () => {
  const result = scoreShow([c('JH'), c('4C'), c('7D'), c('KS')], c('2H'));

  assert.equal(result.total, 1);
  assert.equal(countType(result, 'nobs'), 1);
});

test('nobs negatif : Valet en main d une autre couleur', () => {
  const result = scoreShow([c('JH'), c('4C'), c('7D'), c('KS')], c('2S'));

  assert.equal(countType(result, 'nobs'), 0);
  assert.equal(result.total, 0);
});

test('scoreShow rejette une main qui n a pas 4 cartes', () => {
  assert.throws(() => scoreShow([c('5C'), c('5D'), c('5S')], c('5H')));
});

// --- heels --------------------------------------------------------------

test('heels : 2 points si la carte coupee est un Valet, 0 sinon', () => {
  assert.equal(heels(c('JD')), 2);
  assert.equal(heels(c('5C')), 0);
});

// --- cards.js ----------------------------------------------------------

test('cardValue : As vaut 1, figures valent 10', () => {
  assert.equal(cardValue(c('AS')), 1);
  assert.equal(cardValue(c('5D')), 5);
  assert.equal(cardValue(c('TD')), 10);
  assert.equal(cardValue(c('JH')), 10);
  assert.equal(cardValue(c('KC')), 10);
});

test('cardId : identifiant court', () => {
  assert.equal(cardId({ rank: 1, suit: 'S' }), 'AS');
  assert.equal(cardId({ rank: 9, suit: 'C' }), '9C');
  assert.equal(cardId({ rank: 10, suit: 'D' }), 'TD');
  assert.equal(cardId({ rank: 11, suit: 'H' }), 'JH');
  assert.equal(cardId({ rank: 13, suit: 'S' }), 'KS');
});
