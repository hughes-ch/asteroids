'use strict';
/**
 * Tests for model.js
 *
 * :copyright: Copyright (c) 2021 Chris Hughes
 * :license: Mozilla Public License Version 2.0
 *
 */
import * as gen from '../src/modules/generator.js'
import * as go from '../src/modules/gameObject.js'
import * as intf from '../src/modules/interfaces.js'
import * as math from 'mathjs'
import * as model from '../src/modules/model.js'
import * as objModels from '../src/modules/objModels.js'
import fetchMock from 'jest-fetch-mock';

/**
 * Setups and teardowns
 *
 */
beforeEach(() => {
  go.GameObject.getDevicePixelRatio = jest.fn().mockReturnValue(1);

  jest.spyOn(model.HighScoreScreenModel.prototype, '_fetchScores')
      .mockImplementation(() => new Promise((resolve, reject) => {
        resolve([
          { name: 'Harry', score: 800, },
          { name: 'Sally', score: 600, },
          { name: 'Barry', score: 700, },
        ]);
      }));

  jest.spyOn(
    model.HighScoreScreenModel.prototype,
    '_showMobileKeyboard')
    .mockImplementation(() => undefined);
  jest.spyOn(
    model.HighScoreScreenModel.prototype,
    '_hideMobileKeyboard')
    .mockImplementation(() => undefined);
}); 

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Utility function to calculate rotations
 *
 * @param {Array}  vector   Vector to rotate
 * @param {Number} rotation Amount to rotate (deg)
 * @return {Array} Rotated vector
 */
let rotateVect = (vector, rotation) => {
  const rotationInRad = rotation * Math.PI / 180;
  const rotationMatrix = [
    [Math.cos(rotationInRad), -Math.sin(rotationInRad)],
    [Math.sin(rotationInRad),  Math.cos(rotationInRad)]
  ];

  return math.multiply(rotationMatrix, vector);
};

/**
 * Utility function to create Model in GameState
 *
 * @return {Model}
 */
let createModelInGameState = () => {
  let inputQueue = new intf.Queue();
  let outputQueue = new intf.Queue();
  let gameModel = new model.Model(inputQueue, outputQueue);
  gameModel._currentState = 1;
  
  return gameModel;
};

/**
 * Unit tests
 *
 */
test('Verify correct control object used in updateFrame()', () => {
  let mockUpdateState = jest.spyOn(go.GameObject.prototype, 'updateState');
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

  // Make sure game model does not update model without first input
  gameModel.updateFrame();
  expect(mockUpdateState).not.toHaveBeenCalled();
  mockUpdateState.mockReset();

  // Make sure game model recognizes input
  let controlInput = new intf.Control();
  controlInput.rotate = intf.Control.rotateFullCw;
  controlInput.thrust = true;
  controlInput.shoot = true;

  inputQueue.enqueue(controlInput);
  gameModel.updateFrame();
  expect(mockUpdateState).toHaveBeenCalledWith(
    controlInput,
    expect.anything());
  mockUpdateState.mockReset();

  // Make sure game model uses last input if there is none
  gameModel.updateFrame();
  expect(mockUpdateState).toHaveBeenCalledWith(
    controlInput,
    expect.anything());
  mockUpdateState.mockRestore();
});

test('Test elapsed time is calculated correctly between frames', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;
  let startTime = new Date().getTime();
  
  // Verify last call's 'elapsedTime' parameter is less than test length
  let mockUpdateState = jest.spyOn(go.GameObject.prototype, 'updateState');

  do {
    inputQueue.enqueue(new intf.Control());
    gameModel.updateFrame();
  } while ((new Date().getTime() - startTime) < 1000);

  let lastCall = mockUpdateState.mock.calls[
    mockUpdateState.mock.calls.length-1];

  expect(lastCall[1]).toBeCloseTo(0, 1);
  mockUpdateState.mockRestore();
});

test('Test window resizing', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

  let control = new intf.Control();
  control.windowSize = [100, 100];

  inputQueue.enqueue(control);
  gameModel.updateFrame();

  let frame = outputQueue.dequeue();
  expect(frame.windowSize).toEqual(control.windowSize);
});

