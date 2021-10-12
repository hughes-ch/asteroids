/**
 * Tests for controller.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as intf from '../src/modules/interfaces.js'
import * as control from '../src/modules/controller.js'

let controller;
let queue;

beforeEach(() => {
  jest.spyOn(control.Controller.prototype, '_addEventListeners')
    .mockImplementation(() => undefined);
  jest.spyOn(control.Controller.prototype, '_getWindowSize')
    .mockImplementation(() => [1684, 1305]);

  queue = new intf.Queue();
  controller = new control.Controller(queue);
  queue.dequeue();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('Prevent default', () => {
  let eventInfo = {
    defaultPrevented: true,
    code: 'KeyW'
  };

  controller._handleKeyboardEvent('down', eventInfo);
  expect(queue.length).toEqual(0);
});

test('Test invalid key', () => {
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
          intf.RotateState.cw :
          intf.RotateState.none);
    }
  }
});

test('Test CCW rotation', () => {
  for (let key of ['ArrowLeft', 'KeyA']) {
    for (let keyState of ['down', 'up']) {
      
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
          intf.RotateState.ccw :
          intf.RotateState.none);
    }
  }
});

test('Test resize event', () => {
  controller._handleResizeEvent();
  expect(queue.length).toEqual(1);
});

test('Test initial window size sent on construction', () => {
  let queue = new intf.Queue();
  let controller = new control.Controller(queue);
  expect(queue.length).toEqual(1);
});
