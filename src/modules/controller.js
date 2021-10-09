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

    this._currentControlState = {
      rotate: 0,
      thrust: false,
      shoot: false
    };
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

    switch (eventInfo.code) {
      // Throw on (or turn off) the thruster
      case "KeyW":
      case "ArrowUp":
        if (type === 'down') {
          this._currentControlState.thrust = true;
        } else {
          this._currentControlState.thrust = false;
        }
        break;
        
      default:
        return;
    }

    this._eventQueue.enqueue(this._currentControlState);

    // Do not handle event twice
    eventInfo.preventDefault();
  }
};
