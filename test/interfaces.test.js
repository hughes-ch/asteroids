/**
 * Tests for interfaces.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as intf from '../src/modules/interfaces.js'
import * as model from '../src/modules/model.js'

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
    new model.Spaceship([100, 100], 0),
    new model.Spaceship([200, 200], 50),
    new model.Spaceship([300, 300], 100)
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
