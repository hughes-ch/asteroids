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
    this.isGarbage = false;
    this.type = type;
    this._childObjects = new List();
    this._coordinates = objParams.coordinates;
    this._movement = objParams.movement;
    this._rotation = objParams.rotation;

    switch (this.type) {
      case objModels.ModelType.spaceship:
        this._model = objModels.Spaceship;
        break;

      case objModels.ModelType.thruster:
        this._model = objModels.Thruster;
        break;

      case objModels.ModelType.missile:
        this._model = objModels.Missile;
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
  }

  /**
   * Updates the state of the game object by a single frame
   *
   * @param {Object}  control                Control object
   * @param {Number}  numSecSinceLastUpdate  Number of seconds since last Frame
   * @return {undefined}
   */
  updateState(control, numSecSinceLastUpdate) {
    
    // Determine coordinates
    this._movement = this._calculateMovement(control, numSecSinceLastUpdate);

    this._coordinates = math.add(
      this._coordinates,
      math.multiply(this._movement, numSecSinceLastUpdate));

    // Determine wrapped coordinates
    if (control.windowSize.every((size) => size < Infinity)) {
      for (let ii = 0; ii < this._coordinates.length; ii++) {

        if (this._coordinates[ii] > control.windowSize[ii]) {
          if (this._model.boundsAction === objModels.BoundsAction.wrap) {
            this._coordinates[ii] = 0;
          } else {
            this.isGarbage = true;
          }
          
        } else if (this._coordinates[ii] < 0) {
          if (this._model.boundsAction === objModels.BoundsAction.wrap) {
            this._coordinates[ii] = control.windowSize[ii];
          } else {
            this.isGarbage = true;
          }
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
      translation: this._coordinates,
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
        
    let objParams = {
      coordinates: coordinates,
      movement: missileMovement,
      rotation: rotation,
    };
    super(objModels.ModelType.missile, objParams);
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
    const directionMultiplier =
          control.rotate == intf.RotateState.none ? 0 : (
            control.rotate == intf.RotateState.cw ? 1 : -1
          );

    let scaledRotationChange =
        directionMultiplier * this._model.rotationSpeed * elapsedTime;

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
    let objParams = {
      coordinates: coordinates,
      movement: movement,
      rotation: rotation,
    };
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
    let objParams = {
      coordinates: coordinates,
      movement: [0, 0],
      rotation: rotation
    };
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
            this._coordinates,
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
        this._coordinates);

      this.childObjects.push(
        new Missile(newMissileLoc, this._movement, this._rotation));
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
  }

  /**
   * Updates the game model by one frame
   *
   * @return {undefined}
   */
  updateFrame() {
    this._currentState.updateFrame();
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
   * @return {undefined}
   */
  updateFrame() {
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

    // Determine current control. If there isn't one, use the last
    let control = this._lastControl;
    if (this._inputQueue.length > 0)
    {
      control = this._inputQueue.dequeue();
      this._lastControl = control;
    }

    // Update time interval between frames
    if (!this._lastUpdateTime) {
      this._lastUpdateTime = new Date().getTime();
    }

    let currentTime = new Date().getTime();
    let elapsedTime = (currentTime - this._lastUpdateTime) / 1000;
    this._lastUpdateTime = currentTime;
    
    // Calculate movements and collisions
    this._objectList.forEach((obj) => {
      obj.updateState(control, elapsedTime);

      this._objectList.forEach((remoteObj) => {
        if (obj.collidesWith(remoteObj)) {
          obj.destroy();
          remoteObj.destroy();
        }
      });
    });

    // Cleanup anything that is outside the model
    collectGarbage(this._objectList);

    // Add remaining objects to the frame 
    let frame = new intf.Frame();
    frame.windowSize = control.windowSize;
        
    this._objectList.forEach((obj) => {
      frame.add(obj);
    });
    
    this._outputQueue.enqueue(frame);
  }
};


