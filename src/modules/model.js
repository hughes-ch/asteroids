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
import * as gen from './generator.js'
import * as go from './gameObject.js'
import * as intf from './interfaces.js'

/** 
 * Keeps score
 *
 */
export class ScoreKeeper {

  /**
   * Constructor
   *
   * @return {ScoreKeeper}
   */
  constructor() {
    this.score = 0;
    this.lives = 0;
  }

  /**
   * Updates score based on the two objects that collided
   *
   * @param {GameObject}  obj1  First object in collision
   * @param {GameObject}  obj2  Second object in collision
   * @return {undefined} 
   */
  collectScore(obj1, obj2) {
    let updates = obj1.score().stack(obj2.score());
    
    if (updates.owned) {
      this.score += updates.scoreIncrease;
      this.lives -= updates.livesLost;
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
    this._score = new ScoreKeeper();

    this._gameStates = [
      undefined,
      new GameStateModel(inputQueue, outputQueue, this._score),
      undefined
    ];

    this._currentState = this._gameStates[1];
    this._generator = new gen.ObjectGenerator();
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
   * @param {Queue}       inputQueue   Queue of control objects
   * @param {Queue}       outputQueue  Queue of Frame objects
   * @param {ScoreKeeper} scoreKeeper  Maintains score
   * @return {GameStateModel}
   */
  constructor(inputQueue, outputQueue, scoreKeeper) {
    this._inputQueue = inputQueue;
    this._outputQueue = outputQueue;
    this._lastControl = undefined;
    this._lastUpdateTime = undefined;
    this._objectList = [];
    this._scoreKeeper = scoreKeeper;
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
          this._scoreKeeper.collectScore(obj, remoteObj);          
        }
      }
    }

    // Add clean Frame to the queue
    this._collectGarbage(this._objectList);
    this._sendFrame(control, this._scoreKeeper);
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
   * @param {Control}      control      Control object for the frame
   * @param {ScoreKeeper}  scoreKeeper  Maintains score
   * @return {undefined}
   */
  _sendFrame(control, scoreKeeper) {
    let frame = new intf.Frame();
    frame.windowSize = control.windowSize;
    frame.score = scoreKeeper.score;
    frame.lives = scoreKeeper.lives;

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


