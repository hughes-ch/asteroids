'use strict';
/**
 * Tests for view.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as go from '../src/modules/gameObject.js'
import * as intf from '../src/modules/interfaces.js'
import * as view from '../src/modules/view.js';

beforeEach(() => {
  jest.spyOn(view.Canvas.prototype, 'initializeCanvas')
    .mockImplementation(() => undefined);
  jest.spyOn(view.Canvas.prototype, 'drawObject')
    .mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});
  
test('Test view with nothing in input queue', () => {
  let inputQueue = new intf.Queue();
  let gameView = new view.View(inputQueue);

  let mockResetCanvas = jest.spyOn(gameView._canvas, 'resetCanvas');
  gameView.renderCanvas();
  expect(mockResetCanvas).not.toHaveBeenCalled();
  mockResetCanvas.mockRestore();
});

test('Test view with full queue', () => {
  // Create objects
  let objects = [
    [
      new go.Spaceship([100, 100], 0),
      new go.Spaceship([200, 200], 50),
      new go.Spaceship([300, 300], 100)
    ],
    [
      new go.Spaceship([150, 150], 0),
      new go.Spaceship([250, 250], 50)
    ],
    [
      new go.Spaceship([175, 175], 0),
      new go.Spaceship([275, 275], 50),
      new go.Spaceship([375, 375], 100)
    ]
  ];

  // Fill frames
  let frames = [];
  let queue = new intf.Queue();

  for (let ii = 0; ii < objects.length; ii++)
  {
    frames.push(new intf.Frame());
    
    for (let jj = 0; jj < objects[ii].length; jj++)
    {
      frames[ii].add(objects[ii][jj]);
    }
  }
  
  // Mock functions and render canvas
  let gameView = new view.View(queue);
  let mockResetCanvas = jest.spyOn(gameView._canvas, 'resetCanvas')
    .mockImplementation(() => undefined);
  let mockDrawObject = jest.spyOn(gameView._canvas, 'drawObject')
    .mockImplementation(() => undefined);

  for (let ii = 0; ii < frames.length; ii++)
  {
    queue.enqueue(frames[ii]);
    gameView.renderCanvas();
    
    // Make sure each object is drawn with correct coordinates
    let lastObjInFrame = objects[ii][objects[ii].length-1].decompose();
    let objTranslation = lastObjInFrame.translation;
    let objVertices = lastObjInFrame.vertices;

    let expectedDrawCoords = [];
    for (let vertex of Array.from(objVertices)) {
      expectedDrawCoords.push([
        vertex[0] + objTranslation[0],
        vertex[1] + objTranslation[1]
      ]);
    }

    expect(mockDrawObject).toHaveBeenLastCalledWith(expectedDrawCoords);
  }

  // Check canvas is reset between frames
  expect(mockResetCanvas).toHaveBeenCalledTimes(frames.length);

  mockResetCanvas.mockRestore();
  mockDrawObject.mockRestore();
});

test('Test window resizing', () => {

  // Mock initialize method
  let mockInitialize = jest.spyOn(view.Canvas.prototype, 'initializeCanvas')
      .mockImplementation(() => undefined);
  let mockResetCanvas = jest.spyOn(view.Canvas.prototype, 'resetCanvas')
    .mockImplementation(() => undefined);

  // Verify initialize called after window is resized
  let inputQueue = new intf.Queue();
  let gameView = new view.View(inputQueue);

  let frame1 = new intf.Frame();
  inputQueue.enqueue(frame1);
  gameView.renderCanvas();
  mockInitialize.mockReset();

  let frame2 = new intf.Frame();
  frame2.windowSize = [100, 100];
  inputQueue.enqueue(frame2);
  gameView.renderCanvas();
  expect(mockInitialize).toHaveBeenCalled();
  
  mockInitialize.mockRestore();
});

test('Test that extra frames are discarded', () => {
  // Create objects
  let objects = [
    [new go.Spaceship([100, 100], 0)],
    [new go.Spaceship([150, 150], 0)],
    []
  ];

  // Fill frames
  let queue = new intf.Queue();

  for (let objList of objects) {
    let frame = new intf.Frame();
    
    for (let obj of objList) {
      frame.add(obj)
    }

    queue.enqueue(frame);
  }
  
  // Mock functions and render canvas
  let gameView = new view.View(queue);
  let mockResetCanvas = jest.spyOn(gameView._canvas, 'resetCanvas')
    .mockImplementation(() => undefined);
  let mockDrawObject = jest.spyOn(gameView._canvas, 'drawObject')
    .mockImplementation(() => undefined);

  // Check draw object never called (meaning only last, empty frame rendered)
  expect(mockDrawObject).toHaveBeenCalledTimes(0);

  mockResetCanvas.mockRestore();
  mockDrawObject.mockRestore();
});
