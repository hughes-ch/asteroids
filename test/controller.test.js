'use strict';
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
          intf.Control.rotateFullCw :
          intf.Control.rotateNone);
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
          intf.Control.rotateFullCcw :
          intf.Control.rotateNone);
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

test('Test touch to thrust', () => {
  // Initialize touch event
  let eventInfo = {
    defaultPrevented: false,
    touches: {
      item: (index) => {
        return {pageX: 4};
      },
      length: 1,
    },
    preventDefault: () => { undefined }
  };

  // Let controller handle touch event
  controller._currentControlState.windowSize = [100, 100];
  controller._handleClickEvent(eventInfo);
  expect(queue.length).toEqual(1);

  let control = queue.dequeue();
  expect(control.thrust).toBe(true);
});

test('Test touch to shoot', () => {
  // Initialize touch event
  let eventInfo = {
    defaultPrevented: false,
    touches: {
      item: (index) => {
        return {pageX: 70};
      },
      length: 1,
    },
    preventDefault: () => { undefined }
  };

  // Let controller handle touch event
  controller._currentControlState.windowSize = [100, 100];
  controller._handleClickEvent(eventInfo);
  expect(queue.length).toEqual(2);

  let control = queue.dequeue();
  expect(control.shoot).toBe(true);

  control = queue.dequeue();
  expect(control.shoot).toBe(false);

  // Make sure holding shoot button doesn't continue to release missiles
  controller._handleClickEvent(eventInfo);
  expect(queue.length).toEqual(1);
  control = queue.dequeue();
  expect(control.shoot).toBe(false);
});

test('Test spacing of orientation events', () => {
  let event1 = {
    timeStamp: 15000000,
    beta: 0,
    gamma: 0,
  };

  controller._lastOrientationEvent = 0;

  // Send two back-to-back events. Make sure there's only one output
  controller._handleOrientationEvent(event1);
  controller._handleOrientationEvent(event1);
  expect(queue.length).toEqual(1);
  queue.dequeue();

  // Send two events with large time in between. Should have two outputs.
  let event2 = {
    timeStamp: 16000000,
    beta: 0,
    gamma: 0,
  };
  let event3 = {
    timeStamp: 17000000,
    beta: 0,
    gamma: 0,
  };
  controller._handleOrientationEvent(event2);
  controller._handleOrientationEvent(event3);
  expect(queue.length).toEqual(2);
});

test('Calculate rotation amount in landscape', () => {
  
  controller._currentControlState.windowSize = [100, 10];
  
  let event1 = {
    timeStamp: 15000000,
    beta: -25,
    gamma: 20,
  };
  controller._handleOrientationEvent(event1);
  expect(queue.dequeue().rotate).toEqual(intf.Control.rotateFullCcw);

  let event2 = {
    timeStamp: 16000000,
    beta: 10,
    gamma: 20,
  };
  controller._handleOrientationEvent(event2);
  expect(queue.dequeue().rotate).toBeCloseTo(
    event2.beta/control.Controller.maxTilt);
});

test('Calculate rotation amount in portrait', () => {

  controller._currentControlState.windowSize = [10, 100];
  
  let event1 = {
    timeStamp: 15000000,
    beta: -25,
    gamma: 28,
  };
  controller._handleOrientationEvent(event1);
  expect(queue.dequeue().rotate).toEqual(intf.Control.rotateFullCw);

  let event2 = {
    timeStamp: 16000000,
    beta: 10,
    gamma: -4,
  };
  controller._handleOrientationEvent(event2);
  expect(queue.dequeue().rotate).toBeCloseTo(
    event2.gamma/control.Controller.maxTilt);
});
