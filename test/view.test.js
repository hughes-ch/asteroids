/**
 * Tests for view.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as containers from '../src/modules/containers.js'
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
});

test('Test view with full queue', () => {
  // Fill several frames
  // Make sure resetCanvas called for each frame
  // Make sure each object is drawn with correct coordinates
}); 
