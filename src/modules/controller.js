/**
 * Controller module
 * 
 * Defines stuff to take keyboard/mouse/phone inputs
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */

/**
 * Detects key events and converts them to game inputs
 *
 */
import * as intf from './interfaces.js'

export class Controller {

  /**
   * Constructor
   *
   * @param {Queue} eventQueue  The output queue
   * @return {Controller}
   */
  constructor(eventQueue) {
    this._eventQueue = eventQueue;
    this._addEventListeners();
    this._currentControlState = new intf.Control();

    // Call window resize event handler to set initial screen size
    this._handleResizeEvent();
  }

  /**
   * Adds the event listeners to the window
   *
   * @return {undefined}
   */
  _addEventListeners() {
    document.addEventListener('keydown', (event) => {
      this._handleKeyboardEvent('down', event);
    }, true);
    document.addEventListener('keyup', (event) => {
      this._handleKeyboardEvent('up', event);
    }, true);
  }

  /**
   * Handles a keyboard event
   *
   * @param {String} type wither 'down' or 'up'
   * @param {KeyboardEvent} eventInfo
   * @return {undefined}
   */
  _handleKeyboardEvent(type, eventInfo) {
    // Do not handle event twice
    if (eventInfo.defaultPrevented) {
      return;
    }

    switch (eventInfo.key) {
      // Throw on (or turn off) the thruster
      case "w":
      case "ArrowUp":
        if (type === 'down') {
          this._currentControlState.thrust = true;
        } else {
          this._currentControlState.thrust = false;
        }
        break;
        
      // Rotate clockwise 
      case "d":
      case "ArrowRight":
        if (type === 'down') {
          this._currentControlState.rotate = intf.RotateState.cw;
        } else {
          this._currentControlState.rotate = intf.RotateState.none;
        }
        break;

      // Rotate counter-clockwise
      case "a":
      case "ArrowLeft":
        if (type === 'down') {
          this._currentControlState.rotate = intf.RotateState.ccw;
        } else {
          this._currentControlState.rotate = intf.RotateState.none;
        }
        break;

      // Fire missile
      case " ":
        if (type === 'down') {
          // Immediately send shoot command, then toggle to send second
          this._currentControlState.shoot = true;
          this._sendControl(this._currentControlState);

          this._currentControlState.shoot = false;
          break;

        } else {
          return;
        }

      default:
        return;
    }

    this._sendControl(this._currentControlState);

    // Do not handle event twice
    eventInfo.preventDefault();
  }

  /**
   * Handles a resize event
   *
   * @return {undefined}
   */
  _handleResizeEvent() {
    this._currentControlState.windowSize = this._getWindowSize();
    this._sendControl(this._currentControlState);
  }

  /**
   * Returns the current window size
   *
   * @return {Array}  With [height, width]
   */
  _getWindowSize() {
    return [
      window.innerWidth,
      window.innerHeight
    ];
  }

  /** 
   * Enqueue the control object
   * 
   * @param {Control}  control  The Control to send
   * @return {undefined}
   */
  _sendControl(control) {
    this._eventQueue.enqueue(control.copy());
  }
};