test('Test that extra controls are stacked', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

  let dummyControl = new intf.Control();
  inputQueue.enqueue(dummyControl);
  gameModel.updateFrame();

  let control1 = new intf.Control();
  control1.rotate = 0;
  control1.shoot = true;
  control1.thrust = true;
  control1.windowSize = [10, 10];
  inputQueue.enqueue(control1);

  let control2 = new intf.Control();
  control2.rotate = 1;
  control2.shoot = false;
  control2.thrust = false;
  control2.windowSize = [100, 100];
  inputQueue.enqueue(control2);
  
  let mockUpdateState = jest.spyOn(go.GameObject.prototype, 'updateState');
  gameModel.updateFrame();

  let expectedControl = new intf.Control();
  expectedControl.rotate = control2.rotate;
  expectedControl.shoot = control1.shoot;
  expectedControl.thrust = control1.thrust;
  expectedControl.windowSize = control2.windowSize;
  expect(mockUpdateState).toHaveBeenCalledWith(
    expectedControl,
    expect.anything());
  
  mockUpdateState.mockReset();
  gameModel.updateFrame();

  expectedControl = control2;
  expect(mockUpdateState).toHaveBeenCalledWith(
    expectedControl,
    expect.anything());
  
  mockUpdateState.mockRestore();
});

test('Test garbage is collected at end of each frame update', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;
  let control = new intf.Control()

  inputQueue.enqueue(control);
  gameModel.updateFrame();

  let objList = gameModel._models[gameModel._currentState]._objectList;
  let origObjListLen = objList.length;
  objList[0].isGarbage = true;
  gameModel.updateFrame();

  objList = gameModel._models[gameModel._currentState]._objectList;
  expect(objList.length).toEqual(origObjListLen - 1);
});

test('Test objects are no longer added after 0 lives', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;
  gameModel._score.lives = 0;

  let control = new intf.Control();
  inputQueue.enqueue(control);
  gameModel.updateFrame();
  
  let frame = Array.from(outputQueue.dequeue());
  expect(frame.length).toEqual(0);
});

test('Test score overlay added when lives > 0', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;

  let control = new intf.Control();
  control.windowSize = [0, 0];
  inputQueue.enqueue(control);
  gameModel.updateFrame();
  
  let frame = outputQueue.dequeue();
  expect(frame.textObjects.length).toEqual(2);
  expect(frame.textObjects.find((element) => element.text === 'SCORE: 0'))
    .toBeTruthy();
  expect(frame.textObjects.find(
    (element) => element.text === `LIVES: ${intf.ScoreKeeper.startingLives}`))
    .toBeTruthy();
});

test('Test GAME OVER added when lives === 0', () => {
  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;
  gameModel._score.lives = 0;

  let control = new intf.Control();
  control.windowSize = [0, 0];
  inputQueue.enqueue(control);
  gameModel.updateFrame();
  
  let frame = outputQueue.dequeue();
  expect(frame.textObjects.length).toEqual(2);
  expect(frame.textObjects.find((element) => element.text === 'SCORE: 0'))
    .toBeTruthy();
  expect(frame.textObjects.find((element) => element.text === 'GAME OVER'))
    .toBeTruthy();
});

test('Test the model starts with welcome screen', () => {
  let input = new intf.Queue();
  let output = new intf.Queue();
  let gameModel = new model.Model(input, output);
  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  input.enqueue(control);
  gameModel.updateFrame();

  let frame = output.dequeue();
  expect(frame.textObjects.find(
    (element) => element.text === 'ASTEROIDS'))
    .toBeTruthy();
  expect(frame.textObjects.find(
    (element) => element.text === 'PRESS ANY BUTTON TO CONTINUE'))
    .toBeTruthy();
});

test('Test the state is switched when frame is falsy', () => {
  let mockState = jest.spyOn(model.BaseStateModel.prototype, 'updateFrame')
      .mockImplementation((control) => undefined);
  
  let input = new intf.Queue();
  let output = new intf.Queue();
  let gameModel = new model.Model(input, output);
  gameModel._score.lives = 10;
  gameModel._score.score = 1000;
  
  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  input.enqueue(control);

  let currentState = gameModel._currentState;
  gameModel.updateFrame();
  expect(gameModel._currentState).toEqual(currentState + 1);

  gameModel.updateFrame();
  gameModel.updateFrame();
  expect(gameModel._currentState).toEqual(0);
  expect(gameModel._score.lives).toEqual(intf.ScoreKeeper.startingLives);

  mockState.mockRestore();
});

test('Test model is reset between states', () => {
  let mockDone = jest.spyOn(model.WelcomeStateModel.prototype, '_isModelDone')
      .mockImplementation((control) => true);

  let input = new intf.Queue();
  let output = new intf.Queue();
  let gameModel = new model.Model(input, output);
  gameModel._models[gameModel._currentState+1]._objectList.push(
    new go.Alien([0, 0]));

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  input.enqueue(control);
  
  gameModel.updateFrame();
  expect(gameModel._models[gameModel._currentState]._objectList.length)
    .toEqual(0);

  mockDone.mockRestore();
});

