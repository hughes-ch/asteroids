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
import * as objModels from '../src/modules/objModels.js'
import {RotateState} from '../src/modules/controller.js'

test('Test object decomposition', () => {
  let coordinates = [100, 100];
  let spaceship = new model.Spaceship(coordinates, 0);
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
  expect(array[0].type).toEqual(objModels.ModelType.spaceship);
  expect(array[0].vertices[0][0]).not.toBeNaN();
});

test('Test that movement is calculated correctly with thruster on', () => {
  let origObjLocation = [100, 100];
  let spaceship = new model.Spaceship(origObjLocation, 0);
  let control = {
    rotate: 0,
    thrust: true,
    shoot: false
  };

  // First, calculate with uninitialized time. This should give an approx
  // equal position to the origObjLocation. Note that we need to calculate
  // within tolerance since calculation uses Date objects.
  spaceship.updateState(control);
  expect(spaceship._movement)
    .toEqual([0, spaceship._model.maxSpeed])

  let tolerance = spaceship._model.maxSpeed/100;
  let posDifference = math.subtract(
    spaceship._coordinates, origObjLocation);

  for (let coord of posDifference) {
    expect(coord).toBeLessThan(tolerance);
  }

  // Next, calculate with a time one second in past.
  spaceship._lastUpdateTime = new Date(
    spaceship._lastUpdateTime - 1000 /* ms */);

  spaceship.updateState(control);
  expect(spaceship._movement)
    .toEqual([0, spaceship._model.maxSpeed])

  let posEstimate = math.add(
    origObjLocation, spaceship._movement);

  posDifference = math.abs(
    math.subtract(
      spaceship._coordinates,
      posEstimate));

  for (let coord of posDifference) {
    expect(coord).toBeLessThan(tolerance);
  }
});

test('Test that movement is calculated correctly with thruster off', () => {
  let origObjLocation = [100, 100];
  let spaceship = new model.Spaceship(origObjLocation, 0);
  let control = {
    rotate: 0,
    thrust: false,
    shoot: false
  };

  let currentTime = new Date();
  spaceship._lastUpdateTime = new Date( currentTime - 1000 /* ms */);

  spaceship.updateState(control);
  expect(spaceship._movement).toEqual([0, 0]);

  let tolerance = spaceship._model.maxSpeed/100;
  let posDifference = math.subtract(
    spaceship._coordinates, origObjLocation);

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
    rotate: RotateState.none,
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

test('Test that rotation is accounted for in GameObject', () => {
  const origRotation = 50;
  let spaceship = new model.Spaceship([100, 100], origRotation);
  const control = {
    rotate: RotateState.cw,
    thrust: false,
    shoot: false
  };

  // First, calculate with uninitialized time. This should give an approx
  // equal position to the original rotation. Note that we need to calculate
  // within tolerance since calculation uses Date objects.
  spaceship.updateState(control);

  let tolerance = spaceship._model.rotationSpeed / 100;
  let rotDifference = Math.abs(spaceship._rotation - origRotation);
  expect(rotDifference).toBeLessThan(tolerance);

  // Next, calculate with a time one second in past.
  spaceship._lastUpdateTime = new Date(
    spaceship._lastUpdateTime - 1000 /* ms */);

  spaceship.updateState(control);
  
  let estimatedRotation = spaceship._normalizeRotation(
    origRotation + spaceship._model.rotationSpeed);
  
  rotDifference = Math.abs(spaceship._rotation - estimatedRotation);
  expect(rotDifference).toBeLessThan(tolerance);

  // Verify CCW 
  spaceship._lastUpdateTime = new Date(
    spaceship._lastUpdateTime - 1000 /* ms */);
  
  control.rotate = RotateState.ccw;
  spaceship.updateState(control);
  
  estimatedRotation = spaceship._normalizeRotation(
    estimatedRotation - spaceship._model.rotationSpeed);
  
  rotDifference = Math.abs(spaceship._rotation - estimatedRotation);
  expect(rotDifference).toBeLessThan(tolerance);
});

test('Test that vertices rotated in decomposition of GameObject', () => {
  const rotation = 50;
  let spaceship = new model.Spaceship([100, 100], rotation);
  const rotatedModel = spaceship.decompose().vertices;

  const rotationInRad = rotation * Math.PI / 180;
  const rotationMatrix = [
    [Math.cos(rotationInRad), -Math.sin(rotationInRad)],
    [Math.sin(rotationInRad),  Math.cos(rotationInRad)]
  ];

  const objModel = objModels.Spaceship.vertices;
  for (let vertexIdx = 0; vertexIdx < objModel.length; vertexIdx++) {
    const rotatedVertex = math.multiply(rotationMatrix, objModel[vertexIdx]);

    for (let coordIdx = 0; coordIdx < rotatedVertex.length; coordIdx++) {
      expect(rotatedVertex[coordIdx])
        .toBeCloseTo(rotatedModel[vertexIdx][coordIdx]);
    }
  }
});

test('Test that invalid object types result in exception', () => {
  expect(() => {
    new model.GameObject('notAType', {});
  }).toThrow();
});
