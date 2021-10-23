'use strict';
/**
 * Defines the object generator
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as go from './gameObject.js'
import * as math from 'mathjs'
import * as objModels from './objModels.js'
import Deque from 'collections/deque'

/**
 * Creates any GameObject on screen. Base class for specific generators.
 *
 */
export class ObjectGenerator {

  /**
   * Static "constants"
   *
   */
  static get nominalTimeBetweenAliens() { return 10; }

  /**
   * Constructor
   *
   * @return {ObjectGenerator}
   */
  constructor() {
    this._actions = new Deque();
    this._gameObjects = [];
  }

  /**
   * Resets all internal state
   *
   * @return {ObjectGenerator}
   */
  resetGenerator() {
    this._actions = new Deque();
    this._gameObjects = [];
  }

  /** 
   * Updates internal timers and object list
   *
   * @param {Array}  Collection of GameObjects
   * @param {Number} elapsedTime Elapsed time since last frame (sec)
   * @return {undefined}
   */
  updateState(objList, elapsedTime) {
    this._gameObjects = objList;
    this._actions.map((action) => action.timer -= elapsedTime);
  }

  /**
   * Generates more stuff based on the control
   *
   * @param {Control} control Control for this frame
   * @return {undefined}
   */
  makeNewObjectsFor(control) {

    // Delegate to child classes to make actions
    this._addSpecificActions(control);

    // Handle any expired actions
    this._actions = this._actions.sorted((left, right) => {
      return right.timer - left.timer;
    });
    
    while(this._actions.length > 0) {
      let action = this._actions.peekBack();
      if (action.timer <= 0) {
        action.func.call(action.ctx, control);
        this._actions.pop();

      } else {
        break;
      }
    }
  }

  /**
   * Creates a new alien
   *
   * @return {undefined}
   */
  _createAlien(control) {

    let ypos = Math.random() * control.windowSize[1];
    let xpos = Math.random() > 0.5 ? 0 : control.windowSize[0];
    this._gameObjects.push(new go.Alien([xpos, ypos]));
  }

  /**
   * Create debris for colliding objects
   *
   * @param {Array}  debris  Debris to add to model
   * @return {undefined}
   */
  createDebrisFor(debris) {
    debris.forEach((newObj) => this._gameObjects.push(newObj));
  }

  /**
   * Utility to match a function
   *
   */
  _compareFuncs(elem1, elem2) {
    return elem1 === elem2.func;
  }

  /**
   * Adds actions specific to this generator.
   *
   * Since this is a base implementation, does nothing
   *
   * @param {Control}  control  Control for this gameframe
   * @return {undefined}
   */
  _addSpecificActions(control) {
    return;
  }
};

/**
 * Creates GameObjects in the background of non-gameplay screens
 *
 */
export class DemoGenerator extends ObjectGenerator {

  /**
   * Static "constants"
   *
   */
  static get startingNumAsteroids() { return 10; }

  /**
   * Constructor
   *
   * @return {ObjectGenerator}
   */
  constructor() {
    super();
  }

  /**
   * Adds actions specific to this generator.
   *
   * @param {Control}  control  Control for this gameframe
   * @return {undefined}
   */
  _addSpecificActions(control) {
    // Create asteroids if there's an empty list
    if (!this._gameObjects.find(
      (element) => element.type === objModels.ModelType.asteroid)) {

      this._actions.unshift({
        func: this._createNewAsteroids,
        timer: -1,
        ctx: this,
      });
    }

    // Create aliens periodically
    if (this._actions.findValue(this._createAlien, this._compareFuncs) < 0) {
      let nextAlienTime = (ObjectGenerator.nominalTimeBetweenAliens/2) +
          (Math.random() * ObjectGenerator.nominalTimeBetweenAliens);
      
      this._actions.unshift({
        func: this._createAlien,
        timer: nextAlienTime,
        ctx: this,
      });
    }
  }

  /**
   * Creates new asteroids
   *
   * @param {Control}  control  Control for this gameframe
   * @return {undefined}
   */
  _createNewAsteroids(control) {
    for (let ii = 0; ii < DemoGenerator.startingNumAsteroids; ii++) {
      let coordinates = [
        Math.random() * control.windowSize[0],
        Math.random() * control.windowSize[1],
      ];

      let scale = [
        go.Asteroid.largeScale,
        go.Asteroid.mediumScale,
        go.Asteroid.smallScale,
      ][Math.floor(Math.random() * 3)];
      
      this._gameObjects.push(new go.Asteroid(coordinates, scale));
    }
  }
};

/**
 * Creates any GameObject on screen during gameplay
 *
 */
export class GameplayGenerator extends ObjectGenerator {
  
