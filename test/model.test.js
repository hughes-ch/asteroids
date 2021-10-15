/**
 * Tests for model.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as intf from '../src/modules/interfaces.js'
import * as math from 'mathjs'
import * as model from '../src/modules/model.js'
import * as objModels from '../src/modules/objModels.js'
import {List} from 'collections/list'

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
 * Extended matchers
 *
 */
expect.extend({
  forEachIndexToMatch(received, expected, tolerance = 0) {
    if (received.length !== expected.length) {
      return {
        message: () => 
          `Sizes do not match: ${received.length} !== ${expected.length}`,
        pass: false,
      };
    }

    for (let ii = 0; ii < received.length; ii++) {
      if (math.abs(received[ii] - expected[ii]) > tolerance) {
        return {
          message: () =>
            `Index ${ii}: ${received[ii]} - ${expected[ii]} > ${tolerance}`,
          pass: false,
        };
      }
    }

    return {
      message: () => 'Arrays match',
      pass: true,
    };
  },
});

/**
 * Unit tests
 *
 */
test('Test object decomposition', () => {
  let coordinates = [100, 100];
  let spaceship = new model.Spaceship(coordinates, 0);
  let object = spaceship.decompose();
  
  expect(object.translation).toEqual(coordinates);
});

test('Test the GameStateModel initializes correctly', () => {
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

  let control = new intf.Control();
  control.windowSize = [100, 100];
  inputQueue.enqueue(control);
  gameModel.updateFrame()

  let frame = outputQueue.dequeue();
  let array = Array.from(frame);
  expect(array.length).toEqual(1);
  expect(array[0].type).toEqual(objModels.ModelType.spaceship);
  expect(array[0].vertices[0][0]).not.toBeNaN();
  expect(array[0].translation[0]).toEqual(control.windowSize[0]/2);
  expect(array[0].translation[1]).toEqual(control.windowSize[1]/2);
  expect(array[0].rotation).toEqual(180);
});

