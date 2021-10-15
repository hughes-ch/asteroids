'use strict';
/**
 * Model module
 * 
 * Defines types for the Asteroids game model
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as intf from './interfaces.js'
import * as math from 'mathjs'
import * as objModels from './objModels.js'
import clone from 'just-clone'
import Deque from 'collections/deque'
import earcut from 'earcut'

/**
 * Object parameters class
 *
 * Minimal interface. Members meant to be manipulated directly
 */
class ObjectParameters {

  /**
   * Constructor
   *
   * @return {ObjectParameters}
   */
  constructor() {
    this.coordinates = [0, 0];
    this.movement = [0, 0];
    this.rotation = 0;
    this.scale = 1;
  }
};

/**
 * A Game Model represented as a cluster of trianges. Used for collision.
 *
 */
class TriangulatedObj {

  /**
   * Constructor
   *
   * @param  {Array}  model  List of vertices
   * @return {TriangulatedObj}
   */
  constructor(model) {

    // Verify flatTriangles.length is a factor of three. Otherwise, the
    // earcut algorithm gave us something we didn't expect.
    let flatTriangles = earcut(model.flat());

    this._triangles = [];
    if (flatTriangles.length % 3) {
      return;
    }

    for (let ii = 0; ii < flatTriangles.length; ii += 3) {
      this._triangles.push([]);
      for (let jj = 0; jj < 3; jj++) {
        this._triangles[this._triangles.length-1].push({
          x: model[flatTriangles[ii+jj]][0],
          y: model[flatTriangles[ii+jj]][1],
        });
      }
    }
  }

