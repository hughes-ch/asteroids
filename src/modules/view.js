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
    this.height = 0;
    this.width = 0;
    this._context = undefined;
  }

  /**
   * Resets the canvas
   *
   * @return {undefined} 
   */
  resetCanvas() {
    this._context.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Draw an object
   *
   * @param {Array} coordinates  Vertex coordinates of the object
   * @return {undefined}
   */
  drawObject(coordinates) {

    this._context.beginPath();
    this._context.moveTo(coordinates[0][0], coordinates[0][1]);

    for (let ii = 1; ii < coordinates.length; ii++)
    {
      this._context.lineTo(coordinates[ii][0], coordinates[ii][1]);
    }
    
    this._context.closePath();
    this._context.stroke();
  }

  /**
   * Initialize canvas
   *
   */
  initializeCanvas() {
    let canvas = document.getElementById('canvas');

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    canvas.width = this.width;
    canvas.height = this.height;

    this._context = canvas.getContext('2d');
    this._context.fillStyle = '#000';
    this._context.strokeStyle = '#FFF';
    this._context.lineWidth = 2.0;
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

    // Don't touch canvas if nothing is in the queue
    if (this._inputQueue.length === 0) {
      return;
    }

    // If the canvas size changed or this is the first Frame, initialize canvas
    let nextFrame = this._inputQueue.dequeue();

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

      obj.vertices.forEach((coordinate) => {
        translatedCoordArray.push(
          math.add(coordinate, obj.translation));
      });
      
      this._canvas.drawObject(translatedCoordArray);
    }

    // Save frame history
    this._prevFrame = nextFrame;
  }
};

