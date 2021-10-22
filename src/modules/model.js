'use strict';
/**
 * Model module
 * 
 * Defines types for the Asteroids game model
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as gen from './generator.js'
import * as go from './gameObject.js'
import * as intf from './interfaces.js'
import {rando} from '@nastyox/rando.js';

/**
 * Game Model
 *
 */
export class Model {

  /**
   * Constructor
   *
   * @param {Queue} inputQueue  Queue of Control objects
   * @param {Queue} outputQueue Queue of Frame objects
   * @return {Model} new object
   */
  constructor(inputQueue, outputQueue) {
    this._inputQueue = inputQueue;
    this._outputQueue = outputQueue;
    this._score = new intf.ScoreKeeper();
    this._currentState = 0;
    this._lastControl = undefined;

    this._models = [
      new WelcomeStateModel(),
      new GameStateModel(this._score),
      new HighScoreScreenModel(this._score),
    ];
  }

  /**
   * Updates the game model by one frame
   *
   * @return {undefined}
   */
  updateFrame() {
    // Wait for initial control to set window parameters
    if (!this._lastControl) {

      if (this._inputQueue.length > 0) {
        let control = this._inputQueue.dequeue();
        this._lastControl = control;
        
      } else {
        return;
      }
    }

    // Determine latest control
    let control = new intf.Control();
    if (this._inputQueue.length === 0) {
      control = this._lastControl;

    } else {
      while(this._inputQueue.length > 0) {
        let latestControl = this._inputQueue.dequeue();
        control.stack(latestControl);
        this._lastControl = latestControl;
      }
    }

    // Send new frame to view
    let frame = this._models[this._currentState].updateFrame(control);

    if (frame) {
      this._outputQueue.enqueue(frame);

    // If frame is falsy, it means the model is done. Change state
    } else {
      this._currentState = (this._currentState+1) % this._models.length;
      this._models[this._currentState].resetGameState();

      if (this._currentState === 0) {
        this._score.reset();
      }
    }
  }
};

/** 
 * Base model for the other StateModels to inherit.
 *
 */
export class BaseStateModel {

  /**
   * Static "constants"
   *
   */
  static get bigText() { return 0.15; }
  static get medText() { return 0.10; }
  static get smallText() { return 0.06; }
  static get reallySmallText() { return 0.02; }
  static get fixedReadable() { return 18; }
  static get timeInGameOver() { return 5; }
  static get timeAfterEntry() { return 3; }
  static get highScoreColumnSize() { return 0.75; }
  static get cookieName() { return 'apitoken'; }
  static get tokenLength() { return 43; }

  /**
   * Constructor
   *
   * @param {Generator}   generator    Which generator to use
   * @return {WelcomeStateModel}
   */
  constructor(generator) {
    this._lastUpdateTime = undefined;
    this._objectList = [];
    this._generator = generator;
  }

  /**
   * Resets the game state
   *
   * @param {Array}  windowSize  Size of the current canvas
   * @return {undefined}
   */
  resetGameState(windowSize) {
    this._lastUpdateTime = undefined;
    this._objectList = [];
    this._generator.resetGenerator();
  }

  /**
   * Updates the game model by one frame
   * 
   * @param  {Control}  control  Latest control object from queue
   * @return {Frame}
   */
  updateFrame(control) {

    // Calculate movements and collisions
    let elapsedTime = this._calculateElapsedTime();

    this._generator.updateState(this._objectList, elapsedTime);
    this._generator.makeNewObjectsFor(control);

    for (let obj of this._objectList) {
      obj.updateState(control, elapsedTime);

      for (let remoteObj of this._objectList) {
        if (obj.collidesWith(remoteObj)) {
          this._generator.createDebrisFor(obj.destroy());
          this._generator.createDebrisFor(remoteObj.destroy());
          this._collectScore(obj, remoteObj);          
        }
      }
    }

    // Add clean Frame to the queue or signal model is done
    this._collectGarbage();
    return this._isModelDone(control, elapsedTime) ?
      undefined : this._sendFrame(control);
  }

  /**
   * Gets the elapsed time between frames
   *
   * @return {Number}
   */
  _calculateElapsedTime() {
    if (!this._lastUpdateTime) {
      this._lastUpdateTime = new Date().getTime();
    }

    let currentTime = new Date().getTime();
    let elapsedTime = (currentTime - this._lastUpdateTime) / 1000;
    this._lastUpdateTime = currentTime;

    return elapsedTime;
  }

