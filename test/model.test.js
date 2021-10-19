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
 * Unit tests
 *
 */
test('Verify correct control object used in updateFrame()', () => {
  let mockUpdateState = jest.spyOn(go.GameObject.prototype, 'updateState');
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

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
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);
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
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

  let control = new intf.Control();
  control.windowSize = [100, 100];

  inputQueue.enqueue(control);
  gameModel.updateFrame();

  let frame = outputQueue.dequeue();
  expect(frame.windowSize).toEqual(control.windowSize);
});

test('Test that extra controls are stacked', () => {
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

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
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);
  let control = new intf.Control()

  inputQueue.enqueue(control);
  
  gameModel.updateFrame();
  gameModel._currentState._objectList[0].isGarbage = true;
  gameModel.updateFrame();
  expect(gameModel._currentState._objectList.length).toEqual(0);
});

test('Test the collection of a complex collision', () => {
  let keeper = new model.ScoreKeeper();
  let origLives = keeper.lives;
  
  let missile = new go.Missile([0, 0], [0, 0], 0);
  let alien = new go.Alien([0, 0]);
  keeper.collectScore(missile, alien);

  let spaceship = new go.Spaceship([100, 100], 0);
  let asteroid = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  keeper.collectScore(spaceship, asteroid);

  expect(keeper.lives)
    .toEqual(origLives - spaceship.score().livesLost);
  expect(keeper.score)
    .toEqual(alien.score().scoreIncrease + asteroid.score().scoreIncrease);
});

test('Test that non-owned collisions are not counted', () => {
  let keeper = new model.ScoreKeeper();
  let alien = new go.Alien([0, 0]);
  let asteroid = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  keeper.collectScore(alien, asteroid);

  expect(keeper.score).toEqual(0);
});

test('Test that the game starts with three lives', () => {
  expect(new model.ScoreKeeper().lives).toEqual(3);
});

test('Test a new ship is added every 10000 points', () => {
  let keeper = new model.ScoreKeeper();
  keeper.lives = 3;
  keeper.score = (model.ScoreKeeper.numPointsForNewLife*2) - 1;

  let missile = new go.Missile([0, 0], [0, 0], 0);
  let alien = new go.Alien([0, 0]);
  keeper.collectScore(missile, alien);

  expect(keeper.lives).toEqual(4);
});

test('Test objects are no longer added after 0 lives', () => {
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);
  gameModel._score.lives = 0;

  let control = new intf.Control();
  inputQueue.enqueue(control);
  gameModel.updateFrame();
  
  let frame = Array.from(outputQueue.dequeue());
  expect(frame.length).toEqual(0);
}); 
