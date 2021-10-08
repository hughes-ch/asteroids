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

/**
 * A game object - not intended to be instantiated, but serve as a base class
 *
 */
export class GameObject {

  /**
   * Constructor
   *
   * @param {Array} coordinates  Initial starting coordinates
   * @param {String} type        Type of object (spaceship, asteroid, etc)
   * @return {GameObject}
   */
  constructor(coordinates, type) {
    this._coordinates = coordinates;
    this._type = type;
  }

  /**
   * Updates the state of the game object by a single frame
   *
   * @return {undefined}
   */
  updateState() {
  }

  /**
   * Calculates if an object collides with another
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
      translation: this._coordinates,
      type: this._type,
      vertices: [
        [0, -24],
        [10, 0],
        [-10, 0]
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
    super(coordinates, 'spaceship');
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
    ]

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

    // Calculate movements and collisions
    for (let obj of Array.from(this._objectList)) {
      obj.updateState();

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


