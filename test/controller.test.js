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
    key: 'w'
  };

  controller._handleKeyboardEvent('down', eventInfo);
  expect(queue.length).toEqual(0);
});

test('Test invalid key', () => {
  let eventInfo = {
    defaultPrevented: false,
    key: 'NotAKey'
  };

  controller._handleKeyboardEvent('down', eventInfo);
  expect(queue.length).toEqual(0);
});

test('Test thruster', () => {
  for (let key of ['ArrowUp', 'w']) {
    for (let keyState of ['down', 'up']) {

      let eventInfo = {
        defaultPrevented: false,
        key: key,
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
  for (let key of ['ArrowRight', 'd']) {
    for (let keyState of ['down', 'up']) {
      
      let eventInfo = {
        defaultPrevented: false,
        key: key,
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
  for (let key of ['ArrowLeft', 'a']) {
    for (let keyState of ['down', 'up']) {
      
      let eventInfo = {
        defaultPrevented: false,
        key: key,
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

test('Test shoot control SPC', () => {
  let eventInfo = {
    defaultPrevented: false,
    key: ' ',
    preventDefault: () => { undefined }
  };

  // A shoot button press will immediately send two events
  controller._handleKeyboardEvent('down', eventInfo);
  expect(queue.length).toEqual(2);

  let controlObj = queue.dequeue();
  expect(controlObj.shoot).toBe(true);

  controlObj = queue.dequeue();
  expect(controlObj.shoot).toBe(false);

  // A shoot release will trigger nothing
  controller._handleKeyboardEvent('up', eventInfo);
  expect(queue.length).toEqual(0);
});
