/**
 * Tests for view.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as containers from '../src/modules/containers.js'
import {Spaceship} from '../src/modules/model.js'
import * as view from '../src/modules/view.js';

beforeEach(() => {
  jest.spyOn(view.Canvas.prototype, '_initialize')
    .mockImplementation(() => undefined);
  jest.spyOn(view.Canvas.prototype, 'drawObject')
    .mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});
  
test('Test view with nothing in input queue', () => {
  let inputQueue = new containers.Queue();
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
      new Spaceship([100, 100], 0),
      new Spaceship([200, 200], 50),
      new Spaceship([300, 300], 100)
    ],
    [
      new Spaceship([150, 150], 0),
      new Spaceship([250, 250], 50)
    ],
    [
      new Spaceship([175, 175], 0),
      new Spaceship([275, 275], 50),
      new Spaceship([375, 375], 100)
    ]
  ];

  // Fill frames
  let frames = [];
  let queue = new containers.Queue();

  for (let ii = 0; ii < objects.length; ii++)
  {
    frames.push(new containers.Frame());
    
    for (let jj = 0; jj < objects[ii].length; jj++)
    {
      frames[ii].add(objects[ii][jj]);
    }

    queue.enqueue(frames[ii]);
  }
  
  // Mock functions and render canvas
  let gameView = new view.View(queue);
  let mockResetCanvas = jest.spyOn(gameView._canvas, 'resetCanvas')
    .mockImplementation(() => undefined);
  let mockDrawObject = jest.spyOn(gameView._canvas, 'drawObject')
    .mockImplementation(() => undefined);

  for (let ii = 0; ii < frames.length; ii++)
  {
    gameView.renderCanvas();
    
    // Make sure each object is drawn with correct coordinates
    let lastObjInFrame = objects[ii][objects[ii].length-1].decompose()[0];
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
