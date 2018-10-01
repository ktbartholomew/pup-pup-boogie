// @ts-check

/**
 * CreateCanvas adds a canvas element to the page and returns its 2D context
 * @returns {HTMLCanvasElement}
 */
var CreateCanvas = function() {
  document.body.style.margin = '0';

  RED_BOX = new Image();
  RED_BOX.src = '/img/box-red.png';

  BLUE_BOX = new Image();
  BLUE_BOX.src = '/img/box-blue.png';

  YELLOW_BOX = new Image();
  YELLOW_BOX.src = '/img/box-yellow.png';

  GREEN_BOX = new Image();
  GREEN_BOX.src = '/img/box-green.png';

  var c = document.createElement('canvas');
  c.height = window.innerHeight - 40;
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
    var yFactor = 0.1;
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
    if (this.slot === 0) {
      return;
    }

    var image = null;
    switch (this.slot) {
      case 1:
        image = RED_BOX;
        break;
      case 2:
        image = BLUE_BOX;
        break;
      case 3:
        image = YELLOW_BOX;
        break;
      case 4:
        image = GREEN_BOX;
        break;
    }

    if (this.getYBottom() > C.height - 60 && !this.scored) {
      this.scored = true;
      State.Update({
        type: 'ADD_TO_SCORE',
        data: {
          addition: -9
        }
      });
    }

    if (this.getYBottom() < 0 || this.getYTop() > C.height) {
      return;
    }

    if (this.scored) {
      ctx.globalAlpha = 0.5;
    }
    ctx.drawImage(image, 80 * this.slot, this.getYTop(), 80, 80);
    ctx.globalAlpha = 1;
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
        (e.key === 'a' && this.slot === 1) ||
        (e.key === 's' && this.slot === 2) ||
        (e.key === 'd' && this.slot === 3) ||
        (e.key === 'f' && this.slot === 4)
      )
    ) {
      return 0;
    }

    var finishLine = C.height - 80;
    var bottom = this.getYBottom();

    var close = Math.abs(bottom - finishLine);
    if (close > 20) {
      return 0;
    }

    this.scored = true;

    var score = Math.floor(10 - close);
    return score;
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
        slot: Math.floor(Math.random() * 5),
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
          if (action.data.addition < 0) {
            state.score = Math.max(-40, state.score + action.data.addition);
          } else {
            state.score = Math.min(40, state.score + action.data.addition);
          }
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
  var a = new Audio('/music/song-2.mp3');

  var ctx = C.getContext('2d');

  var drawBackground = function() {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, C.width, C.height);

    // finish line
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, C.height - 80, C.width, 1);

    ctx.fillStyle = '#dddd00';
    ctx.fillRect(0, C.height - 70, C.width, 1);

    ctx.fillStyle = '#dddd00';
    ctx.fillRect(0, C.height - 90, C.width, 1);

    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(0, C.height - 60, C.width, 1);

    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(0, C.height - 100, C.width, 1);
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

  var gameOver = false;
  var stop = false;

  var theLoop = function() {
    window.requestAnimationFrame(() => {
      updateProgress();

      ctx.clearRect(0, 0, C.width, C.height);
      drawBackground();
      drawSquares();

      if (!stop) {
        theLoop();
      }
    });
  };

  a.addEventListener('canplaythrough', e => {
    a.play();
    theLoop();
  });

  document.addEventListener('visibilitychange', e => {
    if (document.visibilityState === 'hidden' && !gameOver) {
      stop = true;
      a.pause();
    } else {
      stop = false;
      a.play();
    }
  });

  State.Subscribe(() => {
    var state = State.Get();
    if (state.score === -40) {
      stop = true;
      gameOver = true;
      a.pause();
    }
  });
};

var findClosestBox = function() {
  var state = State.Get();

  var finishLineY = C.height - 80;

  for (var i = 0; i < state.boxes.length; i++) {
    if (state.boxes[i].slot === 0) {
      continue;
    }
    var distance = state.boxes[i].getYBottom() - finishLineY;

    if (distance > -30 && distance < 30) {
      return state.boxes[i];
    }
  }

  return new Box({
    slot: 0,
    offset: Infinity
  });
};

var WaitForInput = function() {
  window.addEventListener('keydown', function(e) {
    if (e.key === 'a' || e.key === 's' || e.key === 'd' || e.key === 'f') {
      var state = State.Get();

      var box = findClosestBox();
      var score = box.Score(e);
      console.log(score);

      if (score !== 0) {
        if (score >= 8) {
          var ding = new Audio('/music/good-score.mp3');
          ding.play();
        }

        if (score < 0) {
          var womp = new Audio('/music/bad-score.mp3');
          womp.play();
        }

        State.Update({
          type: 'ADD_TO_SCORE',
          data: {
            addition: score
          }
        });
      }
    }
  });
};

var DrawScore = function() {
  var state = State.Get();

  var ticker = document.createElement('div');
  ticker.style.position = 'fixed';
  ticker.style.bottom = '0';
  ticker.style.left = '50%';
  ticker.style.width = '480px';
  ticker.style.height = '40px';
  ticker.style.marginLeft = '-240px';
  ticker.style.background =
    'linear-gradient(to right, rgba(255,50,50,1) 0%,rgba(255,225,0,1) 50%,rgba(255,225,0,1) 51%,rgba(45,255,101,1) 100%)';

  var marker = document.createElement('div');
  marker.style.border = 'solid 8px white';
  marker.style.width = '40px';
  marker.style.height = '40px';
  marker.style.position = 'absolute';
  marker.style.borderRadius = '40px';
  marker.style.left = '50%';
  marker.style.marginLeft = '-20px';
  marker.style.transition = 'left 0.2s ease-in-out';
  ticker.appendChild(marker);

  document.getElementById('app').appendChild(ticker);

  State.Subscribe(function() {
    var state = State.Get();

    marker.style.left = (state.score * 1.25 + 50).toString() + '%';

    if (state.score === -40) {
      var gameOver = document.createElement('div');
      gameOver.style.boxSizing = 'border-box';
      gameOver.style.position = 'fixed';
      gameOver.style.left = '0';
      gameOver.style.top = '0';
      gameOver.style.width = '100%';
      gameOver.style.height = '100%';
      gameOver.style.zIndex = '10';
      gameOver.style.background = 'rgba(0,0,0,0.75)';
      gameOver.style.font = 'bold 48px arial';
      gameOver.style.padding = '10vh 10vw';
      gameOver.style.textAlign = 'center';
      gameOver.style.color = 'white';

      gameOver.textContent = 'GAME OVER';

      document.getElementById('app').appendChild(gameOver);
    }
  });
};

var RED_BOX, BLUE_BOX, GREEN_BOX, YELLOW_BOX;

var C = CreateCanvas();
DrawScore();
StartAnimationLoop();
WaitForInput();
