'use strict';
/**
 * View module
 * 
 * Defines types for rendering Asteroids
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */

/**
 * Interacts with the HTML canvas.
 *
 */
import * as math from 'mathjs'

export class Canvas {
  
  /**
   * Constructor
   *
   */
  constructor() {
  }

  /**
   * Resets the canvas
   *
   * @return {undefined} 
   */
  resetCanvas() {
    let canvas = document.getElementById('canvas');
    let context = canvas.getContext('2d');
    context.fillStyle = '#000';
    context.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  /**
   * Draw an object
   *
   * @param {Array} coordinates  Vertex coordinates of the object
   * @return {undefined}
   */
  drawObject(coordinates) {
    let canvas = document.getElementById('canvas');
    let context = canvas.getContext('2d');
    context.strokeStyle = '#FFF';
    context.lineWidth = 2.0;

    context.beginPath();
    context.moveTo(coordinates[0][0], coordinates[0][1]);

    for (let ii = 1; ii < coordinates.length; ii++)
    {
      context.lineTo(coordinates[ii][0], coordinates[ii][1]);
    }
    
    context.closePath();
    context.stroke();
  }

  /**
   * Initialize canvas
   *
   */
  initializeCanvas() {
    let canvas = document.getElementById('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
};

/**
 * Manages the canvas
 *
 */
export class View {

  /**
   * Constructor
   *
   * @param {Queue} inputQueue  Queue of game Frames
   */
  constructor(inputQueue) {
    this._inputQueue = inputQueue;
    this._canvas = new Canvas();
    this._prevFrame = undefined;
  }

  /**
   * Render the canvas from the latest Frame
   *
   * @return {undefined}
   */
  renderCanvas() {

    // Get the latest frame - discard any earlier ones in queue
    let nextFrame = undefined;
    
    while (this._inputQueue.length > 0) {
      nextFrame = this._inputQueue.dequeue();
    }

    if (nextFrame === undefined) {
      return;
    }

    // If the canvas size changed or this is the first Frame, initialize canvas
    if (this._prevFrame === undefined ||
        this._prevFrame.windowSize[0] !== nextFrame.windowSize[0] ||
        this._prevFrame.windowSize[1] !== nextFrame.windowSize[1]) {
      
      this._canvas.initializeCanvas();
    }

    // Draw next frame
    this._canvas.resetCanvas();

    for (let obj of nextFrame) {
      // Translate object model to correct coordinate
      let translatedCoordArray = [];

      for (let vertex of obj.vertices) {
        translatedCoordArray.push(
          math.add(vertex, obj.translation));
      }
      
      this._canvas.drawObject(translatedCoordArray);
    }

    // Save frame history
    this._prevFrame = nextFrame;
  }
};