  /**
   * Collects score of collision - does nothing by default
   *
   * @param {GameObject}  obj1  First object in collision
   * @param {GameObject}  obj2  Second object in collision
   * @return {undefined}
   */
  _collectScore(obj1, obj2) {
    return;
  }

  /** 
   * Adds a Frame to the queue
   * 
   * @param {Control}  control  Control object for the frame
   * @return {Frame}
   */
  _sendFrame(control) {
    let frame = new intf.Frame();
    frame.windowSize = control.windowSize;
    this._addOverlay(control, frame);

    for (let obj of this._objectList) {
      frame.add(obj);
    }

    return frame;
  }

  /** 
   * Utility function to collect garbage from list
   *
   * @return {undefined}
   */
  _collectGarbage() {
    this._objectList = this._objectList.filter(
      (element) => element.isGarbage === false);
  }

  /**
   * Adds text overlay to the model. By default, does nothing.
   *
   * @param {Control}  control  Control for this game frame
   * @param {Frame}    frame    Frame to update
   * @return {undefined}
   */
  _addOverlay(control, frame) {
    return;
  }

  /**
   * Indicates if this model is ready to transition state
   *
   * @param {Control}  control     Control for this game frame
   * @param {number}   elapsedTime Number of seconds since last invocation
   * @return {Boolean}
   */
  _isModelDone(control, elapsedTime) {
    return false;
  }
};

/**
 * Model used when first entering the app (welcome screen)
 *
 */
export class WelcomeStateModel extends BaseStateModel {

  /**
   * Constructor
   *
   * @return {WelcomeStateModel}
   */
  constructor() {
    let generator = new gen.DemoGenerator();
    super(generator);
  }

  /**
   * Adds text overlay to the model. 
   *
   * @param {Control}  control  Control for this game frame
   * @param {Frame}    frame    Frame to update
   * @return {undefined}
   */
  _addOverlay(control, frame) {
    let gameOverText = new intf.TextObject('ASTEROIDS');
    gameOverText.sizePx = BaseStateModel.bigText * control.windowSize[0];
    gameOverText.justify = 'center';
    gameOverText.position = [
      control.windowSize[0]/2,
      control.windowSize[1]/2,
    ];

    let scoreText = new intf.TextObject('PRESS ANY BUTTON TO CONTINUE');
    scoreText.sizePx = BaseStateModel.smallText * control.windowSize[0];
    scoreText.justify = 'center';
    scoreText.position = [
      control.windowSize[0]/2,
      control.windowSize[1]/2 + gameOverText.sizePx,
    ];

    let instructionsHead = new intf.TextObject('HOW TO PLAY');
    instructionsHead.sizePx = BaseStateModel.smallText * control.windowSize[1];
    instructionsHead.justify = 'left';
    instructionsHead.position = [
      0,
      instructionsHead.sizePx,
    ];

    let mobileText = [
      new intf.TextObject('ON MOBILE:                   '),
      new intf.TextObject('  tilt phone: turn left/right'),
      new intf.TextObject('    tap left: thrust         '),
      new intf.TextObject('   tap right: shoot          '),
    ];

    for (let ii = 0; ii < mobileText.length; ii++) {
      let text = mobileText[ii];

      text.sizePx = BaseStateModel.reallySmallText * control.windowSize[1];
      if (text.sizePx < BaseStateModel.fixedReadable) {
        text.sizePx = BaseStateModel.fixedReadable;
      }
      
      text.justify = 'left';
      text.position = [
        0,
        instructionsHead.position[1] + (text.sizePx * (ii+2))
      ];
    }
      
    let desktopText = [
      new intf.TextObject('WITH KEYBOARD:     '),
      new intf.TextObject('      w: thrust    '),
      new intf.TextObject('      a: turn left '),
      new intf.TextObject('      d: turn right'),
      new intf.TextObject('  space: shoot     '),
    ];

    for (let ii = 0; ii < desktopText.length; ii++) {
      let text = desktopText[ii];

      text.sizePx = BaseStateModel.reallySmallText * control.windowSize[1];
      if (text.sizePx < BaseStateModel.fixedReadable) {
        text.sizePx = BaseStateModel.fixedReadable;
      }

      text.justify = 'left';
      text.position = [
        0,
        mobileText[mobileText.length-1].position[1] + (text.sizePx * (ii+2))
      ];
    }

    frame.addText(gameOverText);
    frame.addText(scoreText);
    frame.addText(instructionsHead);
    for (let text of mobileText) {
      frame.addText(text);
    }
    for (let text of desktopText) {
      frame.addText(text);
    }
  }

