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
export class Canvas {
  
  /**
   * Constructor
   *
   */
  constructor() {
    this._initialize();
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
  _initialize() {
    let canvas = document.getElementById('canvas');

    this.width = window.innerWidth * 0.8;
    this.height = window.innerHeight * 0.8;
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

    this._canvas.resetCanvas();

    // Dequeue next frame
    let nextFrame = this._inputQueue.dequeue();

    for (let obj of nextFrame) {

      // Translate object model to correct coordinate
      let translatedCoordArray = [];
      for (let coordinate of Array.from(obj.vertices)) {
        translatedCoordArray.push([
          coordinate[0] + obj.translation[0],
          coordinate[1] + obj.translation[1]
        ]);
      }

      this._canvas.drawObject(translatedCoordArray);
    }
  }
};

