'use strict';

/**
 * Containers module
 * 
 * Defines common container classes for the Asteroids project
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import {Enumify} from 'enumify'

/**
 * Efficient implementation of a queue
 *
 */
export class Queue {
  /**
   * Constructor
   *
   * @return {Queue} The new object
   */
  constructor() {
    this._queue  = [];
    this._offset = 0;
  }

  /**
   * Getter for length attribute
   *
   * @return {number} Length of queue
   */
  get length() {
    return (this._queue.length - this._offset);
  }

  /**
   * Enqueues the specified item. The parameter is:
   *
   * @param {item} the item to enqueue
   * @return {undefined}
   */
  enqueue (item) {
    this._queue.push(item);
  }

  /** 
   * Dequeues an item and returns it.
   *
   * @return {Object} Or undefined if queue is empty
   */
  dequeue() {

    // if the queue is empty, return immediately
    if (this._queue.length == 0) {
      return undefined;
    }

    // store the item at the front of the queue
    let item = this._queue[this._offset];

    // increment the offset and remove the free space if necessary
    if ((this._offset++) * 2 >= this._queue.length) {
      this._queue = this._queue.slice(this._offset);
      this._offset = 0;
    }

    // return the dequeued item
    return item;

  }
};

/**
 * Represents a single game frame (state of all objects)
 *
 */
export class Frame {

  /**
   * Constructor
   *
   * @return {Frame}
   */
  constructor() {
    this.textObjects = [];
    this.windowSize = [0, 0];
    this._objModels = [];
  }

  /**
   * Adds a GameObject to the frame
   *
   * @param {GameObject} obj
   */
  add(obj) {
    this._objModels.push(obj.decompose());
  }

  /**
   * Adds a TextObject to the frame
   *
   * @param {TextObject} obj
   */
  addText(obj) {
    this.textObjects.push(obj);
  }

  /** 
   * Returns a Frame iterator object
   *
   */
  [Symbol.iterator]() {
    let currentIdx = 0;
    let maxIdx = this._objModels.length-1;
    
    return {
      current: this._objModels[0],
      last: this._objModels[maxIdx],

      next: () => {
        if (currentIdx <= maxIdx) {
          let returnVal = { done: false, value: this._objModels[currentIdx] };
          currentIdx++;
          return returnVal;
          
        } else {
          return { done: true };
        }
      }
    }
  }
};

/**
 * Control class
 *
 * Intended for direct element manipulation
 * Constructor provided for convenience.
 */
export class Control {

  // Static class "constants"
  static get rotateFullCw()  { return 1; }
  static get rotateFullCcw() { return -1; }
  static get rotateNone()    { return 0; }

  /**
   * Constructor
   *
   */
  constructor() {
    this.character = undefined;
    this.rotate = 0;
    this.shoot = false;
    this.thrust = false;
    this.windowSize = [Infinity, Infinity];
  }

  /**
   * Returns a copy of the control
   * 
   * @return {Control}
   */
  copy() {
    let copyControl = new Control();
    copyControl.character = this.character;
    copyControl.rotate = this.rotate;
    copyControl.shoot = this.shoot;
    copyControl.thrust = this.thrust;
    copyControl.windowSize = [this.windowSize[0], this.windowSize[1]];
    return copyControl;
  }

  /**
   * "Stack" controls to handle multiple at once
   * 
   * @param {Control}  nextControl  Next Control to account for 
   * @return {undefined}
   */
  stack(nextControl) {
    this.character = nextControl.character || this.character;
    this.rotate = nextControl.rotate;
    this.shoot = this.shoot || nextControl.shoot;
    this.thrust = this.thrust || nextControl.thrust;
    this.windowSize = nextControl.windowSize;
  }
};

/**
 * Details of a single score event
 *
 */
export class Score {

  /**
   * Constructor
   *
   */
  constructor() {
    this.livesLost = 0;
    this.scoreIncrease = 0;
    this.owned = false;
  }

  /**
   * "Stack" scores to handle multiple at once
   *
   * Newly stacked scores are returned. Original not modified
   * 
   * @param {Score}  nextScore  Next score to account for 
   * @return {Score}
   */
  stack(nextScore) {
    let stacked = new Score();
    stacked.livesLost = this.livesLost + nextScore.livesLost;
    stacked.scoreIncrease = this.scoreIncrease + nextScore.scoreIncrease;
    stacked.owned = this.owned || nextScore.owned;
    return stacked;
  }
};

/** 
 * Keeps score
 *
 */
export class ScoreKeeper {

  /**
   * Static "constants"
   *
   */
  static get startingLives() { return 3; }
  static get numPointsForNewLife() { return 10000; }

  /**
   * Constructor
   *
   * @return {ScoreKeeper}
   */
  constructor() {
    this.score = 0;
    this.lives = ScoreKeeper.startingLives;
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

    if (this.score > ScoreKeeper.numPointsForNewLife &&
        this.score % ScoreKeeper.numPointsForNewLife < updates.scoreIncrease) {
      
      this.lives += 1;
    }
  }

  /**
   * Returns a boolean indicating if game can keep going
   *
   * @return {Boolean}
   */
  allows() {
    return this.lives > 0;
  }

  /**
   * Resets the score
   *
   * @return {undefined}
   */
  reset() {
    this.score = 0;
    this.lives = ScoreKeeper.startingLives;
  }
};

/**
 * Maintains information about text objects
 *
 */
export class TextObject {

  /**
   * Constructor
   *
   * @return {TextObject}
   */
  constructor(text) {
    this.justify = 'left';
    this.position = [0, 0];
    this.sizePx = 16;
    this.text = text;
  }
};
