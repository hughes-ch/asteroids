/**
 * Tests for controller.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as containers from '../src/modules/containers.js'
import * as control from '../src/modules/controller.js'

beforeEach(() => {
  jest.spyOn(control.Controller.prototype, '_addEventListeners')
    .mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('Prevent default', () => {
  let queue = new containers.Queue();
  let controller = new control.Controller(queue);
  let eventInfo = {
    defaultPrevented: true,
    code: 'KeyW'
  };

  controller._handleKeyboardEvent('down', eventInfo);
  expect(queue.length).toEqual(0);
});

test('Test invalid key', () => {
  let queue = new containers.Queue();
  let controller = new control.Controller(queue);
  let eventInfo = {
    defaultPrevented: false,
    code: 'NotAKey'
  };

  controller._handleKeyboardEvent('down', eventInfo);
  expect(queue.length).toEqual(0);
});

test('Test thruster', () => {
  for (let key of ['ArrowUp', 'KeyW']) {
    for (let keyState of ['down', 'up']) {

      let queue = new containers.Queue();
      let controller = new control.Controller(queue);
      let eventInfo = {
        defaultPrevented: false,
        code: key,
        preventDefault: () => { undefined }
      };

      controller._handleKeyboardEvent(keyState, eventInfo);
      expect(queue.length).toEqual(1);

      let controlObj = queue.dequeue();
      expect(controlObj.thrust).toBe(keyState == 'down');
    }
  }
});

test('Test CW rotation', () => {
  for (let key of ['ArrowRight', 'KeyD']) {
    for (let keyState of ['down', 'up']) {
      
      let queue = new containers.Queue();
      let controller = new control.Controller(queue);
      let eventInfo = {
        defaultPrevented: false,
        code: key,
        preventDefault: () => { undefined }
      };

      controller._handleKeyboardEvent(keyState, eventInfo);
      expect(queue.length).toEqual(1);

      let controlObj = queue.dequeue();
      expect(controlObj.thrust).toBe(false);
      expect(controlObj.rotate).toEqual(
        keyState == 'down' ?
          control.RotateState.cw :
          control.RotateState.none);
    }
  }
});

test('Test CCW rotation', () => {
  for (let key of ['ArrowLeft', 'KeyA']) {
    for (let keyState of ['down', 'up']) {
      
      let queue = new containers.Queue();
      let controller = new control.Controller(queue);
      let eventInfo = {
        defaultPrevented: false,
        code: key,
        preventDefault: () => { undefined }
      };

      controller._handleKeyboardEvent(keyState, eventInfo);
      expect(queue.length).toEqual(1);

      let controlObj = queue.dequeue();
      expect(controlObj.thrust).toBe(false);
      expect(controlObj.rotate).toEqual(
        keyState == 'down' ?
          control.RotateState.ccw :
          control.RotateState.none);
    }
  }
});