  /**
   * Static "constants"
   *
   */
  static get minSafeDistancePercent() { return 0.4; }
  static get numTimesRetryAsteroid() { return 100; }
  static get nominalBlasterTime() { return 2; }
  static get startingAsteroidCount() { return 4; }
  static get timeBetweenLives() { return 3; }
  static get timeToGenerateAsteroid() { return 1.0; }
  static get blasterCone() { return 45 /* deg */; }
  
  /**
   * Constructor
   *
   * @param  {ScoreKeeper}  scorekeeper  Maintains game score
   * @return {ObjectGenerator}
   */
  constructor(scorekeeper) {
    super();
    
    this._level = 1;
    this._isGameInitialized = false;
    this._scorekeeper = scorekeeper;
  }

  /**
   * Resets all internal state
   *
   * @return {ObjectGenerator}
   */
  resetGenerator() {
    super.resetGenerator();
    this._level = 1;
    this._isGameInitialized = false;
  }

  /**
   * Adds actions specific to this generator.
   *
   * @param {Control}  control  Control for this gameframe
   * @return {undefined}
   */
  _addSpecificActions(control) {
    
    // Remove thruster 
    let spaceship = this._findShip();
    if ((spaceship === undefined || !control.thrust) &&
        (this._findThrusterIdx() >= 0)) {
      
      this._actions.unshift({
        func: this._removeThruster,
        timer: -1,
        ctx: this,
      });
    }

    // Do not add any more objects if score does not allow
    if (!this._scorekeeper.allows()) {
      return; 
    }
    
    // Make sure spaceship is always in model
    let spaceshipTimer = this._isGameInitialized ?
        GameplayGenerator.timeBetweenLives : -1;

    if (spaceship === undefined &&
        this._actions.findValue(this._createNewShip, this._compareFuncs) < 0) {
      
      this._actions.unshift({
        func: this._createNewShip,
        timer: spaceshipTimer,
        ctx: this,
      });
    }

    this._isGameInitialized = true;

    // Create asteroids if there's an empty list
    if (!this._gameObjects.find((element) => element.type === objModels.ModelType.asteroid) &&
        !this._gameObjects.find((element) => element.type === objModels.ModelType.alien) &&
        this._actions.findValue(this._createNewAsteroids, this._compareFuncs) < 0) {
      
      this._actions.unshift({
        func: this._createNewAsteroids,
        timer: GameplayGenerator.timeToGenerateAsteroid,
        ctx: this,
      });

      // Create alien spacecraft
      let firstAlienTime = (ObjectGenerator.nominalTimeBetweenAliens/2) +
          (Math.random() * ObjectGenerator.nominalTimeBetweenAliens);
      
      this._actions.unshift({
        func: this._createAlien,
        timer: firstAlienTime,
        ctx: this,
      });

      if (Math.random() > 0.5) {
        this._actions.unshift({
          func: this._createAlien,
          timer: firstAlienTime +
            (ObjectGenerator.nominalTimeBetweenAliens/2) +
            (Math.random() * ObjectGenerator.nominalTimeBetweenAliens),
          ctx: this,
        });
      }
    }

    // Add missile shooting from nose of ship
    if (control.shoot) {
      this._actions.unshift({
        func: this._createNewMissile,
        timer: -1,
        ctx: this,
      });
    }

    // Add thruster
    if (spaceship !== undefined && 
        control.thrust &&
        this._findThrusterIdx() < 0) {
      
      this._actions.unshift({
        func: this._createThruster,
        timer: -1,
        ctx: this,
      });
    }

    // Create blasters from spacecraft
    let isBlasterCreated = (elem) => {
      return this._compareFuncs(this._createBlaster, elem);
    }
    
    let isAlien = (element) => element.type === objModels.ModelType.alien;
    
    if (this._actions.filter(isBlasterCreated).length <
        this._gameObjects.filter(isAlien).length) {

      this._actions.unshift({
        func: this._createBlaster,
        timer: GameplayGenerator.nominalBlasterTime + (Math.random() * 2),
        ctx: this,
      });
    }
  }

  /**
   * Creates a new spaceship
   *
   * @return {undefined}
   */
  _createNewShip(control) {
    this._gameObjects.push(
      new go.Spaceship(math.divide(control.windowSize, 2), 180));
  }

  /**
   * Creates a new blaster object (alien missile)
   *
   * @return {undefined}
   */
  _createBlaster(control) {

    // Randomly select an alien to shoot from
    let isAlien = (element) => element.type === objModels.ModelType.alien;
    let alienArray = this._gameObjects.filter(isAlien);
    if (alienArray.length === 0) {
      return;
    }
    
    let alien = alienArray[Math.floor(Math.random() * alienArray.length)];
    let pos = alien.coordinates;
    
    // Shoot at spaceship
    let playerShip = this._findShip();
    if (playerShip === undefined) {
      return;
    }

    let posDiff = math.subtract(pos, playerShip.coordinates);
    let shipAngle = (Math.atan2(posDiff[1], posDiff[0]) * 180/Math.PI) + 90;
    let blasterOffset = (-GameplayGenerator.blasterCone/2) +
        (Math.random() * GameplayGenerator.blasterCone);
    
    this._gameObjects.push(new go.Blaster(pos, shipAngle + blasterOffset)); 
  }