  /**
   * Indicates if this model is ready to transition state
   *
   * @param {Control}  control  Control for this game frame
   * @return {Boolean}
   */
  _isModelDone(control, elapsedTime) {
    return control.thrust || control.shoot || control.character;
  }
};

/**
 * GameStateModel
 *
 * Model of the asteroids gameplay (while user is trying to score)
 */
export class GameStateModel extends BaseStateModel {

  /**
   * Constructor
   *
   * @param {ScoreKeeper} scoreKeeper  Maintains score
   * @return {GameStateModel}
   */
  constructor(scoreKeeper) {
    let generator = new gen.GameplayGenerator(scoreKeeper);
    super(generator);

    this._scoreKeeper = scoreKeeper;
    this._timeInGameOverScreen = 0;
  }

  /**
   * Resets the game state
   *
   * @param {Array}  windowSize  Size of the current canvas
   * @return {undefined}
   */
  resetGameState(windowSize) {
    super.resetGameState(windowSize);
    this._timeInGameOverScreen = 0;
  }

  /**
   * Collects score of collision - does nothing by default
   *
   * @param {GameObject}  obj1  First object in collision
   * @param {GameObject}  obj2  Second object in collision
   * @return {undefined}
   */
  _collectScore(obj1, obj2) {
    this._scoreKeeper.collectScore(obj1, obj2);
  }

  /**
   * Adds text overlay to the model. 
   *
   * @param {Control}  control  Control for this game frame
   * @param {Frame}    frame    Frame to update
   * @return {undefined}
   */
  _addOverlay(control, frame) {
    if (this._scoreKeeper.lives > 0) {
      let scoreText = new intf.TextObject(`SCORE: ${this._scoreKeeper.score}`);
      scoreText.sizePx = BaseStateModel.smallText * control.windowSize[1];
      scoreText.position = [0, scoreText.sizePx];

      let livesText = new intf.TextObject(`LIVES: ${this._scoreKeeper.lives}`);
      livesText.sizePx = BaseStateModel.smallText * control.windowSize[1];
      livesText.position = [0, scoreText.sizePx * 2];

      frame.addText(scoreText);
      frame.addText(livesText);
      
    } else {
      let gameOverText = new intf.TextObject('GAME OVER');
      gameOverText.sizePx = BaseStateModel.bigText * control.windowSize[0];
      gameOverText.justify = 'center';
      gameOverText.position = [
        control.windowSize[0]/2,
        control.windowSize[1]/2 - gameOverText.sizePx,
      ];

      let scoreText = new intf.TextObject(`SCORE: ${this._scoreKeeper.score}`);
      scoreText.sizePx = BaseStateModel.medText * control.windowSize[0];
      scoreText.justify = 'center';
      scoreText.position = [
        control.windowSize[0]/2,
        control.windowSize[1]/2,
      ];
      
      frame.addText(gameOverText);
      frame.addText(scoreText);
    }
  }

  /**
   * Indicates if this model is ready to transition state
   *
   * @param {Control}  control      Control for this game frame
   * @param {number}   elapsedTime  Number of seconds since last evocation
   * @return {Boolean}
   */
  _isModelDone(control, elapsedTime) {
    if (this._scoreKeeper.lives <= 0) {
      this._timeInGameOverScreen += elapsedTime;
      return this._timeInGameOverScreen > BaseStateModel.timeInGameOver;
    }
    
    return false;
  }
};

/**
 * HighScoreScreenModel
 *
 * Model of the asteroids gameplay (while user is trying to score)
 */
export class HighScoreScreenModel extends BaseStateModel {

  /**
   * Constructor
   *
   * @param {ScoreKeeper} scoreKeeper  Maintains score
   * @return {GameStateModel}
   */
  constructor(scoreKeeper) {
    let generator = new gen.ObjectGenerator();
    super(generator);

    this._scoreKeeper = scoreKeeper;
    this._cursor = '';
    this._playerEntry = undefined;
    this._numSecAfterEntry = 0;
    this._querying = false;
    this._fetchedScores = undefined;
  }

  /**
   * Resets the game state
   *
   * @param {Array}  windowSize  Size of the current canvas
   * @return {undefined}
   */
  resetGameState(windowSize) {
    this._cursor = '';
    this._playerEntry = undefined;
    this._numSecAfterEntry = 0;
    this._querying = false;
    this._fetchedScores = undefined;
  }