test('Test generator is reset between states', () => {
  let mockState = jest.spyOn(model.BaseStateModel.prototype, 'updateFrame')
      .mockImplementation((control) => undefined);

  let input = new intf.Queue();
  let output = new intf.Queue();
  let gameModel = new model.Model(input, output);
  gameModel._models[gameModel._currentState+1]._generator._level = 4;

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  input.enqueue(control);
  
  gameModel.updateFrame();
  expect(gameModel._models[gameModel._currentState]._generator._level)
    .toEqual(1);

  mockState.mockRestore();
});

test('Test welcome screen is done when control toggled', () => {
  let gameModel = new model.WelcomeStateModel();

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  expect(gameModel.updateFrame(control)).toBeTruthy();

  control.thrust = true;
  expect(gameModel.updateFrame(control)).toBeFalsy();
});

test('Test game model is done when lives are exhausted', () => {
  let mockTime = jest.spyOn(
    model.BaseStateModel.prototype,
    '_calculateElapsedTime').
      mockImplementation(() => model.BaseStateModel.timeInGameOver*2);

  let score = new intf.ScoreKeeper();
  let gameModel = new model.GameStateModel(score);

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  expect(gameModel.updateFrame(control)).toBeTruthy();

  score.lives = 0;
  expect(gameModel.updateFrame(control)).toBeFalsy();
});

test('Test HighScoreScreenModel reset', () => {
  let mockDoneHighScore = jest.spyOn(
    model.HighScoreScreenModel.prototype,
    '_isModelDone').mockImplementation((control) => true);
  let mockDoneGameState = jest.spyOn(
    model.GameStateModel.prototype,
    '_isModelDone').mockImplementation((control) => true);

  let gameModel = createModelInGameState();
  let inputQueue = gameModel._inputQueue;
  let outputQueue = gameModel._outputQueue;
  gameModel._models[gameModel._currentState+1]._playerEntry = 'name';

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  inputQueue.enqueue(control);
  
  gameModel.updateFrame();
  expect(gameModel._models[gameModel._currentState]._playerEntry)
    .toBe(undefined);

  mockDoneHighScore.mockRestore();
  mockDoneGameState.mockRestore();
});

test('Test contents of HighScoreScreenModel are present', () => {
  let expectedRows = [
    { name: 'Harry', score: 1080, },
    { name: 'Barry', score: 1058, },
    { name: 'Susan', score: 50,   }
  ];

  let keeper = new intf.ScoreKeeper();
  let gameModel = new model.HighScoreScreenModel(keeper);
  gameModel._fetchedScores = expectedRows;
  
  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  // verify title is there
  let frame = gameModel.updateFrame(control);
  let isTitlePresent = (element) => element.text === 'HIGH SCORES';
  expect(frame.textObjects.find(isTitlePresent)).toBeTruthy();
  
  // make sure num rows matches expected
  let filterRows = (element) => /\d\./.test(element.text) 
  expect(frame.textObjects.filter(filterRows).length)
    .toEqual(expectedRows.length);
  
  // Make sure entry is there
  let isEntryPresent = (element) => /YOUR NAME/.test(element.text);
  expect(frame.textObjects.find(isEntryPresent)).toBeTruthy();
});

test('Test contents of HighScoreScreenModel are centered', () => {
  let keeper = new intf.ScoreKeeper();
  let gameModel = new model.HighScoreScreenModel(keeper);

  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  let padding = ((1-model.BaseStateModel.highScoreColumnSize)/2);
  let minBound = padding * control.windowSize[0];
  let maxBound = (model.BaseStateModel.highScoreColumnSize + padding) *
      control.windowSize[0];

  let frame = gameModel.updateFrame(control);
  for (let text of frame.textObjects) {
    expect(text.position[0]).toBeGreaterThanOrEqual(minBound);
    expect(text.position[0]).toBeLessThanOrEqual(maxBound);
  }
});