  /**
   * Create new asteroids
   *
   * @param {Control}  control  Control for this frame
   * @return {undefined} 
   */
  _createNewAsteroids(control) {
    // Do not create asteroids without ship
    if (this._findShip() === undefined) {
      return;
    }

    let numAsteroids = GameplayGenerator.startingAsteroidCount +
        math.floor(this._level++ / 2);

    for (let ii = 0; ii < numAsteroids; ii++) {
      let coordinates = this._calculateNewAsteroidPos(control.windowSize);

      // Couldn't find coordinates that worked in a reasonable time
      // User gets away with one
      if (coordinates !== undefined) {
        this._gameObjects.push(
          new go.Asteroid(coordinates, go.Asteroid.largeScale));
      }
    }
  }

  /**
   * Create new missile
   *
   * @param {Control}  control  Control for this frame
   * @return {undefined}
   */
  _createNewMissile(control) {
    
    let shipObj = this._findShip();
    if (shipObj === undefined) {
      return;
    }
    
    this._gameObjects.push(
      new go.Missile(
        shipObj.getTranslatedModel()[0],
        [0, 0],
        shipObj.rotation));
  }

  /**
   * Add ephemeral thrust object
   *
   * @param {Control}  control  Control for this frame
   * @return {undefined}
   */
  _createThruster(control) {
    // Add thruster
    let ship = this._findShip();
    
    this._gameObjects.push(
      new go.Thruster(
        ship.coordinates,
        ship.movement,
        ship.rotation));
  }

  /**
   * Remove ephemeral thrust object
   *
   * @param {Control}  control  Control for this frame
   * @return {undefined}
   */
  _removeThruster(control) {
    // Remove thruster
    let thrusterIdx = this._findThrusterIdx();
    
    if (thrusterIdx >= 0) {
      this._gameObjects.splice(thrusterIdx, 1);
    }
  }

  /**
   * Finds thruster index in array
   *
   * @param {Array}  objList  Collection of objects in frame
   * @return {GameObj} or {undefined}
   */
  _findThrusterIdx() {
    return this._gameObjects.findIndex((element) => {
      return element.type === objModels.ModelType.thruster;
    });
  }

  /**
   * Finds ship object in list
   *
   * @param {Array}  objList  List of objects in frame
   * @return {GameObj} or {undefined}
   */
  _findShip() {
    let isSpaceship = (element) => {
      return element.type === objModels.ModelType.spaceship;
    };

    return this._gameObjects.find(isSpaceship);
  }

  /**
   * Finds ship coordinates
   *
   * @param {Array}  objList  List of objects in frame
   * @return {Array} or {undefined}
   */
  _findShipCoordinates() {
    let shipObj = this._findShip();
    return shipObj === undefined ? undefined : shipObj.coordinates;
  }

  /**
   * Finds new position of asteroid
   *
   * @param {List}  objList
   * @param {Array} screenSize
   * @return {Array} Coordinates of new asteroid
   */
  _calculateNewAsteroidPos(screenSize) {
    for (let tryCount = 0;
         tryCount < GameplayGenerator.numTimesRetryAsteroid;
         tryCount++) {
      // Calculate new position
      // 
      // Randomly select Y. Then make X satisfy:
      // x_new > sqrt(h^2 - (y_new-y_ship)^2) + x_ship
      // 
      // Where h is minimum distance between ship/asteroid,
      // calculated as a fraction from midpoint to outside of canvas
      let distance = Math.sqrt(((screenSize[0]/4)**2) +
                                  ((screenSize[1]/4)**2))

      let yCoordinate = Math.random() * screenSize[1];
      let shipCoordinates = this._findShipCoordinates();
      let xoffset = Math.sqrt(
        (distance**2) - ((yCoordinate-shipCoordinates[1])**2));
      
      let xCoordinate = Math.random() > 0.5 ?
          xoffset + shipCoordinates[0] :
          shipCoordinates[0] - xoffset;

      // Verify wrapped position does not get too close
      if (xCoordinate > screenSize[0]) {
        xCoordinate -= screenSize[0];
      } else if (xCoordinate < 0) {
        xCoordinate += screenSize[0];
      }

      if (yCoordinate > screenSize[1]) {
        yCoordinate -= screenSize[1];
      } else if (yCoordinate < 0) {
        yCoordinate += screenSize[1];
      }

      let wrappedDistance = Math.sqrt(((shipCoordinates[0]-xCoordinate)**2) +
                                      ((shipCoordinates[1]-yCoordinate)**2));

      if (wrappedDistance >= distance) {
        return [xCoordinate, yCoordinate];
      }
    }
  }
};
  
