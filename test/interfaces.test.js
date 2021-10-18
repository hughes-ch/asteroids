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
