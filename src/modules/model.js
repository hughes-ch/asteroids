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

/**
 * A game object - not intended to be instantiated, but serve as a base class
 *
 */
export class GameObject {

  /**
   * Constructor
   *
   * @param {String} type        Type of object (spaceship, asteroid, etc)
   * @param {Object} objParams   Characteristics of the new object
   * @return {GameObject}
   */
  constructor(type, objParams) {
    this._type = type;
    this._objParams = objParams;
    this._lastUpdateTime = undefined;
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

    // Determine movement vector
    let currentTime = new Date();
    let numSecSinceLastUpdate = (
      currentTime.getTime() - this._lastUpdateTime.getTime())/1000;

    if (control.thrust) {
      this._objParams.movement = [0, this._objParams.maxSpeed];
    } else {
      this._objParams.movement = [0, 0];
    }

    let scaledMovementVect = math.multiply(
      this._objParams.movement,
      numSecSinceLastUpdate);

    this._objParams.coordinates = math.add(
      this._objParams.coordinates, scaledMovementVect);

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
    return []
  }

  /**
   * Decompose an object into its object model
   *
   * @return {obj} Simple representation of GameObject
   */
  decompose() {
    return {
      translation: this._objParams.coordinates,
      type: this._type,
      vertices: [
        [0, 24],
        [-10, 0],
        [10, 0]
      ]
    };
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
   * @return {Spaceship}
   */
  constructor(coordinates) {
    let objParams = {
      coordinates: coordinates,
      drag: 0,
      maxSpeed: 100,
      maxThrust: 0,
      movement: [0, 0],
      rotation: 0
    };
    super('spaceship', objParams);
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
      new Spaceship([100, 100]),
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
        rotate: 0,
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


