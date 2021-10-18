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
 * Real-time object generator
 *
 * In the standard game of asteroids, four asteroids would be generated in the
 * first level. Once all asteroids were destroyed, a new set would be created.
 *
 * Alien spaceships would also shoot at the player - about one spaceship per
 * level.
 *
 * As the player progressed, more alien spaceships and asteroids would be
 * generated per level. In both cases, one more would be added per level.
 */
export class ObjectGenerator {

  /**
   * Static "constants"
   *
   */
  static get blasterCone() { return 45 /* deg */; }
  static get minSafeDistancePercent() { return 0.4; }
  static get startingAsteroidCount() { return 4; }
  static get nominalTimeBetweenAliens() { return 10; }
  static get nominalBlasterTime() { return 1; }
  static get timeBetweenLives() { return 3; }
  static get timeToGenerateAsteroid() { return 1.0; }

  /**
   * Constructor
   *
   * @return {ObjectGenerator}
   */
  constructor() {
    this._actions = new Deque();
    this._level = 1;
    this._gameObjects = [];
    this._isGameInitialized = false;
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
    // Make sure spaceship is always in model
    let spaceshipTimer = this._isGameInitialized ?
        ObjectGenerator.timeBetweenLives : -1;

    const compareFuncs = (elem1, elem2) => elem1 === elem2.func;

    if (this._findShip() === undefined &&
        this._actions.findValue(this._createNewShip, compareFuncs) < 0) {
      
      this._actions.unshift({
        func: this._createNewShip,
        timer: spaceshipTimer,
      });
    }

    this._isGameInitialized = true;

    // Create asteroids if there's an empty list
    if (!this._gameObjects.find((element) => element.type === objModels.ModelType.asteroid) &&
        !this._gameObjects.find((element) => element.type === objModels.ModelType.alien) &&
        this._actions.findValue(this._createNewAsteroids, compareFuncs) < 0) {
      
      this._actions.unshift({
        func: this._createNewAsteroids,
        timer: ObjectGenerator.timeToGenerateAsteroid,
      });

      // Create alien spacecraft
      let firstAlienTime = (ObjectGenerator.nominalTimeBetweenAliens/2) +
          (Math.random() * ObjectGenerator.nominalTimeBetweenAliens);
      
      this._actions.unshift({
        func: this._createAlien,
        timer: firstAlienTime,
      });

      if (Math.random() > 0.5) {
        this._actions.unshift({
          func: this._createAlien,
          timer: firstAlienTime +
            (ObjectGenerator.nominalTimeBetweenAliens/2) +
            (Math.random() * ObjectGenerator.nominalTimeBetweenAliens),
        });
      }
    }

    // Add missile shooting from nose of ship
    if (control.shoot) {
      this._actions.unshift({
        func: this._createNewMissile,
        timer: -1,
      });
    }

    // Add/remove thruster
    if (this._findShip() !== undefined) {
      if (control.thrust) {
        if (this._findThrusterIdx() < 0) {
          this._actions.unshift({
            func: this._createThruster,
            timer: -1,
          });
        }

      } else {
        if (this._findThrusterIdx() >= 0) {
          this._actions.unshift({
            func: this._removeThruster,
            timer: -1,
          });
        }
      }
    }

    // Create blasters from spacecraft
    let isBlasterCreated = (elem) => compareFuncs(this._createBlaster, elem);
    let isAlien = (element) => element.type === objModels.ModelType.alien;
    
    if (this._actions.filter(isBlasterCreated).length <
        this._gameObjects.filter(isAlien).length) {

      this._actions.unshift({
        func: this._createBlaster,
        timer: ObjectGenerator.nominalBlasterTime + (Math.random() * 2),
      });
    }

    // Handle any expired actions
    this._actions = this._actions.sorted((left, right) => {
      return right.timer - left.timer;
    });
    
    while(this._actions.length > 0) {
      let action = this._actions.peekBack();
      if (action.timer <= 0) {
        action.func.call(this, control);
        this._actions.pop();

      } else {
        break;
      }
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
    let blasterOffset = (-ObjectGenerator.blasterCone/2) +
        (Math.random() * ObjectGenerator.blasterCone);
    
    this._gameObjects.push(new go.Blaster(pos, shipAngle + blasterOffset)); 
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

    let numAsteroids = ObjectGenerator.startingAsteroidCount +
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
    for (let tryCount = 0; tryCount < 5; tryCount++) {
      // Calculate new position
      // 
      // Randomly select Y. Then make X satisfy:
      // x_new > sqrt(h^2 - (y_new-y_ship)^2) + x_ship
      // 
      // Where h is minimum distance between ship/asteroid,
      // calculated as a fraction from midpoint to outside of canvas
      let maxDistance = Math.sqrt(((screenSize[0]/2)**2) +
                                  ((screenSize[1]/2)**2))

      let minDistance = maxDistance * ObjectGenerator.minSafeDistancePercent;
      let yCoordinate = Math.random() * screenSize[1];
      let shipCoordinates = this._findShipCoordinates();
      let distance = (Math.random() * (maxDistance-minDistance)) + minDistance;

      let xCoordinate = Math.sqrt((distance**2) -
                                  ((yCoordinate-shipCoordinates[1])**2) +
                                  shipCoordinates[0]);

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

      if (wrappedDistance >= minDistance) {
        return [xCoordinate, yCoordinate];
      }
    }
  }
};
