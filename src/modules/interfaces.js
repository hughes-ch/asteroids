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
    this.windowSize = [0, 0];
    this._objModels = [];
  }

  /**
   * Adds a GameObject to the frame
   *
   * @param {GameObject} obj
   */
  add(obj) {
    this._objModels = this._objModels.concat(obj.decompose())
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
 * Enum specifying which direction to rotate
 *
 */
export class RotateState extends Enumify {
  static ccw = new RotateState();
  static cw = new RotateState();
  static none = new RotateState();
  static _ = this.closeEnum();
};

/**
 * Control class
 *
 * Intended for direct element manipulation
 * Constructor provided for convenience.
 */
export class Control {

  /**
   * Constructor
   *
   */
  constructor() {
    this.rotate = RotateState.none;
    this.shoot = false;
    this.thrust = false;
    this.windowSize = [Infinity, Infinity];
  }
};

