// Tests de la phase de pose du mode regulier (node --test).

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPegging,
  legalPlays,
  playCard,
  sayGo,
  isComplete,
} from '../js/pegging.js';
import { cardId } from '../js/cards.js';

// --- Helpers de test -----------------------------------------------------

const RANK_FROM_CHAR = { A: 1, T: 10, J: 11, Q: 12, K: 13 };

/** Construit une carte depuis un identifiant court : "5H", "TD", "JS", "AC". */
function c(id) {
  const suit = id.slice(-1);
  const rankChar = id.slice(0, -1);
  const rank = RANK_FROM_CHAR[rankChar] ?? Number(rankChar);
  return { rank, suit };
}

/** Le joueur courant pose la carte identifiee par `id`. */
function play(state, id) {
  const card = state.hands[state.turn].find((cd) => cardId(cd) === id);
  if (!card) {
    throw new Error(`play : ${id} absente de la main de ${state.turn}`);
  }
  return playCard(state, card);
}

/** Types presents dans le breakdown d'un evenement. */
function types(event) {
  return event.breakdown.map((entry) => entry.type);
}

// --- Mise en place -----------------------------------------------------

test('createPegging : etat initial, le pone ouvre', () => {
  const s = createPegging(['P', 'D'], {
    P: [c('AH'), c('2H'), c('3H'), c('4H')],
    D: [c('AS'), c('2S'), c('3S'), c('4S')],
  });

  assert.equal(s.turn, 'P');
  assert.equal(s.count, 0);
  assert.deepEqual(s.pile, []);
  assert.deepEqual(s.scores, { P: 0, D: 0 });
  assert.equal(isComplete(s), false);
});

test('createPegging : rejette les mises en place invalides', () => {
  const hand = [c('AH'), c('2H')];
  assert.throws(() => createPegging(['P'], { P: hand, D: hand }));
  assert.throws(() => createPegging(['P', 'P'], { P: hand }));
  assert.throws(() => createPegging(['P', 'D'], { P: hand }));
  assert.throws(() =>
    createPegging(['P', 'D'], { P: hand, D: [c('AH')] }),
  );
  assert.throws(() => createPegging(['P', 'D'], { P: [], D: [] }));
});

test('playCard ne mute pas l etat recu', () => {
  const s0 = createPegging(['P', 'D'], {
    P: [c('5H'), c('6H')],
    D: [c('5S'), c('6S')],
  });
  const s1 = play(s0, '5H');

  assert.equal(s0.count, 0);
  assert.equal(s0.hands.P.length, 2);
  assert.equal(s0.scores.P, 0);
  assert.equal(s0.log.length, 0);
  assert.equal(s1.count, 5);
  assert.equal(s1.hands.P.length, 1);
});

// --- Combinaisons reelles --------------------------------------------

test('15 pour 2 : carte qui amene le cumul a 15', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('7H'), c('2C')],
    D: [c('8S'), c('9D')],
  });
  s = play(s, '7H'); // 7
  s = play(s, '8S'); // 15

  assert.equal(s.lastEvent.count, 15);
  assert.equal(s.lastEvent.points, 2);
  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'fifteen', points: 2 }]);
});

test('paire pour 2', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('4H'), c('2C')],
    D: [c('4S'), c('9D')],
  });
  s = play(s, '4H');
  s = play(s, '4S');

  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'pair', points: 2 }]);
});

test('brelan pour 6', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('3H'), c('3S')],
    D: [c('3D'), c('9C')],
  });
  s = play(s, '3H'); // 3
  s = play(s, '3D'); // 6, paire
  s = play(s, '3S'); // 9, brelan

  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'pairRoyal', points: 6 }]);
});

test('carre pour 12', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('5H'), c('5S'), c('AC')],
    D: [c('5D'), c('5C'), c('KH')],
  });
  s = play(s, '5H'); // 5   floor 1
  s = play(s, '5D'); // 10  paire
  s = play(s, '5S'); // 15  15 + brelan
  assert.deepEqual(types(s.lastEvent), ['fifteen', 'pairRoyal']);
  s = play(s, '5C'); // 20  carre

  assert.deepEqual(s.lastEvent.breakdown, [
    { type: 'doublePairRoyal', points: 12 },
  ]);
});

