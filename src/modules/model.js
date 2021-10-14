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
import {List} from 'collections/list'

/**
 * Utility function to rotate a vector
 *
 * @param {Array} vector    Vector to rotate
 * @param {Number} rotation Amount to rotate
 * @return {Array} Rotated vector
 */
let rotateVector = (vector, rotation) => {
  const rotationInRad = rotation * math.pi / 180;
  // return math.rotate(vector, rotationInRad);
  return [
    vector[0] * math.cos(rotationInRad) - vector[1] * math.sin(rotationInRad),
    vector[0] * math.sin(rotationInRad) + vector[1] * math.cos(rotationInRad),
  ];
};

/** 
 * Utility function to collect garbage from list
 *
 * @param {List}  list  List to clean
 * @return {undefined}
 */
let collectGarbage = (list) => {
  list.deleteAll(
    { isGarbage: true, },
    (element1, element2) => element1.isGarbage === element2.isGarbage);
};

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
 * A game object - not intended to be instantiated, but serve as a base class
 *
 */
export class GameObject {

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
    this.type = type;
    this._childObjects = new List();
    this._movement = objParams.movement;
    this._rotation = objParams.rotation;

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

    // Determine if object is at end-of-life
    this._model.lifetime -= numSecSinceLastUpdate;
    if (this._model.lifetime <= 0) {
      this.isGarbage = true;
    }
    
    // Determine coordinates
    this._movement = this._calculateMovement(control, numSecSinceLastUpdate);

    this.coordinates = math.add(
      this.coordinates,
      math.multiply(this._movement, numSecSinceLastUpdate));

    // Determine wrapped coordinates
    if (control.windowSize.every((size) => size < Infinity)) {
      for (let ii = 0; ii < this.coordinates.length; ii++) {

        if (this.coordinates[ii] > control.windowSize[ii]) {
          this.coordinates[ii] = 0;
          
        } else if (this.coordinates[ii] < 0) {
          this.coordinates[ii] = control.windowSize[ii];
        }
      }
    }

    // Update child objects
    this._childObjects.forEach((childObj) => {
      childObj.updateState(control, numSecSinceLastUpdate);
    });

    this._addResultingChildObjects(control);

    // Collect garbage
    collectGarbage(this._childObjects);
  }

  /**
   * calculates if an object collides with another
   *
   * @param {GameObject} obj Another game object
   * @return {Boolean}
   */
  collidesWith(obj) {
    return false;
  }

  /**
   * Destroys the game object and returns its parts
   *
   * @return {[GameObject]} A list of gameObjects
   */
  destroy() {
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
    this._model.vertices.forEach((vertex) => {
      rotatedModel.push(rotateVector(vertex, this._rotation));
    });

    let decomposedObj = [{
      rotation: this._rotation,
      translation: this.coordinates,
      type: this.type,
      vertices: rotatedModel,
    }];

    // Decompose child objects
    this._childObjects.forEach((child) => {
      decomposedObj = decomposedObj.concat(child.decompose());
    });

    return decomposedObj;
  }

  /**
   * Getter for childObjects
   *
   * @return {Array}  Child Objects
   */
  get childObjects() {
    return this._childObjects;
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
    return this._movement;
  }

  /**
   * Creates any objects as a result of this control
   *
   * @param {obj}  control  Control object
   * @return {Array}  Array of new objects
   */
  _addResultingChildObjects(control) {
    return;
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
      rotateVector(
        [0, objModels.Missile.maxSpeed],
        rotation),
      movement);
        
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.movement = missileMovement;
    objParams.rotation = rotation;

    super(objModels.ModelType.missile, objParams);
  }
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
  static get largeScale() { return 3; }

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
   * Returns updated movement vector
   *
   * @param {obj}   control      Control object
   * @param {Date}  elapsedTime  Time since last update
   * @return {Array} Updated movement vector
   */
  _calculateMovement(control, elapsedTime) {

    // Movement must be calculated after model is chosen by base class
    if (this._movement === undefined) {
      let movementVec = [0, this._model.maxSpeed / this._scale];
      let movementAngle = Math.random() * 360;
      this._movement = rotateVector(movementVec, movementAngle);
    }

    return this._movement;
  }
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

    this._rotation += scaledRotationChange;
    this._rotation = this._normalizeRotation(this._rotation);

    // Determine acceleration. 
    let accelerationVector = [0, 0];
    
    if (control.thrust) {
      accelerationVector = rotateVector(
        [0, this._model.maxThrust],
        this._rotation);
    }

    let scaledAccelerationVector = math.multiply(
      accelerationVector,
      elapsedTime);

    // Determine drag
    let dragEffect = math.multiply(
      math.multiply(this._movement, this._model.drag),
      elapsedTime);
    
    // Determine movement vector
    let updatedMovement = this._movement;
    
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
   * Adds any objects created as a result of this control
   *
   * @param {obj}  control  Control object
   * @return {Array}  Array of new objects
   */
  _addResultingChildObjects(control) {
    
    // Add/remove thruster
    let elementTypeMatches = (element1, element2) => {
      return element1.type === element2.type;
    };

    let thrusterObj = {
      type: objModels.ModelType.thruster,
    };
    
    if (control.thrust) {
      if (!this.childObjects.has(thrusterObj, elementTypeMatches)) {
        this.childObjects.push(
          new Thruster(
            this.coordinates,
            this._movement,
            this._rotation));
      }
      
    } else {
      this.childObjects.delete(thrusterObj, elementTypeMatches);
    }

    // Add missile shooting from nose
    if (control.shoot) {
      let newMissileLoc = math.add(
        rotateVector(this._model.vertices[0], this._rotation),
        this.coordinates);

      this.childObjects.push(
        new Missile(newMissileLoc, this._movement, this._rotation));
    }
  }
};

