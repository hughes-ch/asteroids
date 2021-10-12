/**
 * Model module
 * 
 * Defines types for the Asteroids game model
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as containers from './containers.js'
import * as math from 'mathjs'
import * as objModels from './objModels.js'
import {RotateState} from './controller.js'

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
    this.type = type;
    this._childObjects = [];
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

    // Update child objects
    this._childObjects.forEach((childObj) => {
      childObj.updateState(control, numSecSinceLastUpdate);
    });

    this._addResultingChildObjects(control);
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
      rotatedModel.push(this._rotateVector(vertex, this._rotation));
    });

    let decomposedObj = [{
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
   * Rotates a vector
   *
   * @param {Array} vector    Vector to rotate
   * @param {Number} rotation Amount to rotate
   * @return {Array} Rotated vector
   */
  _rotateVector(vector, rotation) {
    const rotationInRad = rotation * Math.PI / 180;
    return math.rotate(vector, rotationInRad);
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
          control.rotate == RotateState.none ? 0 : (
            control.rotate == RotateState.cw ? 1 : -1
          );

    let scaledRotationChange =
        directionMultiplier * this._model.rotationSpeed * elapsedTime;

    this._rotation += scaledRotationChange;
    this._rotation = this._normalizeRotation(this._rotation);

    // Determine acceleration. 
    let accelerationVector = [0, 0];
    
    if (control.thrust) {
      accelerationVector = this._rotateVector(
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
    let thrusterFilter = (element) => {
      return element.type === objModels.ModelType.thruster;
    };
    
    if (control.thrust) {
      if (this.childObjects.find(thrusterFilter) === undefined) {
        this.childObjects.push(
          new Thruster(this._coordinates, this._movement, this._rotation));
      }
    } else {
      let thrusterIdx = this.childObjects.find(thrusterFilter);
      if (thrusterIdx !== undefined) {
        this.childObjects.splice(thrusterIdx, 1);
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

    this._objectList = [
      new Spaceship([100, 100], 0),
    ];
  }

  /**
   * Updates the game model by one frame
   *
   * @return {undefined}
   */
  updateFrame() {

    // Determine current control. If there isn't one, use the last
    if (!this._lastControl) {
      this._lastControl = {
        rotate: RotateState.none,
        thrust: false,
        shoot: false
      };
    }

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

    // Add remaining objects to the frame 
    let frame = new containers.Frame();

    this._objectList.forEach((obj) => {
      frame.add(obj);
    });
    
    this._outputQueue.enqueue(frame);
  }
};