test('Test rows are cut off early if there are too many', () => {
  let expectedRows = [
    { name: 'Harry', score: 1080, },
    { name: 'Barry', score: 1058, },
    { name: 'Susan', score: 50,   }
  ];
  for (let ii = 0; ii < 10; ii++) {
    expectedRows = expectedRows.concat(expectedRows);
  }

  let mockRetrieve = jest.spyOn(
    model.HighScoreScreenModel.prototype,
    '_retrieveHighScores').mockImplementation((control) => expectedRows);

  let keeper = new intf.ScoreKeeper();
  let gameModel = new model.HighScoreScreenModel(keeper);
  let control = new intf.Control();
  control.windowSize = [100, 100];

  let frame = gameModel.updateFrame(control);
  let filterRows = (element) => /\d\./.test(element.text) 
  expect(frame.textObjects.filter(filterRows).length)
    .toBeLessThan(expectedRows.length);
  
  mockRetrieve.mockReset();
});

test('Test HighScoreScreenModel done after entry made', () => {
  let keeper = new intf.ScoreKeeper();
  let gameModel = new model.HighScoreScreenModel(keeper);
  let control = new intf.Control();
  control.windowSize = [100, 100];

  gameModel.updateFrame(control);
  expect(gameModel._isModelDone(control, 0)).toBe(false);

  gameModel._playerEntry = 'name';
  gameModel.updateFrame(control);
  expect(gameModel._isModelDone(
    control,
    model.BaseStateModel.timeAfterEntry*2))
    .toBe(true);
});

test('Test retrieveHighScores returns sorted array', () => {
  let keeper = new intf.ScoreKeeper();
  let gameModel = new model.HighScoreScreenModel(keeper);
  gameModel._fetchedScores = [
    { name: 'Harry', score: 800, },
    { name: 'Sally', score: 600, },
    { name: 'Barry', score: 700, },
  ];

  let highScores = gameModel._retrieveHighScores();
  let lastScore = Infinity;
  for (let ii = 0; ii < highScores.length; ii++) {
    expect(highScores[ii].score).toBeLessThanOrEqual(lastScore);
    lastScore = highScores[ii].score;
  }
});

test('Test entry box is not displayed if player has made entry', () => {
  let keeper = new intf.ScoreKeeper();
  let gameModel = new model.HighScoreScreenModel(keeper);
  gameModel._playerEntry = 'name'
  
  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  let frame = gameModel.updateFrame(control);
  let isEntryPresent = (element) => /YOUR NAME/.test(element.text);
  expect(frame.textObjects.find(isEntryPresent)).toBeFalsy();
});

test('Test entry box updates with character controls', () => {
  let keeper = new intf.ScoreKeeper();
  let gameModel = new model.HighScoreScreenModel(keeper);
  gameModel._fetchedScores = [];

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  control.character = 'a';

  let frame = gameModel.updateFrame(control);
  let isEntryPresent = (element) => /YOUR NAME: a_/.test(element.text);
  expect(frame.textObjects.find(isEntryPresent)).toBeTruthy();

  control.character = 'b';
  frame = gameModel.updateFrame(control);
  isEntryPresent = (element) => /YOUR NAME: ab_/.test(element.text);
  expect(frame.textObjects.find(isEntryPresent)).toBeTruthy();

  control.character = 'Backspace';
  frame = gameModel.updateFrame(control);
  isEntryPresent = (element) => /YOUR NAME: a_/.test(element.text);
  expect(frame.textObjects.find(isEntryPresent)).toBeTruthy();

  control.character = 'Enter';
  frame = gameModel.updateFrame(control);
  expect(gameModel._playerEntry).toEqual('a');
});

test('Test entry box does not update on empty name', () => {
  let mockSave = jest.spyOn(
    model.HighScoreScreenModel.prototype,
    '_saveHighScore');
  
  let keeper = new intf.ScoreKeeper();
  let gameModel = new model.HighScoreScreenModel(keeper);
  gameModel._fetchedScores = [];

  let control = new intf.Control();
  control.windowSize = [1000, 1000];
  control.character = 'Enter';

  gameModel.updateFrame(control);
  expect(mockSave).not.toHaveBeenCalled();
  mockSave.mockRestore();
});

test('Test the score is correct in the entry box', () => {
  let keeper = new intf.ScoreKeeper();
  keeper.score = 20;
  
  let gameModel = new model.HighScoreScreenModel(keeper);
  gameModel._fetchedScores = [];
  
  let control = new intf.Control();
  control.windowSize = [1000, 1000];

  let frame = gameModel.updateFrame(control);
  let findEntry = (element) => /YOUR NAME/.test(element.text);
  let entryIndex = frame.textObjects.findIndex(findEntry);
  expect(frame.textObjects[entryIndex+1].text)
    .toEqual(keeper.score);
});

