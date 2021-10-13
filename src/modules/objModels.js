/**
 * Defines vertices for game objects
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import {Enumify} from 'enumify'

export class ModelType extends Enumify {
  static missile = new ModelType();
  static spaceship = new ModelType();
  static thruster = new ModelType();
  static _ = this.closeEnum();
};

export class BoundsAction extends Enumify {
  static remove = new BoundsAction();
  static wrap = new BoundsAction();
  static _ = this.closeEnum();
};

export const Missile = {
  drag: 0,
  maxSpeed: 500,
  maxThrust: 0,
  boundsAction: BoundsAction.remove,
  rotationSpeed: 0,
  vertices: [
    [0, 4],
    [0, 0],
  ],
};

export const Spaceship = {
  drag: 0.1,
  maxSpeed: 250, /* px/sec */
  maxThrust: 500,
  boundsAction: BoundsAction.wrap,
  rotationSpeed: 360 /* deg/sec */,
  vertices: [
    [0, 12],
    [-10, -12],
    [0, -6],
    [10, -12],
  ],
};

export const Thruster = {
  drag: Spaceship.drag,
  maxSpeed: Spaceship.maxSpeed,
  maxThrust: Spaceship.maxThrust,
  boundsAction: BoundsAction.wrap,
  rotationSpeed: Spaceship.rotationSpeed,
  vertices: [
    [0, -9],
    [3, -11],
    [0, -21],
    [-3, -11],
  ],
};
