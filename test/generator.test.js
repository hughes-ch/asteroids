'use strict';
/**
 * Tests for generator.js
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
 */
test('Test the GameStateModel initializes correctly', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

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

test('Test thruster model removed after thrusting', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

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

test('Test new missile created on "shoot"', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

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
  let spaceship = new go.Spaceship(coordinates, rotation);
  gameObjects.push(spaceship);

  let control = new intf.Control();
  control.windowSize = [3440, 1440];
  control.shoot = true;

  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
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

test('Test generator timer', () => {
  let mockCreate = jest.spyOn(
    gen.GameplayGenerator.prototype,
    '_createNewAsteroids')
      .mockImplementation(() => undefined);

  let control = new intf.Control();
  control.windowSize = [100, 100];

  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  generator.makeNewObjectsFor(control);
  generator.updateState([], gen.GameplayGenerator.timeToGenerateAsteroid / 2);
  generator.makeNewObjectsFor(control);
  expect(mockCreate).not.toHaveBeenCalled()

  generator.updateState([], gen.GameplayGenerator.timeToGenerateAsteroid * 2);
  generator.makeNewObjectsFor(control);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  
  mockCreate.mockRestore();
});

test('Test generator only makes asteroids/aliens when none left', () => {
  let mockRandom = jest.spyOn(Math, 'random')
      .mockImplementation(() => 0);
  
  let objList = [];
  objList.push(new go.Spaceship([1000, 1000], 0));
  objList.push(new go.Asteroid([0, 0], go.Asteroid.largeScale));

  let control = new intf.Control();
  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);
  expect(generator._actions.length).toEqual(0);

  objList.pop();
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);
  
  // Expect one command for asteroid, one for alien
  expect(generator._actions.length).toEqual(2); 

  mockRandom.mockRestore();
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
    
    objList.push(new go.Spaceship(spaceshipCoordinates, 0));
    
    // Generate asteroids - make sure they're not too close
    let control = new intf.Control();
    control.windowSize = screenSize;
    
    let keeper = new intf.ScoreKeeper();
    let generator = new gen.GameplayGenerator(keeper);
    generator.updateState(objList, 0);
    generator.makeNewObjectsFor(control);
    generator.updateState(
      objList,
      gen.GameplayGenerator.timeToGenerateAsteroid * 2);
    
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
            gen.GameplayGenerator.minSafeDistancePercent;
        
        expect(distance).toBeGreaterThanOrEqual(minDistance);
      }
    }
  }
});

test('Test number of asteroids generated per level', () => {
  let mockCalculate = jest.spyOn(
    gen.GameplayGenerator.prototype,
    '_calculateNewAsteroidPos')
      .mockImplementation(() => [0, 0]);

  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  
  for (let ii = 1; ii < 10; ii++) {

    let objList = [new go.Spaceship([100, 100], 0)];
    generator.updateState(objList, 0);
    generator.makeNewObjectsFor(control);
    generator.updateState(
      objList,
      gen.GameplayGenerator.timeToGenerateAsteroid * 2);
    
    generator.makeNewObjectsFor(control);

    const isAsteroid = (element) =>
          element.type === objModels.ModelType.asteroid;
    
    expect(objList.filter(isAsteroid).length).toEqual(
      gen.GameplayGenerator.startingAsteroidCount + Math.floor(ii/2));
  }

  mockCalculate.mockRestore();
});

test('Test number of asteroids generated with no ship', () => {
  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  
  let objList = [new go.Spaceship([0, 0], 0)];
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);

  objList = [];
  generator.updateState(
    objList,
    gen.GameplayGenerator.timeToGenerateAsteroid * 2);
  
  generator.makeNewObjectsFor(control);

  const isAsteroid = (element) =>
        element.type === objModels.ModelType.asteroid;
  
  expect(objList.filter(isAsteroid).length).toEqual(0);
});

test('Test asteroid calculation when not enough room on screen', () => {
  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  let control = new intf.Control();
  let objList = [];

  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);
  generator.updateState(
    objList,
    gen.GameplayGenerator.timeToGenerateAsteroid * 2);
  
  generator.makeNewObjectsFor(control);

  const isAsteroid = (element) =>
        element.type === objModels.ModelType.asteroid;
  
  expect(objList.filter(isAsteroid).length).toEqual(0);
});

