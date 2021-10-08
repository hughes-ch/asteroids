/**
 * Tests for containers.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as containers from '../src/modules/containers.js'
import * as model from '../src/modules/model.js'

test('Test enqueueing items works correctly', () => {
  let queue = new containers.Queue();
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
  let queue = new containers.Queue();

  expect(queue.dequeue()).toBe(undefined);
});

test('Test Frame iteration', () => {
  let objects = [
    new model.GameObject([100, 100]),
    new model.GameObject([200, 200]),
    new model.GameObject([300, 300])
  ];

  let frame = new containers.Frame();

  for (let obj of Array.from(objects)) {
    frame.add(obj)
  }

  let obj_idx = 0;
  for (let obj of frame) {
    expect(obj.translation).toEqual(objects[obj_idx].decompose().translation);
    obj_idx++;
  }
});
