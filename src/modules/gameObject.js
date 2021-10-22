'use strict';
/**
 * Contains the definitions of various game objects
 * 
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as intf from './interfaces.js'
import * as math from 'mathjs'
import * as objModels from './objModels.js'
import clone from 'just-clone'
import earcut from 'earcut'

/**
 * Object parameters class
 *
 * Minimal interface. Members meant to be manipulated directly
 */
export class ObjectParameters {

  /**
   * Constructor
   *
   * @return {ObjectParameters}
   */
  constructor() {
    this.coordinates = [0, 0];
    this.movement = [0, 0];
    this.rotation = 0;
    this.scale = 1;
  }
};

/**
 * A Game Model represented as a cluster of trianges. Used for collision.
 *
 */
class TriangulatedObj {

  /**
   * Constructor
   *
   * @param  {Array}  model  List of vertices
   * @return {TriangulatedObj}
   */
  constructor(model) {

    // Verify flatTriangles.length is a factor of three. Otherwise, the
    // earcut algorithm gave us something we didn't expect.
    let flatTriangles = earcut(model.flat());

    this._triangles = [];
    if (flatTriangles.length % 3) {
      return;
    }

    for (let ii = 0; ii < flatTriangles.length; ii += 3) {
      this._triangles.push([]);
      for (let jj = 0; jj < 3; jj++) {
        this._triangles[this._triangles.length-1].push({
          x: model[flatTriangles[ii+jj]][0],
          y: model[flatTriangles[ii+jj]][1],
        });
      }
    }
  }

