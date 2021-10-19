'use strict'
/**
 * Tests for interfaces.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as intf from '../src/modules/interfaces.js'
import * as go from '../src/modules/gameObject.js'

test('Test enqueueing items works correctly', () => {
  let queue = new intf.Queue();
  let range = 5;
  for (let ii = 0; ii <= range; ii++) {
    queue.enqueue(ii);
  }
  
  expect(queue.length).toEqual(range+1);
  
  for (let ii = 0; ii < range; ii++) {
    expect(queue.dequeue()).toEqual(ii);
  }
});

test('Test dequeuing an empty queue', () => {
  let queue = new intf.Queue();

  expect(queue.dequeue()).toBe(undefined);
});

test('Test Frame iteration', () => {
  let objects = [
    new go.Spaceship([100, 100], 0),
    new go.Spaceship([200, 200], 50),
    new go.Spaceship([300, 300], 100)
  ];

  let frame = new intf.Frame();

  for (let obj of Array.from(objects)) {
    frame.add(obj)
  }

  let obj_idx = 0;
  for (let obj of frame) {
    expect(obj.translation).toEqual(
      objects[obj_idx].decompose().translation);
    obj_idx++;
  }
});

test('Test stacking scores', () => {
  let score1 = new intf.Score();
  score1.livesLost = 1;
  score1.scoreIncrease = 20;

  let score2 = new intf.Score();
  score2.scoreIncrease = 10;
  
  let score3 = new intf.Score();
  score3.livesLost = 1;
  score3.owned = true;

  let stacked = score1.stack(score2.stack(score3));

  expect(stacked.owned).toBe(true);
  expect(stacked.scoreIncrease)
    .toEqual(score1.scoreIncrease + score2.scoreIncrease);
  expect(stacked.livesLost)
    .toEqual(score1.livesLost + score3.livesLost);
});

test('Test the collection of a complex collision', () => {
  let keeper = new intf.ScoreKeeper();
  let origLives = keeper.lives;
  
  let missile = new go.Missile([0, 0], [0, 0], 0);
  let alien = new go.Alien([0, 0]);
  keeper.collectScore(missile, alien);

  let spaceship = new go.Spaceship([100, 100], 0);
  let asteroid = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  keeper.collectScore(spaceship, asteroid);

  expect(keeper.lives)
    .toEqual(origLives - spaceship.score().livesLost);
  expect(keeper.score)
    .toEqual(alien.score().scoreIncrease + asteroid.score().scoreIncrease);
});

test('Test that non-owned collisions are not counted', () => {
  let keeper = new intf.ScoreKeeper();
  let alien = new go.Alien([0, 0]);
  let asteroid = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  keeper.collectScore(alien, asteroid);

  expect(keeper.score).toEqual(0);
});

test('Test that the game starts with three lives', () => {
  expect(new intf.ScoreKeeper().lives).toEqual(3);
});

test('Test a new ship is added every 10000 points', () => {
  let keeper = new intf.ScoreKeeper();
  keeper.lives = 3;
  keeper.score = (intf.ScoreKeeper.numPointsForNewLife*2) - 1;

  let missile = new go.Missile([0, 0], [0, 0], 0);
  let alien = new go.Alien([0, 0]);
  keeper.collectScore(missile, alien);

  expect(keeper.lives).toEqual(4);
});

