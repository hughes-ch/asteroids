'use strict';
/**
 * Tests for gameObject.js
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
 * Cleanup and teardown
 */
beforeEach(() => {
  go.GameObject.getDevicePixelRatio = jest.fn().mockReturnValue(1);
}); 

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Tests
 */
test('Test object decomposition', () => {
  let coordinates = [100, 100];
  let spaceship = new go.Spaceship(coordinates, 0);
  let object = spaceship.decompose();
  
  expect(object.translation).toEqual(coordinates);
});

test('Test that movement is calculated correctly with thrust', () => {
  // Request a thrusting, rotating spaceship
  let origObjLocation = [100, 100];
  let origRotation = 0;
  let spaceship = new go.Spaceship(origObjLocation, origRotation);

  let control = new intf.Control();
  control.rotate = intf.Control.rotateFullCw;
  control.thrust = true;

  // Calculate expected velocity. Note that rotation calculation done in
  // another unit test.
  let elapsedSeconds = 0.5
  spaceship.updateState(control, elapsedSeconds);
  
  let expectedVelocity = math.multiply(
    rotateVect([0, spaceship._model.maxThrust], spaceship.rotation),
    elapsedSeconds);

  let tolerance = 1;
  let velDiff = math.abs(math.subtract(spaceship.movement, expectedVelocity));
  
  for (let velDiffComponent of Array.from(velDiff)) {
    expect(velDiffComponent).toBeLessThan(tolerance);
  }

  // Calculate expected position.
  let expectedPosition = math.add(
    origObjLocation,
    math.multiply(spaceship.movement, elapsedSeconds));

  let posDiff = math.abs(
    math.subtract(spaceship.coordinates, expectedPosition));
  
  for (let posDiffComponent of Array.from(posDiff)) {
    expect(posDiffComponent).toBeLessThan(tolerance);
  }
});

test('Test that movement is calculated correctly with thruster off', () => {
  let origObjLocation = [100, 100];
  let spaceship = new go.Spaceship(origObjLocation, 0);
  let control = new intf.Control();

  spaceship.updateState(control, 1);
  expect(spaceship.movement).toEqual([0, 0]);

  let tolerance = spaceship._model.maxSpeed/100;
  let posDifference = math.subtract(
    spaceship.coordinates, origObjLocation);

  for (let coord of posDifference) {
    expect(coord).toBeLessThan(tolerance);
  }
});

test('Test that rotation is accounted for in GameObject', () => {
  const origRotation = 50;
  let spaceship = new go.Spaceship([100, 100], origRotation);
  
  let control = new intf.Control();
  control.rotate = intf.Control.rotateFullCw;

  // Verify CW
  let timeInterval = 1;
  spaceship.updateState(control, timeInterval);
  
  let estimatedRotation = spaceship._normalizeRotation(
    origRotation + spaceship._model.rotationSpeed);
  
  expect(spaceship.rotation).toBeCloseTo(estimatedRotation, 1);

  // Verify CCW 
  control.rotate = intf.Control.rotateFullCcw;
  spaceship.updateState(control, timeInterval);
  
  estimatedRotation = spaceship._normalizeRotation(
    estimatedRotation - spaceship._model.rotationSpeed);
  
  expect(spaceship.rotation).toBeCloseTo(estimatedRotation, 1);
});

test('Test that vertices rotated in decomposition of GameObject', () => {
  const rotation = 50;
  let spaceship = new go.Spaceship([100, 100], rotation);
  const rotatedModel = spaceship.decompose().vertices;

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
    new go.GameObject('notAType', {});
  }).toThrow();
});

test('Test drag', () => {
  // Initialize moving object
  let origObjLocation = [100, 100];
  let origRotation = 0;
  let spaceship = new go.Spaceship(origObjLocation, origRotation);
  let control = new intf.Control();
  
  let currentMovementVect = [100, 100];
  spaceship.movement = currentMovementVect;

  let elapsedSeconds = 0.3;
  spaceship.updateState(control, elapsedSeconds);

  // Calculate expected velocity. 
  let dragEffect = math.multiply(
    math.multiply(currentMovementVect, spaceship._model.drag),
    elapsedSeconds);

  let expectedVelocity = math.subtract(currentMovementVect, dragEffect);
  for (let ii = 0; ii < expectedVelocity.length; ii++) {
    expect(spaceship.movement[ii]).toBeCloseTo(expectedVelocity[ii], 1)
  }
});

