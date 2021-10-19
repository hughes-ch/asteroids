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

  /**
   * Renders text on screen
   *
   * @param {String}  text   Text to write
   * @param {String}  size   Size to write
   * @param {Array}   pos    Position to write text
   * @param {Boolean} center Whether to center text
   * @return {undefined}
   */
  renderText(text, size, pos, center=false) {
    let canvas = document.getElementById('canvas');
    let context = canvas.getContext('2d');

    if (center) {
      context.textAlign = 'center';
    }

    context.font = `${size} "VT323"`;
    context.strokeStyle = '#FFF';
    context.fillStyle = '#FFF';
    context.lineWidth = 1.0;
    context.fillText(text, pos[0], pos[1]);
  }
};

/**
 * Manages the canvas
 *
 */
export class View {

  /**
   * Static "constants"
   *
   */
  static get sizeTitleText() { return 15 /* vw */; }
  static get sizeSubtitleText() { return 10 /* vw */; }
  static get sizeStandardText() { return 4 /* vw */; }

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

    // Draw score
    if (nextFrame.lives <= 0) {
      
      this._canvas.renderText(
        'GAME OVER',
        `${View.sizeTitleText}vw`,
        [nextFrame.windowSize[0]/2, nextFrame.windowSize[1]/2],
        true);

      let yoffset = (View.sizeTitleText/100) * nextFrame.windowSize[0];
      
      this._canvas.renderText(
        `SCORE: ${nextFrame.score}`,
        `${View.sizeSubtitleText}vw`,
        [nextFrame.windowSize[0]/2, (nextFrame.windowSize[1]/2) + yoffset],
        true);
          
    } else {
      let textSize = `${View.sizeStandardText}vw`;
      let yoffset = (View.sizeStandardText/100) * nextFrame.windowSize[0];
      
      this._canvas.renderText(
        `SCORE: ${nextFrame.score}`,
        textSize,
        [0, yoffset]);

      this._canvas.renderText(
        `LIVES: ${nextFrame.lives}`,
        textSize,
        [0, yoffset*2]);
    }

    // Save frame history
    this._prevFrame = nextFrame;
  }
};