/**
 * Generator
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
  static get timeToGenerateAsteroid() { return 1.0; }
  static get startingAsteroidCount() { return 4; }

  /**
   * Constructor
   *
   * @return {ObjectGenerator}
   */
  constructor() {
    this._action = undefined;
    this._timer = undefined;
    this._level = 1;
  }

  /** 
   * Updates internal timers
   *
   * @param {Number} elapsedTime Elapsed time since last frame (sec)
   * @return {undefined}
   */
  updateTimers(elapsedTime) {
    if (this._timer !== undefined) {
      this._timer -= elapsedTime;
    }
  }

  /**
   * Generates more stuff for this object list
   *
   * @param {List}    objectList   List of objects in frame
   * @param {Array}   screenSize   Size of screen [x,y]
   * @return {undefined}
   */
  makeNewObjectsFor(objectList, screenSize) {

    // First, check if there's an ongoing action
    if (this._action !== undefined) {
      
      if (this._timer <= 0) {
        this._action(objectList, screenSize);
        this._action = undefined;
        this._timer = undefined;
        
      } else {
        return;
      }
    }

    // Create asteroids if there's an empty list
    let asteroid = {
      type: objModels.ModelType.asteroid,
    };

    if (!objectList.has(asteroid, this._objTypesMatch)) {
      this._action = this._createNewAsteroids;
      this._timer = ObjectGenerator.timeToGenerateAsteroid;
    }
  }

  /**
   * Create new asteroids
   *
   * @param {List}  objectList  List to add asteroids
   * @param {Array} screenSize  Size of screen [x, y]
   * @return {undefined} 
   */
  _createNewAsteroids(objList, screenSize) {
    let numAsteroids = ObjectGenerator.startingAsteroidCount +
        math.floor(this._level++ / 2);

    for (let ii = 0; ii < numAsteroids; ii++) {
      let coordinates = this._calculateNewAsteroidPos(objList, screenSize);
      objList.push(new Asteroid(coordinates, Asteroid.largeScale));
    }
  }

  /**
   * Utility function to determine if object types match
   *
   * Meant to be used in List.get, List.has, etc
   */
  _objTypesMatch(obj1, obj2) {
    return obj1.type === obj2.type;
  }

  /**
   * Finds ship coordinates
   *
   * @param {List}  objList  List of objects in frame
   * @return {Array} or {undefined}
   */
  _findShipCoordinates(objList) {
    let shipType = {
      type: objModels.ModelType.spaceship,
    };

    let shipObj = objList.get(shipType, this._objTypesMatch);
    return shipObj === undefined ? undefined : shipObj.coordinates;
  }

  /**
   * Finds new position of asteroid
   *
   * @param {List}  objList
   * @param {Array} screenSize
   * @return {Array} Coordinates of new asteroid
   */
  _calculateNewAsteroidPos(objList, screenSize) {
    while (true) {
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
      let shipCoordinates = this._findShipCoordinates(objList);
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
    this._objectList = new List();
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

        this._objectList.push(
          new Spaceship(math.divide(control.windowSize, 2), 180));

        this._lastControl = control;
        
      } else {
        return;
      }
    }

    // Calculate movements and collisions
    let control = this._getControlForFrame();
    let elapsedTime = this._calculateElapsedTime();

    generator.updateTimers(elapsedTime);
    generator.makeNewObjectsFor(this._objectList, control.windowSize);

    this._objectList.forEach((obj) => {
      obj.updateState(control, elapsedTime);

      this._objectList.forEach((remoteObj) => {
        if (obj.collidesWith(remoteObj)) {
          obj.destroy();
          remoteObj.destroy();
        }
      });
    });

    // Add clean Frame to the queue
    collectGarbage(this._objectList);
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
        
    this._objectList.forEach((obj) => {
      frame.add(obj);
    });
    
    this._outputQueue.enqueue(frame);
  }
};


