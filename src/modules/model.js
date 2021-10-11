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
    this._coordinates = objParams.coordinates;
    this._lastUpdateTime = undefined;
    this._movement = objParams.movement;
    this._rotation = objParams.rotation;
    this._type = type;

    switch (this._type) {
      case objModels.ModelType.spaceship:
        this._model = objModels.Spaceship;
        break;

      default:
        {
          let invalidObjTypeException = (message) => {
            this.message = message;
            this.name = 'InvalidObjTypeException';
          };
          throw new invalidObjTypeException(
            `New object not created. Invalid type: ${this._type}`);
        }
    }
  }

  /**
   * Updates the state of the game object by a single frame
   *
   * @return {undefined}
   */
  updateState(control) {
    
    // If an object hasn't been updated yet, set to current time to render
    // it immobile for a single frame. 
    if (!this._lastUpdateTime) {
      this._lastUpdateTime = new Date();
    }

    let currentTime = new Date();
    let numSecSinceLastUpdate = (
      currentTime.getTime() - this._lastUpdateTime.getTime())/1000;

    // Determine rotation 
    const directionMultiplier =
          control.rotate == RotateState.none ? 0 : (
            control.rotate == RotateState.cw ? 1 : -1
          );

    let scaledRotationChange =
        directionMultiplier * this._model.rotationSpeed * numSecSinceLastUpdate;

    this._rotation += scaledRotationChange;
    this._rotation = this._normalizeRotation(this._rotation);

    // Determine acceleration
    let accelerationVector = [0, 0];
    
    if (control.thrust) {
      accelerationVector = this._rotateVector(
        [0, this._model.maxThrust],
        this._rotation);
    }

    let scaledAccelerationVector = math.multiply(
      accelerationVector,
      numSecSinceLastUpdate);
    
    // Determine movement vector
    if (control.thrust) {
      this._movement = math.add(this._movement, scaledAccelerationVector);
    } else {
      this._movement = [0, 0];
    }

    // Determine coordinates
    this._coordinates = math.add(
      this._coordinates,
      math.multiply(this._movement, numSecSinceLastUpdate));

    // Set last update time
    this._lastUpdateTime = currentTime;
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
    for (let vertex of Array.from(this._model.vertices)) {
      rotatedModel.push(this._rotateVector(vertex, this._rotation));
    }

    return {
      translation: this._coordinates,
      type: this._type,
      vertices: rotatedModel,
    };
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
    const rotationMatrix = [
      [Math.cos(rotationInRad), -Math.sin(rotationInRad)],
      [Math.sin(rotationInRad),  Math.cos(rotationInRad)]
    ];
    
    return math.multiply(rotationMatrix, vector);
  }
};

/**
 * Represents the object the player is trying to fly
 *
 */
export class Spaceship extends GameObject {

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

    // Calculate movements and collisions
    for (let obj of Array.from(this._objectList)) {
      obj.updateState(control);

      for (let remoteObj of Array.from(this._objectList)) {
        if (obj.collidesWith(remoteObj)) {
          obj.destroy();
          remoteObj.destroy();
        }
      }
    }

    // Add remaining objects to the frame 
    let frame = new containers.Frame();

    for (let obj of Array.from(this._objectList)) {
      frame.add(obj);
    }
    
    this._outputQueue.enqueue(frame);
  }
};


