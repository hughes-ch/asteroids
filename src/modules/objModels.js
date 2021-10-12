/**
 * Defines vertices for game objects
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import {Enumify} from 'enumify'

export class ModelType extends Enumify {
  static spaceship = new ModelType();
  static thruster = new ModelType();
  static _ = this.closeEnum();
};

export const Spaceship = {
  drag: 0.1,
  maxSpeed: 250, /* px/sec */
  maxThrust: 500,
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
  rotationSpeed: Spaceship.rotationSpeed,
  vertices: [
    [0, -9],
    [3, -11],
    [0, -21],
    [-3, -11],
  ],
};