  /**
   * Adds text overlay to the model. 
   *
   * @param {Control}  control  Control for this game frame
   * @param {Frame}    frame    Frame to update
   * @return {undefined}
   */
  _addOverlay(control, frame) {

    // Add title
    let title = new intf.TextObject('HIGH SCORES');
    title.sizePx = BaseStateModel.medText * control.windowSize[0];
    title.justify = 'center';
    title.position = [
      control.windowSize[0]/2,
      title.sizePx,
    ];
    
    frame.addText(title);

    // Determine bounds of window, accounting for title space
    const columnSize = BaseStateModel.highScoreColumnSize;
    const padding = (1-columnSize)/2;

    let bounds = {
      xmin: control.windowSize[0] * padding,
      xmax: control.windowSize[0] * (columnSize + padding),
      ymin: title.sizePx,
      ymax: control.windowSize[1],
      font: BaseStateModel.smallText * control.windowSize[0],
    }

    // Create contents of table
    this._makeEntryBox(bounds, control, frame);
    this._createHighScoreTable(bounds, frame);
  }

  /**
   * Indicates if this model is ready to transition state
   *
   * @param {Control}  control      Control for this game frame
   * @param {number}   elapsedTime  Number of seconds since last evocation
   * @return {Boolean}
   */
  _isModelDone(control, elapsedTime) {
    if (this._playerEntry !== undefined) {
      this._numSecAfterEntry += elapsedTime;
    }
    
    return this._numSecAfterEntry > BaseStateModel.timeAfterEntry;
  }

  /**
   * Retrieves the user token from cookies
   *
   * @return {String}
   */
  _getUserToken() {
    let tokenRe = new RegExp(`\\b${BaseStateModel.cookieName}=([\\w-]+)`);
    let token = document.cookie.match(tokenRe);

    if (!token) {
      token = '';
      let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
      for(let ii = 0; ii < length; ii++) token += rando(chars);
      document.cookie = `${BaseStateModel.cookieName}=${token}`;
    }

    return token[1];
  }

  /**
   * Fetch scores from DB
   *
   * @return {Promise}  
   */
  async _fetchScores() {
    let token = this._getUserToken();
    let scores = await fetch(`/api/${token}/scores`);
    return scores.json();
  }

  /**
   * Retrieves the high scores from the database
   *
   * @return {Object}
   */
  _retrieveHighScores() {
    
    // Retrieve scores from DB
    let scoresFromDb = this._fetchedScores ?
        Array.from(this._fetchedScores) : [];

    if (!this._querying && this._fetchedScores === undefined) {
      this._querying = true;

      this._fetchScores()
        .then((value) => {
          this._fetchedScores = value;
          this._querying = false;
        })
        .catch(() => {
          this._fetchedScores = [];
          this._querying = false;
        });
    }

    // Sort and return
    scoresFromDb.sort((obj1, obj2) => {
      return obj2.score - obj1.score
    });
    
    return scoresFromDb;               
  }

  /**
   * Creates the high scores table
   *
   * @param {Object}  bounds  contains the bounds of the window
   * @param {Frame}   frame   Frame to populate
   * @return {undefined} 
   */
  _createHighScoreTable(bounds, frame) {
    
    // Create headers
    let nameColumn = new intf.TextObject('NAME');
    nameColumn.sizePx = bounds.font,
    nameColumn.justify = 'left';
    nameColumn.position = [
      bounds.xmin,
      bounds.ymin + nameColumn.sizePx,
    ];

    let scoreColumn = new intf.TextObject('SCORE');
    scoreColumn.sizePx = bounds.font,
    scoreColumn.justify = 'right';
    scoreColumn.position = [
      bounds.xmax,
      nameColumn.position[1],
    ];

    // If querying, just show a loading screen and exit
    if (this._querying) {
      let loadingText = new intf.TextObject('LOADING...');
      loadingText.sizePx = bounds.font,
      loadingText.justify = 'left';
      loadingText.position = [
        nameColumn.position[0],
        nameColumn.position[1] + bounds.font
      ];

      frame.addText(loadingText);
      return;
    }

    // Retrieve the scores to display
    let scores = this._retrieveHighScores();

    let scoreTableText = [];
    for (let ii = 0; ii < scores.length; ii++) {
      
      // First, check that the next row won't go out of bounds
      let nextYPos = nameColumn.position[1] + (bounds.font * (ii+1));
      if (nextYPos > bounds.ymax) {
        break;
      }

      // Create table rows
      let numberText = new intf.TextObject(`${ii+1}.`);
      numberText.sizePx = bounds.font,
      numberText.justify = 'right';
      numberText.position = [
        bounds.xmin,
        nextYPos,
      ];

      let nameText = new intf.TextObject(scores[ii].name);
      nameText.sizePx = bounds.font,
      nameText.justify = 'left';
      nameText.position = [
        nameColumn.position[0],
        numberText.position[1],
      ];

      let scoreText = new intf.TextObject(scores[ii].score);
      scoreText.sizePx = bounds.font,
      scoreText.justify = 'right';
      scoreText.position = [
        scoreColumn.position[0],
        numberText.position[1],
      ];
      
      scoreTableText.push(numberText);
      scoreTableText.push(nameText);
      scoreTableText.push(scoreText);
    }

    frame.addText(nameColumn);
    frame.addText(scoreColumn);

    for (let text of scoreTableText) {
      frame.addText(text);
    }
  }

