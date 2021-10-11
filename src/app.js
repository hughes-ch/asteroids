/**
 * Javascript script defining the Asteroids game
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */

import * as containers from './modules/containers.js'
import * as control from './modules/controller.js'
import * as model from './modules/model.js'
import * as view from './modules/view.js'

/**
 * Entry point for asteroids game
 *
 */
let asteroids_main = function() {
  let frameQueue = new containers.Queue();
  let controlQueue = new containers.Queue();

  let controller = new control.Controller(controlQueue);
  let gameModel = new model.Model(controlQueue, frameQueue);
  let gameView = new view.View(frameQueue);

  setInterval(gameModel.updateFrame.bind(gameModel), 30);
  setInterval(gameView.renderCanvas.bind(gameView), 30);
};

asteroids_main();
