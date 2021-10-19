'use strict';
/**
 * Tests for model.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as gen from '../src/modules/generator.js'
import * as go from '../src/modules/gameObject.js'
import * as intf from '../src/modules/interfaces.js'
import * as math from 'mathjs'
import * as model from '../src/modules/model.js'
import * as objModels from '../src/modules/objModels.js'

/**
 * Utility function to calculate rotations
 *
 * @param {Array}  vector   Vector to rotate
 * @param {Number} rotation Amount to rotate (deg)
 * @return {Array} Rotated vector
 */
let rotateVect = (vector, rotation) => {
  const rotationInRad = rotation * Math.PI / 180;
  const rotationMatrix = [
    [Math.cos(rotationInRad), -Math.sin(rotationInRad)],
    [Math.sin(rotationInRad),  Math.cos(rotationInRad)]
  ];

  return math.multiply(rotationMatrix, vector);
};

/**
 * Utility function to create Model in GameState
 *
 * @return {Model}
 */
let createModelInGameState = () => {
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);
  gameModel._currentState = 1;
  
  return gameModel;
};

/**
 * Unit tests
 *
 */
test('Verify correct control object used in updateFrame()', () => {
  let mockUpdateState = jest.spyOn(go.GameObject.prototype, 'updateState');
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

  // Make sure game model does not update model without first input
  gameModel.updateFrame();
  expect(mockUpdateState).not.toHaveBeenCalled();
  mockUpdateState.mockReset();

  // Make sure game model recognizes input
  let controlInput = new intf.Control();
  controlInput.rotate = intf.Control.rotateFullCw;
  controlInput.thrust = true;
  controlInput.shoot = true;

  inputQueue.enqueue(controlInput);
  gameModel.updateFrame();
  expect(mockUpdateState).toHaveBeenCalledWith(
    controlInput,
    expect.anything());
  mockUpdateState.mockReset();

  // Make sure game model uses last input if there is none
  gameModel.updateFrame();
  expect(mockUpdateState).toHaveBeenCalledWith(
    controlInput,
    expect.anything());
  mockUpdateState.mockRestore();
});

test('Test elapsed time is calculated correctly between frames', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;
  let startTime = new Date().getTime();
  
  // Verify last call's 'elapsedTime' parameter is less than test length
  let mockUpdateState = jest.spyOn(go.GameObject.prototype, 'updateState');

  do {
    inputQueue.enqueue(new intf.Control());
    gameModel.updateFrame();
  } while ((new Date().getTime() - startTime) < 1000);

  let lastCall = mockUpdateState.mock.calls[
    mockUpdateState.mock.calls.length-1];

  expect(lastCall[1]).toBeCloseTo(0);
  mockUpdateState.mockRestore();
});

test('Test window resizing', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

  let control = new intf.Control();
  control.windowSize = [100, 100];

  inputQueue.enqueue(control);
  gameModel.updateFrame();

  let frame = outputQueue.dequeue();
  expect(frame.windowSize).toEqual(control.windowSize);
});

test('Test that extra controls are stacked', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

  let dummyControl = new intf.Control();
  inputQueue.enqueue(dummyControl);
  gameModel.updateFrame();

  let control1 = new intf.Control();
  control1.rotate = 0;
  control1.shoot = true;
  control1.thrust = true;
  control1.windowSize = [10, 10];
  inputQueue.enqueue(control1);

  let control2 = new intf.Control();
  control2.rotate = 1;
  control2.shoot = false;
  control2.thrust = false;
  control2.windowSize = [100, 100];
  inputQueue.enqueue(control2);
  
  let mockUpdateState = jest.spyOn(go.GameObject.prototype, 'updateState');
  gameModel.updateFrame();

  let expectedControl = new intf.Control();
  expectedControl.rotate = control2.rotate;
  expectedControl.shoot = control1.shoot;
  expectedControl.thrust = control1.thrust;
  expectedControl.windowSize = control2.windowSize;
  expect(mockUpdateState).toHaveBeenCalledWith(
    expectedControl,
    expect.anything());
  
  mockUpdateState.mockReset();
  gameModel.updateFrame();

  expectedControl = control2;
  expect(mockUpdateState).toHaveBeenCalledWith(
    expectedControl,
    expect.anything());
  
  mockUpdateState.mockRestore();
});

test('Test garbage is collected at end of each frame update', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;
  let control = new intf.Control()

  inputQueue.enqueue(control);
  gameModel.updateFrame();

  let objList = gameModel._models[gameModel._currentState]._objectList;
  let origObjListLen = objList.length;
  objList[0].isGarbage = true;
  gameModel.updateFrame();

  objList = gameModel._models[gameModel._currentState]._objectList;
  expect(objList.length).toEqual(origObjListLen - 1);
});