  /**
   * Show mobile keyboard
   *
   * @param {TextObject}  nameBoxLabel  Information about user entry
   * @return {undefined}
   */
  _showMobileKeyboard(nameBoxLabel) {
    // Make the #force-keyboard input visible. Move to be close to the
    // input on the canvas. By focusing on the input, the mobile keyboard
    // will be displayed to the user.
    let input = document.getElementById('force-keyboard');
    input.style.visibility = 'visible';
    input.style.position = 'absolute';
    input.style.left = `${nameBoxLabel.position[0]}px`;
    input.style.bottom = `${nameBoxLabel.sizePx}px`;

    // Note that the controller does the actual focus
  }

  /**
   * Hide mobile keyboard
   *
   * @return {undefined}
   */
  _hideMobileKeyboard() {
    // Make the #force-keyboard input invisible. Subsequent clicks will
    // not focus
    document.getElementById('force-keyboard').style.visibility = 'hidden';
  }

  /**
   * Sends POST request to database
   *
   * @param {String}  name   Name of entry
   * @param {number}  score  To post
   * @return {undefined}
   */
  async _postToDb(name, score) {
    const data = {
      'name': name,
      'score': score,
    };

    const token = this._getUserToken();
    let response = await fetch(
      `/api/${token}/scores`,
      {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

    return response.json(); 
  }

  /**
   * Saves a player high score to the database
   *
   * @param {String}  name   Name of entry
   * @param {number}  score  High score to save
   * @return {undefined}
   */
  _saveHighScore(name, score) {
    if (!this._querying) {
      this._querying = true;

      this._postToDb(name, score)
        .then((value) => {
          this._fetchedScores = value;
          this._querying = false;
        })
        .catch((error) => {
          this._fetchedScores = new Array();
          this._querying = false;
        });
    }
  }

  /**
   * Makes (and populates) an entry box for player to put in their score
   *
   * @param {Object}   bounds   Bounds of window
   * @param {Control}  control  Control for game frame
   * @param {Frame}    frame    GameFrame to populate
   * @return {undefined}
   */
  _makeEntryBox(bounds, control, frame) {

    // Do not make the entry box if player has already entered score
    // or currently querying database
    if (this._playerEntry !== undefined ||
        this._querying || this._fetchedScores === undefined) {
      
      this._hideMobileKeyboard();
      return;
    }

    // Take characters and add it to the player's name
    if (control.character) {
      if (control.character === 'Backspace') {
        this._cursor = this._cursor.substring(
          0,
          this._cursor.length-1);
        
      } else if (control.character === 'Enter') {
        this._playerEntry = this._cursor;
        this._cursor = '';
        this._saveHighScore(this._playerEntry, this._scoreKeeper.score);

      } else {
        this._cursor += control.character;
      }
    }

    // Create the text box
    let nameBoxLabel = new intf.TextObject(`YOUR NAME: ${this._cursor}_`);
    nameBoxLabel.sizePx = bounds.font,
    nameBoxLabel.justify = 'left';
    nameBoxLabel.position = [
      bounds.xmin,
      bounds.ymax - nameBoxLabel.sizePx,
    ];

    this._showMobileKeyboard(nameBoxLabel);

    let yourScoreLabel = new intf.TextObject(this._scoreKeeper.score)
    yourScoreLabel.sizePx = bounds.font,
    yourScoreLabel.justify = 'right';
    yourScoreLabel.position = [bounds.xmax, nameBoxLabel.position[1]];

    frame.addText(nameBoxLabel);
    frame.addText(yourScoreLabel);

    // Set ymax bound to prevent table from overlapping
    bounds.ymax = nameBoxLabel.position[1] - nameBoxLabel.sizePx;
  }
};