test('suite : comptee peu importe l ordre de pose (7-9-8)', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('7H'), c('8C')],
    D: [c('9S'), c('6D')],
  });
  s = play(s, '7H'); // 7
  s = play(s, '9S'); // 16
  s = play(s, '8C'); // 24  suite 7-8-9

  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'run', points: 3 }]);

  s = play(s, '6D'); // 30  suite 6-7-8-9 + go (P n a plus de cartes)
  assert.deepEqual(types(s.lastEvent), ['run', 'go']);
  assert.equal(s.lastEvent.breakdown[0].points, 4);
});

test('suite de figures : J-K-Q comptent comme une suite de 3', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('JH'), c('QC')],
    D: [c('KS'), c('AD')],
  });
  s = play(s, 'JH'); // 10
  s = play(s, 'KS'); // 20
  s = play(s, 'QC'); // 30  suite J-Q-K (D peut encore poser l As)

  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'run', points: 3 }]);
});

test('15 + suite sur la meme carte', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('4H'), c('6C')],
    D: [c('5S'), c('9D')],
  });
  s = play(s, '4H'); // 4
  s = play(s, '5S'); // 9
  s = play(s, '6C'); // 15  15 + suite 4-5-6

  assert.deepEqual(s.lastEvent.breakdown, [
    { type: 'fifteen', points: 2 },
    { type: 'run', points: 3 },
  ]);
  assert.equal(s.lastEvent.points, 5);
});

test('suite cassee par une paire : aucune suite', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('AH'), c('3C')],
    D: [c('2S'), c('3D')],
  });
  s = play(s, 'AH'); // 1
  s = play(s, '2S'); // 3
  s = play(s, '3C'); // 6  suite A-2-3
  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'run', points: 3 }]);

  s = play(s, '3D'); // 9  paire de 3, suite cassee
  assert.ok(!types(s.lastEvent).includes('run'));
  assert.ok(types(s.lastEvent).includes('pair'));
});

// --- Bonus "go" et "31 pile" ---------------------------------------

test('go : double blocage certain -> 1 pt a la derniere carte, remise a 0', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('KH'), c('TS'), c('5C'), c('2C')],
    D: [c('QD'), c('TC'), c('3H'), c('4H')],
  });
  s = play(s, 'KH'); // 10
  s = play(s, 'QD'); // 20
  // P pose TS -> 30 : D est bloque (10/3/4) ET P l est aussi (5/2) -> fermeture auto.
  s = play(s, 'TS');

  assert.equal(s.lastEvent.action, 'play');
  assert.equal(s.lastEvent.player, 'P'); // derniere carte posee
  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'go', points: 1 }]);
  assert.equal(s.scores.P, 2); // plancher (KH) + go (TS)
  assert.equal(s.count, 0); // remise a 0
  assert.deepEqual(s.pile, []);
  assert.deepEqual(s.saidGo, []);
  assert.equal(s.turn, 'D'); // le joueur qui n a pas pose la derniere carte ouvre
});

test('31 pile : 2 pts a la place du go (pas de cumul avec le go)', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('9H'), c('2C')],
    D: [c('TD'), c('TS')],
  });
  s = play(s, '9H'); // 9
  s = play(s, 'TD'); // 19
  s = play(s, '2C'); // 21
  s = play(s, 'TS'); // 31

  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'thirtyOne', points: 2 }]);
  assert.ok(!types(s.lastEvent).includes('go'));
  assert.equal(s.count, 0);
  assert.equal(isComplete(s), true);
});

test('31 pile s ajoute aux combinaisons de la carte', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('9H'), c('8C')],
    D: [c('6S'), c('8D')],
  });
  s = play(s, '9H'); // 9
  s = play(s, '6S'); // 15
  s = play(s, '8C'); // 23
  s = play(s, '8D'); // 31  -> paire de 8 + 31 pile

  assert.deepEqual(types(s.lastEvent), ['pair', 'thirtyOne']);
  assert.equal(s.lastEvent.points, 4);
});

// --- Plancher ------------------------------------------------------

test('plancher : 1 pt quand une carte ne declenche rien', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('3H'), c('KC')],
    D: [c('9S'), c('7D')],
  });
  s = play(s, '3H'); // 3  rien -> plancher

  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'floor', points: 1 }]);
  assert.equal(s.scores.P, 1);
});

test('plancher : jamais applique quand une combinaison score', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('4H'), c('2C')],
    D: [c('4S'), c('9D')],
  });
  s = play(s, '4H'); // plancher
  s = play(s, '4S'); // paire -> pas de plancher

  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'pair', points: 2 }]);
});