  /**
   * Determines if a polygon contains any point in a series
   *
   * @param  {Array}  points  Coordinates to check
   * @return {Boolean}
   */
  contains(points) {
    for (let triangle of this._triangles) {
      for (let point of points) {
        if (this._isPointInTriangle(triangle, point)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Determines if a single point is within a single triangle
   *
   * @param {Array}  t  coordinates of triangle
   * @param {Array}  p  coordinate to test
   * @return {Boolean}
   */
  _isPointInTriangle(t, p) {

    let denominator = ((t[1].y-t[2].y) * (t[0].x-t[2].x) + (t[2].x-t[1].x) * (t[0].y-t[2].y));
    let a = ((t[1].y-t[2].y) * (p[0]-t[2].x) + (t[2].x-t[1].x) * (p[1]-t[2].y)) / denominator;
    let b = ((t[2].y-t[0].y) * (p[0]-t[2].x) + (t[0].x-t[2].x) * (p[1]-t[2].y)) / denominator;
    let c = 1 - a - b;
    
    return 0 <= a && a <= 1 && 0 <= b && b <= 1 && 0 <= c && c <= 1;
  }
};

/**
 * A game object - not intended to be instantiated, but serve as a base class
 *
 */
export class GameObject {

  /**
   * Static method to retrieve device pixel ratio
   *
   * @return {number}
   */
  static getDevicePixelRatio() {
    return window.devicePixelRatio / 2;
  }

  /**
   * Utility function to rotate a vector
   *
   * @param {Array} vector    Vector to rotate
   * @param {Number} rotation Amount to rotate
   * @return {Array} Rotated vector
   */
  static rotateVector(vector, rotation) {
    const rotationInRad = rotation * math.pi / 180;

    return [
      vector[0] * math.cos(rotationInRad) - vector[1] * math.sin(rotationInRad),
      vector[0] * math.sin(rotationInRad) + vector[1] * math.cos(rotationInRad),
    ];
  }

  /**
   * Constructor
   *
   * @param {objModels.ModelType} type      Type of object
   * @param {Object}              objParams Characteristics of new object
   * @return {GameObject}
   */
  constructor(type, objParams) {
    this.coordinates = objParams.coordinates;
    this.isGarbage = false;
    this.movement = objParams.movement;
    this.remainingLife = 1 /* percent */;
    this.rotation = objParams.rotation;
    this.type = type;
    this._lastCanvasSize = undefined;

    // Choose object model
    switch (this.type) {
      case objModels.ModelType.alien:
        this._model = clone(objModels.Alien);
        break;
        
      case objModels.ModelType.asteroid:
        let modelIdx = Math.floor(Math.random() * objModels.Asteroid.length);
        this._model = clone(objModels.Asteroid[modelIdx]);
        break;
        
      case objModels.ModelType.blaster:
      case objModels.ModelType.missile:
        this._model = clone(objModels.Missile);
        break;

      case objModels.ModelType.debris:
        this._model = clone(objModels.Debris);
        break;

      case objModels.ModelType.spaceship:
        this._model = clone(objModels.Spaceship);
        break;

      case objModels.ModelType.thruster:
        this._model = clone(objModels.Thruster);
        break;

      default:
        {
          let invalidObjTypeException = (message) => {
            this.message = message;
            this.name = 'InvalidObjTypeException';
          };
          throw new invalidObjTypeException(
            `New object not created. Invalid type: ${this.type}`);
        }
    }

    // Scale object model
    this._model.vertices = this._model.vertices.map(
      (vertex) => {
        return math.multiply(vertex, objParams.scale);
      });

    this._scaleOnDevicePixelRatio();
  }

  /**
   * Updates the state of the game object by a single frame
   *
   * @param {Object}  control                Control object
   * @param {Number}  numSecSinceLastUpdate  Number of seconds since last Frame
   * @return {undefined}
   */
  updateState(control, numSecSinceLastUpdate) {
    // Do as close to the expected thing as possible if the canvas size changes
    if (this._lastCanvasSize !== undefined &&
        (this._lastCanvasSize[0] !== control.windowSize[0] ||
         this._lastCanvasSize[1] !== control.windowSize[1])) {

      let xscale = control.windowSize[0]/this._lastCanvasSize[0];
      let yscale = control.windowSize[1]/this._lastCanvasSize[1];
      this.coordinates[0] *= xscale;
      this.coordinates[1] *= yscale;
    }
    
    this._lastCanvasSize = control.windowSize;

    // Determine coordinates
    this.movement = this._calculateMovement(control, numSecSinceLastUpdate);

    this.coordinates = math.add(
      this.coordinates,
      math.multiply(this.movement, numSecSinceLastUpdate));

    // Determine if object is at end-of-life
    if (this._model.lifetime < Infinity) {
      let amountOfLifeTaken = Math.abs(
        math.norm(
          math.multiply(
            this.movement,
            numSecSinceLastUpdate)) /
          (this._model.lifetime * math.norm(control.windowSize))
      );
      
      this.remainingLife -= amountOfLifeTaken;
      if (this.remainingLife <= 0) {
        this.isGarbage = true;
      }
    }

    // Determine wrapped coordinates
    if (control.windowSize[0] < Infinity && control.windowSize[1] < Infinity) {
      for (let ii = 0; ii < this.coordinates.length; ii++) {

        if (this.coordinates[ii] > control.windowSize[ii]) {
          if (this._canWrap()) {
            this.coordinates[ii] = 0;
          } else {
            this.isGarbage = true;
          }
          
        } else if (this.coordinates[ii] < 0) {
          if (this._canWrap()) {
            this.coordinates[ii] = control.windowSize[ii];
          } else {
            this.isGarbage = true;
          }
        }
      }
    }
  }

  /**
   * Determines if this object can collide with the other
   *
   * @param  {GameObject}  obj  The other game object to check
   * @return {Boolean}
   */
  canCollideWith(obj) {
    return false;
  };

  /**
   * calculates if an object collides with another
   *
   * @param {GameObject} obj Another game object
   * @return {Boolean}
   */
  collidesWith(obj) {
    // Make sure the types can actually collide
    if (!this.canCollideWith(obj)) {
      return false;
    }

    if (this.isGarbage || obj.isGarbage) {
      return false;
    }

    // Triangulate both models
    const thisModel = this.getTranslatedModel();
    const thatModel = obj.getTranslatedModel();
    
    let triangulatedThis = new TriangulatedObj(thisModel);
    let triangulatedThat = new TriangulatedObj(thatModel);

    // Check if either model has points within the other polygon
    return triangulatedThis.contains(thatModel) ||
      triangulatedThat.contains(thisModel);
  }

  /**
   * Destroys the game object and returns its parts
   *
   * @return {[GameObject]} A list of gameObjects
   */
  destroy() {
    let debris = [];
    for (let ii = 0; ii < this._model.vertices.length; ii++) {
      let nextVertex = ii === this._model.vertices.length-1 ?
          this._model.vertices[0] : this._model.vertices[ii+1];
      let thisEdge = [this._model.vertices[ii], nextVertex];
      debris.push(new Debris(this.coordinates, thisEdge, this.rotation));
    }
    
    this.isGarbage = true;
    return debris;
  }

  /**
   * Decompose an object into its object model
   *
   * @return {obj} Simple representation of GameObject
   */
  decompose() {
    // Rotate object model
    let rotatedModel = [];
    for (let vertex of this._model.vertices) {
      rotatedModel.push(GameObject.rotateVector(vertex, this.rotation));
    }

    return {
      rotation: this.rotation,
      translation: this.coordinates,
      type: this.type,
      vertices: rotatedModel,
    };
  }

  /**
   * Gets the translated model
   *
   * @return {Array}
   */
  getTranslatedModel() {
    let translatedModel = [];
    let decomposedModel = this.decompose();
    
    for (let vertex of decomposedModel.vertices) {
      translatedModel.push(math.add(vertex, decomposedModel.translation));
    }

    return translatedModel;
  }

  /**
   * Returns a score object
   *
   * @return {Score}
   */
  score() {
    return new intf.Score();
  }

  /** 
   * Normalize a rotation to between 0 and 360
   *
   * @return {number} between 0 and 360
   */
  _normalizeRotation(rotation) {
    if (rotation > 360) {
      return rotation - 360;
    }
    if (rotation < 0) {
      return rotation + 360;
    }
    return rotation;
  }

  /**
   * Returns updated movement vector
   *
   * @param {obj}   control      Control object
   * @param {Date}  elapsedTime  Time since last update
   * @return {Array} Updated movement vector
   */
  _calculateMovement(control, elapsedTime) {
    return this.movement;
  }

  /**
   * Determines if the object can wrap
   *
   * @return {Boolean}
   */
  _canWrap() {
    // Objects can wrap by default
    return true;
  }

  /**
   * Scale based on device pixel ratio
   *
   * @return {undefined}
   */
  _scaleOnDevicePixelRatio() {
    let ratio = GameObject.getDevicePixelRatio();

    this._model.maxSpeed /= ratio;
    this._model.maxThrust /= ratio;

    if (this.movement) {
      this.movement = math.divide(this.movement, ratio);
    }
    
    this._model.vertices = this._model.vertices.map(
      (vertex) => math.divide(vertex, ratio));
  }
};

/**
 * Debris
 *
 */
export class Debris extends GameObject {

  /**
   * Constructor
   *
   * @param {Array}  coordinates  Coordinates of destroyed object
   * @param {Array}  edge         Two vertices that represent an edge
   * @param {number} rotation     Rotation of destroyed object
   * @return {Debris}
   */
  constructor(coordinates, edge, rotation) {
    // Select "anchor point" or point that doesn't rotate
    let rotatedEdge = [
      GameObject.rotateVector(edge[0], rotation),
      GameObject.rotateVector(edge[1], rotation),
    ];
      
    let translatedEdge = [
      math.add(rotatedEdge[0], coordinates),
      math.add(rotatedEdge[1], coordinates),
    ];
    
    let anchorPoint = translatedEdge[0];
    let objParams = new ObjectParameters();
    objParams.coordinates = anchorPoint;
    objParams.movement = undefined;
    super(objModels.ModelType.debris, objParams);

    // Calculate vertices for decomposition
    this._vertices = [
      [0, 0],
      math.subtract(translatedEdge[1], anchorPoint),
    ];
  }

  /**
   * Decompose an object into its object model
   *
   * @return {obj} Simple representation of GameObject
   */
  decompose() {
    // Rotate object model
    let rotatedModel = [];
    for (let vertex of this._vertices) {
      rotatedModel.push(GameObject.rotateVector(vertex, this.rotation));
    }

    return {
      rotation: this.rotation,
      translation: this.coordinates,
      type: this.type,
      vertices: rotatedModel,
    };
  }

  /**
   * Returns updated movement vector
   *
   * @param {obj}   control      Control object
   * @param {Date}  elapsedTime  Time since last update
   * @return {Array} Updated movement vector
   */
  _calculateMovement(control, elapsedTime) {

    // Movement must be calculated after model is chosen by base class
    if (this.movement === undefined) {
      let movementVec = [0, this._model.maxSpeed];
      let movementAngle = Math.random() * 360;
      this.movement = GameObject.rotateVector(movementVec, movementAngle);
    }

    return this.movement;
  }
}; 

/** 
 * A missile
 *
 */
export class Missile extends GameObject {

  /**
   * Constructor
   *
   * @param {Array}   coordinates  Coordinates of new object
   * @param {Array}   movement     Movement vect of ship firing missile
   * @param {Number}  rotation     Rotation of ship firing object
   * @return {Missile}
   */
  constructor(coordinates, movement, rotation) {
    let missileMovement = math.add(
      GameObject.rotateVector(
        [0, objModels.Missile.maxSpeed],
        rotation),
      movement);
        
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.movement = missileMovement;
    objParams.rotation = rotation;

    super(objModels.ModelType.missile, objParams);
  }

  /**
   * Determines if this object can collide with the other
   *
   * @param  {GameObject}  obj  The other game object to check
   * @return {Boolean}
   */
  canCollideWith(obj) {
    return obj.type === objModels.ModelType.asteroid ||
      obj.type === objModels.ModelType.alien;
  };

  /**
   * Returns a score object
   *
   * @return {Score}
   */
  score() {
    let newScore = new intf.Score();
    newScore.owned = true;
    return newScore;
  }
};

/** 
 * A blaster (alien missile)
 *
 */
export class Blaster extends GameObject {

  /**
   * Constructor
   *
   * @param {Array}   coordinates  Coordinates of new object
   * @param {Number}  rotation     Rotation of ship firing object
   * @return {Missile}
   */
  constructor(coordinates, rotation) {
    let velocity = GameObject.rotateVector(
      [0, objModels.Missile.maxSpeed],
      rotation);
        
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.movement = velocity;
    objParams.rotation = rotation;

    super(objModels.ModelType.blaster, objParams);
  }

  /**
   * Determines if this object can collide with the other
   *
   * @param  {GameObject}  obj  The other game object to check
   * @return {Boolean}
   */
  canCollideWith(obj) {
    return obj.type === objModels.ModelType.asteroid ||
      obj.type === objModels.ModelType.spaceship;
  };

  /**
   * Determines if the object can wrap
   *
   * @return {Boolean}
   */
  _canWrap() {
    return false;
  }
};

/**
 * An asteroid
 *
 */
export class Asteroid extends GameObject {

  /**
   * Static "Constants"
   *
   */
  static get debrisCount() { return 2; }
  
  static get largeScale() { return 2; }
  static get mediumScale() { return 1; }
  static get smallScale() { return 0.5; }

  /**
   * Constructor
   *
   * @param {Array}  coordinates  Coordinates of new object
   * @return {Asteroid}
   */
  constructor(coordinates, scale) {
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.movement = undefined;
    objParams.rotation = Math.random() * 360;
    objParams.scale = scale;

    super(objModels.ModelType.asteroid, objParams);

    this._scale = scale;
  }

  /**
   * Destroys the game object and returns its parts
   *
   * @return {[GameObject]} A list of gameObjects
   */
  destroy() {
    this.isGarbage = true;

    let debris = [];
    if (this._scale !== Asteroid.smallScale) {
      let newScale = this._scale == Asteroid.largeScale ?
          Asteroid.mediumScale :
          Asteroid.smallScale;
      
      for (let ii = 0; ii < Asteroid.debrisCount; ii++) {
        debris.push(new Asteroid(this.coordinates, newScale));
      }

    } else {
      return super.destroy();
    }

    return debris;
  }

  /**
   * Returns a score object
   *
   * @return {Score}
   */
  score() {
    let newScore = new intf.Score();
    newScore.scoreIncrease = this._scale === Asteroid.largeScale ? 20 :
      this._scale === Asteroid.mediumScale ? 50 : 100;

    return newScore;
  }

  /**
   * Returns updated movement vector
   *
   * @param {obj}   control      Control object
   * @param {Date}  elapsedTime  Time since last update
   * @return {Array} Updated movement vector
   */
  _calculateMovement(control, elapsedTime) {

    // Movement must be calculated after model is chosen by base class
    if (this.movement === undefined) {
      let movementVec = [0, this._model.maxSpeed / this._scale];
      let movementAngle = Math.random() * 360;
      this.movement = GameObject.rotateVector(movementVec, movementAngle);
    }

    return this.movement;
  }

  /**
   * Determines if this object can collide with the other
   *
   * @param  {GameObject}  obj  The other game object to check
   * @return {Boolean}
   */
  canCollideWith(obj) {
    return obj.type === objModels.ModelType.missile ||
      obj.type === objModels.ModelType.spaceship ||
      obj.type === objModels.ModelType.alien ||
      obj.type === objModels.ModelType.blaster;
  };
};

/**
 * An alien spacecraft
 *
 */
export class Alien extends GameObject {

  /**
   * Static "Constants"
   *
   */
  static get jukeLength() { return 0.5; }
  static get jukeNominalTime() { return 2; }
  static get movementAngleOffset() { return 30; }

  /**
   * Constructor
   *
   * @param {Array}  coordinates  Coordinates of new object
   * @return {Asteroid}
   */
  constructor(coordinates) {
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.movement = undefined;
    super(objModels.ModelType.alien, objParams);

    this._movementAngleOffset = undefined;
    this._nextJukeTime = this._calculateNextJukeTime();
    this._origMovementVect = undefined;
    this._timeElapsedSinceJuke = 0;
  }

  /**
   * Returns a score object
   *
   * @return {Score}
   */
  score() {
    let newScore = new intf.Score();
    newScore.scoreIncrease = 200;
    return newScore;
  }

  /**
   * Returns updated movement vector
   *
   * @param {obj}   control      Control object
   * @param {Date}  elapsedTime  Time since last update
   * @return {Array} Updated movement vector
   */
  _calculateMovement(control, elapsedTime) {
    // Calculate the movement angle
    if (this.movement === undefined) {
      let directionMultiplier = this.coordinates[0] === 0 ? 1 : -1;
      this._movementAngleOffset = (
        Math.random() * Alien.movementAngleOffset * 2) -
        Alien.movementAngleOffset;
      
      this.movement = GameObject.rotateVector(
        math.multiply([this._model.maxSpeed, 0], directionMultiplier),
        this._movementAngleOffset);
      
      this._origMovementVect = this.movement;
    }

    // Start a juke
    this._timeElapsedSinceJuke += elapsedTime;
    
    if (this._timeElapsedSinceJuke > this._nextJukeTime) {
      
      this._nextJukeTime = this._calculateNextJukeTime();
      this._timeElapsedSinceJuke = 0;
      
      let jukeDirection = Math.random() > 0.5 ? 1 : -1;
      let jukeVelocity = GameObject.rotateVector(
        [0, jukeDirection * this._model.maxSpeed * 2],
        this._movementAngleOffset);
      
      this.movement = math.add(this.movement, jukeVelocity);
    }

    // Stop juke
    if (this._timeElapsedSinceJuke > Alien.jukeLength) {
      this.movement = this._origMovementVect;
    }

    return this.movement;
  }

  /**
   * Determines if this object can collide with the other
   *
   * @param  {GameObject}  obj  The other game object to check
   * @return {Boolean}
   */
  canCollideWith(obj) {
    return obj.type === objModels.ModelType.missile ||
      obj.type == objModels.ModelType.spaceship ||
      obj.type == objModels.ModelType.asteroid;
  };
 
  /**
   * Calculates the next juke time
   *
   * @return {number}
   */
  _calculateNextJukeTime() {
    return (Alien.jukeNominalTime/2) +
      (Alien.jukeNominalTime * Math.random());
  };

  /**
   * Determines if the object can wrap
   *
   * @return {Boolean}
   */
  _canWrap() {
    return false;
  }
};

/**
 * Represents any object controlled by the user
 *
 */
class UserControlledGameObject extends GameObject {

  /**
   * Constructor
   *
   * Note this class is not intended to be instantiated directly
   *
   * @param {objModel.ModelType}  type       Type of object
   * @param {obj}                 objParams  Details about the object's model
   * @return {UserControlledGameObject}
   */
  constructor(type, objParams) {
    super(type, objParams);
  };

  /**
   * Returns updated movement vector
   *
   * @param {obj}   control      Control object
   * @param {Date}  elapsedTime  Time since last update
   * @return {Array} Updated movement vector
   */
  _calculateMovement(control, elapsedTime) {
    // Determine rotation
    let scaledRotationChange =
        this._model.rotationSpeed * elapsedTime * control.rotate;

    this.rotation += scaledRotationChange;
    this.rotation = this._normalizeRotation(this.rotation);

    // Determine acceleration. 
    let accelerationVector = [0, 0];
    
    if (control.thrust) {
      accelerationVector = GameObject.rotateVector(
        [0, this._model.maxThrust],
        this.rotation);
    }

    let scaledAccelerationVector = math.multiply(
      accelerationVector,
      elapsedTime);

    // Determine drag
    let dragEffect = math.multiply(
      math.multiply(this.movement, this._model.drag),
      elapsedTime);
    
    // Determine movement vector
    let updatedMovement = this.movement;
    
    if (control.thrust) {
      updatedMovement = math.add(updatedMovement, scaledAccelerationVector);
    }

    return math.subtract(updatedMovement, dragEffect);
  }
};

/**
 * Thruster graphic on back of spaceship
 *
 */
export class Thruster extends UserControlledGameObject {

  /**
   * Constructor
   *
   * @param {Array} coordinates  Initial starting coordinates
   * @param {Array} movement     Initial movement vector
   * @param {number} rotation    Initial rotation of object
   * @return {Thruster}
   */
  constructor(coordinates, movement, rotation) {
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.rotation = rotation;
    objParams.movement = math.multiply(
      movement,
      GameObject.getDevicePixelRatio());

    super(objModels.ModelType.thruster, objParams);
  }
};

/**
 * Represents the object the player is trying to fly
 *
 */
export class Spaceship extends UserControlledGameObject {

  /**
   * Constructor
   *
   * @param {Array} coordinates  Initial starting coordinates
   * @param {number} rotation    Initial rotation of object
   * @return {Spaceship}
   */
  constructor(coordinates, rotation) {
    let objParams = new ObjectParameters();
    objParams.coordinates = coordinates;
    objParams.rotation = rotation;

    super(objModels.ModelType.spaceship, objParams);
  }

  /**
   * Determines if this object can collide with the other
   *
   * @param  {GameObject}  obj  The other game object to check
   * @return {Boolean}
   */
  canCollideWith(obj) {
    return obj.type === objModels.ModelType.asteroid ||
      obj.type === objModels.ModelType.blaster ||
      obj.type === objModels.ModelType.alien;
  };

  /**
   * Returns a score object
   *
   * @return {Score}
   */
  score() {
    let newScore = new intf.Score();
    newScore.livesLost = 1;
    newScore.owned = true;
    return newScore;
p  }
};
