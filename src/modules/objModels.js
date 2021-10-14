/**
 * Defines vertices for game objects
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import {Enumify} from 'enumify'

/**
 * Enum specifying the type of model to use
 *
 */ 
export class ModelType extends Enumify {
  static asteroid = new ModelType();
  static missile = new ModelType();
  static spaceship = new ModelType();
  static thruster = new ModelType();
  static _ = this.closeEnum();
};

/**
 * Object model instances
 *
 */
export const Missile = {
  drag: 0,
  lifetime: 2 /* sec */,
  maxSpeed: 500,
  maxThrust: 0,
  rotationSpeed: 0,
  vertices: [
    [0, 4],
    [0, 0],
  ],
};

export const Spaceship = {
  drag: 0.1,
  lifetime: Infinity,
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
  lifetime: Infinity,
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

export const Asteroid = [
  {
    drag: 0,
    lifetime: Infinity,
    maxSpeed: 70,
    maxThrust: 0,
    rotationSpeed: 0,
    vertices: [
      [-26.0, 3.5],
      [-30.0, -11.5],
      [-14.0, -23.5],
      [-2.0, -15.5],
      [13.0, -19.5],
      [26.0, -3.5],
      [11.0, 0.5],
      [22.0, 18.5],
      [6.0, 37.5],
      [-13.0, 27.5],
      [-21.0, 33.5],
      [-33.0, 17.5],
    ],
  },
  {
    drag: 0,
    lifetime: Infinity,
    maxSpeed: 60,
    maxThrust: 0,
    rotationSpeed: 0,
    vertices: [
      [-13.0, 28.0],
      [-11.0, 10.0],
      [-25.0, 16.0],
      [-25.0, -14.0],
      [-13.0, -30.0],
      [13.0, -28.0],
      [23.0, -16.0],
      [29.0, 8.0],
      [21.0, 20.0],
      [7.0, 8.0],
      [9.0, 28.0],
    ],
  },
  {
    drag: 0,
    lifetime: Infinity,
    maxSpeed: 80,
    maxThrust: 0,
    rotationSpeed: 0,
    vertices: [
      [-1.5, -31.5],
      [-18.5, -22.5],
      [-27.5, 5.5],
      [-18.5, 24.5],
      [1.5, 31.5],
      [24.5, 24.5],
      [23.5, 8.5],
      [33.5, -3.5],
      [24.5, -22.5],
      [7.5, -13.5],
    ],
  },
  {
    drag: 0,
    lifetime: Infinity,
    maxSpeed: 50,
    maxThrust: 0,
    rotationSpeed: 0,
    vertices: [
      [-28.0, 8.0],
      [-12.0, 21.0],
      [-13.0, 32.0],
      [5.0, 35.0],
      [6.0, 9.0],
      [23.0, 22.0],
      [29.0, 18.0],
      [28.0, -8.0],
      [16.0, -25.0],
      [9.0, -13.0],
      [-4.0, -29.0],
      [-20.0, -17.0],
    ],
  },
]