test('Verify the generator creates a new ship after one is destroyed', () => {
  // Initialize model with spaceship
  let control = new intf.Control();
  let gameObjects = [ new go.Spaceship([100, 100], 0) ];
  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
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
    gen.GameplayGenerator.timeBetweenLives * 2);
  
  generator.makeNewObjectsFor(control);
  
  expect(gameObjects.filter(
    (element) => element.type === objModels.ModelType.spaceship).length)
    .toEqual(1);
});

test('Test there is no thruster added with no ship', () => {
  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  generator._isGameInitialized = true;
  
  let objList = [];
  let control = new intf.Control();
  control.thrust = true;
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);

  expect(objList.length).toBe(0);
});

test('Test blaster is shot at spaceship', () => {
  let mockRandom = jest.spyOn(Math, 'random')
      .mockImplementation(() => 0);

  let objList = [
    new go.Alien([100, 100]),
    new go.Spaceship([100, 200], 0),
  ];

  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);

  generator.updateState(
    objList,
    gen.GameplayGenerator.nominalBlasterTime + 0.1);

  generator.makeNewObjectsFor(control);
  
  let blaster = objList.find(
    (element) => element.type === objModels.ModelType.blaster);
  
  let travelAngle = (
    Math.atan2(blaster.movement[1], blaster.movement[0]) * 180/Math.PI) + 90;
  
  expect(Math.abs(travelAngle))
    .toBeGreaterThanOrEqual(gen.GameplayGenerator.blasterCone/2);

  mockRandom.mockReset();
});

test('Test initial alien location', () => {
  let objList = [];
  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);
  generator.updateState(
    objList,
    gen.GameplayGenerator.timeToGenerateAsteroid * 2);

  // Create alien on left side of the screen
  let mockRandom = jest.spyOn(Math, 'random')
    .mockImplementation(() => 0)

  generator._createAlien.call(generator, control);
  let alien = objList.find(
    element => element.type === objModels.ModelType.alien);

  expect(alien.coordinates[0]).toEqual(control.windowSize[1]);

  // Create alien on right side of screen
  mockRandom.mockRestore();
  mockRandom = jest.spyOn(Math, 'random')
    .mockImplementation(() => 0.99)

  objList = [];
  generator.updateState(objList, 0);
  generator._createAlien.call(generator, control);
  alien = objList.find(element => element.type === objModels.ModelType.alien);
  expect(alien.coordinates[0]).toEqual(0);

  mockRandom.mockRestore();
});

test('Test blaster generation with no ship', () => {
  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  generator.updateState([], 0);
  generator.makeNewObjectsFor(control);

  // As long as this handles gracefully, assume success
  let objList = [];
  generator.updateState(objList, 0);
  generator._createBlaster.call(generator, control);
});

test('Test blaster generation with no alien', () => {
  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  let objList = [];
  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);

  // As long as this handles gracefully, assume success
  generator.updateState(objList, 0);
  generator._createBlaster.call(generator, control);
});

test('Test missile generation with no ship', () => {
  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  let keeper = new intf.ScoreKeeper();
  let generator = new gen.GameplayGenerator(keeper);
  generator.updateState([], 0);
  generator.makeNewObjectsFor(control);

  // As long as this handles gracefully, assume success
  let objList = [];
  generator.updateState(objList, 0);
  generator._createNewMissile.call(generator, control);
});

test('Test demo generator creates periodic aliens', () => {
  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  let objList = [];
  let generator = new gen.DemoGenerator();
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);
  expect(generator._actions.findValue(
    generator._createAlien, generator._compareFuncs))
    .toBeGreaterThanOrEqual(0);

  generator.updateState(
    objList,
    gen.ObjectGenerator.nominalTimeBetweenAliens*2);

  generator.makeNewObjectsFor(control);

  generator.updateState(
    objList,
    gen.ObjectGenerator.nominalTimeBetweenAliens*2);
  
  generator.makeNewObjectsFor(control);
  
  expect(generator._actions.findValue(
    generator._createAlien, generator._compareFuncs))
    .toBeGreaterThanOrEqual(0);
});

test('Test demo generator creates asteroids', () => {
  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  let objList = [];
  let generator = new gen.DemoGenerator();
  generator.updateState(objList, 0);
  generator.makeNewObjectsFor(control);
  expect(objList.length).toEqual(gen.DemoGenerator.startingNumAsteroids);
});