test('Test thruster model updated during thrust', () => {
  // Make sure position matches updated spaceship exactly
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

  let control = new intf.Control();
  control.rotate = intf.Control.rotateFullCw;
  control.thrust = true;

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

test('Test screen wrap', () => {
  let control = new intf.Control();
  control.windowSize = [100, 100];

  let origCoordinates = [50, 99];
  let spaceship = new go.Spaceship(origCoordinates, 0);
  spaceship.movement = [0, 10];
  spaceship.updateState(control, 1);

  expect(spaceship.coordinates[0]).toEqual(origCoordinates[0]);
  expect(spaceship.coordinates[1]).toEqual(0);

  origCoordinates = [50, 1];
  spaceship = new go.Spaceship(origCoordinates, 0);
  spaceship.movement = [0, -10];
  spaceship.updateState(control, 1);

  expect(spaceship.coordinates[0]).toEqual(origCoordinates[0]);
  expect(spaceship.coordinates[1]).toEqual(control.windowSize[1]);
});

test('Test missiles are removed after their lifetime', () => {
  let control = new intf.Control();
  control.windowSize = [50, 50];
  
  let missile = new go.Missile([0, 0], [0, 0], 0);
  missile.updateState(control, 0);
  expect(missile.isGarbage).toBe(false);

  let expectedLifeTime = math.norm(control.windowSize) *
      missile._model.lifetime / missile._model.maxSpeed;
  
  missile.updateState(control, expectedLifeTime * 2);
  expect(missile.isGarbage).toBe(true);
});

test('Test asteroid model selection', () => {
  let mockRandom = jest.spyOn(Math, 'random')
      .mockImplementation(() => 0);

  let asteroid = new go.Asteroid([0, 0], go.Asteroid.largeScale);
  expect(asteroid._model.maxSpeed).toEqual(objModels.Asteroid[0].maxSpeed);
  expect(asteroid._model.vertices[0][0])
    .toEqual(objModels.Asteroid[0].vertices[0][0] * go.Asteroid.largeScale)
  
  mockRandom.mockRestore();
});

test('Test asteroid movement calculation', () => {
  let mockRandom = jest.spyOn(Math, 'random')
      .mockImplementation(() => 0);

  let asteroid = new go.Asteroid([0, 0], go.Asteroid.largeScale);
  asteroid.updateState(new intf.Control(), 1);
  expect(asteroid.movement[0]).toEqual(0);
  expect(asteroid.movement[1])
    .toEqual(objModels.Asteroid[0].maxSpeed / go.Asteroid.largeScale)

  mockRandom.mockRestore();
});

test('Test that an asteroid/missile collision is detected', () => {
  let asteroid = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  let missile = new go.Missile([100, 100], [0, 0], 0);
  expect(missile.collidesWith(asteroid)).toBe(true);

  let asteroid2 = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  let missile2 = new go.Missile([10000, 10000], [0, 0], 0);
  expect(missile2.collidesWith(asteroid2)).toBe(false);

});

test('Test that a missile/ship collision is ignored', () => {
  let ship = new go.Spaceship([100, 100], 180);
  let missile = new go.Missile([100, 100], [0, 0], 0);
  expect(missile.collidesWith(ship)).toBe(false);
});

test('Test what happens when a missile is destroyed', () => {
  let missile = new go.Missile([100, 100], [0, 0], 0);
  let debris = missile.destroy();
  expect(debris.length).toEqual(3);
  expect(missile.isGarbage).toBe(true);

  for (let piece of debris) {
    let length = math.norm(
      math.subtract(piece._vertices[0], piece._vertices[1]));

    expect(length).toBeGreaterThan(0);
  }
});

test('Test what happens when an asteroid is destroyed', () => {
  let mockRandom = jest.spyOn(Math, 'random')
      .mockImplementation(() => 0);

  let asteroid = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  let debris = asteroid.destroy();
  expect(debris.length).toEqual(2);
  expect(asteroid.isGarbage).toBe(true);

  for (let ii = 0; ii < go.Asteroid.debrisCount; ii++) {
    expect(debris[ii]._scale).toEqual(go.Asteroid.mediumScale);
  }

  asteroid = new go.Asteroid([100, 100], go.Asteroid.mediumScale);
  debris = asteroid.destroy();
  expect(debris.length).toEqual(go.Asteroid.debrisCount);
  expect(asteroid.isGarbage).toBe(true);

  for (let ii = 0; ii < go.Asteroid.debrisCount; ii++) {
    expect(debris[ii]._scale).toEqual(go.Asteroid.smallScale);
  }

  asteroid = new go.Asteroid([100, 100], go.Asteroid.smallScale);
  debris = asteroid.destroy();
  expect(debris.length).toBeGreaterThan(0);
  expect(asteroid.isGarbage).toBe(true);

  for (let piece of debris) {
    let length = math.norm(
      math.subtract(piece._vertices[0], piece._vertices[1]));

    expect(length).toBeGreaterThan(0);
  }

  mockRandom.mockRestore();  
});

test('Test that an asteroid/ship collision is detected', () => {
  let asteroid = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  let ship = new go.Spaceship([100, 100], 0);
  expect(asteroid.collidesWith(ship)).toBe(true);
});

test('Test what happens when a ship is destroyed', () => {
  let ship = new go.Spaceship([100, 100], 0);
  let debris = ship.destroy();
  expect(ship.isGarbage).toBe(true);
  expect(debris.length).toBeGreaterThan(0);

  for (let piece of debris) {
    let length = math.norm(
      math.subtract(piece._vertices[0], piece._vertices[1]));

    expect(length).toBeGreaterThan(0);
  }
});

test('Verify garbage does not collide with other stuff', () => {
  let asteroid = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  let ship = new go.Spaceship([100, 100], 0);
  asteroid.isGarbage = true;
  expect(asteroid.collidesWith(ship)).toBe(false);
});

test('Test position changes if windowSize changes', () => {
  let ship = new go.Spaceship([100, 100], 0);
  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  ship.updateState(control, 0);

  control.windowSize = [100, 100];
  ship.updateState(control, 0);
  expect(ship.coordinates[0]).toEqual(10);
  expect(ship.coordinates[1]).toEqual(10);
});

test('Test blaster does not wrap', () => {
  let control = new intf.Control();
  control.windowSize = [100, 100];

  let blaster = new go.Blaster([1000, 1000], 0);
  blaster.updateState(control, 0);
  expect(blaster.isGarbage).toBe(true);
});

test('Test alien does not wrap', () => {
  let control = new intf.Control();
  control.windowSize = [100, 100];

  let alien = new go.Alien([1000, 1000]);
  alien.updateState(control, 0);
  expect(alien.isGarbage).toBe(true);
});

test('Test alien movement angle calculation', () => {
  let control = new intf.Control();
  control.windowSize = [100, 100];

  let alien = new go.Alien([0, 50]);
  alien.updateState(control, 0);
  expect(alien.movement[0]).toBeGreaterThan(0);
  expect(alien.movement[0]).toBeGreaterThan(alien.movement[1]);

  alien = new go.Alien([100, 50]);
  alien.updateState(control, 0);
  expect(alien.movement[0]).toBeLessThan(0);
  expect(alien.movement[0]).toBeLessThan(alien.movement[1]);
});

test('Test alien juke calculation', () => {
  let mockRandom = jest.spyOn(Math, 'random')
      .mockImplementation(() => 0.75);

  // Initialize juke and make sure it doesn't start too early
  let control = new intf.Control();
  let alien = new go.Alien([0, 50]);
  alien.updateState(control, go.Alien.jukeNominalTime/2);
  expect(alien.movement[0]).toBeGreaterThan(alien.movement[1]);

  // Verify juke is calculated correctly
  let movement = alien.movement;

  alien.updateState(control, go.Alien.jukeNominalTime);
  expect(alien.movement).not.toEqual(movement);
  expect(alien.movement[1]).toBeGreaterThan(alien.movement[0]);

  // Verify juke stops eventually
  alien.updateState(control, go.Alien.jukeLength*2);
  expect(alien.movement).toEqual(movement);
  
  mockRandom.mockRestore();
});

test('Test blaster can collide with spaceship', () => {
  let blaster = new go.Blaster([100, 100], 0);
  let spaceship = new go.Spaceship([100, 100], 0);21
  expect(blaster.collidesWith(spaceship)).toBe(true);
  expect(spaceship.collidesWith(blaster)).toBe(true);
});

test('Test blaster can collide with asteroid', () => {
  let blaster = new go.Blaster([100, 100], 0);
  let asteroid = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  expect(blaster.collidesWith(asteroid)).toBe(true);
  expect(asteroid.collidesWith(blaster)).toBe(true);
});

test('Test blaster does not collide with alien', () => {
  let blaster = new go.Blaster([100, 100], 0);
  let alien = new go.Alien([100, 100]);
  expect(blaster.collidesWith(alien)).toBe(false);
  expect(alien.collidesWith(blaster)).toBe(false);
});

test('Test alien can collide with spaceship', () => {
  let alien = new go.Alien([100, 100]);
  let spaceship = new go.Spaceship([100, 100], 0);
  expect(alien.collidesWith(spaceship)).toBe(true);
  expect(spaceship.collidesWith(alien)).toBe(true);
});

test('Test alien can collide with asteroid', () => {
  let alien = new go.Alien([100, 100]);
  let asteroid = new go.Asteroid([100, 100], go.Asteroid.largeScale);
  expect(alien.collidesWith(asteroid)).toBe(true);
  expect(asteroid.collidesWith(alien)).toBe(true);
});

test('Test alien can collide with missile', () => {
  let alien = new go.Alien([100, 100]);
  let missile = new go.Missile([100, 100], [0, 0], 0);
  expect(alien.collidesWith(missile)).toBe(true);
  expect(missile.collidesWith(alien)).toBe(true);
});

test('Test scores of each object', () => {
  let alien = new go.Alien([0, 0]);
  expect(alien.score().scoreIncrease).toBeGreaterThan(0);
  expect(alien.score().livesLost).toEqual(0);
  expect(alien.score().owned).toBe(false);
  
  let asteroidLarge = new go.Asteroid([0,0], go.Asteroid.largeScale);
  expect(asteroidLarge.score().scoreIncrease).toBeGreaterThan(0);
  expect(asteroidLarge.score().livesLost).toEqual(0);
  expect(asteroidLarge.score().owned).toBe(false);

  let asteroidMedium = new go.Asteroid([0,0], go.Asteroid.mediumScale);
  expect(asteroidMedium.score().scoreIncrease).toBeGreaterThan(0);
  expect(asteroidMedium.score().livesLost).toEqual(0);
  expect(asteroidMedium.score().owned).toBe(false);

  let asteroidSmall = new go.Asteroid([0,0], go.Asteroid.smallScale);
  expect(asteroidSmall.score().scoreIncrease).toBeGreaterThan(0);
  expect(asteroidSmall.score().livesLost).toEqual(0);
  expect(asteroidSmall.score().owned).toBe(false);

  let blaster = new go.Blaster([0, 0], 0);
  expect(blaster.score().scoreIncrease).toEqual(0);
  expect(blaster.score().livesLost).toEqual(0);
  expect(blaster.score().owned).toBe(false);

  let missile = new go.Missile([0, 0], 0);
  expect(missile.score().scoreIncrease).toEqual(0);
  expect(missile.score().livesLost).toEqual(0);
  expect(missile.score().owned).toBe(true);

  let spaceship = new go.Spaceship([0, 0], 0);
  expect(spaceship.score().scoreIncrease).toEqual(0);
  expect(spaceship.score().livesLost).toEqual(1);
  expect(spaceship.score().owned).toBe(true);

});