  /**
   * Determines if a polygon contains any point in a series
   *
   * @param  {Array}  points  Coordinates to check
   * @return {Boolean}
   */
  contains(points) {
    for (let triangle of this._triangles) {
      for (let point of points) {
        if (this._isPointInTriangle(triangle, point)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Determines if a single point is within a single triangle
   *
   * @param {Array}  t  coordinates of triangle
   * @param {Array}  p  coordinate to test
   * @return {Boolean}
   */
  _isPointInTriangle(t, p) {

    let denominator = ((t[1].y-t[2].y) * (t[0].x-t[2].x) + (t[2].x-t[1].x) * (t[0].y-t[2].y));
    let a = ((t[1].y-t[2].y) * (p[0]-t[2].x) + (t[2].x-t[1].x) * (p[1]-t[2].y)) / denominator;
    let b = ((t[2].y-t[0].y) * (p[0]-t[2].x) + (t[0].x-t[2].x) * (p[1]-t[2].y)) / denominator;
    let c = 1 - a - b;
    
    return 0 <= a && a <= 1 && 0 <= b && b <= 1 && 0 <= c && c <= 1;
  }
};

/**
 * A game object - not intended to be instantiated, but serve as a base class
 *
 */
export class GameObject {

  /**
   * Utility function to rotate a vector
   *
   * @param {Array} vector    Vector to rotate
   * @param {Number} rotation Amount to rotate
   * @return {Array} Rotated vector
   */
  static rotateVector(vector, rotation) {
    const rotationInRad = rotation * math.pi / 180;

    return [
      vector[0] * math.cos(rotationInRad) - vector[1] * math.sin(rotationInRad),
      vector[0] * math.sin(rotationInRad) + vector[1] * math.cos(rotationInRad),
    ];
  }

  /**
   * Constructor
   *
   * @param {objModels.ModelType} type      Type of object
   * @param {Object}              objParams Characteristics of new object
   * @return {GameObject}
   */
  constructor(type, objParams) {
    this.coordinates = objParams.coordinates;
    this.isGarbage = false;
    this.movement = objParams.movement;
    this.rotation = objParams.rotation;
    this.type = type;
    this._lastCanvasSize = undefined;

    // Choose object model
    switch (this.type) {
      case objModels.ModelType.asteroid:
        let modelIdx = Math.floor(Math.random() * objModels.Asteroid.length);
        this._model = clone(objModels.Asteroid[modelIdx]);
        break;
        
      case objModels.ModelType.missile:
        this._model = clone(objModels.Missile);
        break;

      case objModels.ModelType.spaceship:
        this._model = clone(objModels.Spaceship);
        break;

      case objModels.ModelType.thruster:
        this._model = clone(objModels.Thruster);
        break;

      default:
        {
          let invalidObjTypeException = (message) => {
            this.message = message;
            this.name = 'InvalidObjTypeException';
          };
          throw new invalidObjTypeException(
            `New object not created. Invalid type: ${this.type}`);
        }
    }

    // Scale object model
    this._model.vertices = this._model.vertices.map(
      (vertex) => {
        return math.multiply(vertex, objParams.scale);
      });
  }

  /**
   * Updates the state of the game object by a single frame
   *
   * @param {Object}  control                Control object
   * @param {Number}  numSecSinceLastUpdate  Number of seconds since last Frame
   * @return {undefined}
   */
  updateState(control, numSecSinceLastUpdate) {
    // Do as close to the expected thing as possible if the canvas size changes
    if (this._lastCanvasSize !== undefined &&
        (this._lastCanvasSize[0] !== control.windowSize[0] ||
         this._lastCanvasSize[1] !== control.windowSize[1])) {

      let xscale = control.windowSize[0]/this._lastCanvasSize[0];
      let yscale = control.windowSize[1]/this._lastCanvasSize[1];
      this.coordinates[0] *= xscale;
      this.coordinates[1] *= yscale;
    }
    
    this._lastCanvasSize = control.windowSize;

    // Determine if object is at end-of-life
    this._model.lifetime -= numSecSinceLastUpdate;
    if (this._model.lifetime <= 0) {
      this.isGarbage = true;
    }
    
    // Determine coordinates
    this.movement = this._calculateMovement(control, numSecSinceLastUpdate);

    this.coordinates = math.add(
      this.coordinates,
      math.multiply(this.movement, numSecSinceLastUpdate));

    // Determine wrapped coordinates
    if (control.windowSize[0] < Infinity && control.windowSize[1] < Infinity) {
      for (let ii = 0; ii < this.coordinates.length; ii++) {

        if (this.coordinates[ii] > control.windowSize[ii]) {
          this.coordinates[ii] = 0;
          
        } else if (this.coordinates[ii] < 0) {
          this.coordinates[ii] = control.windowSize[ii];
        }
      }
    }
  }

  /**
   * Determines if this object can collide with the other
   *
   * @param  {GameObject}  obj  The other game object to check
   * @return {Boolean}
   */
  canCollideWith(obj) {
    return false;
  };

  /**
   * calculates if an object collides with another
   *
   * @param {GameObject} obj Another game object
   * @return {Boolean}
   */
  collidesWith(obj) {
    // Make sure the types can actually collide
    if (!this.canCollideWith(obj)) {
      return false;
    }

    if (this.isGarbage || obj.isGarbage) {
      return false;
    }

    // Triangulate both models
    const thisModel = this.getTranslatedModel();
    const thatModel = obj.getTranslatedModel();
    
    let triangulatedThis = new TriangulatedObj(thisModel);
    let triangulatedThat = new TriangulatedObj(thatModel);

    // Check if either model has points within the other polygon
    return triangulatedThis.contains(thatModel) ||
      triangulatedThat.contains(thisModel);
  }

  /**
   * Destroys the game object and returns its parts
   *
   * @return {[GameObject]} A list of gameObjects
   */
  destroy() {
    this.isGarbage = true;
    return [];
  }

  /**
   * Decompose an object into its object model
   *
   * @return {obj} Simple representation of GameObject
   */
  decompose() {
    // Rotate object model
    let rotatedModel = [];
    for (let vertex of this._model.vertices) {
      rotatedModel.push(GameObject.rotateVector(vertex, this.rotation));
    }

    return {
      rotation: this.rotation,
      translation: this.coordinates,
      type: this.type,
      vertices: rotatedModel,
    };
  }

  /**
   * Gets the translated model
   *
   * @return {Array}
   */
  getTranslatedModel() {
    let translatedModel = [];
    let decomposedModel = this.decompose();
    
    for (let vertex of decomposedModel.vertices) {
      translatedModel.push(math.add(vertex, decomposedModel.translation));
    }

    return translatedModel;
  }

  /** 
   * Normalize a rotation to between 0 and 360
   *
   * @return {number} between 0 and 360
   */
  _normalizeRotation(rotation) {
    if (rotation > 360) {
      return rotation - 360;
    }
    if (rotation < 0) {
      return rotation + 360;
    }
    return rotation;
  }

  /**
   * Returns updated movement vector
   *
   * @param {obj}   control      Control object
   * @param {Date}  elapsedTime  Time since last update
   * @return {Array} Updated movement vector
   */
  _calculateMovement(control, elapsedTime) {
    return this.movement;
  }
};

/** 
 * A missile
 *
 */
export class Missile extends GameObject {

  /**
   * Constructor
   *
   * @param {Array}   coordinates  Coordinates of new object
   * @param {Array}   movement     Movement vect of ship firing missile
   * @param {Number}  rotation     Rotation of ship firing object
   * @return {Missile}
   */
  constructor(coordinates, movement, rotation) {
    let missileMovement = math.add(
      GameObject.rotateVector(
        [0, objModels.Missile.maxSpeed],
        rotation),
      movement);
        
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.movement = missileMovement;
    objParams.rotation = rotation;

    super(objModels.ModelType.missile, objParams);
  }

  /**
   * Determines if this object can collide with the other
   *
   * @param  {GameObject}  obj  The other game object to check
   * @return {Boolean}
   */
  canCollideWith(obj) {
    return obj.type === objModels.ModelType.asteroid;
  };
};

/**
 * An asteroid
 *
 */
export class Asteroid extends GameObject {

  /**
   * Static "Constants"
   *
   */
  static get debrisCount() { return 2; }
  
  static get largeScale() { return 3; }
  static get mediumScale() { return 1; }
  static get smallScale() { return 0.5; }

  /**
   * Constructor
   *
   * @param {Array}  coordinates  Coordinates of new object
   * @return {Asteroid}
   */
  constructor(coordinates, scale) {
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.movement = undefined;
    objParams.rotation = Math.random() * 360;
    objParams.scale = scale;

    super(objModels.ModelType.asteroid, objParams);

    this._scale = scale;
  }

  /**
   * Destroys the game object and returns its parts
   *
   * @return {[GameObject]} A list of gameObjects
   */
  destroy() {
    this.isGarbage = true;

    let debris = [];
    if (this._scale !== Asteroid.smallScale) {
      let newScale = this._scale == Asteroid.largeScale ?
          Asteroid.mediumScale :
          Asteroid.smallScale;
      
      for (let ii = 0; ii < Asteroid.debrisCount; ii++) {
        debris.push(new Asteroid(this.coordinates, newScale));
      }
    }

    return debris;
  }

  /**
   * Returns updated movement vector
   *
   * @param {obj}   control      Control object
   * @param {Date}  elapsedTime  Time since last update
   * @return {Array} Updated movement vector
   */
  _calculateMovement(control, elapsedTime) {

    // Movement must be calculated after model is chosen by base class
    if (this.movement === undefined) {
      let movementVec = [0, this._model.maxSpeed / this._scale];
      let movementAngle = Math.random() * 360;
      this.movement = GameObject.rotateVector(movementVec, movementAngle);
    }

    return this.movement;
  }

  /**
   * Determines if this object can collide with the other
   *
   * @param  {GameObject}  obj  The other game object to check
   * @return {Boolean}
   */
  canCollideWith(obj) {
    return obj.type === objModels.ModelType.missile ||
      obj.type == objModels.ModelType.spaceship;
  };
};

/**
 * Represents any object controlled by the user
 *
 */
class UserControlledGameObject extends GameObject {

  /**
   * Constructor
   *
   * Note this class is not intended to be instantiated directly
   *
   * @param {objModel.ModelType}  type       Type of object
   * @param {obj}                 objParams  Details about the object's model
   * @return {UserControlledGameObject}
   */
  constructor(type, objParams) {
    super(type, objParams);
  };

  /**
   * Returns updated movement vector
   *
   * @param {obj}   control      Control object
   * @param {Date}  elapsedTime  Time since last update
   * @return {Array} Updated movement vector
   */
  _calculateMovement(control, elapsedTime) {
    // Determine rotation
    let scaledRotationChange =
        this._model.rotationSpeed * elapsedTime * control.rotate;

    this.rotation += scaledRotationChange;
    this.rotation = this._normalizeRotation(this.rotation);

    // Determine acceleration. 
    let accelerationVector = [0, 0];
    
    if (control.thrust) {
      accelerationVector = GameObject.rotateVector(
        [0, this._model.maxThrust],
        this.rotation);
    }

    let scaledAccelerationVector = math.multiply(
      accelerationVector,
      elapsedTime);

    // Determine drag
    let dragEffect = math.multiply(
      math.multiply(this.movement, this._model.drag),
      elapsedTime);
    
    // Determine movement vector
    let updatedMovement = this.movement;
    
    if (control.thrust) {
      updatedMovement = math.add(updatedMovement, scaledAccelerationVector);
    }

    return math.subtract(updatedMovement, dragEffect);
  }
};

/**
 * Thruster graphic on back of spaceship
 *
 */
export class Thruster extends UserControlledGameObject {

  /**
   * Constructor
   *
   * @param {Array} coordinates  Initial starting coordinates
   * @param {Array} movement     Initial movement vector
   * @param {number} rotation    Initial rotation of object
   * @return {Thruster}
   */
  constructor(coordinates, movement, rotation) {
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.movement = movement;
    objParams.rotation = rotation;

    super(objModels.ModelType.thruster, objParams);
  }
};

/**
 * Represents the object the player is trying to fly
 *
 */
export class Spaceship extends UserControlledGameObject {

  /**
   * Constructor
   *
   * @param {Array} coordinates  Initial starting coordinates
   * @param {number} rotation    Initial rotation of object
   * @return {Spaceship}
   */
  constructor(coordinates, rotation) {
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.rotation = rotation;

    super(objModels.ModelType.spaceship, objParams);
  }

  /**
   * Determines if this object can collide with the other
   *
   * @param  {GameObject}  obj  The other game object to check
   * @return {Boolean}
   */
  canCollideWith(obj) {
    return obj.type === objModels.ModelType.asteroid;
  };
};

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
  static get minSafeDistancePercent() { return 0.4; }
  static get startingAsteroidCount() { return 4; }
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
        this._actions.findValue(this._createNewAsteroids, compareFuncs) < 0) {
      
      this._actions.unshift({
        func: this._createNewAsteroids,
        timer: ObjectGenerator.timeToGenerateAsteroid,
      });
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
      new Spaceship(math.divide(control.windowSize, 2), 180));
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
        this._gameObjects.push(new Asteroid(coordinates, Asteroid.largeScale));
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
    let newMissileLoc = shipObj.getTranslatedModel()[0];      

    this._gameObjects.push(
      new Missile(newMissileLoc, [0, 0], shipObj.rotation));
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
      new Thruster(
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

/**
 * Game Model
 *
 */
export class Model {

  /**
   * Constructor
   *
   * @param {Queue} inputQueue  Queue of Control objects
   * @param {Queue} outputQueue Queue of Frame objects
   * @return {Model} new object
   */
  constructor(inputQueue, outputQueue) {
    this._inputQueue = inputQueue;
    this._outputQueue = outputQueue;

    this._gameStates = [
      undefined,
      new GameStateModel(inputQueue, outputQueue),
      undefined
    ];

    this._currentState = this._gameStates[1];
    this._generator = new ObjectGenerator();
  }

  /**
   * Updates the game model by one frame
   *
   * @return {undefined}
   */
  updateFrame() {
    this._currentState.updateFrame(this._generator);
  }

};

/**
 * GameStateModel
 *
 * Model of the asteroids gameplay (while user is trying to score)
 */
class GameStateModel {

  /**
   * Constructor
   *
   * @param {Queue} inputQueue  Queue of control objects
   * @param {Queue} outputQueue Queue of Frame objects
   * @return {GameStateModel}
   */
  constructor(inputQueue, outputQueue) {
    this._inputQueue = inputQueue;
    this._outputQueue = outputQueue;
    this._lastControl = undefined;
    this._lastUpdateTime = undefined;
    this._objectList = [];
  }

  /**
   * Updates the game model by one frame
   * 
   * @param  {ObjectGenerator}  generator  Generator to create asteroids
   * @return {undefined}
   */
  updateFrame(generator) {

    // Wait for initial control to set window parameters
    if (!this._lastControl) {

      if (this._inputQueue.length > 0) {
        let control = this._inputQueue.dequeue();
        this._lastControl = control;
        
      } else {
        return;
      }
    }

    // Calculate movements and collisions
    let control = this._getControlForFrame();
    let elapsedTime = this._calculateElapsedTime();

    generator.updateState(this._objectList, elapsedTime);
    generator.makeNewObjectsFor(control);

    for (let obj of this._objectList) {
      obj.updateState(control, elapsedTime);

      for (let remoteObj of this._objectList) {
        if (obj.collidesWith(remoteObj)) {
          generator.createDebrisFor(obj.destroy());
          generator.createDebrisFor(remoteObj.destroy());
        }
      }
    }

    // Add clean Frame to the queue
    this._collectGarbage(this._objectList);
    this._sendFrame(control);
  }

  /**
   * Gets the latest Control
   *
   * @return {Control}
   */
  _getControlForFrame() {
    let control = new intf.Control();
    if (this._inputQueue.length === 0) {
      control = this._lastControl;

    } else {
      while(this._inputQueue.length > 0) {
        let latestControl = this._inputQueue.dequeue();
        control.stack(latestControl);
        this._lastControl = latestControl;
      }
    }

    return control;
  }

  /**
   * Gets the elapsed time between frames
   *
   * @return {Number}
   */
  _calculateElapsedTime() {
    if (!this._lastUpdateTime) {
      this._lastUpdateTime = new Date().getTime();
    }

    let currentTime = new Date().getTime();
    let elapsedTime = (currentTime - this._lastUpdateTime) / 1000;
    this._lastUpdateTime = currentTime;

    return elapsedTime;
  }

  /** 
   * Adds a Frame to the queue
   * 
   * @param {Control}  control  Control object for the frame
   * @return {undefined}
   */
  _sendFrame(control) {
    let frame = new intf.Frame();
    frame.windowSize = control.windowSize;

    for (let obj of this._objectList) {
      frame.add(obj);
    }
    
    this._outputQueue.enqueue(frame);
  }

  /** 
   * Utility function to collect garbage from list
   *
   * @param {List}  list  List to clean
   * @return {undefined}
   */
  _collectGarbage(list) {
    this._objectList = this._objectList.filter((element) => element.isGarbage === false);
  }
};