test('Test that movement is calculated correctly with thrust', () => {
  // Request a thrusting, rotating spaceship
  let origObjLocation = [100, 100];
  let origRotation = 0;
  let spaceship = new model.Spaceship(origObjLocation, origRotation);

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
  let spaceship = new model.Spaceship(origObjLocation, 0);
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

test('Verify correct control object used in updateFrame()', () => {
  let mockUpdateState = jest.spyOn(model.GameObject.prototype, 'updateState');
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

test('Test that rotation is accounted for in GameObject', () => {
  const origRotation = 50;
  let spaceship = new model.Spaceship([100, 100], origRotation);
  
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
  let spaceship = new model.Spaceship([100, 100], rotation);
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
    new model.GameObject('notAType', {});
  }).toThrow();
});

test('Test drag', () => {
  // Initialize moving object
  let origObjLocation = [100, 100];
  let origRotation = 0;
  let spaceship = new model.Spaceship(origObjLocation, origRotation);
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
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

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

test('Test elapsed time is calculated correctly between frames', () => {
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);
  let startTime = new Date().getTime();
  
  // Verify last call's 'elapsedTime' parameter is less than test length
  let mockUpdateState = jest.spyOn(model.GameObject.prototype, 'updateState');

  do {
    inputQueue.enqueue(new intf.Control());
    gameModel.updateFrame();
  } while ((new Date().getTime() - startTime) < 1000);

  let lastCall = mockUpdateState.mock.calls[
    mockUpdateState.mock.calls.length-1];

  expect(lastCall[1]).toBeCloseTo(0);
  mockUpdateState.mockRestore();
});

test('Test thruster model removed after thrusting', () => {
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

  let control = new intf.Control();
  control.shoot = true;

  inputQueue.enqueue(control);
  gameModel.updateFrame();
  outputQueue.dequeue();

  control.thrust = true;
  inputQueue.enqueue(control);
  gameModel.updateFrame();
  outputQueue.dequeue();

  control.shoot = false;
  control.thrust = false;
  inputQueue.enqueue(control);
  gameModel.updateFrame();

  let frame = outputQueue.dequeue();
  let array = Array.from(frame);
  expect(array.length).toEqual(3);

  for (let element of array) {
    expect(element.type).not.toEqual(objModels.ModelType.thruster);
  }
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

test('Test screen wrap', () => {
  let control = new intf.Control();
  control.windowSize = [100, 100];

  let origCoordinates = [50, 99];
  let spaceship = new model.Spaceship(origCoordinates, 0);
  spaceship.movement = [0, 10];
  spaceship.updateState(control, 1);

  expect(spaceship.coordinates[0]).toEqual(origCoordinates[0]);
  expect(spaceship.coordinates[1]).toEqual(0);

  origCoordinates = [50, 1];
  spaceship = new model.Spaceship(origCoordinates, 0);
  spaceship.movement = [0, -10];
  spaceship.updateState(control, 1);

  expect(spaceship.coordinates[0]).toEqual(origCoordinates[0]);
  expect(spaceship.coordinates[1]).toEqual(control.windowSize[1]);
});

test('Test new missile created on "shoot"', () => {
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);

  let control = new intf.Control();
  control.shoot = true;
  inputQueue.enqueue(control);
  gameModel.updateFrame();

  let frame = outputQueue.dequeue();
  let array = Array.from(frame);
  expect(array.length).toEqual(2);
  expect(array[1].type).toEqual(objModels.ModelType.missile);
});

test('Test new missiles move where ship is pointed', () => {
  let rotation = 100;
  let coordinates = [100, 100];
  let gameObjects = [];
  let spaceship = new model.Spaceship(coordinates, rotation);
  gameObjects.push(spaceship);

  let control = new intf.Control();
  control.windowSize = [3440, 1440];
  control.shoot = true;

  let generator = new model.ObjectGenerator();
  generator.updateState(gameObjects, 0);
  generator.makeNewObjectsFor(control);
  
  expect(gameObjects.length).toEqual(2);

  let missile = gameObjects[1];
  let travelDirection = -Math.atan2(
    missile.movement[0],
    missile.movement[1]) * (180 / Math.PI);
  
  expect(travelDirection).toBeCloseTo(spaceship.rotation, 1);

  let rotatedNose = math.add(
    rotateVect(spaceship._model.vertices[0], spaceship.rotation),
    spaceship.coordinates);
  
  expect(missile.coordinates).forEachIndexToMatch(rotatedNose);
});

test('Test missiles are removed after their lifetime', () => {
  let missile = new model.Missile([0, 0], [0, 0], 0);
  missile.updateState(new intf.Control(), objModels.Missile.lifetime/2);
  expect(missile.isGarbage).toBe(false);

  missile.updateState(new intf.Control(), objModels.Missile.lifetime);
  expect(missile.isGarbage).toBe(true);
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
  
  let mockUpdateState = jest.spyOn(model.GameObject.prototype, 'updateState');
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

test('Test asteroid model selection', () => {
  let mockRandom = jest.spyOn(Math, 'random')
      .mockImplementation(() => 0);

  let asteroid = new model.Asteroid([0, 0], model.Asteroid.largeScale);
  expect(asteroid._model.maxSpeed).toEqual(objModels.Asteroid[0].maxSpeed);
  expect(asteroid._model.vertices[0][0])
    .toEqual(objModels.Asteroid[0].vertices[0][0] * model.Asteroid.largeScale)
  
  mockRandom.mockRestore();
});

test('Test asteroid movement calculation', () => {
  let mockRandom = jest.spyOn(Math, 'random')
      .mockImplementation(() => 0);

  let asteroid = new model.Asteroid([0, 0], model.Asteroid.largeScale);
  asteroid.updateState(new intf.Control(), 1);
  expect(asteroid.movement[0]).toEqual(0);
  expect(asteroid.movement[1])
    .toEqual(objModels.Asteroid[0].maxSpeed / model.Asteroid.largeScale)

  mockRandom.mockRestore();
});

test('Test generator timer', () => {
  let mockCreate = jest.spyOn(
    model.ObjectGenerator.prototype,
    '_createNewAsteroids')
      .mockImplementation(() => undefined);

  let control = new intf.Control();
  control.windowSize = [100, 100];

  let generator = new model.ObjectGenerator();
  generator.makeNewObjectsFor(control);
  generator.updateState([], model.ObjectGenerator.timeToGenerateAsteroid / 2);
  generator.makeNewObjectsFor(control);
  expect(mockCreate).not.toHaveBeenCalled()

  generator.updateState([], model.ObjectGenerator.timeToGenerateAsteroid * 2);
  generator.makeNewObjectsFor(control);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  
  mockCreate.mockRestore();
});

test('Test generator only makes asteroids when none left', () => {
  let objList = [];
  objList.push(new model.Spaceship([1000, 1000], 0));
  objList.push(new model.Asteroid([0, 0], model.Asteroid.largeScale));

  let control = new intf.Control();
  let generator = new model.ObjectGenerator();
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);
  expect(generator._actions.length).toEqual(0);

  objList.pop();
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);
  expect(generator._actions.length).toEqual(1);
});

test('Test new asteroid position calculation', () => {
  // For a dozen calculations with ship in different parts of screen,
  //     1. Make sure its a safe distance away from ship
  //     2. Make sure its on canvas
  for (let ii = 0; ii < 10; ii++) {
    
    // Add new spaceship to a random point on screen
    let objList = [];
    let screenSize = [800, 600];
    let spaceshipCoordinates = [
      Math.random() * screenSize[0],
      Math.random() * screenSize[1],
    ];
    
    objList.push(new model.Spaceship(spaceshipCoordinates, 0));
    
    // Generate asteroids - make sure they're not too close
    let control = new intf.Control();
    control.windowSize = screenSize;
    
    let generator = new model.ObjectGenerator();
    generator.updateState(objList, 0);
    generator.makeNewObjectsFor(control);
    generator.updateState(
      objList,
      model.ObjectGenerator.timeToGenerateAsteroid * 2);
    
    generator.makeNewObjectsFor(control);

    for (let obj of Array.from(objList)) {
      if (obj.type === objModels.ModelType.asteroid) {
        expect(obj.coordinates[0]).toBeGreaterThanOrEqual(0);
        expect(obj.coordinates[0]).toBeLessThanOrEqual(screenSize[0]);
        
        expect(obj.coordinates[1]).toBeGreaterThanOrEqual(0);
        expect(obj.coordinates[1]).toBeLessThanOrEqual(screenSize[1]);

        let translation = [
          obj.coordinates[0] - spaceshipCoordinates[0],
          obj.coordinates[1] - spaceshipCoordinates[1],
        ];

        let distance = Math.sqrt(translation[0]**2 + translation[1]**2);
        let minDistance = Math.sqrt(
          (screenSize[0]/2)**2 +
            (screenSize[1]/2)**2) *
            model.ObjectGenerator.minSafeDistancePercent;
        
        expect(distance).toBeGreaterThanOrEqual(minDistance);
      }
    }
  }
});

test('Test number of asteroids generated per level', () => {
  let mockCalculate = jest.spyOn(
    model.ObjectGenerator.prototype,
    '_calculateNewAsteroidPos')
      .mockImplementation(() => [0, 0]);

  let generator = new model.ObjectGenerator();
  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  
  for (let ii = 1; ii < 10; ii++) {

    let objList = [new model.Spaceship([100, 100], 0)];
    generator.updateState(objList, 0);
    generator.makeNewObjectsFor(control);
    generator.updateState(
      objList,
      model.ObjectGenerator.timeToGenerateAsteroid * 2);
    
    generator.makeNewObjectsFor(control);

    const isAsteroid = (element) =>
          element.type === objModels.ModelType.asteroid;
    
    expect(objList.filter(isAsteroid).length).toEqual(
      model.ObjectGenerator.startingAsteroidCount + Math.floor(ii/2));
  }

  mockCalculate.mockRestore();
});

test('Test number of asteroids generated with no ship', () => {
  let generator = new model.ObjectGenerator();
  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  
  let objList = [new model.Spaceship([0, 0], 0)];
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);

  objList = [];
  generator.updateState(
    objList,
    model.ObjectGenerator.timeToGenerateAsteroid * 2);
  
  generator.makeNewObjectsFor(control);

  const isAsteroid = (element) =>
        element.type === objModels.ModelType.asteroid;
  
  expect(objList.filter(isAsteroid).length).toEqual(0);
});

test('Test asteroid calculation when not enough room on screen', () => {
  let generator = new model.ObjectGenerator();
  let control = new intf.Control();
  let objList = [];

  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);
  generator.updateState(
    objList,
    model.ObjectGenerator.timeToGenerateAsteroid * 2);
  
  generator.makeNewObjectsFor(control);

  const isAsteroid = (element) =>
        element.type === objModels.ModelType.asteroid;
  
  expect(objList.filter(isAsteroid).length).toEqual(0);
});

test('Test that an asteroid/missile collision is detected', () => {
  let asteroid = new model.Asteroid([100, 100], model.Asteroid.largeScale);
  let missile = new model.Missile([100, 100], [0, 0], 0);
  expect(missile.collidesWith(asteroid)).toBe(true);

  let asteroid2 = new model.Asteroid([100, 100], model.Asteroid.largeScale);
  let missile2 = new model.Missile([10000, 10000], [0, 0], 0);
  expect(missile2.collidesWith(asteroid2)).toBe(false);

});

test('Test that a missile/ship collision is ignored', () => {
  let ship = new model.Spaceship([100, 100], 180);
  let missile = new model.Missile([100, 100], [0, 0], 0);
  expect(missile.collidesWith(ship)).toBe(false);
});

test('Test what happens when a missile is destroyed', () => {
  let missile = new model.Missile([100, 100], [0, 0], 0);
  let debris = missile.destroy();
  expect(debris.length).toEqual(0);
  expect(missile.isGarbage).toBe(true);
});

test('Test what happens when an asteroid is destroyed', () => {
  let mockRandom = jest.spyOn(Math, 'random')
      .mockImplementation(() => 0);

  let asteroid = new model.Asteroid([100, 100], model.Asteroid.largeScale);
  let debris = asteroid.destroy();
  expect(debris.length).toEqual(2);
  expect(asteroid.isGarbage).toBe(true);

  for (let ii = 0; ii < model.Asteroid.debrisCount; ii++) {
    expect(debris[ii]._scale).toEqual(model.Asteroid.mediumScale);
  }

  asteroid = new model.Asteroid([100, 100], model.Asteroid.mediumScale);
  debris = asteroid.destroy();
  expect(debris.length).toEqual(model.Asteroid.debrisCount);
  expect(asteroid.isGarbage).toBe(true);

  for (let ii = 0; ii < model.Asteroid.debrisCount; ii++) {
    expect(debris[ii]._scale).toEqual(model.Asteroid.smallScale);
  }

  asteroid = new model.Asteroid([100, 100], model.Asteroid.smallScale);
  debris = asteroid.destroy();
  expect(debris.length).toEqual(0);
  expect(asteroid.isGarbage).toBe(true);

  mockRandom.mockRestore();  
});

test('Test that an asteroid/ship collision is detected', () => {
  let asteroid = new model.Asteroid([100, 100], model.Asteroid.largeScale);
  let ship = new model.Spaceship([100, 100], 0);
  expect(asteroid.collidesWith(ship)).toBe(true);
});

test('Test what happens when a ship is destroyed', () => {
  let ship = new model.Spaceship([100, 100], 0);
  let debris = ship.destroy();
  expect(ship.isGarbage).toBe(true);
  expect(debris.length).toEqual(0);
});

test('Verify the generator creates a new ship after one is destroyed', () => {
  // Initialize model with spaceship
  let control = new intf.Control();
  let gameObjects = [ new model.Spaceship([100, 100], 0) ];
  let generator = new model.ObjectGenerator();
  generator.updateState(gameObjects, 0);
  generator.makeNewObjectsFor(control);

  // Destroy spaceship
  gameObjects = [];
  generator.updateState(gameObjects, 0);
  generator.makeNewObjectsFor(control);

  // Verify spaceship added back after timer expires
  generator.updateState(gameObjects, 0);
  generator.makeNewObjectsFor(control);
  generator.updateState(
    gameObjects,
    model.ObjectGenerator.timeBetweenLives * 2);
  
  generator.makeNewObjectsFor(control);
  
  expect(gameObjects.filter(
    (element) => element.type === objModels.ModelType.spaceship).length)
    .toEqual(1);
});

test('Verify garbage does not collide with other stuff', () => {
  let asteroid = new model.Asteroid([100, 100], model.Asteroid.largeScale);
  let ship = new model.Spaceship([100, 100], 0);
  asteroid.isGarbage = true;
  expect(asteroid.collidesWith(ship)).toBe(false);
});

test('Test there is no thruster added with no ship', () => {
  let generator = new model.ObjectGenerator();
  generator._isGameInitialized = true;
  
  let objList = [];
  let control = new intf.Control();
  control.thrust = true;
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);

  expect(objList.length).toBe(0);
});

test('Test position changes if windowSize changes', () => {
  let ship = new model.Spaceship([100, 100], 0);
  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  ship.updateState(control, 0);

  control.windowSize = [100, 100];
  ship.updateState(control, 0);
  expect(ship.coordinates[0]).toEqual(10);
  expect(ship.coordinates[1]).toEqual(10);
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
