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
   * Static "constants"
   *
   */
  static get maxTilt() { return 20; }
    
  /**
   * Constructor
   *
   * @param {Queue} eventQueue  The output queue
   * @return {Controller}
   */
  constructor(eventQueue) {
    this._currentControlState = new intf.Control();
    this._eventQueue = eventQueue;
    this._firstClick = true;
    this._shootReleasedOnTouch = true;

    this._addEventListeners();
    this._handleResizeEvent();
  }

  /**
   * Adds the event listeners to the window
   *
   * @return {undefined}
   */
  _addEventListeners() {
    // Key Events
    document.addEventListener('keydown', (event) => {
      this._handleKeyboardEvent('down', event);
    });
    document.addEventListener('keyup', (event) => {
      this._handleKeyboardEvent('up', event);
    });

    // Click events. The first click sets up touch and
    // orientation events. Subsequent clicks interacts
    // with canvas.
    document.addEventListener('click', (event) => {
      if (this._firstClick) {
        this._addOrientationEvent();
        
        let canvas = document.getElementById('canvas');
        canvas.addEventListener('touchstart', (event) => {
          this._handleClickEvent(event);
        });
        canvas.addEventListener('touchend', (event) => {
          this._handleClickEvent(event);
        });
        canvas.addEventListener('touchcancel', (event) => {
          this._handleClickEvent(event);
        });
        canvas.addEventListener('touchmove', (event) => {
          this._handleClickEvent(event);
        });
        this._firstClick = false;
      }
    });
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
          this._currentControlState.rotate = intf.Control.rotateFullCw;
        } else {
          this._currentControlState.rotate = intf.Control.rotateNone;
        }
        break;

      // Rotate counter-clockwise
      case "a":
      case "ArrowLeft":
        if (type === 'down') {
          this._currentControlState.rotate = intf.Control.rotateFullCcw;
        } else {
          this._currentControlState.rotate = intf.Control.rotateNone;
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
    this._eventQueue.enqueue(this._currentControlState);
  }

  /**
   * Handles a click event
   *
   * @param {MouseEvent} event Mouse event to handle
   * @return {undefined}
   */
  _handleClickEvent(eventInfo) {
    // Do not handle event twice
    if (eventInfo.defaultPrevented) {
      return;
    }

    // Reset control state - these will be updated below if touch is active
    let requestedMissile = false;
    this._currentControlState.thrust = false;
    this._currentControlState.shoot = false;

    for (let ii = 0; ii < eventInfo.touches.length; ii++) {
      let touch = eventInfo.touches.item(ii);
      let xpos = touch.pageX;

      // Left side of screen is thruster
      if (xpos < this._currentControlState.windowSize[0] / 2) {
        this._currentControlState.thrust = true;

      // Right side of screen is missile launch
      } else {
        requestedMissile = true;
        if (this._shootReleasedOnTouch) {
          this._currentControlState.shoot = true;
          this._sendControl(this._currentControlState);
          this._currentControlState.shoot = false;
        }
      }
    }
    
    this._sendControl(this._currentControlState);

    // Make sure each tap of the right side of screen only shoots once
    this._shootReleasedOnTouch = !requestedMissile;
    
    // Do not handle event twice
    eventInfo.preventDefault();
  }

  /**
   * Handles a device orientation event
   *
   * @param {OrientationEvent}  event  Event passed from DOM
   * @return {undefined}
   */
  _handleOrientationEvent(event) {

    // Prevent too many orientation events - these come fast
    if (this._lastOrientationEvent !== undefined &&
        event.timeStamp - this._lastOrientationEvent < 30) {
      return;
    }
    this._lastOrientationEvent = event.timeStamp;

    // Calculate rotation amount based on orientation
    let sendRotationControl = (orientation) => {

      if (orientation < - Controller.maxTilt) {
        this._currentControlState.rotate = intf.Control.rotateFullCcw;
        
      } else if (orientation > Controller.maxTilt) {
        this._currentControlState.rotate = intf.Control.rotateFullCw;
        
      } else {
        this._currentControlState.rotate = orientation / Controller.maxTilt;
      }

      this._sendControl(this._currentControlState);
    };
    
    // Landscape
    if(this._currentControlState.windowSize[0] >
       this._currentControlState.windowSize[1])
    {
      sendRotationControl(event.beta);

    // Portrait
    } else {
      sendRotationControl(event.gamma);
    }
  }

  /**
   * Returns the current window size
   *
   * @return {Array}  With [height, width]
   */
  _getWindowSize() {
    return [
      window.innerWidth,
      window.innerHeight,
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

  /**
   * Adds orientation event (if applicable)
   *
   * @return {undefined}
   */
  _addOrientationEvent() {

    if (typeof(DeviceOrientationEvent) !== 'undefined' &&
        typeof(DeviceOrientationEvent.requestPermission) === 'function') {
      
        DeviceMotionEvent.requestPermission()
          .then( response => {
            if ( response == "granted" ) {
              window.addEventListener( "deviceorientation", (event) => {
                this._handleOrientationEvent(event);
              });
            }
          }).catch((error) => {
            console.log(`[${error.code}]: ${error.message}`); 
          })
            
    } else {
      window.addEventListener('deviceorientation', (event) => {
        this._handleOrientationEvent(event);
      });
    }
  }
};