test('Test objects are no longer added after 0 lives', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;
  gameModel._score.lives = 0;

  let control = new intf.Control();
  inputQueue.enqueue(control);
  gameModel.updateFrame();
  
  let frame = Array.from(outputQueue.dequeue());
  expect(frame.length).toEqual(0);
});

test('Test score overlay added when lives > 0', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

  let control = new intf.Control();
  control.windowSize = [0, 0];
  inputQueue.enqueue(control);
  gameModel.updateFrame();
  
  let frame = outputQueue.dequeue();
  expect(frame.textObjects.length).toEqual(2);
  expect(frame.textObjects.find((element) => element.text === 'SCORE: 0'))
    .toBeTruthy();
  expect(frame.textObjects.find(
    (element) => element.text === `LIVES: ${intf.ScoreKeeper.startingLives}`))
    .toBeTruthy();
});

test('Test GAME OVER added when lives === 0', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;
  gameModel._score.lives = 0;

  let control = new intf.Control();
  control.windowSize = [0, 0];
  inputQueue.enqueue(control);
  gameModel.updateFrame();
  
  let frame = outputQueue.dequeue();
  expect(frame.textObjects.length).toEqual(2);
  expect(frame.textObjects.find((element) => element.text === 'SCORE: 0'))
    .toBeTruthy();
  expect(frame.textObjects.find((element) => element.text === 'GAME OVER'))
    .toBeTruthy();
});

test('Test the model starts with welcome screen', () => {
  let input = new intf.Queue();
  let output = new intf.Queue();
  let gameModel = new model.Model(input, output);
  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  input.enqueue(control);
  gameModel.updateFrame();

  let frame = output.dequeue();
  expect(frame.textObjects.find(
    (element) => element.text === 'ASTEROIDS'))
    .toBeTruthy();
  expect(frame.textObjects.find(
    (element) => element.text === 'PRESS ANY BUTTON TO CONTINUE'))
    .toBeTruthy();
});

test('Test the state is switched when frame is falsy', () => {
  let mockState = jest.spyOn(model.BaseStateModel.prototype, 'updateFrame')
      .mockImplementation((control) => undefined);
  
  let input = new intf.Queue();
  let output = new intf.Queue();
  let gameModel = new model.Model(input, output);
  gameModel._score.lives = 10;
  gameModel._score.score = 1000;
  
  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  input.enqueue(control);

  let currentState = gameModel._currentState;
  gameModel.updateFrame();
  expect(gameModel._currentState).toEqual(currentState + 1);

  gameModel.updateFrame();
  expect(gameModel._currentState).toEqual(0);
  expect(gameModel._score.lives).toEqual(intf.ScoreKeeper.startingLives);

  mockState.mockRestore();
});

test('Test model is reset between states', () => {
  let mockDone = jest.spyOn(model.WelcomeStateModel.prototype, '_isModelDone')
      .mockImplementation((control) => true);

  let input = new intf.Queue();
  let output = new intf.Queue();
  let gameModel = new model.Model(input, output);
  gameModel._models[gameModel._currentState+1]._objectList.push(
    new go.Alien([0, 0]));

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  input.enqueue(control);
  
  gameModel.updateFrame();
  expect(gameModel._models[gameModel._currentState]._objectList.length)
    .toEqual(0);

  mockDone.mockRestore();
});

test('Test generator is reset between states', () => {
  let mockState = jest.spyOn(model.BaseStateModel.prototype, 'updateFrame')
      .mockImplementation((control) => undefined);

  let input = new intf.Queue();
  let output = new intf.Queue();
  let gameModel = new model.Model(input, output);
  gameModel._models[gameModel._currentState+1]._generator._level = 4;

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  input.enqueue(control);
  
  gameModel.updateFrame();
  expect(gameModel._models[gameModel._currentState]._generator._level)
    .toEqual(1);

  mockState.mockRestore();
});

test('Test welcome screen is done when control toggled', () => {
  let gameModel = new model.WelcomeStateModel();

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  expect(gameModel.updateFrame(control)).toBeTruthy();

  control.thrust = true;
  expect(gameModel.updateFrame(control)).toBeFalsy();
});

test('Test game model is done when lives are exhausted', () => {
  let mockTime = jest.spyOn(
    model.BaseStateModel.prototype,
    '_calculateElapsedTime').
      mockImplementation(() => model.BaseStateModel.timeInGameOver*2);

  let score = new intf.ScoreKeeper();
  let gameModel = new model.GameStateModel(score);

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  expect(gameModel.updateFrame(control)).toBeTruthy();

  score.lives = 0;
  expect(gameModel.updateFrame(control)).toBeFalsy();
});