test('Test that a loading screen is displayed', () => {
  let keeper = new intf.ScoreKeeper();
  let scoreModel = new model.HighScoreScreenModel(keeper);
  scoreModel._querying = true;
  
  let frame = new intf.Frame();
  let bounds = {
    xmin: 0,
    xmax: 100,
    ymin: 0,
    ymax: 100
  };
  
  scoreModel._createHighScoreTable(bounds, frame);
  expect(frame.textObjects.find((element) => element.text === 'LOADING...'))
    .toBeTruthy();
  expect(frame.textObjects.find((element) => element.text === 'YOUR NAME_'))
    .toBeFalsy();
});

test('Test only one fetch is sent', () => {
  let mockFetch = jest.spyOn(
    model.HighScoreScreenModel.prototype,
    '_fetchScores')
      .mockImplementation(() => new Promise((resolve, reject) => {
        resolve([]);
      }));
  
  let keeper = new intf.ScoreKeeper();
  let scoreModel = new model.HighScoreScreenModel(keeper);

  let frame = new intf.Frame();
  let bounds = {
    xmin: 0,
    xmax: 100,
    ymin: 0,
    ymax: 100
  };
  
  scoreModel._createHighScoreTable(bounds, frame);
  scoreModel._createHighScoreTable(bounds, frame);
  scoreModel._createHighScoreTable(bounds, frame);

  expect(mockFetch).toHaveBeenCalledTimes(1);
  mockFetch.mockRestore();
});

test('Test what happens if connection is lost to server', () => {
  // jest.restoreAllMocks();

  // fetchMock.enableMocks();
  // fetch.mockReject(500);

  // let keeper = new intf.ScoreKeeper();
  // let scoreModel = new model.HighScoreScreenModel(keeper);

  // let frame = new intf.Frame();
  // let bounds = {
  //   xmin: 0,
  //   xmax: 100,
  //   ymin: 0,
  //   ymax: 100
  // };

  // return new Promise((resolve, reject) => {
  //   resolve(scoreModel._createHighScoreTable(bounds, frame));

  // }).then(() => {
  //   Promise succeeded unexpectedly
  //   expect(false).toBe(true);
  //   fetch.resetMocks();
    
  // }).catch(() => {
  //   expect(scoreModel._fetchedScores).toEqual([]);
  //   fetch.resetMocks();
  // });
});

test('Test only one POST', () => {
  let mockPost = jest.spyOn(
    model.HighScoreScreenModel.prototype,
    '_postToDb')
      .mockImplementation(() => new Promise((resolve, reject) => {
        resolve([]);
      }));
  
  let keeper = new intf.ScoreKeeper();
  let scoreModel = new model.HighScoreScreenModel(keeper);
  scoreModel._saveHighScore('name', 100);
  scoreModel._saveHighScore('name', 100);
  scoreModel._saveHighScore('name', 100);
  expect(mockPost).toHaveBeenCalledTimes(1);
  mockPost.mockRestore();
});

test('Test POST data and response', async () => {
  jest.restoreAllMocks();
  fetchMock.enableMocks();

  let name = 'name';
  let score = 100;
  let expectedData = {
    name: name,
    score: score,
  };
  fetch.mockResponseOnce(JSON.stringify(expectedData));
  
  let fakeToken = 'faketoken'
  let mockToken = jest.spyOn(
    model.HighScoreScreenModel.prototype,
    '_getUserToken')
      .mockImplementation(() => fakeToken);

  
  let keeper = new intf.ScoreKeeper();
  let scoreModel = new model.HighScoreScreenModel(keeper);

  await scoreModel._saveHighScore('name', 100);
  expect(fetch).toHaveBeenCalledWith(
    `/api/${fakeToken}/scores`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expectedData),
    });

  fetch.resetMocks();
  const flushPromises = () => new Promise(setImmediate);
  await flushPromises();
  expect(scoreModel._fetchedScores).toEqual(expectedData);
});

test('Test POST when server returns error', async () => {
  jest.restoreAllMocks();
  fetchMock.enableMocks();
  fetch.resetMocks();
  fetch.mockReject(500);

  let fakeToken = 'faketoken'
  let mockToken = jest.spyOn(
    model.HighScoreScreenModel.prototype,
    '_getUserToken')
      .mockImplementation(() => fakeToken);
  
  let keeper = new intf.ScoreKeeper();
  let scoreModel = new model.HighScoreScreenModel(keeper);

  let name = 'name';
  let score = 100;

  await scoreModel._saveHighScore('name', 100)
  const flushPromises = () => new Promise(setImmediate);
  await flushPromises();
  expect(scoreModel._fetchedScores).toEqual([])
  fetch.resetMocks();
});

