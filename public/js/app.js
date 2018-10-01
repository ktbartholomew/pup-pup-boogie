// @ts-check

/**
 * CreateCanvas adds a canvas element to the page and returns its 2D context
 * @returns {HTMLCanvasElement}
 */
var CreateCanvas = function() {
  document.body.style.margin = '0';

  var c = document.createElement('canvas');
  c.height = window.innerHeight;
  c.width = 480;

  c.style.display = 'block';
  c.style.margin = '0 auto';
  c.style.transform = 'translateZ(0)';

  document.getElementById('app').appendChild(c);

  return c;
};

class Box {
  constructor(opts) {
    this.slot = opts.slot || 0;
    this.offset = opts.offset || 0;
    this.scored = false;
  }

  getYTop() {
    var state = State.Get();
    var yFactor = 0.2;
    return state.progress * yFactor - this.offset * 120;
  }

  getYBottom() {
    return this.getYTop() + 80;
  }

  /**
   * Draw renders the box to the provided context
   * @param {CanvasRenderingContext2D} ctx
   */
  Draw(ctx) {
    var fillStyle = '';
    switch (this.slot) {
      case 0:
        fillStyle = '#ff3300';
        break;
      case 1:
        fillStyle = '#0033ff';
        break;
      case 2:
        fillStyle = '#ffdd00';
        break;
      case 3:
        fillStyle = '#00dd66';
        break;
    }

    if (this.getYBottom() < 0 || this.getYTop() > C.height) {
      return;
    }

    ctx.fillStyle = fillStyle;
    ctx.fillRect(80 + 80 * this.slot, this.getYTop(), 80, 80);
  }

  /**
   * Score determines the score received from pushing a key at a certain time
   * @param {KeyboardEvent} e
   * @returns {number}
   */
  Score(e) {
    if (this.scored) {
      return 0;
    }

    if (
      !(
        (e.key === 'a' && this.slot === 0) ||
        (e.key === 's' && this.slot === 1) ||
        (e.key === 'd' && this.slot === 2) ||
        (e.key === 'f' && this.slot === 3)
      )
    ) {
      return;
    }

    var finishLine = C.height - 80;
    var bottom = this.getYBottom();

    var close = bottom - finishLine;
    if (Math.abs(close) > 20) {
      return 0;
    }

    this.scored = true;

    return Math.floor(20 - Math.abs(close));
  }
}

/**
 * @typedef StateInterface
 * @property {function} Get
 * @property {function} Update
 * @property {function} Subscribe
 */

/**
 * @returns {StateInterface}
 */
var StateInterface = function() {
  /**
   * @typedef Action
   * @property {String} type
   * @property {Object} data
   */

  /**
   * @typedef InternalState
   * @property {number} progress
   * @property {number} score
   * @property {Box[]} boxes
   */
  var state = {
    progress: 0,
    score: 0,
    boxes: []
  };

  for (var i = 0; i < 255; i++) {
    state.boxes.push(
      new Box({
        slot: Math.floor(Math.random() * 4),
        offset: i
      })
    );
  }

  /**
   * @type {number}
   */
  var startTime = Date.now();

  /** @type {function[]} */
  var subscribers = [];

  return {
    /**
     * @returns {InternalState}
     */
    Get: function() {
      return state;
    },
    /**
     * @param {Action} action
     * @returns {void}
     */
    Update: function(action) {
      switch (action.type) {
        case 'PROGRESS_UPDATE':
          state.progress = Date.now() - startTime;
          break;
        case 'ADD_TO_SCORE':
          state.score += action.data.addition;
          break;
      }

      subscribers.forEach(s => {
        s();
      });
    },

    /**
     * @param {function} callback
     * @returns {function}
     */
    Subscribe: function(callback) {
      subscribers.push(callback);

      return function() {
        subscribers.forEach((s, index) => {
          if (s == callback) {
            subscribers.splice(index, 1);
          }
        });
      };
    }
  };
};

var State = StateInterface();

var StartAnimationLoop = function() {
  var ctx = C.getContext('2d');

  var drawBackground = function() {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, C.width, C.height);

    // finish line
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, C.height - 80, C.width, 1);
  };

  var drawSquares = function() {
    var state = State.Get();

    state.boxes.forEach(box => {
      box.Draw(ctx);
    });
  };

  var updateProgress = function() {
    State.Update({type: 'PROGRESS_UPDATE'});
  };

  var theLoop = function() {
    window.requestAnimationFrame(() => {
      updateProgress();

      ctx.clearRect(0, 0, C.width, C.height);
      drawBackground();
      drawSquares();

      if (document.visibilityState !== 'hidden') {
        theLoop();
      }
    });
  };

  theLoop();
};

var WaitForInput = function() {
  window.addEventListener('keydown', function(e) {
    if (e.key === 'a' || e.key === 's' || e.key === 'd' || e.key === 'f') {
      var state = State.Get();
      state.boxes.forEach(box => {
        var score = box.Score(e);

        if (score > 0) {
          State.Update({
            type: 'ADD_TO_SCORE',
            data: {
              addition: score
            }
          });
        }
      });
    }
  });
};

var DrawScore = function() {
  var state = State.Get();
  var score = document.createElement('div');
  score.style.position = 'fixed';
  score.style.top = '20px';
  score.style.left = '20px';
  score.style.font = '48px Arial';
  score.textContent = state.score.toString();

  document.getElementById('app').appendChild(score);

  State.Subscribe(function() {
    var state = State.Get();
    score.textContent = state.score;
  });
};

var C = CreateCanvas();
DrawScore();
StartAnimationLoop();
WaitForInput();
