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
  static _ = this.closeEnum();
};

export const Spaceship = {
  drag: 0,
  maxSpeed: 100, /* px/sec */
  maxThrust: 0,
  rotationSpeed: 360 /* deg/sec */,
  vertices: [
    [0, 12],
    [-10, -12],
    [10, -12]
  ]
};
