/**
 * Javascript script defining the Asteroids game
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
// Model
//     Maintains game state/score/lives/obj positions
//     Try to wake at 30 Hz (asynchronous of view)
//     input:
//         Control obj
//             rotate: -1/0/+1
//             thrust: true/false
//             shoot: true/false
//     output (called a frame):
//         [
//             {
//                 obj-model: 
//                 rotation:
//                 position:
//             }
//         ]
// View
//     Renders to canvas
//     Try to wake at 30 Hz (asynchronous of model)
//     input:
//         output of Model
//     output:
//         Beautiful pictures
// Controller
//     Takes input, makes easy-to-understand control for model
//     input:
//         Mouse, keyboard
//     output:
//         Model input
// Obj models - global
//     Ordered list of coordinates (to be drawn)
//     Can collide (true/false)

import * as containers from './modules/containers.js'
import * as model from './modules/model.js'
import * as view from './modules/view.js'

/**
 * Entry point for asteroids game
 *
 */
let asteroids_main = function() {
  let frameQueue = new containers.Queue();
  let controlQueue = new containers.Queue();

  let gameModel = new model.Model(controlQueue, frameQueue);
  let gameView = new view.View(frameQueue);

  setInterval(gameModel.updateFrame.bind(gameModel), 30);
  setInterval(gameView.renderCanvas.bind(gameView), 30);
};

asteroids_main();
