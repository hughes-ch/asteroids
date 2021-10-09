/**
 * Tests for model.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as containers from '../src/modules/containers.js'
import * as math from 'mathjs'
import * as model from '../src/modules/model.js'

test('Test object decomposition', () => {
  let coordinates = [100, 100];
  let spaceship = new model.Spaceship(coordinates);
  let object = spaceship.decompose();
  
  expect(object.translation).toEqual(coordinates);
});

test('Test the GameStateModel initializes correctly', () => {
  let inputQueue = new containers.Queue();
  let outputQueue = new containers.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

  gameModel.updateFrame()

  let frame = outputQueue.dequeue();
  let array = Array.from(frame);
  expect(array.length).toEqual(1);
  expect(array[0].type).toEqual('spaceship');
});

test('Test that movement is calculated correctly with thruster on', () => {
  let origObjLocation = [100, 100];
  let spaceship = new model.Spaceship(origObjLocation);
  let control = {
    rotate: 0,
    thrust: true,
    shoot: false
  };

  // First, calculate with uninitialized time. This should give an approx
  // equal position to the origObjLocation. Note that we need to calculate
  // within tolerance since calculation uses Date objects.
  spaceship.updateState(control);
  expect(spaceship._objParams.movement)
    .toEqual([0, spaceship._objParams.maxSpeed])

  let tolerance = spaceship._objParams.maxSpeed/100;
  let posDifference = math.subtract(
    spaceship._objParams.coordinates, origObjLocation);

  for (let coord of posDifference) {
    expect(coord).toBeLessThan(tolerance);
  }

  // Next, calculate with a time one second in past.
  spaceship._lastUpdateTime = new Date(
    spaceship._lastUpdateTime - 1000 /* ms */);

  spaceship.updateState(control);
  expect(spaceship._objParams.movement)
    .toEqual([0, spaceship._objParams.maxSpeed])

  let posEstimate = math.add(
    origObjLocation, spaceship._objParams.movement);

  posDifference = math.abs(
    math.subtract(
      spaceship._objParams.coordinates,
      posEstimate));

  for (let coord of posDifference) {
    expect(coord).toBeLessThan(tolerance);
  }
});

test('Test that movement is calculated correctly with thruster off', () => {
  let origObjLocation = [100, 100];
  let spaceship = new model.Spaceship(origObjLocation);
  let control = {
    rotate: 0,
    thrust: false,
    shoot: false
  };

  let currentTime = new Date();
  spaceship._lastUpdateTime = new Date( currentTime - 1000 /* ms */);

  spaceship.updateState(control);
  expect(spaceship._objParams.movement).toEqual([0, 0]);

  let tolerance = spaceship._objParams.maxSpeed/100;
  let posDifference = math.subtract(
    spaceship._objParams.coordinates, origObjLocation);

  for (let coord of posDifference) {
    expect(coord).toBeLessThan(tolerance);
  }
});

test('Verify correct control object used in updateFrame()', () => {
  let mockUpdateState = jest.spyOn(model.GameObject.prototype, 'updateState');
  let inputQueue = new containers.Queue();
  let outputQueue = new containers.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

  // Make sure game model correctly initializes queue with no input
  gameModel.updateFrame();
  expect(mockUpdateState).toHaveBeenCalledWith({
    rotate: 0,
    thrust: false,
    shoot: false
  });
  
  mockUpdateState.mockReset();

  // Make sure game model recognizes input
  let controlInput = {
    rotate: -1,
    thrust: true,
    shoot: true
  };

  inputQueue.enqueue(controlInput);
  gameModel.updateFrame();
  expect(mockUpdateState).toHaveBeenCalledWith(controlInput);
  mockUpdateState.mockReset();

  // Make sure game model uses last input if there is none
  gameModel.updateFrame();
  expect(mockUpdateState).toHaveBeenCalledWith(controlInput);
  mockUpdateState.mockRestore();
});
