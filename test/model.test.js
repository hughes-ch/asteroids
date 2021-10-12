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
test('Test object decomposition', () => {
  let coordinates = [100, 100];
  let spaceship = new model.Spaceship(coordinates, 0);
  let object = spaceship.decompose()[0];
  
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

test('Test that movement is calculated correctly with thrust', () => {
  // Request a thrusting, rotating spaceship
  let origObjLocation = [100, 100];
  let origRotation = 0;
  let spaceship = new model.Spaceship(origObjLocation, origRotation);
  let control = {
    rotate: RotateState.cw,
    thrust: true,
    shoot: false
  };

  // Calculate expected velocity. Note that rotation calculation done in
  // another unit test.
  let elapsedSeconds = 0.5
  spaceship.updateState(control, elapsedSeconds);
  
  let expectedVelocity = math.multiply(
    rotateVect([0, spaceship._model.maxThrust], spaceship._rotation),
    elapsedSeconds);

  let tolerance = 1;
  let velDiff = math.abs(math.subtract(spaceship._movement, expectedVelocity));
  
  for (let velDiffComponent of Array.from(velDiff)) {
    expect(velDiffComponent).toBeLessThan(tolerance);
  }

  // Calculate expected position.
  let expectedPosition = math.add(
    origObjLocation,
    math.multiply(spaceship._movement, elapsedSeconds));

  let posDiff = math.abs(
    math.subtract(spaceship._coordinates, expectedPosition));
  
  for (let posDiffComponent of Array.from(posDiff)) {
    expect(posDiffComponent).toBeLessThan(tolerance);
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

  spaceship.updateState(control, 1);
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
  }, expect.anything());
  
  mockUpdateState.mockReset();

  // Make sure game model recognizes input
  let controlInput = {
    rotate: -1,
    thrust: true,
    shoot: true
  };

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

test('Test that rotation is accounted for in GameObject', () => {
  const origRotation = 50;
  let spaceship = new model.Spaceship([100, 100], origRotation);
  const control = {
    rotate: RotateState.cw,
    thrust: false,
    shoot: false
  };

  // Verify CW
  let timeInterval = 1;
  spaceship.updateState(control, timeInterval);
  
  let estimatedRotation = spaceship._normalizeRotation(
    origRotation + spaceship._model.rotationSpeed);
  
  expect(spaceship._rotation).toBeCloseTo(estimatedRotation, 1);

  // Verify CCW 
  control.rotate = RotateState.ccw;
  spaceship.updateState(control, timeInterval);
  
  estimatedRotation = spaceship._normalizeRotation(
    estimatedRotation - spaceship._model.rotationSpeed);
  
  expect(spaceship._rotation).toBeCloseTo(estimatedRotation, 1);
});

test('Test that vertices rotated in decomposition of GameObject', () => {
  const rotation = 50;
  let spaceship = new model.Spaceship([100, 100], rotation);
  const rotatedModel = spaceship.decompose()[0].vertices;

  const objModel = objModels.Spaceship.vertices;
  for (let vertexIdx = 0; vertexIdx < objModel.length; vertexIdx++) {
    const rotatedVertex = rotateVect(objModel[vertexIdx], rotation);

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

test('Test drag', () => {
  // Initialize moving object
  let origObjLocation = [100, 100];
  let origRotation = 0;
  let spaceship = new model.Spaceship(origObjLocation, origRotation);
  let control = {
    rotate: RotateState.none,
    thrust: false,
    shoot: false,
  };

  let currentMovementVect = [100, 100];
  spaceship._movement = currentMovementVect;

  let elapsedSeconds = 0.3;
  spaceship.updateState(control, elapsedSeconds);

  // Calculate expected velocity. 
  let dragEffect = math.multiply(
    math.multiply(currentMovementVect, spaceship._model.drag),
    elapsedSeconds);

  let expectedVelocity = math.subtract(currentMovementVect, dragEffect);
  for (let ii = 0; ii < expectedVelocity.length; ii++) {
    expect(spaceship._movement[ii]).toBeCloseTo(expectedVelocity[ii], 1)
  }
});

test('Test thruster model updated during thrust', () => {
  // Make sure position matches updated spaceship exactly
  let inputQueue = new containers.Queue();
  let outputQueue = new containers.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

  let control = {
    rotate: RotateState.cw,
    thrust: true,
    shoot: false,
  };

  let startTime = new Date().getTime();
  inputQueue.enqueue(control);

  do {
    outputQueue.dequeue();
    gameModel.updateFrame();
  } while ((new Date().getTime() - startTime) < 1000);    

  let frame = outputQueue.dequeue();
  let array = Array.from(frame);
  expect(array.length).toEqual(2);
  expect(array[1].type).toEqual(objModels.ModelType.thruster);
  
  for (let ii = 0; ii < array[0].translation.length; ii++) {
    expect(array[0].translation[ii]).toBeCloseTo(array[1].translation[ii], 1);
  }
});

test('Test elapsed time is calculated correctly between frames', () => {
  let inputQueue = new containers.Queue();
  let outputQueue = new containers.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);
  let startTime = new Date().getTime();
  
  // Verify last call's 'elapsedTime' parameter is less than test length
  let mockUpdateState = jest.spyOn(model.GameObject.prototype, 'updateState');

  do {
    gameModel.updateFrame();
  } while ((new Date().getTime() - startTime) < 1000);

  let lastCall = mockUpdateState.mock.calls[
    mockUpdateState.mock.calls.length-1];

  expect(lastCall[1]).toBeCloseTo(0);
  mockUpdateState.mockRestore();
});

test('Test thruster model removed after thrusting', () => {
  let inputQueue = new containers.Queue();
  let outputQueue = new containers.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

  let control = {
    rotate: RotateState.none,
    thrust: true,
    shoot: false,
  };

  inputQueue.enqueue(control);
  gameModel.updateFrame();
  outputQueue.dequeue();

  control.thrust = false;
  inputQueue.enqueue(control);
  gameModel.updateFrame();

  let frame = outputQueue.dequeue();
  let array = Array.from(frame);
  expect(array.length).toEqual(1);
});