test('plancher : jamais cumule avec le go', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('3H')],
    D: [c('9S')],
  });
  s = play(s, '3H'); // 3  plancher
  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'floor', points: 1 }]);

  s = play(s, '9S'); // 12  rien, mais P est vide -> go, pas de plancher
  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'go', points: 1 }]);
  assert.equal(s.scores.D, 1);
});

// --- Remise a 0 et reprise ------------------------------------------

test('reprise apres remise a 0 : la pose continue avec les cartes restantes', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('KH'), c('TS'), c('5C'), c('2C')],
    D: [c('QD'), c('TC'), c('3H'), c('4H')],
  });
  s = play(s, 'KH'); // 10
  s = play(s, 'QD'); // 20
  s = play(s, 'TS'); // 30  -> double blocage certain -> fermeture auto, D ouvre

  assert.equal(s.turn, 'D');
  assert.equal(s.count, 0);
  s = play(s, 'TC'); // 10
  s = play(s, '5C'); // 15  -> 15 pour 2
  assert.deepEqual(s.lastEvent.breakdown, [{ type: 'fifteen', points: 2 }]);
  s = play(s, '3H'); // 18
  s = play(s, '2C'); // 20
  s = play(s, '4H'); // 24  derniere carte -> go

  assert.equal(isComplete(s), true);
  assert.equal(s.hands.P.length, 0);
  assert.equal(s.hands.D.length, 0);
});

// --- Fin de phase --------------------------------------------------

test('fin de phase : derniere carte posee, aucune action ensuite', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('7H'), c('2C')],
    D: [c('8S'), c('9D')],
  });
  s = play(s, '7H');
  s = play(s, '8S');
  s = play(s, '2C');
  s = play(s, '9D'); // derniere carte -> go

  assert.equal(isComplete(s), true);
  assert.deepEqual(legalPlays(s), []);
  assert.throws(() => playCard(s, c('9D')));
  assert.throws(() => sayGo(s));
});

// --- Coups illegaux ----------------------------------------------

test('playCard : refuse une carte qui depasse 31', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('9H'), c('5C'), c('AC')],
    D: [c('KD'), c('KC'), c('QS')],
  });
  s = play(s, '9H'); // 9
  s = play(s, 'KD'); // 19
  s = play(s, '5C'); // 24  -> D bloque (K/K/Q), mais P garde l As : D est au tour
  assert.equal(s.turn, 'D');
  assert.deepEqual(legalPlays(s), []);
  assert.throws(() => playCard(s, s.hands.D.find((cd) => cardId(cd) === 'KC')));
});

test('playCard : refuse une carte hors de la main du joueur courant', () => {
  const s = createPegging(['P', 'D'], {
    P: [c('5H'), c('6H')],
    D: [c('5S'), c('6S')],
  });
  assert.throws(() => playCard(s, s.hands.D[0]));
  assert.throws(() => playCard(s, c('9C')));
});

test('sayGo : refuse si le joueur courant a un coup legal', () => {
  const s = createPegging(['P', 'D'], {
    P: [c('5H'), c('6H')],
    D: [c('5S'), c('6S')],
  });
  assert.throws(() => sayGo(s));
});

test('sayGo intermediaire : l adversaire continue seul avant la fermeture', () => {
  let s = createPegging(['P', 'D'], {
    P: [c('KH'), c('KS'), c('9C')],
    D: [c('2S'), c('2D'), c('AH')],
  });
  s = play(s, 'KH'); // 10
  s = play(s, '2S'); // 12
  s = play(s, 'KS'); // 22
  s = play(s, '2D'); // 24  paire de 2
  // P : 9 -> 33 depasse -> P doit dire go
  assert.equal(s.turn, 'P');
  s = sayGo(s);

  assert.equal(s.lastEvent.action, 'go');
  assert.equal(s.lastEvent.points, 0);
  assert.equal(s.turn, 'D'); // D continue seul
  assert.equal(s.count, 24); // pas encore de remise a 0
  assert.deepEqual(s.saidGo, ['P']);

  s = play(s, 'AH'); // 25  -> D bloque ensuite, P a dit go -> fermeture, go a D
  assert.equal(s.lastEvent.player, 'D');
  assert.ok(types(s.lastEvent).includes('go'));
  assert.equal(s.count, 0);
  assert.equal(s.turn, 'P'); // P garde le 9C et ouvre le cumul suivant

  s = play(s, '9C'); // 9  derniere carte
  assert.equal(isComplete(s), true);
});
